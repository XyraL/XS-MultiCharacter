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
