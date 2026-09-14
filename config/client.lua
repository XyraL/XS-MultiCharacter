Config.Client = {}

Config.Client.Scene = {
    coords = vec4(-813.68, 176.22, 76.74, 111.0),
    camera = vec3(-811.15, 174.80, 77.65),
    cameraLookAt = vec3(-813.68, 176.22, 76.95),
    maleModel = `mp_m_freemode_01`,
    femaleModel = `mp_f_freemode_01`,
    time = { hour = 12, minute = 0 },
    weather = 'EXTRASUNNY',
    cameraTransitionMs = 700
}

Config.Client.SceneEffects = {
    timecycle = 'hud_def_blur', -- false to leave the scene untreated
    timecycleStrength = 0.35,
    depthOfField = {
        enabled = true,
        near = 0.5,
        far = 2.8,
        strength = 0.65
    },
    orbit = {
        enabled = true,
        degreesPerSecond = 0.65,
        maxDegrees = 4.0
    }
}

Config.Client.Animation = {
    enabled = true,
    default = 'idle',
    byJob = {
        police = 'guard',
        ambulance = 'clipboard',
        mechanic = 'lean'
    },
    presets = {
        idle = { scenario = 'WORLD_HUMAN_STAND_IMPATIENT' },
        guard = { scenario = 'WORLD_HUMAN_GUARD_STAND' },
        clipboard = { scenario = 'WORLD_HUMAN_CLIPBOARD' },
        lean = { scenario = 'WORLD_HUMAN_LEANING' },
        smoke = { scenario = 'WORLD_HUMAN_SMOKING' },
        phone = { scenario = 'WORLD_HUMAN_STAND_MOBILE' }
    }
}

Config.Client.PedPersistence = {
    enabled = true,

    -- There is no ped picker anywhere in this resource. This only remembers the
    -- model a character is already wearing, so a ped set by an admin or another
    -- resource comes back on the next login and shows on the character screen.
    saveOutfit = true, -- also remember the ped's components and props

    -- Treated as the normal character rather than a ped. A character sitting on
    -- one of these clears its saved ped and goes back to its saved clothing.
    ignoredModels = {
        `mp_m_freemode_01`,
        `mp_f_freemode_01`
    },

    checkIntervalMs = 1000,
    confirmChecks = 2, -- matching checks in a row before the model is saved

    -- The clothing resource loads the saved skin right after spawning, so the
    -- ped is applied after that and held for a moment in case it loads late.
    restoreDelayMs = 1200,
    holdSeconds = 6,

    -- How long after spawning to start watching the model.
    graceMs = 5000
}

Config.Client.CinematicSpawn = {
    enabled = true,
    transitionMs = 850,
    defaultCameraHeight = 18.0,
    defaultCameraDistance = 18.0,
    fov = 48.0
}

Config.Client.Integrations = {
    appearance = 'auto', -- auto, illenium-appearance, fivem-appearance, qb-clothing, none
    apartments = 'auto', -- auto, qbx, qb, event, none
    weather = 'auto', -- auto, qb-weathersync, qbx, cd_easytime, native, none
    housing = 'auto' -- auto, qb-houses, qbx_properties, event, none
}

Config.Client.UI = {
    title = 'XYRAL',
    subtitle = 'IDENTITY NETWORK',
    accent = '#8b5cf6',
    background = '#090a0f',
    showCash = true,
    showBank = true,
    showCitizenId = true,
    showAccount = true,
    showNationality = true,
    showBirthdate = true,
    showJobGrade = true,
    showGang = true,
    showPhone = true,
    showActivity = true,
    activityDateStyle = 'short', -- short, medium, long
    currency = '$'
}
