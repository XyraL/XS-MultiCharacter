local previewPed, previewCam
local characters, spawnOptions = {}, {}
local activeCharacter, activeCharacterData
local waitingForClothing, selectorOpen = false, false
local previewToken = 0

if not XSValidation.print('client') then return end

local function debugPrint(message)
    if Config.Debug then print(('[XS-MultiCharacter] %s'):format(message)) end
end

local function fadeOut()
    DoScreenFadeOut(350)
    while not IsScreenFadedOut() do Wait(0) end
end

local function destroyPreviewPed()
    previewToken = previewToken + 1
    if previewPed and DoesEntityExist(previewPed) then DeleteEntity(previewPed) end
    previewPed = nil
end

local function destroyCamera(transition)
    if not previewCam then return end
    RenderScriptCams(false, transition == true, Config.Client.Scene.cameraTransitionMs, true, true)
    DestroyCam(previewCam, false)
    previewCam = nil
end

local function removeScene()
    selectorOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'close' })
    destroyCamera(true)
    destroyPreviewPed()
    NetworkEndTutorialSession()
    DisplayRadar(true)
    ClearFocus()
    XSWeather.leaveScene()
    XSSceneEffects.leave()
end

local function requestModel(model)
    RequestModel(model)
    local deadline = GetGameTimer() + 10000
    while not HasModelLoaded(model) and GetGameTimer() < deadline do Wait(0) end
    return HasModelLoaded(model)
end

local function showPed(character, fallbackGender)
    previewToken = previewToken + 1
    local token = previewToken
    destroyPreviewPed()
    previewToken = token
    local gender = character and character.charinfo and character.charinfo.gender or fallbackGender or 0
    local model = XSAppearance.model(character and character.appearance, gender)
    if not requestModel(model) or token ~= previewToken then return end
    local pos = Config.Client.Scene.coords
    previewPed = CreatePed(2, model, pos.x, pos.y, pos.z - 1.0, pos.w, false, true)
    SetEntityInvincible(previewPed, true)
    FreezeEntityPosition(previewPed, true)
    SetBlockingOfNonTemporaryEvents(previewPed, true)
    SetPedDefaultComponentVariation(previewPed)
    if character and character.appearance then XSAppearance.apply(previewPed, character.appearance) end
    local jobName = character and character.job and character.job.name
    XSAnimation.play(previewPed, jobName)
    SetModelAsNoLongerNeeded(model)
    TriggerEvent('XS-MultiCharacter:client:characterPreviewed', character, previewPed)
end

local function createCamera(coords, lookAt, interpolate)
    local newCamera = CreateCam('DEFAULT_SCRIPTED_CAMERA', true)
    SetCamCoord(newCamera, coords.x, coords.y, coords.z)
    PointCamAtCoord(newCamera, lookAt.x, lookAt.y, lookAt.z)
    SetCamFov(newCamera, Config.Client.CinematicSpawn.fov)
    XSSceneEffects.applyCamera(newCamera)
    SetCamActive(newCamera, true)
    if previewCam and interpolate then
        local previous = previewCam
        SetCamActiveWithInterp(newCamera, previous, Config.Client.CinematicSpawn.transitionMs, true, true)
        CreateThread(function()
            Wait(Config.Client.CinematicSpawn.transitionMs + 50)
            if DoesCamExist(previous) then DestroyCam(previous, false) end
        end)
    else
        RenderScriptCams(true, false, 0, true, true)
        if previewCam and DoesCamExist(previewCam) then DestroyCam(previewCam, false) end
    end
    previewCam = newCamera
end

local function setupScene()
    fadeOut()
    ShutdownLoadingScreen()
    ShutdownLoadingScreenNui()
    NetworkStartSoloTutorialSession()
    DisplayRadar(false)
    XSWeather.enterScene()
    XSSceneEffects.enter()
    local scene = Config.Client.Scene
    SetEntityCoords(PlayerPedId(), scene.coords.x, scene.coords.y, scene.coords.z - 5.0, false, false, false, false)
    FreezeEntityPosition(PlayerPedId(), true)
    SetEntityVisible(PlayerPedId(), false, false)
    showPed(nil, 0)
    createCamera(scene.camera, scene.cameraLookAt, false)
    XSSceneEffects.startOrbit(previewCam, scene.camera, scene.cameraLookAt)
    DoScreenFadeIn(500)
end

local function openCharacters()
    selectorOpen = true
    setupScene()
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'loading',
        config = { characters = Config.Characters, ui = Config.Client.UI, locale = XSLocaleTable() }
    })
    TriggerServerEvent('XS-MultiCharacter:server:list')
end

local function spawnAt(coords, spawnId)
    coords = coords or Config.Spawn.default
    fadeOut()
    removeScene()
    local ped = PlayerPedId()
    SetEntityVisible(ped, true, false)
    FreezeEntityPosition(ped, false)
    RequestCollisionAtCoord(coords.x, coords.y, coords.z)
    SetEntityCoordsNoOffset(ped, coords.x, coords.y, coords.z, false, false, false)
    SetEntityHeading(ped, coords.w or coords.heading or 0.0)
    local deadline = GetGameTimer() + 10000
    while not HasCollisionLoadedAroundEntity(ped) and GetGameTimer() < deadline do Wait(0) end
    XSBridge.clearInside()
    XSBridge.playerLoaded()
    DoScreenFadeIn(700)
    TriggerEvent('XS-MultiCharacter:client:characterSpawned', activeCharacter, spawnId, coords)
    TriggerServerEvent('XS-MultiCharacter:server:spawned', spawnId)
end

local function cameraFor(location)
    if location.camera and location.lookAt then return location.camera, location.lookAt end
    local coords = location.coords
    local height, distance = Config.Client.CinematicSpawn.defaultCameraHeight, Config.Client.CinematicSpawn.defaultCameraDistance
    return vec3(coords.x + distance, coords.y + distance, coords.z + height), vec3(coords.x, coords.y, coords.z)
end

local function openSpawns(position, allowedIds)
    XSSceneEffects.stopOrbit()
    local allowed, options = {}, {}
    for _, id in ipairs(allowedIds or {}) do allowed[id] = true end
    if allowed.last and Config.Spawn.allowLastLocation and position and position.x then
        options[#options + 1] = {
            id = 'last', label = XSLocale('lastLocation'), description = XSLocale('lastLocationDescription'),
            district = GetLabelText(GetNameOfZone(position.x, position.y, position.z)), coords = position,
            category = Config.Spawn.lastLocationCategory
        }
    end
    for _, location in ipairs(Config.Spawn.locations) do
        if allowed[location.id] then
            location.category = location.category or Config.Spawn.defaultCategory
            options[#options + 1] = location
        end
    end
    spawnOptions = options
    SetNuiFocus(true, true)
    SendNUIMessage({ action = 'spawns', locations = options, categories = Config.Spawn.categories })
end

local function openApartmentsAfterClothing()
    if not waitingForClothing then return end
    waitingForClothing = false
    CreateThread(function()
        local deadline = GetGameTimer() + 3000
        while IsNuiFocused() and GetGameTimer() < deadline do Wait(100) end
        if Config.FirstCharacter.apartments.enabled
            and Config.FirstCharacter.apartments.opensClothingAfterSelection == false then
            XSBridge.openApartments(activeCharacterData or activeCharacter)
        end
    end)
end

for i = 1, #Config.FirstCharacter.clothing.finishedEvents do
    RegisterNetEvent(Config.FirstCharacter.clothing.finishedEvents[i], openApartmentsAfterClothing)
end

exports('GetSelectedCharacter', function() return activeCharacter, activeCharacterData end)
exports('IsSelectingCharacter', function() return selectorOpen end)

RegisterNetEvent('XS-MultiCharacter:client:list', function(payload)
    characters = payload.characters or {}
    for _, character in ipairs(characters) do
        if character.position and character.position.x and character.dossier and character.dossier.activity then
            character.dossier.activity.lastDistrict = GetLabelText(GetNameOfZone(character.position.x, character.position.y, character.position.z))
        end
    end
    SendNUIMessage({ action = 'characters', characters = characters, slots = payload.slots or 1 })
end)

RegisterNetEvent('XS-MultiCharacter:client:adminOpen', function()
    TriggerServerEvent('XS-MultiCharacter:server:adminList')
end)

RegisterNetEvent('XS-MultiCharacter:client:adminData', function(payload)
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'adminSlots',
        players = payload.players or {},
        maximum = payload.maximum,
        locale = XSLocaleTable(),
        ui = Config.Client.UI
    })
end)

RegisterNetEvent('XS-MultiCharacter:client:loggedIn', function(citizenid, position, isNew, playerData, allowedSpawns)
    activeCharacter, activeCharacterData = citizenid, playerData
    TriggerEvent('XS-MultiCharacter:client:characterSelected', citizenid, isNew, playerData)
    if isNew then
        waitingForClothing = false
        fadeOut()
        removeScene()
        local ped = PlayerPedId()
        SetEntityVisible(ped, true, false)
        FreezeEntityPosition(ped, false)

        -- The stock apartment flow opens clothing after the apartment is made.
        -- Starting either of those here would make the two menus overlap.
        if Config.FirstCharacter.apartments.enabled
            and Config.FirstCharacter.apartments.opensClothingAfterSelection ~= false
            and XSBridge.openApartments(activeCharacterData or activeCharacter) then
            return
        end

        spawnAt(Config.Spawn.default, 'default')
        if Config.FirstCharacter.clothing.enabled and Config.FirstCharacter.clothing.mode ~= 'none' then
            waitingForClothing = true
            XSBridge.openClothing()
            CreateThread(function()
                local deadline = GetGameTimer() + (Config.FirstCharacter.clothing.fallbackSeconds * 1000)
                while waitingForClothing and not IsNuiFocused() and GetGameTimer() < deadline do Wait(100) end
                if not waitingForClothing then return end
                if IsNuiFocused() then while waitingForClothing and IsNuiFocused() do Wait(150) end end
                Wait(250)
                openApartmentsAfterClothing()
            end)
        else
            waitingForClothing = true
            openApartmentsAfterClothing()
        end
    else
        openSpawns(position, allowedSpawns)
    end
end)

RegisterNetEvent('XS-MultiCharacter:client:spawnApproved', function(spawnId, coords)
    spawnAt(coords, spawnId)
end)

RegisterNetEvent('XS-MultiCharacter:client:refresh', function()
    TriggerServerEvent('XS-MultiCharacter:server:list')
end)

RegisterNUICallback('preview', function(data, cb)
    local selected
    for _, character in ipairs(characters) do
        if character.citizenid == data.citizenid then selected = character break end
    end
    showPed(selected, data.gender or 0)
    cb('ok')
end)

RegisterNUICallback('previewSpawn', function(data, cb)
    if Config.Client.CinematicSpawn.enabled then
        for _, location in ipairs(spawnOptions) do
            if location.id == data.id then
                local camera, lookAt = cameraFor(location)
                SetFocusPosAndVel(location.coords.x, location.coords.y, location.coords.z, 0.0, 0.0, 0.0)
                createCamera(camera, lookAt, true)
                TriggerEvent('XS-MultiCharacter:client:spawnPreviewed', activeCharacter, location)
                break
            end
        end
    end
    cb('ok')
end)

RegisterNUICallback('play', function(data, cb)
    SetNuiFocus(false, false)
    TriggerServerEvent('XS-MultiCharacter:server:load', data.citizenid)
    cb('ok')
end)

RegisterNUICallback('create', function(data, cb)
    SetNuiFocus(false, false)
    TriggerServerEvent('XS-MultiCharacter:server:create', data)
    cb('ok')
end)

RegisterNUICallback('delete', function(data, cb)
    TriggerServerEvent('XS-MultiCharacter:server:delete', data.citizenid)
    cb('ok')
end)

RegisterNUICallback('spawn', function(data, cb)
    TriggerServerEvent('XS-MultiCharacter:server:selectSpawn', data.id)
    cb('ok')
end)

RegisterNUICallback('adminSetSlots', function(data, cb)
    TriggerServerEvent('XS-MultiCharacter:server:adminSetSlots', data.license, data.slots, data.reset == true)
    cb('ok')
end)

RegisterNUICallback('adminClose', function(_, cb)
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'adminClosed' })
    cb('ok')
end)

CreateThread(function()
    while not NetworkIsSessionStarted() do Wait(100) end
    Wait(500)
    openCharacters()
end)
