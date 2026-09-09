XSValidation = {}

local allowedFrameworks = { auto = true, qbox = true, qbcore = true }
local allowedAppearance = { auto = true, ['illenium-appearance'] = true, ['fivem-appearance'] = true, ['qb-clothing'] = true, none = true }

local function add(errors, condition, message)
    if not condition then errors[#errors + 1] = message end
end

function XSValidation.run(side)
    local errors, warnings, ids, categoryIds = {}, {}, {}, {}
    add(errors, allowedFrameworks[Config.Framework], 'Config.Framework must be auto, qbox, or qbcore.')
    add(errors, Locales[Config.Locale] ~= nil, ('Locale "%s" does not exist in locales/.'):format(Config.Locale))
    local spawnLocations = Config.Spawn and Config.Spawn.locations
    local spawnCategories = Config.Spawn and Config.Spawn.categories
    local apartments = Config.FirstCharacter and Config.FirstCharacter.apartments
    add(errors, type(apartments) == 'table', 'Config.FirstCharacter.apartments is missing.')
    if apartments then
        add(errors, type(apartments.opensClothingAfterSelection) == 'boolean', 'Apartment opensClothingAfterSelection must be true or false.')
    end
    add(errors, type(spawnCategories) == 'table' and #spawnCategories > 0, 'At least one spawn category is required.')
    for index, category in ipairs(spawnCategories or {}) do
        add(errors, type(category.id) == 'string' and category.id ~= '', ('Spawn category %s needs an id.'):format(index))
        add(errors, type(category.label) == 'string' and category.label ~= '', ('Spawn category "%s" needs a label.'):format(category.id or index))
        if category.id and categoryIds[category.id] then errors[#errors + 1] = ('Spawn category id "%s" is duplicated.'):format(category.id) end
        categoryIds[category.id] = true
    end
    if Config.Spawn then
        add(errors, categoryIds[Config.Spawn.defaultCategory] == true, 'Config.Spawn.defaultCategory does not match a configured category.')
        add(errors, categoryIds[Config.Spawn.lastLocationCategory] == true, 'Config.Spawn.lastLocationCategory does not match a configured category.')
    end
    add(errors, type(spawnLocations) == 'table' and #spawnLocations > 0, 'At least one spawn location is required.')
    for index, location in ipairs(spawnLocations or {}) do
        add(errors, type(location.id) == 'string' and location.id ~= '', ('Spawn %s needs a unique id.'):format(index))
        add(errors, location.coords ~= nil, ('Spawn "%s" is missing coords.'):format(location.id or index))
        add(errors, location.category == nil or categoryIds[location.category] == true, ('Spawn "%s" uses an unknown category.'):format(location.id or index))
        if location.id and ids[location.id] then errors[#errors + 1] = ('Spawn id "%s" is duplicated.'):format(location.id) end
        ids[location.id] = true
    end
    if side == 'client' then
        add(errors, Config.Client and Config.Client.Scene ~= nil, 'config/client.lua did not load.')
        if Config.Client and Config.Client.Integrations then
            add(errors, allowedAppearance[Config.Client.Integrations.appearance], 'The client appearance integration is not valid.')
        else
            errors[#errors + 1] = 'Config.Client.Integrations is missing.'
        end
    else
        add(errors, Config.Server and Config.Server.Slots ~= nil, 'config/server.lua did not load.')
        if Config.Server and Config.Server.Slots and Config.Server.Appearance and Config.Server.Database and Config.Server.Admin then
            local defaultSlots = tonumber(Config.Server.Slots.default)
            local maximumSlots = tonumber(Config.Server.Slots.maximum)
            add(errors, defaultSlots and defaultSlots > 0, 'Default character slots must be a number above zero.')
            add(errors, defaultSlots and maximumSlots and maximumSlots >= defaultSlots, 'Maximum slots must be a number and cannot be lower than default slots.')
            local appearance = Config.Server.Appearance
            for _, key in ipairs({ 'table', 'identifierColumn', 'modelColumn', 'appearanceColumn' }) do
                local value = appearance[key]
                add(errors, type(value) == 'string' and value:match('^[%w_]+$') ~= nil, ('Appearance %s contains an invalid SQL identifier.'):format(key))
            end
            for _, key in ipairs({ 'activeColumn', 'orderColumn' }) do
                local value = appearance[key]
                add(errors, value == false or (type(value) == 'string' and value:match('^[%w_]+$') ~= nil), ('Appearance %s contains an invalid SQL identifier.'):format(key))
            end
            add(errors, type(Config.Server.Database.autoCreateTables) == 'boolean', 'Database autoCreateTables must be true or false.')
            add(errors, type(Config.Server.Admin.command) == 'string' and Config.Server.Admin.command:match('^[%w_-]+$') ~= nil, 'The admin command contains invalid characters.')
        else
            errors[#errors + 1] = 'One or more required server config sections are missing.'
        end
        if Config.Framework == 'qbox' then add(errors, GetResourceState('qbx_core'):find('start') ~= nil, 'Config.Framework is qbox but qbx_core is not started before this resource.') end
        if Config.Framework == 'qbcore' then add(errors, GetResourceState('qb-core'):find('start') ~= nil, 'Config.Framework is qbcore but qb-core is not started before this resource.') end
        if Config.Framework == 'auto' then
            add(errors, GetResourceState('qbx_core'):find('start') ~= nil or GetResourceState('qb-core'):find('start') ~= nil, 'Auto detection could not find a started qbx_core or qb-core resource.')
        end
    end
    return #errors == 0, errors, warnings
end

function XSValidation.print(side)
    local valid, errors, warnings = XSValidation.run(side)
    for _, message in ipairs(warnings) do print(('^3[XS-MultiCharacter] WARNING:^0 %s'):format(message)) end
    for _, message in ipairs(errors) do print(('^1[XS-MultiCharacter] CONFIG ERROR:^0 %s'):format(message)) end
    if valid and (side == 'server' or Config.Debug) then print(('^2[XS-MultiCharacter]^0 %s config checked successfully.'):format(side)) end
    return valid
end
