XSHousing = {}

function XSHousing.clearInside()
    local mode = Config.Client.Integrations.housing
    if mode == 'auto' then
        if GetResourceState('qbx_properties'):find('start') then mode = 'qbx_properties'
        elseif GetResourceState('qb-houses'):find('start') then mode = 'qb-houses'
        else mode = 'none' end
    end
    if mode == 'qb-houses' or mode == 'auto' then TriggerServerEvent('qb-houses:server:SetInsideMeta', 0, false) end
    TriggerServerEvent('qb-apartments:server:SetInsideMeta', 0, 0, false)
    if mode == 'event' and Config.Client.HousingEvent then TriggerEvent(Config.Client.HousingEvent) end
end
