XSBridge = {}

local configured = tostring(Config.Framework or ''):lower()
if configured == 'auto' then
    if GetResourceState('qbx_core'):find('start') then configured = 'qbox'
    elseif GetResourceState('qb-core'):find('start') then configured = 'qbcore' end
end

XSBridge.name = configured
XSBridge.core = nil
if configured == 'qbcore' and GetResourceState('qb-core'):find('start') then
    local ok, core = pcall(function() return exports['qb-core']:GetCoreObject() end)
    if ok then XSBridge.core = core end
end

function XSBridge.getPlayer(source)
    if XSBridge.name == 'qbox' then return exports.qbx_core:GetPlayer(source) end
    return XSBridge.core and XSBridge.core.Functions.GetPlayer(source) or nil
end

function XSBridge.login(source, citizenid, newData)
    if XSBridge.name == 'qbox' then
        return exports.qbx_core:Login(source, citizenid, newData)
    end
    return XSBridge.core and XSBridge.core.Player.Login(source, citizenid, newData) or false
end

function XSBridge.delete(source, citizenid)
    if XSBridge.name == 'qbox' then
        exports.qbx_core:DeleteCharacter(citizenid)
        return true
    end
    if not XSBridge.core then return false end
    XSBridge.core.Player.DeleteCharacter(source, citizenid)
    return true
end

function XSBridge.notify(source, message, kind)
    if XSBridge.name == 'qbox' then
        exports.qbx_core:Notify(source, message, kind or 'inform')
    elseif XSBridge.core then
        TriggerClientEvent('QBCore:Notify', source, message, kind or 'primary')
    else
        print(('^3[XS-MultiCharacter]^0 %s'):format(message))
    end
end

if configured ~= 'qbox' and configured ~= 'qbcore' then
    print(('^1[XS-MultiCharacter]^0 %s'):format(XSLocale('noFramework')))
end
