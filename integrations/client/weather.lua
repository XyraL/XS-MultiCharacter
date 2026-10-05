XSWeather = {}

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

local clockOverridden = false

function XSWeather.enterScene(weather, time)
    if weather == nil then weather = Config.Client.Scene.weather end
    if time == nil then time = Config.Client.Scene.time end
    activeMode = mode()
    if activeMode == 'qb-weathersync' then TriggerEvent('qb-weathersync:client:DisableSync')
    elseif activeMode == 'qbx' then TriggerEvent('qbx_weathersync:client:disableSync')
    elseif activeMode == 'cd_easytime' then TriggerEvent('cd_easytime:PauseSync', true) end
    if activeMode ~= 'none' then
        if weather then SetWeatherTypeNowPersist(weather) end
        if time then
            NetworkOverrideClockTime(time.hour or 12, time.minute or 0, 0)
            clockOverridden = true
        end
    end
end

function XSWeather.leaveScene()
    if activeMode == 'qb-weathersync' then TriggerEvent('qb-weathersync:client:EnableSync')
    elseif activeMode == 'qbx' then TriggerEvent('qbx_weathersync:client:enableSync')
    elseif activeMode == 'cd_easytime' then TriggerEvent('cd_easytime:PauseSync', false) end
    ClearOverrideWeather()
    ClearWeatherTypePersist()
    if clockOverridden then
        NetworkClearClockTimeOverride()
        clockOverridden = false
    end
    activeMode = nil
end
