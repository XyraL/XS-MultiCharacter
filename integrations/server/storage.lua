XSStorage = {}

local ready = false
local slotOverrides = {}

local activityTable = [[
    CREATE TABLE IF NOT EXISTS `xs_multichar_activity` (
        `citizenid` VARCHAR(64) NOT NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `last_played` TIMESTAMP NULL DEFAULT NULL,
        `playtime_seconds` BIGINT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (`citizenid`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
]]

local slotsTable = [[
    CREATE TABLE IF NOT EXISTS `xs_multichar_slots` (
        `license` VARCHAR(64) NOT NULL,
        `slots` TINYINT UNSIGNED NOT NULL,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        `updated_by` VARCHAR(64) DEFAULT NULL,
        PRIMARY KEY (`license`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
]]

local function warn(message)
    print(('^3[XS-MultiCharacter] Storage warning:^0 %s'):format(message))
end

MySQL.ready(function()
    if Config.Server.Database and Config.Server.Database.autoCreateTables then
        local activityOk, activityError = pcall(MySQL.query.await, activityTable)
        local slotsOk, slotsError = pcall(MySQL.query.await, slotsTable)
        if not activityOk then warn(activityError) end
        if not slotsOk then warn(slotsError) end
    end
    local ok, rows = pcall(MySQL.query.await, 'SELECT license, slots FROM xs_multichar_slots')
    if ok then
        for _, row in ipairs(rows) do slotOverrides[row.license] = tonumber(row.slots) end
    else
        warn('Could not load slot overrides. Import sql/xs_multichar.sql or enable automatic table creation.')
    end
    ready = true
end)

function XSStorage.awaitReady()
    local deadline = GetGameTimer() + 10000
    while not ready and GetGameTimer() < deadline do Wait(50) end
    return ready
end

function XSStorage.getSlotOverride(license)
    XSStorage.awaitReady()
    return license and slotOverrides[license] or nil
end

function XSStorage.setSlotOverride(license, slots, updatedBy)
    if not XSStorage.awaitReady() then return false end
    local ok = pcall(MySQL.prepare.await, [[
        INSERT INTO xs_multichar_slots (license, slots, updated_by)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE slots = VALUES(slots), updated_by = VALUES(updated_by)
    ]], { license, slots, updatedBy })
    if ok then slotOverrides[license] = slots end
    return ok
end

function XSStorage.resetSlotOverride(license)
    if not XSStorage.awaitReady() then return false end
    local ok = pcall(MySQL.update.await, 'DELETE FROM xs_multichar_slots WHERE license = ?', { license })
    if ok then slotOverrides[license] = nil end
    return ok
end

function XSStorage.ensureActivity(citizenid)
    if not Config.Server.Activity.enabled or not XSStorage.awaitReady() then return false end
    return pcall(MySQL.insert.await, 'INSERT IGNORE INTO xs_multichar_activity (citizenid) VALUES (?)', { citizenid })
end

function XSStorage.getActivity(citizenid)
    if not Config.Server.Activity.enabled or not XSStorage.awaitReady() then return nil end
    XSStorage.ensureActivity(citizenid)
    local ok, row = pcall(MySQL.single.await, [[
        SELECT UNIX_TIMESTAMP(created_at) AS createdAt,
               UNIX_TIMESTAMP(last_played) AS lastPlayed,
               playtime_seconds AS playtimeSeconds
        FROM xs_multichar_activity WHERE citizenid = ? LIMIT 1
    ]], { citizenid })
    if not ok or not row then return nil end
    return {
        createdAt = tonumber(row.createdAt),
        lastPlayed = tonumber(row.lastPlayed),
        playtimeSeconds = tonumber(row.playtimeSeconds) or 0
    }
end

function XSStorage.markSelected(citizenid)
    if not Config.Server.Activity.enabled or not XSStorage.awaitReady() then return end
    XSStorage.ensureActivity(citizenid)
    if Config.Server.Activity.updateLastPlayedOnSelect then
        pcall(MySQL.update.await, 'UPDATE xs_multichar_activity SET last_played = CURRENT_TIMESTAMP WHERE citizenid = ?', { citizenid })
    end
end

function XSStorage.addPlaytime(citizenid, seconds)
    seconds = math.max(math.floor(tonumber(seconds) or 0), 0)
    if seconds == 0 or not Config.Server.Activity.enabled or not XSStorage.awaitReady() then return end
    XSStorage.ensureActivity(citizenid)
    pcall(MySQL.update.await, 'UPDATE xs_multichar_activity SET playtime_seconds = playtime_seconds + ? WHERE citizenid = ?', { seconds, citizenid })
end

function XSStorage.deleteActivity(citizenid)
    if not Config.Server.Activity.enabled or not XSStorage.awaitReady() then return end
    pcall(MySQL.update.await, 'DELETE FROM xs_multichar_activity WHERE citizenid = ?', { citizenid })
end
