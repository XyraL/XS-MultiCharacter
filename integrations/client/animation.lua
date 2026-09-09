XSAnimation = {}

function XSAnimation.play(ped, jobName)
    if not Config.Client.Animation.enabled or not ped then return end
    local presetName = Config.Client.Animation.byJob[jobName] or Config.Client.Animation.default
    local preset = Config.Client.Animation.presets[presetName]
    if not preset then return end
    ClearPedTasksImmediately(ped)
    if preset.scenario then
        TaskStartScenarioInPlace(ped, preset.scenario, 0, true)
    elseif preset.dict and preset.name then
        RequestAnimDict(preset.dict)
        while not HasAnimDictLoaded(preset.dict) do Wait(0) end
        TaskPlayAnim(ped, preset.dict, preset.name, 4.0, -4.0, -1, preset.flag or 1, 0.0, false, false, false)
    end
end
