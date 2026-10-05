XSPhotos = {}

local shots = {}
local clones = {}
local runToken = 0
local transparentFailed = false

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

function XSPhotos.capture(key, ped, isCurrent)
    if not settings().enabled or not key or not ped or not DoesEntityExist(ped) then return false end
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

local function cloneFor(character, index, token)
    local gender = character.charinfo and character.charinfo.gender or 0
    local model = XSAppearance.model(character.appearance, gender)
    if not loadModel(model) or token ~= runToken then return nil end
    local x, y, z = hiddenSpot(index)
    local ped = CreatePed(2, model, x, y, z, 0.0, false, true)
    SetModelAsNoLongerNeeded(model)
    if not ped or ped == 0 then return nil end
    clones[#clones + 1] = ped
    SetEntityCollision(ped, false, false)
    FreezeEntityPosition(ped, true)
    SetEntityInvincible(ped, true)
    SetBlockingOfNonTemporaryEvents(ped, true)
    SetPedDefaultComponentVariation(ped)
    if character.appearance then XSAppearance.apply(ped, character.appearance) end
    Wait(600)
    return ped
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
                SendNUIMessage({ action = 'photo', key = key, url = shots[key].url })
            elseif key then
                local ped = cloneFor(character, index, token)
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
