CipherWeather = {}

local activeMode

local function running(resource)
    return GetResourceState(resource):find('start') ~= nil
end

local function mode()
    local selected = Config.Client.Integrations.weather
    if selected ~= 'auto' then return selected end
    if running('qb-weathersync') then return 'qb-weathersync' end
    if running('qbx_weathersync') then return 'qbx' end
    if running('cd_easytime') then return 'cd_easytime' end
    return 'native'
end

function CipherWeather.enterScene()
    activeMode = mode()
    if activeMode == 'qb-weathersync' then TriggerEvent('qb-weathersync:client:DisableSync')
    elseif activeMode == 'qbx' then TriggerEvent('qbx_weathersync:client:disableSync')
    elseif activeMode == 'cd_easytime' then TriggerEvent('cd_easytime:PauseSync', true) end
    if activeMode ~= 'none' then
        SetWeatherTypeNowPersist(Config.Client.Scene.weather)
        NetworkOverrideClockTime(Config.Client.Scene.time.hour, Config.Client.Scene.time.minute, 0)
    end
end

function CipherWeather.leaveScene()
    if activeMode == 'qb-weathersync' then TriggerEvent('qb-weathersync:client:EnableSync')
    elseif activeMode == 'qbx' then TriggerEvent('qbx_weathersync:client:enableSync')
    elseif activeMode == 'cd_easytime' then TriggerEvent('cd_easytime:PauseSync', false) end
    ClearOverrideWeather()
    ClearWeatherTypePersist()
    activeMode = nil
end
