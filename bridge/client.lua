CipherBridge = {}

local configured = tostring(Config.Framework or ''):lower()
if configured == 'auto' then
    if GetResourceState('qbx_core'):find('start') then configured = 'qbox'
    elseif GetResourceState('qb-core'):find('start') then configured = 'qbcore' end
end
CipherBridge.name = configured

function CipherBridge.playerLoaded()
    TriggerServerEvent('QBCore:Server:OnPlayerLoaded')
    TriggerEvent('QBCore:Client:OnPlayerLoaded')
end

function CipherBridge.clearInside()
    CipherHousing.clearInside()
end

function CipherBridge.openClothing()
    CipherAppearance.openFirstCharacter()
end

function CipherBridge.openApartments(character)
    return CipherApartments.open(character)
end
