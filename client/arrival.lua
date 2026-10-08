XSArrival = {}

local LIFT_STEP, LIFT_TRIES = 5.0, 10

local function settings()
    return Config.Client.Arrival or { enabled = false }
end

local function waitFor(ms, skipped)
    local untilTime = GetGameTimer() + ms
    while GetGameTimer() < untilTime and not skipped() do Wait(0) end
end

local function point(p)
    return vector3(p.x + 0.0, p.y + 0.0, p.z + 0.0)
end

local function camera(position, lookAt, fov)
    local cam = CreateCamWithParams('DEFAULT_SCRIPTED_CAMERA', position.x, position.y, position.z, 0.0, 0.0, 0.0, fov or 50.0, false, 0)
    PointCamAtCoord(cam, lookAt.x, lookAt.y, lookAt.z)
    return cam
end

local function blocked(a, b)
    local ray = StartExpensiveSynchronousShapeTestLosProbe(a.x, a.y, a.z, b.x, b.y, b.z, 17, 0, 7)
    local _, hit = GetShapeTestResult(ray)
    return hit == true or hit == 1
end

local function pathClear(from, to, lookAt)
    local steps = 12
    local last = from
    for i = 0, steps do
        local p = from + (to - from) * (i / steps)
        if i > 0 and blocked(last, p) then return false end
        if blocked(p, p + (lookAt - p) * 0.85) then return false end
        if blocked(p, p - vector3(0.0, 0.0, 1.5)) then return false end
        last = p
    end
    return true
end

local function loadArea(at, skipped)
    SetFocusPosAndVel(at.x, at.y, at.z, 0.0, 0.0, 0.0)
    NewLoadSceneStartSphere(at.x, at.y, at.z, 180.0, 0)
    local untilTime = GetGameTimer() + 4000
    while not IsNewLoadSceneLoaded() and GetGameTimer() < untilTime and not skipped() do
        RequestCollisionAtCoord(at.x, at.y, at.z)
        Wait(0)
    end
    NewLoadSceneStop()
end

local function safePath(shot)
    local from, lookAt = point(shot.from), point(shot.lookAt)
    local to = shot.to and point(shot.to) or from
    for attempt = 0, LIFT_TRIES do
        local lift = vector3(0.0, 0.0, attempt * LIFT_STEP)
        if pathClear(from + lift, to + lift, lookAt) then
            if attempt > 0 and Config.Debug then
                print(('[XS-MultiCharacter] arrival shot raised %.0f m to clear the map'):format(attempt * LIFT_STEP))
            end
            return from + lift, to + lift
        end
    end
    local high = from + vector3(0.0, 0.0, (LIFT_TRIES + 2) * LIFT_STEP)
    return high, high
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
        loadArea(point(shot.from), skipped)
        if skip then break end
        local from, to = safePath(shot)
        local lookAt = point(shot.lookAt)
        local startCam = camera(from, lookAt, shot.fov)
        local endCam = camera(to, lookAt, shot.fov)
        SetCamActive(startCam, true)
        RenderScriptCams(true, false, 0, true, true)
        waitFor(index == 1 and 600 or 300, skipped)
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
