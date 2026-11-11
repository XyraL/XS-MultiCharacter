XSHomes = {}

local HOUSING = 'XS-Housing'
local PREFIX = 'home:'

local function settings()
    return Config.Spawn.housing or {}
end

function XSHomes.running()
    return GetResourceState(HOUSING) == 'started'
end

function XSHomes.isHome(spawnId)
    return type(spawnId) == 'string' and spawnId:sub(1, #PREFIX) == PREFIX
end

function XSHomes.list(source)
    if settings().enabled == false or not XSHomes.running() then return {} end
    local ok, places = pcall(function() return exports[HOUSING]:Spawns(source) end)
    if not ok or type(places) ~= 'table' then return {} end
    local list = {}
    for _, place in ipairs(places) do
        local coords = type(place) == 'table' and place.coords
        if coords and place.id ~= nil and tonumber(coords.x) then
            list[#list + 1] = {
                id = PREFIX .. tostring(place.id),
                place = tostring(place.id),
                label = tostring(place.label or place.id),
                category = settings().category or 'homes',
                coords = vector4(coords.x + 0.0, coords.y + 0.0, coords.z + 0.0, (tonumber(coords.w) or 0.0) + 0.0),
                inside = place.inside == true,
                housing = true
            }
        end
    end
    return list
end

function XSHomes.find(source, spawnId)
    if not XSHomes.isHome(spawnId) then return nil end
    for _, home in ipairs(XSHomes.list(source)) do
        if home.id == spawnId then return home end
    end
    return nil
end

function XSHomes.enter(source, home)
    if not home or not home.inside or not XSHomes.running() then return false end
    local ok, entered = pcall(function() return exports[HOUSING]:EnterProperty(source, home.place) end)
    return ok and entered == true
end

local function fileStarter()
    local code = LoadResourceFile(HOUSING, 'config.lua')
    if not code then return {} end
    local env = setmetatable({}, { __index = _G })
    local chunk = load(code, ('@@%s/config.lua'):format(HOUSING), 't', env)
    if not chunk or not pcall(chunk) or type(env.Config) ~= 'table' then return {} end
    return type(env.Config.Starter) == 'table' and env.Config.Starter or {}
end

local function liveSettings()
    local ok, row = pcall(MySQL.single.await, 'SELECT `data` FROM `xs_housing_settings` WHERE `name` = ?', { 'config' })
    if not ok or type(row) ~= 'table' or not row.data then return {} end
    if type(row.data) == 'table' then return row.data end
    local decoded, data = pcall(json.decode, row.data)
    return decoded and type(data) == 'table' and data or {}
end

function XSHomes.givesStarter()
    if not XSHomes.running() then return false end
    local mode = Config.FirstCharacter.apartments.xsHousing or 'auto'
    if mode == 'skip' then return true end
    if mode == 'show' then return false end
    local starter, live = fileStarter(), liveSettings()
    local enabled, onFirstSpawn = starter.enabled ~= false, starter.onFirstSpawn ~= false
    if live['Starter.enabled'] ~= nil then enabled = live['Starter.enabled'] == true end
    if live['Starter.onFirstSpawn'] ~= nil then onFirstSpawn = live['Starter.onFirstSpawn'] == true end
    return enabled and onFirstSpawn
end
