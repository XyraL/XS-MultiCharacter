XSArrival = {}

local function settings()
    return Config.Client.Arrival or { enabled = false }
end

local function waitFor(ms, skipped)
    local untilTime = GetGameTimer() + ms
    while GetGameTimer() < untilTime and not skipped() do Wait(0) end
end

local function camera(position, lookAt, fov)
    local cam = CreateCamWithParams('DEFAULT_SCRIPTED_CAMERA', position.x, position.y, position.z, 0.0, 0.0, 0.0, fov or 50.0, false, 0)
    PointCamAtCoord(cam, lookAt.x, lookAt.y, lookAt.z)
    return cam
end

function XSArrival.play(playerData)
    local config = settings()
    local shots = config.shots or {}
    if not config.enabled or #shots == 0 then return end

    local skip, finished = false, false
    local skipped = function() return skip end
    local control = tonumber(config.skipControl) or 22

    CreateThread(function()
        while not finished do
            DisableAllControlActions(0)
            HideHudAndRadarThisFrame()
            if IsDisabledControlJustPressed(0, control) then skip = true end
            Wait(0)
        end
    end)

    DisplayRadar(false)
    XSWeather.enterScene(config.weather or false, config.time or false)
    local charinfo = playerData and playerData.charinfo or {}
    SendNUIMessage({ action = 'arrival', firstname = charinfo.firstname or '', place = config.place or '' })

    for index, shot in ipairs(shots) do
        if skip then break end
        SetFocusPosAndVel(shot.from.x, shot.from.y, shot.from.z, 0.0, 0.0, 0.0)
        local startCam = camera(shot.from, shot.lookAt, shot.fov)
        local endCam = camera(shot.to or shot.from, shot.lookAt, shot.fov)
        SetCamActive(startCam, true)
        RenderScriptCams(true, false, 0, true, true)
        waitFor(index == 1 and 1500 or 600, skipped)
        if skip then
            DestroyCam(startCam, false)
            DestroyCam(endCam, false)
            break
        end
        local duration = math.max(500, math.floor(tonumber(shot.durationMs) or 5000))
        SetCamActiveWithInterp(endCam, startCam, duration, 1, 1)
        DoScreenFadeIn(index == 1 and 900 or 400)
        waitFor(duration - 450, skipped)
        DoScreenFadeOut(skip and 250 or 450)
        while not IsScreenFadedOut() do Wait(0) end
        if DoesCamExist(startCam) then DestroyCam(startCam, false) end
        if DoesCamExist(endCam) then DestroyCam(endCam, false) end
    end

    if not IsScreenFadedOut() then
        DoScreenFadeOut(250)
        while not IsScreenFadedOut() do Wait(0) end
    end
    RenderScriptCams(false, false, 0, true, true)
    ClearFocus()
    XSWeather.leaveScene()
    SendNUIMessage({ action = 'arrivalDone' })
    finished = true
    DisplayRadar(true)
end
