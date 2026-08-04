local RESOURCE = GetCurrentResourceName()
local slotProviders, dossierProviders, spawnProviders = {}, {}, {}
local cooldowns = {}
local awaitingSpawn = {}
local spawnConfirmation = {}
local activeSessions = {}

if not CipherValidation.print('server') then return end

local function accountIdentifiers(source)
    local license = GetPlayerIdentifierByType(source, 'license')
    local license2 = GetPlayerIdentifierByType(source, 'license2')
    if CipherBridge.name == 'qbox' then
        return license2 or license, license or license2
    end
    local primary = license or license2
    return primary, primary
end

local function identifier(source)
    local primary = accountIdentifiers(source)
    return primary
end

local function decode(value, fallback)
    if type(value) == 'table' then return value end
    if not value or value == '' then return fallback end
    local ok, data = pcall(json.decode, value)
    return ok and data or fallback
end

local function ownsCharacter(source, citizenid)
    local primary, secondary = accountIdentifiers(source)
    if not primary or type(citizenid) ~= 'string' then return false end
    return MySQL.scalar.await('SELECT 1 FROM players WHERE citizenid = ? AND (license = ? OR license = ?) LIMIT 1', { citizenid, primary, secondary }) ~= nil
end

local function ready(source, key, duration)
    local now = GetGameTimer()
    cooldowns[source] = cooldowns[source] or {}
    if (cooldowns[source][key] or 0) > now then return false end
    cooldowns[source][key] = now + duration
    return true
end

local function providerKey(callback)
    return GetInvokingResource() or tostring(callback)
end

local function registerProvider(collection, callback)
    if type(callback) ~= 'function' then return false end
    collection[providerKey(callback)] = callback
    return true
end

local function allowedSlots(source)
    local config = Config.Server.Slots
    local amount = config.default
    local license, secondary = accountIdentifiers(source)
    local storedOverride = CipherStorage.getSlotOverride(license) or CipherStorage.getSlotOverride(secondary)
    if storedOverride then amount = tonumber(storedOverride) or amount end
    local configuredOverride = license and config.identifiers[license] or secondary and config.identifiers[secondary]
    if configuredOverride then amount = math.max(amount, tonumber(configuredOverride) or amount) end
    for _, rule in ipairs(config.ace) do
        if IsPlayerAceAllowed(source, rule.permission) then amount = math.max(amount, tonumber(rule.slots) or amount) end
    end
    for name, provider in pairs(slotProviders) do
        local ok, result = pcall(provider, source, amount)
        if ok and tonumber(result) then amount = math.max(amount, tonumber(result))
        elseif not ok then print(('^3[%s] Slot provider %s failed:^0 %s'):format(RESOURCE, name, result)) end
    end
    return math.min(math.max(math.floor(amount), 1), config.maximum)
end

local function gradeLevel(job)
    if not job then return 0 end
    if type(job.grade) == 'number' then return job.grade end
    return tonumber(job.grade and (job.grade.level or job.grade.grade)) or 0
end

local function listed(values, wanted)
    if not values then return false end
    if values[wanted] ~= nil then return true end
    for _, value in ipairs(values) do if value == wanted then return true end end
    return false
end

local function passesSpawnPermission(source, playerData, location)
    local permission = location.permission
    local checks = {}
    if permission then
        if permission.ace then checks[#checks + 1] = IsPlayerAceAllowed(source, permission.ace) end
        if permission.citizenids then checks[#checks + 1] = listed(permission.citizenids, playerData.citizenid) end
        if permission.jobs then
            local required = permission.jobs[playerData.job and playerData.job.name]
            checks[#checks + 1] = required ~= nil and gradeLevel(playerData.job) >= (tonumber(required) or 0)
        end
        if permission.gangs then
            local required = permission.gangs[playerData.gang and playerData.gang.name]
            checks[#checks + 1] = required ~= nil and gradeLevel(playerData.gang) >= (tonumber(required) or 0)
        end
    end
    local allowed = #checks == 0
    if #checks > 0 then
        allowed = permission.requireAll == true
        for _, passed in ipairs(checks) do
            if permission.requireAll and not passed then allowed = false break end
            if not permission.requireAll and passed then allowed = true break end
        end
    end
    if not allowed then return false end
    for name, provider in pairs(spawnProviders) do
        local ok, result = pcall(provider, source, playerData, location)
        if not ok then print(('^3[%s] Spawn provider %s failed:^0 %s'):format(RESOURCE, name, result))
        elseif result == false then return false end
    end
    return true
end

local function allowedSpawnIds(source, playerData)
    local ids = {}
    if Config.Spawn.allowLastLocation and playerData.position then ids[#ids + 1] = 'last' end
    for _, location in ipairs(Config.Spawn.locations) do
        if passesSpawnPermission(source, playerData, location) then ids[#ids + 1] = location.id end
    end
    return ids
end

local function dossierFor(source, row)
    local charinfo, job, gang, metadata = row.charinfo, row.job, row.gang, row.metadata
    local dossier = {
        citizenid = row.citizenid,
        phone = charinfo.phone,
        account = charinfo.account,
        nationality = charinfo.nationality,
        birthdate = charinfo.birthdate,
        gender = charinfo.gender,
        job = { name = job.name, label = job.label, grade = job.grade and (job.grade.name or job.grade.label), level = gradeLevel(job) },
        gang = { name = gang.name, label = gang.label, grade = gang.grade and (gang.grade.name or gang.grade.label), level = gradeLevel(gang) },
        activity = row.activity,
        extra = {}
    }
    for _, field in ipairs(Config.Server.Dossier.metadataFields) do
        local value = metadata[field.key]
        if value ~= nil then dossier.extra[#dossier.extra + 1] = { label = field.label, value = tostring(value) } end
    end
    for name, provider in pairs(dossierProviders) do
        local ok, result = pcall(provider, source, row.citizenid, row, dossier)
        if ok and type(result) == 'table' then
            for _, field in ipairs(result) do dossier.extra[#dossier.extra + 1] = field end
        elseif not ok then print(('^3[%s] Dossier provider %s failed:^0 %s'):format(RESOURCE, name, result)) end
    end
    return dossier
end

local function commitSession(source)
    local session = activeSessions[source]
    if not session then return end
    activeSessions[source] = nil
    CipherStorage.addPlaytime(session.citizenid, os.time() - session.startedAt)
end

local function isAdmin(source)
    return source == 0 or (Config.Server.Admin.enabled and IsPlayerAceAllowed(source, Config.Server.Admin.ace))
end

local function characterCount(license, secondary)
    return tonumber(MySQL.scalar.await('SELECT COUNT(*) FROM players WHERE license = ? OR license = ?', { license, secondary or license })) or 0
end

local function adminPlayers()
    local players = {}
    for _, value in ipairs(GetPlayers()) do
        local source = tonumber(value)
        local license, secondary = accountIdentifiers(source)
        if license then
            players[#players + 1] = {
                source = source,
                name = GetPlayerName(source) or ('Player %s'):format(source),
                license = license,
                slots = allowedSlots(source),
                override = CipherStorage.getSlotOverride(license),
                characters = characterCount(license, secondary)
            }
        end
    end
    table.sort(players, function(a, b) return a.source < b.source end)
    return players
end

local function updateSlots(adminSource, license, amount)
    if type(license) ~= 'string' or not license:find('^license%d*:[%w]+') then return false end
    if amount == nil then return CipherStorage.resetSlotOverride(license) end
    amount = math.floor(tonumber(amount) or 0)
    if amount < 1 or amount > Config.Server.Slots.maximum or amount < characterCount(license) then return false end
    return CipherStorage.setSlotOverride(license, amount, adminSource == 0 and 'console' or identifier(adminSource))
end

exports('GetAllowedSlots', allowedSlots)
exports('GetSelectedCharacter', function(source)
    local player = CipherBridge.getPlayer(source)
    return player and player.PlayerData or nil
end)
exports('CanUseSpawn', function(source, spawnId)
    local player = CipherBridge.getPlayer(source)
    if not player then return false end
    if spawnId == 'last' then return Config.Spawn.allowLastLocation and player.PlayerData.position ~= nil end
    for _, location in ipairs(Config.Spawn.locations) do
        if location.id == spawnId then return passesSpawnPermission(source, player.PlayerData, location) end
    end
    return false
end)
exports('RegisterSlotProvider', function(callback) return registerProvider(slotProviders, callback) end)
exports('RegisterDossierProvider', function(callback) return registerProvider(dossierProviders, callback) end)
exports('RegisterSpawnProvider', function(callback) return registerProvider(spawnProviders, callback) end)
exports('SetSlotOverride', function(license, slots, updatedBy)
    slots = math.floor(tonumber(slots) or 0)
    if type(license) ~= 'string' or slots < 1 or slots > Config.Server.Slots.maximum or slots < characterCount(license) then return false end
    return CipherStorage.setSlotOverride(license, slots, updatedBy or GetInvokingResource() or 'export')
end)
exports('ResetSlotOverride', function(license)
    if type(license) ~= 'string' then return false end
    return CipherStorage.resetSlotOverride(license)
end)

AddEventHandler('onResourceStop', function(resource)
    slotProviders[resource], dossierProviders[resource], spawnProviders[resource] = nil, nil, nil
    if resource == RESOURCE then
        for source in pairs(activeSessions) do commitSession(source) end
    end
end)

AddEventHandler('playerDropped', function()
    -- Storage can yield, so keep the event source before doing any work.
    local src = source
    commitSession(src)
    cooldowns[src] = nil
    awaitingSpawn[src] = nil
    spawnConfirmation[src] = nil
end)

AddEventHandler('QBCore:Server:OnPlayerUnload', function(source)
    commitSession(source)
end)

RegisterNetEvent('cipher-multichar:server:list', function()
    local src = source
    if not ready(src, 'list', Config.Server.Security.requestCooldownMs) then return end
    local license, secondary = accountIdentifiers(src)
    if not license then return end
    local rows = MySQL.query.await('SELECT citizenid, cid, charinfo, money, job, gang, position, metadata FROM players WHERE license = ? OR license = ? ORDER BY cid ASC', { license, secondary })
    local characters = {}
    for i = 1, #rows do
        local row = rows[i]
        row.charinfo = decode(row.charinfo, {})
        row.money = decode(row.money, {})
        row.job = decode(row.job, {})
        row.gang = decode(row.gang, {})
        row.position = decode(row.position, nil)
        row.metadata = decode(row.metadata, {})
        row.activity = CipherStorage.getActivity(row.citizenid)
        row.dossier = dossierFor(src, row)
        row.appearance = CipherServerAppearance.get(row.citizenid)
        row.metadata = nil
        characters[#characters + 1] = row
    end
    TriggerClientEvent('cipher-multichar:client:list', src, { characters = characters, slots = allowedSlots(src) })
end)

RegisterNetEvent('cipher-multichar:server:load', function(citizenid)
    local src = source
    if not ready(src, 'load', Config.Server.Security.requestCooldownMs) then return end
    if CipherBridge.getPlayer(src) then return end
    if not ownsCharacter(src, citizenid) then
        print(('[%s] %s tried to load a character they do not own.'):format(RESOURCE, src))
        return
    end
    if CipherBridge.login(src, citizenid) then
        local player = CipherBridge.getPlayer(src)
        if not player then return end
        local data = player.PlayerData
        awaitingSpawn[src] = true
        CipherStorage.markSelected(citizenid)
        activeSessions[src] = { citizenid = citizenid, startedAt = os.time() }
        TriggerEvent('cipher-multichar:server:characterSelected', src, data)
        TriggerClientEvent('cipher-multichar:client:loggedIn', src, citizenid, data.position, false, data, allowedSpawnIds(src, data))
    end
end)

RegisterNetEvent('cipher-multichar:server:create', function(data)
    local src = source
    if not ready(src, 'create', Config.Server.Security.createCooldownMs) or type(data) ~= 'table' then return end
    if CipherBridge.getPlayer(src) then return end
    local cid = math.floor(tonumber(data.cid) or 0)
    if cid < 1 or cid > allowedSlots(src) then return end
    local license, secondary = accountIdentifiers(src)
    local used = MySQL.scalar.await('SELECT 1 FROM players WHERE (license = ? OR license = ?) AND cid = ? LIMIT 1', { license, secondary, cid })
    if used then return CipherBridge.notify(src, CipherLocale('slotUsed'), 'error') end
    local function clean(value)
        value = tostring(value or ''):gsub("[^%a%s%-']", ''):gsub('^%s+', ''):gsub('%s+$', '')
        return value:sub(1, Config.Characters.nameMaxLength)
    end
    local first, last = clean(data.firstname), clean(data.lastname)
    if #first < Config.Characters.nameMinLength or #last < Config.Characters.nameMinLength then
        return CipherBridge.notify(src, CipherLocale('nameTooShort'), 'error')
    end
    local newData = { cid = cid, charinfo = {
        firstname = first, lastname = last, birthdate = tostring(data.birthdate or ''),
        gender = tonumber(data.gender) == 1 and 1 or 0,
        nationality = tostring(data.nationality or Config.Characters.defaultNationality):sub(1, 24)
    }}
    if CipherBridge.login(src, nil, newData) then
        local player = CipherBridge.getPlayer(src)
        if not player then return end
        local playerData = player.PlayerData
        CipherStorage.ensureActivity(playerData.citizenid)
        CipherStorage.markSelected(playerData.citizenid)
        activeSessions[src] = { citizenid = playerData.citizenid, startedAt = os.time() }
        if not Config.FirstCharacter.apartments.enabled then spawnConfirmation[src] = 'default' end
        TriggerEvent('cipher-multichar:server:characterCreated', src, playerData)
        TriggerClientEvent('cipher-multichar:client:loggedIn', src, playerData.citizenid, nil, true, playerData, {})
    end
end)

RegisterNetEvent('cipher-multichar:server:delete', function(citizenid)
    local src = source
    if not ready(src, 'delete', Config.Server.Security.deleteCooldownMs) then return end
    if CipherBridge.getPlayer(src) then return end
    if not Config.Characters.allowDelete or not ownsCharacter(src, citizenid) then return end
    TriggerEvent('cipher-multichar:server:characterDeleting', src, citizenid)
    CipherBridge.delete(src, citizenid)
    CipherStorage.deleteActivity(citizenid)
    TriggerEvent('cipher-multichar:server:characterDeleted', src, citizenid)
    TriggerClientEvent('cipher-multichar:client:refresh', src)
end)

RegisterNetEvent('cipher-multichar:server:selectSpawn', function(spawnId)
    local src = source
    if type(spawnId) ~= 'string' then return end
    if not awaitingSpawn[src] then return end
    local player = CipherBridge.getPlayer(src)
    if not player then return end
    local data, coords, location = player.PlayerData
    if spawnId == 'last' and Config.Spawn.allowLastLocation and data.position then
        coords = data.position
        location = { id = 'last', label = CipherLocale('lastLocation') }
    else
        for _, configured in ipairs(Config.Spawn.locations) do
            if configured.id == spawnId then location = configured break end
        end
        if location and passesSpawnPermission(src, data, location) then coords = location.coords end
    end
    if not coords then return CipherBridge.notify(src, CipherLocale('invalidSpawn'), 'error') end
    awaitingSpawn[src] = nil
    spawnConfirmation[src] = spawnId
    TriggerClientEvent('cipher-multichar:client:spawnApproved', src, spawnId, coords)
end)

RegisterNetEvent('cipher-multichar:server:spawned', function(spawnId)
    local src = source
    if spawnConfirmation[src] ~= spawnId then return end
    spawnConfirmation[src] = nil
    local player = CipherBridge.getPlayer(src)
    if player then TriggerEvent('cipher-multichar:server:characterSpawned', src, player.PlayerData, spawnId) end
end)

if Config.Server.Admin.enabled then
RegisterCommand(Config.Server.Admin.command, function(source, args)
    if not isAdmin(source) then
        if source > 0 then CipherBridge.notify(source, CipherLocale('adminDenied'), 'error') end
        return
    end
    if source > 0 and not args[1] then
        TriggerClientEvent('cipher-multichar:client:adminOpen', source)
        return
    end
    local target = tonumber(args[1])
    local targetLicense = target and identifier(target)
    if not targetLicense or not args[2] then
        print(('[%s] Usage: /%s [server id] [1-%s|reset]'):format(RESOURCE, Config.Server.Admin.command, Config.Server.Slots.maximum))
        return
    end
    local reset = tostring(args[2] or ''):lower() == 'reset'
    local amount = tonumber(args[2])
    local updated = false
    if reset then updated = updateSlots(source, targetLicense, nil)
    elseif amount then updated = updateSlots(source, targetLicense, amount) end
    if updated then
        local message = reset and CipherLocale('adminResetDone') or CipherLocale('adminUpdated')
        if source > 0 then CipherBridge.notify(source, message, 'success') else print(('[%s] %s'):format(RESOURCE, message)) end
    elseif source > 0 then
        CipherBridge.notify(source, CipherLocale('adminInvalidSlots', { maximum = Config.Server.Slots.maximum }), 'error')
    end
end, false)
end

RegisterNetEvent('cipher-multichar:server:adminList', function()
    local src = source
    if not isAdmin(src) or not ready(src, 'adminList', Config.Server.Security.requestCooldownMs) then return end
    TriggerClientEvent('cipher-multichar:client:adminData', src, { players = adminPlayers(), maximum = Config.Server.Slots.maximum })
end)

RegisterNetEvent('cipher-multichar:server:adminSetSlots', function(license, amount, reset)
    local src = source
    if not isAdmin(src) or not ready(src, 'adminSet', Config.Server.Security.requestCooldownMs) then return end
    local value = tonumber(amount)
    local updated = false
    if reset == true then updated = updateSlots(src, license, nil)
    elseif value then updated = updateSlots(src, license, value) end
    if updated then
        CipherBridge.notify(src, reset and CipherLocale('adminResetDone') or CipherLocale('adminUpdated'), 'success')
    else
        CipherBridge.notify(src, CipherLocale('adminInvalidSlots', { maximum = Config.Server.Slots.maximum }), 'error')
    end
    TriggerClientEvent('cipher-multichar:client:adminData', src, { players = adminPlayers(), maximum = Config.Server.Slots.maximum })
end)
