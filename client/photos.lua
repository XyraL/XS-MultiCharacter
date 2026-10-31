XSPhotos = {}

local shots = {}
local clones = {}
local runToken = 0
local transparentFailed = false
local cameraFailed = false
local developing = false

local function settings()
    return Config.Client.Photos or { enabled = false }
end

local function release(key)
    local shot = shots[key]
    if not shot then return end
    shots[key] = nil
    if shot.handle and IsPedheadshotValid(shot.handle) then UnregisterPedheadshot(shot.handle) end
end

local function headshot(ped, transparent, timeoutMs)
    local register = transparent and RegisterPedheadshotTransparent or RegisterPedheadshot
    if not register then return nil end
    local handle = register(ped)
    if not handle or handle == 0 then return nil end
    local deadline = GetGameTimer() + timeoutMs
    while not IsPedheadshotReady(handle) and GetGameTimer() < deadline do Wait(25) end
    if IsPedheadshotReady(handle) and IsPedheadshotValid(handle) then return handle end
    UnregisterPedheadshot(handle)
    return nil
end

function XSPhotos.url(key)
    return shots[key] and shots[key].url or nil
end

function XSPhotos.cameraReady()
    local options = settings()
    return options.enabled == true and options.camera ~= false and not cameraFailed
        and GetResourceState('screenshot-basic') == 'started'
end

function XSPhotos.capture(key, ped, isCurrent)
    if not settings().enabled or not key or not ped or not DoesEntityExist(ped) then return false end
    if shots[key] and shots[key].camera then return false end
    local handle
    if settings().transparent and not transparentFailed then
        handle = headshot(ped, true, 2500)
        if not handle then transparentFailed = true end
    end
    if not handle then handle = headshot(ped, false, 5000) end
    if not handle then return false end
    if isCurrent and not isCurrent() then
        UnregisterPedheadshot(handle)
        return false
    end
    if shots[key] and shots[key].camera then
        UnregisterPedheadshot(handle)
        return false
    end
    local txd = GetPedheadshotTxdString(handle)
    release(key)
    shots[key] = { handle = handle, url = ('https://nui-img/%s/%s?v=%s'):format(txd, txd, GetGameTimer()) }
    SendNUIMessage({ action = 'photo', key = key, url = shots[key].url })
    return true
end

local function hiddenSpot(index)
    local scene = Config.Client.Scene
    local camera, lookAt = scene.camera, scene.cameraLookAt
    local dx, dy = camera.x - lookAt.x, camera.y - lookAt.y
    local length = math.sqrt(dx * dx + dy * dy)
    if length < 0.01 then dx, dy, length = 1.0, 0.0, 1.0 end
    local back = 3.0 + index * 1.2
    return camera.x + dx / length * back, camera.y + dy / length * back, lookAt.z - 1.0
end

local function loadModel(model)
    if not IsModelInCdimage(model) then return false end
    RequestModel(model)
    local deadline = GetGameTimer() + 10000
    while not HasModelLoaded(model) and GetGameTimer() < deadline do Wait(0) end
    return HasModelLoaded(model)
end

local function cloneFor(character, token, x, y, z, heading)
    local gender = character.charinfo and character.charinfo.gender or 0
    local model = XSAppearance.model(character.appearance, gender)
    if not loadModel(model) or token ~= runToken then return nil end
    local ped = CreatePed(2, model, x + 0.0, y + 0.0, z + 0.0, (heading or 0.0) + 0.0, false, true)
    SetModelAsNoLongerNeeded(model)
    if not ped or ped == 0 then return nil end
    clones[#clones + 1] = ped
    SetEntityCollision(ped, false, false)
    FreezeEntityPosition(ped, true)
    SetEntityInvincible(ped, true)
    SetBlockingOfNonTemporaryEvents(ped, true)
    SetPedDefaultComponentVariation(ped)
    if character.appearance then XSAppearance.apply(ped, character.appearance) end
    return ped
end

local function removeClone(ped)
    if DoesEntityExist(ped) then DeleteEntity(ped) end
    for index = #clones, 1, -1 do
        if clones[index] == ped then table.remove(clones, index) end
    end
end

local function screenshot()
    local result = promise.new()
    local done = false
    local function finish(data)
        if done then return end
        done = true
        result:resolve(data)
    end
    local ok = pcall(function()
        exports['screenshot-basic']:requestScreenshot({ encoding = 'jpg', quality = 0.95 }, finish)
    end)
    if not ok then return nil end
    SetTimeout(5000, function() finish(nil) end)
    local data = Citizen.Await(result)
    if type(data) ~= 'string' or data:sub(1, 11) ~= 'data:image/' then return nil end
    return data
end

local function frame(camera, ped)
    local options = settings()
    local distance = (tonumber(options.distance) or 1.0) + 0.0
    local head = GetPedBoneCoords(ped, 31086, 0.0, 0.0, 0.0)
    local forward = GetEntityForwardVector(ped)
    SetCamCoord(camera, head.x + forward.x * distance, head.y + forward.y * distance, head.z + 0.05)
    PointCamAtCoord(camera, head.x, head.y, head.z + 0.02)
    SetCamFov(camera, (tonumber(options.fov) or 32.0) + 0.0)
    SetCamUseShallowDofMode(camera, true)
    SetCamNearDof(camera, math.max(0.1, distance - 0.35))
    SetCamFarDof(camera, distance + 0.45)
    SetCamDofStrength(camera, 1.0)
end

local function waitFrames(count)
    for _ = 1, count do Wait(0) end
end

function XSPhotos.develop(characters, scenePed, sceneCamera)
    while developing do Wait(50) end
    if not XSPhotos.cameraReady() then return end
    local todo = {}
    for _, character in ipairs(characters or {}) do
        if character.citizenid and not (shots[character.citizenid] and shots[character.citizenid].camera) then
            todo[#todo + 1] = character
        end
    end
    if #todo == 0 then return end
    developing = true
    runToken = runToken + 1
    local token = runToken

    SendNUIMessage({ action = 'cover', show = true })
    local fadeDeadline = GetGameTimer() + 3000
    while not IsScreenFadedIn() and GetGameTimer() < fadeDeadline do Wait(0) end
    Wait(150)

    local spot = Config.Client.Scene.coords
    local booth = {}
    for _, character in ipairs(todo) do
        if token ~= runToken then break end
        local ped = cloneFor(character, token, spot.x, spot.y, spot.z - 1.0, spot.w)
        if ped then booth[#booth + 1] = { key = character.citizenid, ped = ped } end
    end
    Wait(800)

    local hidScene = scenePed and DoesEntityExist(scenePed) and IsEntityVisible(scenePed)
    if hidScene then SetEntityVisible(scenePed, false, false) end
    XSSceneEffects.clearLook()
    local framing = true
    CreateThread(function()
        while framing do
            HideHudAndRadarThisFrame()
            ThefeedHideThisFrame()
            SetUseHiDof()
            Wait(0)
        end
    end)

    local camera = CreateCam('DEFAULT_SCRIPTED_CAMERA', true)
    RenderScriptCams(true, false, 0, true, true)
    for _, entry in ipairs(booth) do
        if token ~= runToken then break end
        for _, other in ipairs(booth) do SetEntityVisible(other.ped, other == entry, false) end
        waitFrames(2)
        frame(camera, entry.ped)
        waitFrames(3)
        Wait(120)
        local image = screenshot()
        if not image then
            cameraFailed = true
            break
        end
        if token ~= runToken then break end
        release(entry.key)
        shots[entry.key] = { camera = true }
        SendNUIMessage({ action = 'develop', key = entry.key, image = image })
    end

    framing = false
    DestroyCam(camera, false)
    if sceneCamera and DoesCamExist(sceneCamera) then
        SetCamActive(sceneCamera, true)
        RenderScriptCams(true, false, 0, true, true)
    else
        RenderScriptCams(false, false, 0, true, true)
    end
    XSSceneEffects.restoreLook()
    if hidScene and DoesEntityExist(scenePed) then SetEntityVisible(scenePed, true, false) end
    for _, entry in ipairs(booth) do removeClone(entry.ped) end
    waitFrames(2)
    developing = false
end

function XSPhotos.takeAll(characters)
    if not settings().enabled then return end
    runToken = runToken + 1
    local token = runToken
    CreateThread(function()
        Wait(800)
        for index, character in ipairs(characters or {}) do
            if token ~= runToken then return end
            local key = character.citizenid
            if key and shots[key] then
                if shots[key].url then SendNUIMessage({ action = 'photo', key = key, url = shots[key].url }) end
            elseif key then
                local x, y, z = hiddenSpot(index)
                local ped = cloneFor(character, token, x, y, z, 0.0)
                if ped then Wait(600) end
                if ped and token == runToken then
                    XSPhotos.capture(key, ped, function() return token == runToken end)
                end
            end
        end
    end)
end

function XSPhotos.clear()
    runToken = runToken + 1
    for _, ped in ipairs(clones) do
        if DoesEntityExist(ped) then DeleteEntity(ped) end
    end
    clones = {}
    for key in pairs(shots) do release(key) end
end

AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() then XSPhotos.clear() end
end)
