CipherStorage = {}

local ready = false
local slotOverrides = {}

local activityTable = [[
    CREATE TABLE IF NOT EXISTS `cipher_multichar_activity` (
        `citizenid` VARCHAR(64) NOT NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `last_played` TIMESTAMP NULL DEFAULT NULL,
        `playtime_seconds` BIGINT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (`citizenid`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
]]

local slotsTable = [[
    CREATE TABLE IF NOT EXISTS `cipher_multichar_slots` (
        `license` VARCHAR(64) NOT NULL,
        `slots` TINYINT UNSIGNED NOT NULL,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        `updated_by` VARCHAR(64) DEFAULT NULL,
        PRIMARY KEY (`license`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
]]

local function warn(message)
    print(('^3[Cipher-MultiCharacter] Storage warning:^0 %s'):format(message))
end

MySQL.ready(function()
    if Config.Server.Database and Config.Server.Database.autoCreateTables then
        local activityOk, activityError = pcall(MySQL.query.await, activityTable)
        local slotsOk, slotsError = pcall(MySQL.query.await, slotsTable)
        if not activityOk then warn(activityError) end
        if not slotsOk then warn(slotsError) end
    end
    local ok, rows = pcall(MySQL.query.await, 'SELECT license, slots FROM cipher_multichar_slots')
    if ok then
        for _, row in ipairs(rows) do slotOverrides[row.license] = tonumber(row.slots) end
    else
        warn('Could not load slot overrides. Import sql/cipher_multichar.sql or enable automatic table creation.')
    end
    ready = true
end)

function CipherStorage.awaitReady()
    local deadline = GetGameTimer() + 10000
    while not ready and GetGameTimer() < deadline do Wait(50) end
    return ready
end

function CipherStorage.getSlotOverride(license)
    CipherStorage.awaitReady()
    return license and slotOverrides[license] or nil
end

function CipherStorage.setSlotOverride(license, slots, updatedBy)
    if not CipherStorage.awaitReady() then return false end
    local ok = pcall(MySQL.prepare.await, [[
        INSERT INTO cipher_multichar_slots (license, slots, updated_by)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE slots = VALUES(slots), updated_by = VALUES(updated_by)
    ]], { license, slots, updatedBy })
    if ok then slotOverrides[license] = slots end
    return ok
end

function CipherStorage.resetSlotOverride(license)
    if not CipherStorage.awaitReady() then return false end
    local ok = pcall(MySQL.update.await, 'DELETE FROM cipher_multichar_slots WHERE license = ?', { license })
    if ok then slotOverrides[license] = nil end
    return ok
end

function CipherStorage.ensureActivity(citizenid)
    if not Config.Server.Activity.enabled or not CipherStorage.awaitReady() then return false end
    return pcall(MySQL.insert.await, 'INSERT IGNORE INTO cipher_multichar_activity (citizenid) VALUES (?)', { citizenid })
end

function CipherStorage.getActivity(citizenid)
    if not Config.Server.Activity.enabled or not CipherStorage.awaitReady() then return nil end
    CipherStorage.ensureActivity(citizenid)
    local ok, row = pcall(MySQL.single.await, [[
        SELECT UNIX_TIMESTAMP(created_at) AS createdAt,
               UNIX_TIMESTAMP(last_played) AS lastPlayed,
               playtime_seconds AS playtimeSeconds
        FROM cipher_multichar_activity WHERE citizenid = ? LIMIT 1
    ]], { citizenid })
    if not ok or not row then return nil end
    return {
        createdAt = tonumber(row.createdAt),
        lastPlayed = tonumber(row.lastPlayed),
        playtimeSeconds = tonumber(row.playtimeSeconds) or 0
    }
end

function CipherStorage.markSelected(citizenid)
    if not Config.Server.Activity.enabled or not CipherStorage.awaitReady() then return end
    CipherStorage.ensureActivity(citizenid)
    if Config.Server.Activity.updateLastPlayedOnSelect then
        pcall(MySQL.update.await, 'UPDATE cipher_multichar_activity SET last_played = CURRENT_TIMESTAMP WHERE citizenid = ?', { citizenid })
    end
end

function CipherStorage.addPlaytime(citizenid, seconds)
    seconds = math.max(math.floor(tonumber(seconds) or 0), 0)
    if seconds == 0 or not Config.Server.Activity.enabled or not CipherStorage.awaitReady() then return end
    CipherStorage.ensureActivity(citizenid)
    pcall(MySQL.update.await, 'UPDATE cipher_multichar_activity SET playtime_seconds = playtime_seconds + ? WHERE citizenid = ?', { seconds, citizenid })
end

function CipherStorage.deleteActivity(citizenid)
    if not Config.Server.Activity.enabled or not CipherStorage.awaitReady() then return end
    pcall(MySQL.update.await, 'DELETE FROM cipher_multichar_activity WHERE citizenid = ?', { citizenid })
end
