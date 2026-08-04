Config.Server = {}

Config.Server.Slots = {
    default = 5,
    maximum = 10,

    -- Highest matching value wins. Add the ACE in server.cfg with add_ace.
    ace = {
        { permission = 'cipher.slots.6', slots = 6 },
        { permission = 'cipher.slots.8', slots = 8 },
        { permission = 'cipher.slots.10', slots = 10 }
    },

    -- Handy for a one-off override. The key must be the full FiveM identifier.
    identifiers = {
        -- ['license:abc123'] = 8
    }
}

Config.Server.Database = {
    autoCreateTables = true
}

Config.Server.Activity = {
    enabled = true,
    updateLastPlayedOnSelect = true
}

Config.Server.Admin = {
    enabled = true,
    ace = 'cipher.multichar.admin',
    command = 'charslots'
}

Config.Server.Appearance = {
    enabled = true,
    table = 'playerskins',
    identifierColumn = 'citizenid',
    modelColumn = 'model',
    appearanceColumn = 'skin',
    orderColumn = 'id', -- set to false if the table only keeps one row per character
    activeColumn = 'active' -- set to false if your table has no active column
}

Config.Server.Dossier = {
    metadataFields = {
        -- { key = 'callsign', label = 'Callsign' }
    }
}

Config.Server.Security = {
    requestCooldownMs = 500,
    createCooldownMs = 2500,
    deleteCooldownMs = 2500
}
