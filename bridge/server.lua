CipherBridge = {}

local configured = tostring(Config.Framework or ''):lower()
if configured == 'auto' then
    if GetResourceState('qbx_core'):find('start') then configured = 'qbox'
    elseif GetResourceState('qb-core'):find('start') then configured = 'qbcore' end
end

CipherBridge.name = configured
CipherBridge.core = nil
if configured == 'qbcore' and GetResourceState('qb-core'):find('start') then
    local ok, core = pcall(function() return exports['qb-core']:GetCoreObject() end)
    if ok then CipherBridge.core = core end
end

function CipherBridge.getPlayer(source)
    if CipherBridge.name == 'qbox' then return exports.qbx_core:GetPlayer(source) end
    return CipherBridge.core and CipherBridge.core.Functions.GetPlayer(source) or nil
end

function CipherBridge.login(source, citizenid, newData)
    if CipherBridge.name == 'qbox' then
        return exports.qbx_core:Login(source, citizenid, newData)
    end
    return CipherBridge.core and CipherBridge.core.Player.Login(source, citizenid, newData) or false
end

function CipherBridge.delete(source, citizenid)
    if CipherBridge.name == 'qbox' then
        exports.qbx_core:DeleteCharacter(citizenid)
        return true
    end
    if not CipherBridge.core then return false end
    CipherBridge.core.Player.DeleteCharacter(source, citizenid)
    return true
end

function CipherBridge.notify(source, message, kind)
    if CipherBridge.name == 'qbox' then
        exports.qbx_core:Notify(source, message, kind or 'inform')
    elseif CipherBridge.core then
        TriggerClientEvent('QBCore:Notify', source, message, kind or 'primary')
    else
        print(('^3[Cipher-MultiCharacter]^0 %s'):format(message))
    end
end

if configured ~= 'qbox' and configured ~= 'qbcore' then
    print(('^1[Cipher-MultiCharacter]^0 %s'):format(CipherLocale('noFramework')))
end
