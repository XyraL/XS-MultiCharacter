Config.Server = {}

Config.Server.Slots = {
    default = 5,
    maximum = 10,

    -- Highest matching value wins. Add the ACE in server.cfg with add_ace.
    ace = {
        { permission = 'xs.slots.6', slots = 6 },
        { permission = 'xs.slots.8', slots = 8 },
        { permission = 'xs.slots.10', slots = 10 }
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

-- The character records panel: slot overrides for online players, plus a search
-- over every character on the server (online or not) to fix a name or a date
-- of birth. Every change is printed to the server console.
Config.Server.Admin = {
    enabled = true,
    ace = 'xs.multichar.admin',
    command = 'charslots',
    searchLimit = 25
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

Config.Server.Ped = {
    enabled = true,

    -- Leave empty to remember any ped a character is put in. Fill it in to only
    -- remember these models. Names or hashes both work.
    allowed = {
        -- 'a_m_m_farmer_01'
    },

    -- Never remembered, even if a character is set to one.
    blocked = {},

    cooldownMs = 1000
}

-- What a brand new character starts with. Handed over once, the moment the
-- character is made. An item your inventory does not know is skipped and named
-- in the server console, so a typo never stops the rest.
Config.Server.StarterKit = {
    enabled = true,

    -- On top of whatever your framework already starts every character with.
    money = {
        cash = 5000,
        bank = 0
    },

    items = {
        { name = 'phone', amount = 1 },

        -- A list of names uses the first one your inventory has, so the same
        -- kit works on ox_inventory (water, burger) and qb-inventory
        -- (water_bottle, sandwich).
        { name = { 'water', 'water_bottle' }, amount = 10 },
        { name = { 'burger', 'sandwich' }, amount = 10 },

        -- 'idcard' and 'license' fill in the new character's own details, the
        -- way Qbox and QBCore make them. Uses qbx_idcard when it is running.
        { name = 'id_card', amount = 1, metadata = 'idcard' },
        { name = 'driver_license', amount = 1, metadata = 'license' },

        -- metadata can also be a table, or a function(playerData, source)
        -- that returns one.
    },

    currency = '$',

    -- Tell the player what they were given.
    notify = true
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
