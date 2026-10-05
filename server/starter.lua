XSStarter = {}

local function kit()
    return Config.Server.StarterKit or {}
end

local function oxStarted()
    return GetResourceState('ox_inventory') == 'started'
end

local function itemData(name)
    if oxStarted() then
        local ok, data = pcall(function() return exports.ox_inventory:Items(name) end)
        return ok and data or nil
    end
    local items = XSBridge.core and XSBridge.core.Shared and XSBridge.core.Shared.Items
    return items and items[name] or nil
end

local function resolveName(entry)
    local names = type(entry.name) == 'table' and entry.name or { entry.name }
    for _, name in ipairs(names) do
        if type(name) == 'string' and name ~= '' and itemData(name) then return name end
    end
    return nil
end

local function cardInfo(playerData)
    local info = playerData.charinfo or {}
    return {
        citizenid = playerData.citizenid,
        firstname = info.firstname,
        lastname = info.lastname,
        birthdate = info.birthdate,
        gender = info.gender,
        nationality = info.nationality,
    }
end

local function licenceInfo(playerData)
    local info = playerData.charinfo or {}
    return {
        firstname = info.firstname,
        lastname = info.lastname,
        birthdate = info.birthdate,
        type = 'Class C Driver License',
    }
end

local function qbxCard(source, kind)
    if GetResourceState('qbx_idcard') ~= 'started' then return nil end
    local ok, data = pcall(function() return exports.qbx_idcard:GetMetaLicense(source, { kind }) end)
    return ok and data or nil
end

local function metadataFor(source, entry, playerData)
    local metadata = entry.metadata
    if metadata == 'idcard' then return qbxCard(source, 'id_card') or cardInfo(playerData) end
    if metadata == 'license' then return qbxCard(source, 'driver_license') or licenceInfo(playerData) end
    if type(metadata) == 'function' then
        local ok, data = pcall(metadata, playerData, source)
        return ok and data or nil
    end
    if type(metadata) == 'table' then return metadata end
    return nil
end

local function giveItem(source, player, name, amount, metadata)
    if oxStarted() then
        local ok, added = pcall(function() return exports.ox_inventory:AddItem(source, name, amount, metadata) end)
        return ok and added and true or false
    end
    local ok, added = pcall(function() return player.Functions.AddItem(name, amount, false, metadata) end)
    return ok and added and true or false
end

local function waitForInventory(source)
    if not oxStarted() then return true end
    local waited = 0
    while waited < 10000 do
        local ok, inventory = pcall(function() return exports.ox_inventory:GetInventory(source) end)
        if ok and inventory then return true end
        Wait(200)
        waited = waited + 200
    end
    return false
end

local function cash(amount)
    local digits = tostring(math.floor(amount))
    local grouped = digits:reverse():gsub('(%d%d%d)', '%1,'):reverse():gsub('^,', '')
    return (kit().currency or '$') .. grouped
end

local function label(name)
    local data = itemData(name)
    return data and data.label or name
end

function XSStarter.summary()
    local config = kit()
    if not config.enabled then return nil end

    local out = { cash = 0, bank = 0, items = {} }
    out.cash = math.max(0, math.floor(tonumber((config.money or {}).cash) or 0))
    out.bank = math.max(0, math.floor(tonumber((config.money or {}).bank) or 0))

    for _, entry in ipairs(config.items or {}) do
        local name = resolveName(entry)
        if name then
            out.items[#out.items + 1] = { name = name, label = label(name), amount = math.max(1, math.floor(tonumber(entry.amount) or 1)) }
        end
    end

    if out.cash == 0 and out.bank == 0 and #out.items == 0 then return nil end
    return out
end

function XSStarter.give(source, playerData)
    local config = kit()
    if not config.enabled then return end

    CreateThread(function()
        local player = XSBridge.getPlayer(source)
        if not player then return end

        local given = {}
        local cashAmount = math.max(0, math.floor(tonumber((config.money or {}).cash) or 0))
        local bank = math.max(0, math.floor(tonumber((config.money or {}).bank) or 0))

        if cashAmount > 0 and pcall(function() player.Functions.AddMoney('cash', cashAmount, 'starter-kit') end) then
            given[#given + 1] = cash(cashAmount)
        end
        if bank > 0 and pcall(function() player.Functions.AddMoney('bank', bank, 'starter-kit') end) then
            given[#given + 1] = XSLocale('starterBank', { amount = cash(bank) })
        end

        if #(config.items or {}) > 0 and not waitForInventory(source) then
            print(('^3[XS-MultiCharacter]^0 %s'):format(XSLocale('starterNoInventory')))
            return
        end

        for _, entry in ipairs(config.items or {}) do
            local name = resolveName(entry)
            local amount = math.max(1, math.floor(tonumber(entry.amount) or 1))
            if not name then
                local wanted = type(entry.name) == 'table' and table.concat(entry.name, ' / ') or tostring(entry.name)
                print(('^3[XS-MultiCharacter]^0 %s'):format(XSLocale('starterUnknownItem', { item = wanted })))
            elseif giveItem(source, player, name, amount, metadataFor(source, entry, playerData)) then
                given[#given + 1] = amount > 1 and ('%dx %s'):format(amount, label(name)) or label(name)
            end
        end

        if config.notify ~= false and #given > 0 then
            XSBridge.notify(source, XSLocale('starterKit', { list = table.concat(given, ', ') }), 'success')
        end

        TriggerEvent('XS-MultiCharacter:server:starterKitGiven', source, playerData.citizenid, given)
    end)
end
