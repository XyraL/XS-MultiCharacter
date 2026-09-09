Config = {}

-- Leave this on auto unless both cores are running.
Config.Framework = 'auto' -- auto, qbox, qbcore
Config.Locale = 'en'
Config.Debug = false

Config.Characters = {
    allowDelete = true,
    deleteConfirmation = 'DELETE',
    defaultNationality = 'American',
    dateFormatHint = 'MM/DD/YYYY',
    nameMinLength = 2,
    nameMaxLength = 18
}

Config.FirstCharacter = {
    clothing = {
        enabled = true,
        mode = 'auto', -- auto, qb-clothing, illenium-appearance, fivem-appearance, event, none
        event = '',
        finishedEvents = {
            'qb-clothing:client:onMenuClose',
            'illenium-appearance:client:finishedCustomization',
            'fivem-appearance:client:finishedCustomization'
        },
        fallbackSeconds = 15
    },
    apartments = {
        enabled = true,
        mode = 'auto', -- auto, qbx, qb, event, none
        event = '',

        -- Standard Qbox/QBCore apartments open first-character clothing after
        -- the apartment is picked. Turn this off only if your custom apartment
        -- event does not handle clothing for you.
        opensClothingAfterSelection = true
    }
}

Config.Spawn = {
    allowLastLocation = true,
    default = vec4(-1035.71, -2731.87, 12.86, 0.0),
    defaultCategory = 'city',
    lastLocationCategory = 'recent',

    categories = {
        { id = 'recent', label = 'Recent' },
        { id = 'city', label = 'Los Santos' },
        { id = 'county', label = 'Blaine County' },
        { id = 'restricted', label = 'Restricted' }
    },

    -- Permission options are all optional. When more than one is present the
    -- character only needs to pass one of them.
    locations = {
        {
            id = 'legion',
            category = 'city',
            label = 'Legion Square',
            description = 'Downtown Los Santos',
            district = 'Mission Row',
            coords = vec4(195.17, -933.77, 30.69, 144.5),
            camera = vec3(205.30, -940.40, 37.20),
            lookAt = vec3(195.17, -933.77, 30.69)
        },
        {
            id = 'airport',
            category = 'city',
            label = 'Los Santos Airport',
            description = 'The lower arrivals entrance',
            district = 'Los Santos International',
            coords = vec4(-1035.71, -2731.87, 12.86, 0.0),
            camera = vec3(-1019.40, -2739.10, 27.00),
            lookAt = vec3(-1035.71, -2731.87, 12.86)
        },
        {
            id = 'sandy',
            category = 'county',
            label = 'Sandy Shores',
            description = 'Across from the motel',
            district = 'Blaine County',
            coords = vec4(1839.49, 3672.73, 34.28, 210.0),
            camera = vec3(1819.50, 3657.20, 48.00),
            lookAt = vec3(1839.49, 3672.73, 34.28)
        },
        {
            id = 'paleto',
            category = 'county',
            label = 'Paleto Bay',
            description = 'Near the sheriff station',
            district = 'Paleto Bay',
            coords = vec4(-111.41, 6469.36, 31.63, 135.0),
            camera = vec3(-128.20, 6481.50, 43.00),
            lookAt = vec3(-111.41, 6469.36, 31.63)
        },
        -- Example restricted spawn:
        -- { id = 'pd', category = 'restricted', label = 'Mission Row PD', coords = vec4(...), camera = vec3(...),
        --   lookAt = vec3(...), permission = { jobs = { police = 0 }, ace = 'xs.spawn.pd' } }
    }
}
