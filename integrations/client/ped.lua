XSPed = {}

local watching, watchToken = false, 0
local ignored = {}
local disabled = { enabled = false, ignoredModels = {} }

local function settings()
    return Config.Client.PedPersistence or disabled
end

function XSPed.normalize(hash)
    hash = tonumber(hash)
    if not hash then return nil end
    hash = math.floor(hash) % 0x100000000
    if hash >= 0x80000000 then hash = hash - 0x100000000 end
    return hash
end

local function buildIgnored()
    ignored = {}
    for _, model in ipairs(settings().ignoredModels or {}) do
        if type(model) == 'string' then model = joaat(model) end
        local normalized = XSPed.normalize(model)
        if normalized then ignored[normalized] = true end
    end
end

function XSPed.isIgnored(model)
    local normalized = XSPed.normalize(model)
    return normalized == nil or normalized == 0 or ignored[normalized] == true
end

function XSPed.matches(ped, model)
    local wanted = XSPed.normalize(model)
    return wanted ~= nil and XSPed.normalize(GetEntityModel(ped)) == wanted
end

function XSPed.variation(ped)
    local data = { components = {}, props = {} }
    if not settings().saveOutfit then return data end
    for component = 0, 11 do
        data.components[#data.components + 1] = {
            id = component,
            drawable = GetPedDrawableVariation(ped, component),
            texture = GetPedTextureVariation(ped, component),
            palette = GetPedPaletteVariation(ped, component)
        }
    end
    for prop = 0, 7 do
        local drawable = GetPedPropIndex(ped, prop)
        if drawable >= 0 then
            data.props[#data.props + 1] = { id = prop, drawable = drawable, texture = GetPedPropTextureIndex(ped, prop) }
        end
    end
    return data
end

function XSPed.applyVariation(ped, data)
    if not ped or not DoesEntityExist(ped) or type(data) ~= 'table' then return false end
    for _, component in ipairs(data.components or {}) do
        SetPedComponentVariation(ped, component.id or 0, component.drawable or 0, component.texture or 0, component.palette or 0)
    end
    ClearAllPedProps(ped)
    for _, prop in ipairs(data.props or {}) do
        SetPedPropIndex(ped, prop.id or 0, prop.drawable or -1, prop.texture or 0, true)
    end
    return true
end

local function signature(model, data)
    if not model or XSPed.isIgnored(model) then return 'none' end
    local parts = { tostring(model) }
    for _, component in ipairs(data and data.components or {}) do
        parts[#parts + 1] = ('%s.%s.%s.%s'):format(component.id, component.drawable, component.texture, component.palette)
    end
    for _, prop in ipairs(data and data.props or {}) do
        parts[#parts + 1] = ('p%s.%s.%s'):format(prop.id, prop.drawable, prop.texture)
    end
    return table.concat(parts, '|')
end

local function loadModel(model)
    if not IsModelInCdimage(model) or not IsModelValid(model) then return false end
    RequestModel(model)
    local deadline = GetGameTimer() + 10000
    while not HasModelLoaded(model) and GetGameTimer() < deadline do Wait(0) end
    return HasModelLoaded(model)
end

local function wear(model, variation)
    if not loadModel(model) then return false end
    local previous = PlayerPedId()
    local health, armour = GetEntityHealth(previous), GetPedArmour(previous)
    local coords, heading = GetEntityCoords(previous), GetEntityHeading(previous)
    SetPlayerModel(PlayerId(), model)
    SetModelAsNoLongerNeeded(model)
    local ped = PlayerPedId()
    SetEntityCoordsNoOffset(ped, coords.x, coords.y, coords.z, false, false, false)
    SetEntityHeading(ped, heading)
    SetPedDefaultComponentVariation(ped)
    XSPed.applyVariation(ped, variation)
    if health > GetPedMaxHealth(ped) then SetPedMaxHealth(ped, health) end
    SetEntityHealth(ped, health)
    SetPedArmour(ped, armour)
    ClearPedBloodDamage(ped)
    return true
end

function XSPed.stop()
    watching = false
    watchToken = watchToken + 1
end

-- There is no ped picker. This only remembers the model a character is already
-- wearing, so an admin or another resource setting one sticks across a relog.
function XSPed.begin(saved)
    XSPed.stop()
    if not settings().enabled then return end
    watching = true
    local token = watchToken
    local stored = saved and saved.ped
    local model = stored and XSPed.normalize(saved.model) or nil
    CreateThread(function()
        local expected = 'none'
        if model and not XSPed.isIgnored(model) then
            Wait(settings().restoreDelayMs)
            if watching and token == watchToken and wear(model, stored) then
                expected = signature(model, stored)
                -- The clothing resource can load the saved skin late and put the
                -- character back on a freemode body, so hold the model briefly.
                local deadline = GetGameTimer() + (settings().holdSeconds * 1000)
                while watching and token == watchToken and GetGameTimer() < deadline do
                    Wait(500)
                    if not XSPed.matches(PlayerPedId(), model) then wear(model, stored) end
                end
            end
        end
        Wait(settings().graceMs)
        local last, pending, stable = expected, nil, 0
        while watching and token == watchToken do
            local ped = PlayerPedId()
            if DoesEntityExist(ped) and not IsPlayerSwitchInProgress() then
                local current = XSPed.normalize(GetEntityModel(ped))
                local wearingPed = not XSPed.isIgnored(current)
                local variation
                if wearingPed then variation = XSPed.variation(ped) end
                local found = wearingPed and signature(current, variation) or 'none'
                if found ~= last then
                    if found ~= pending then pending, stable = found, 0 end
                    stable = stable + 1
                    if stable >= settings().confirmChecks then
                        last, pending, stable = found, nil, 0
                        if wearingPed then
                            TriggerServerEvent('XS-MultiCharacter:server:ped', { model = current, variation = variation })
                        else
                            TriggerServerEvent('XS-MultiCharacter:server:ped', { clear = true })
                        end
                    end
                else
                    pending, stable = nil, 0
                end
            end
            Wait(settings().checkIntervalMs)
        end
    end)
end

RegisterNetEvent('QBCore:Client:OnPlayerUnload', function()
    XSPed.stop()
end)

buildIgnored()
