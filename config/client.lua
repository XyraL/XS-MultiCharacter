Config.Client = {}

Config.Client.Scene = {
    coords = vec4(-811.7346, 175.2027, 76.7454, 107.3739),
    camera = vec3(-813.5, 174, 78),
    cameraLookAt = vec3(-811.7346, 175.2027, 76.7454),
    maleModel = mp_m_freemode_01,
    femaleModel = mp_f_freemode_01,
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
        maxDegrees = 3.0
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
    subtitle = 'PASSPORT OFFICE',

    passport = {
        -- Printed on the cover, the seal and the machine-readable strip.
        issuer = 'STATE OF SAN ANDREAS',
        code = 'SAN', -- three letters

        cover = '#14213d',
        foil = '#d6b46a',

        -- The smaller second-language labels under each field. Change the
        -- wording in locales/, or set this to false for one language only.
        secondLanguage = true
    },

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
    currency = '$'
}

-- Every character's photo is taken from their own ped and shown on their
-- boarding pass and passport. Turn it off and the photo boxes stay blank.
Config.Client.Photos = {
    enabled = true,

    -- A see-through background, like a real passport photo. When the game
    -- will not give one, the normal photo is used instead.
    transparent = true
}

-- A short arrival scene played once for a brand new character, right after
-- the passport application and before the apartment or clothing screens.
Config.Client.Arrival = {
    enabled = true,
    place = 'Los Santos International', -- printed on the ADMITTED stamp
    skipControl = 22, -- Space. Change arrivalSkip in locales/ to match.

    -- The camera glides from `from` to `to` while looking at `lookAt`. Add,
    -- remove or move shots freely.
    shots = {
        {
            from = vec3(-1700.0, -3700.0, 170.0),
            to = vec3(-1420.0, -3300.0, 115.0),
            lookAt = vec3(-1000.0, -2700.0, 40.0),
            durationMs = 6500,
            fov = 50.0
        },
        {
            from = vec3(-1064.0, -2778.0, 32.0),
            to = vec3(-1050.0, -2756.0, 22.0),
            lookAt = vec3(-1035.7, -2731.9, 14.0),
            durationMs = 5500,
            fov = 45.0
        }
    },

    -- Golden hour for the arrival. Set either to false to keep the server's.
    time = { hour = 18, minute = 30 },
    weather = 'EXTRASUNNY'
}
