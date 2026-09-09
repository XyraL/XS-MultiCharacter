XSSceneEffects = {}

local orbitToken = 0
local effectsActive = false

function XSSceneEffects.enter()
    effectsActive = true
    local config = Config.Client.SceneEffects
    if config.timecycle then
        SetTimecycleModifier(config.timecycle)
        SetTimecycleModifierStrength(config.timecycleStrength or 0.35)
    end
    CreateThread(function()
        while effectsActive do
            if config.depthOfField.enabled then SetUseHiDof() end
            Wait(0)
        end
    end)
end

function XSSceneEffects.applyCamera(camera)
    local depth = Config.Client.SceneEffects.depthOfField
    if not depth.enabled then return end
    SetCamUseShallowDofMode(camera, true)
    SetCamNearDof(camera, depth.near)
    SetCamFarDof(camera, depth.far)
    SetCamDofStrength(camera, depth.strength)
end

function XSSceneEffects.stopOrbit()
    orbitToken = orbitToken + 1
end

function XSSceneEffects.startOrbit(camera, origin, lookAt)
    XSSceneEffects.stopOrbit()
    local orbit = Config.Client.SceneEffects.orbit
    if not orbit.enabled then return end
    local token = orbitToken
    local offsetX, offsetY = origin.x - lookAt.x, origin.y - lookAt.y
    local started = GetGameTimer()
    CreateThread(function()
        while effectsActive and token == orbitToken and DoesCamExist(camera) do
            local elapsed = (GetGameTimer() - started) / 1000.0
            local angle = math.rad(math.sin(elapsed * orbit.degreesPerSecond) * orbit.maxDegrees)
            local cosAngle, sinAngle = math.cos(angle), math.sin(angle)
            SetCamCoord(camera,
                lookAt.x + (offsetX * cosAngle - offsetY * sinAngle),
                lookAt.y + (offsetX * sinAngle + offsetY * cosAngle),
                origin.z
            )
            PointCamAtCoord(camera, lookAt.x, lookAt.y, lookAt.z)
            Wait(0)
        end
    end)
end

function XSSceneEffects.leave()
    effectsActive = false
    XSSceneEffects.stopOrbit()
    ClearTimecycleModifier()
end
