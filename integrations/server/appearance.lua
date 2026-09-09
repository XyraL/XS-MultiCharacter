XSServerAppearance = {}

local function decode(value)
    if type(value) == 'table' then return value end
    if not value or value == '' then return nil end
    local ok, decoded = pcall(json.decode, value)
    return ok and decoded or nil
end

function XSServerAppearance.get(citizenid)
    local config = Config.Server.Appearance
    if not config.enabled then return nil end
    local active = config.activeColumn and (' AND `%s` = 1'):format(config.activeColumn) or ''
    local order = config.orderColumn and (' ORDER BY `%s` DESC'):format(config.orderColumn) or ''
    local query = ('SELECT `%s` AS model, `%s` AS appearance FROM `%s` WHERE `%s` = ?%s%s LIMIT 1')
        :format(config.modelColumn, config.appearanceColumn, config.table, config.identifierColumn, active, order)
    local ok, row = pcall(MySQL.single.await, query, { citizenid })
    if not ok then
        print(('^3[XS-MultiCharacter] Appearance preview query failed:^0 %s'):format(row))
        return nil
    end
    if not row then return nil end
    return { model = row.model, appearance = decode(row.appearance) }
end
