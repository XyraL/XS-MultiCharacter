XSApartments = {}

local function running(resource)
    return GetResourceState(resource):find('start') ~= nil
end

local function qbxStartingApartment()
    local source = LoadResourceFile('qbx_core', 'config/client.lua')
    if not source then return true end
    local chunk = load(source, '@@qbx_core/config/client.lua', 't')
    if not chunk then return true end
    local ok, config = pcall(chunk)
    if not ok or type(config) ~= 'table' or type(config.characters) ~= 'table' then return true end
    return config.characters.startingApartment ~= false
end

function XSApartments.provider()
    local mode = Config.FirstCharacter.apartments.mode
    if mode == 'auto' then mode = Config.Client.Integrations.apartments end
    if mode ~= 'auto' then return mode end

    local named = Config.FirstCharacter.apartments.resource
    if type(named) == 'string' and named ~= '' and running(named) then return 'qb' end
    if running('qbx_properties') then return qbxStartingApartment() and 'qbx_properties' or 'none' end
    if running('qbx_apartments') then return 'qbx' end
    if running('qb-apartments') then return 'qb' end
    return 'none'
end

function XSApartments.open(character)
    local mode = XSApartments.provider()
    if mode == 'qbx' or mode == 'qb' or mode == 'qbx_properties' then
        TriggerEvent('apartments:client:setupSpawnUI', character)
        return true
    elseif mode == 'event' and Config.FirstCharacter.apartments.event ~= '' then
        TriggerEvent(Config.FirstCharacter.apartments.event, character)
        return true
    end
    return false
end
