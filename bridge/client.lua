XSBridge = {}

local configured = tostring(Config.Framework or ''):lower()
if configured == 'auto' then
    if GetResourceState('qbx_core'):find('start') then configured = 'qbox'
    elseif GetResourceState('qb-core'):find('start') then configured = 'qbcore' end
end
XSBridge.name = configured

function XSBridge.playerLoaded()
    TriggerServerEvent('QBCore:Server:OnPlayerLoaded')
    TriggerEvent('QBCore:Client:OnPlayerLoaded')
end

function XSBridge.clearInside()
    XSHousing.clearInside()
end

function XSBridge.openClothing()
    XSAppearance.openFirstCharacter()
end

function XSBridge.openApartments(character)
    return XSApartments.open(character)
end
