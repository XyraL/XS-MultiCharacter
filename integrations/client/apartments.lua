CipherApartments = {}

local function running(resource)
    return GetResourceState(resource):find('start') ~= nil
end

function CipherApartments.open(character)
    local mode = Config.FirstCharacter.apartments.mode
    if mode == 'auto' then mode = Config.Client.Integrations.apartments end
    if mode == 'auto' then
        if running('qbx_apartments') then mode = 'qbx'
        elseif running('qb-apartments') then mode = 'qb'
        else mode = 'none' end
    end
    if mode == 'qbx' or mode == 'qb' then
        TriggerEvent('apartments:client:setupSpawnUI', character)
        return true
    elseif mode == 'event' and Config.FirstCharacter.apartments.event ~= '' then
        TriggerEvent(Config.FirstCharacter.apartments.event, character)
        return true
    end
    return false
end
