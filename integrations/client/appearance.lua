XSAppearance = {}

local function running(resource)
    return GetResourceState(resource):find('start') ~= nil
end

function XSAppearance.mode()
    local mode = Config.Client.Integrations.appearance
    if mode ~= 'auto' then return mode end
    if running('illenium-appearance') then return 'illenium-appearance' end
    if running('fivem-appearance') then return 'fivem-appearance' end
    if running('qb-clothing') then return 'qb-clothing' end
    return 'none'
end

function XSAppearance.model(saved, gender)
    local model = saved and saved.model
    if type(model) == 'string' and tonumber(model) then model = tonumber(model) end
    if type(model) == 'string' then model = joaat(model) end
    if type(model) ~= 'number' or not IsModelInCdimage(model) then
        return tonumber(gender) == 1 and Config.Client.Scene.femaleModel or Config.Client.Scene.maleModel
    end
    return model
end

function XSAppearance.apply(ped, saved)
    if not saved or not saved.appearance then return false end
    local mode = XSAppearance.mode()
    if mode == 'illenium-appearance' then
        return pcall(function() exports['illenium-appearance']:setPedAppearance(ped, saved.appearance) end)
    elseif mode == 'fivem-appearance' then
        return pcall(function() exports['fivem-appearance']:setPedAppearance(ped, saved.appearance) end)
    elseif mode == 'qb-clothing' then
        TriggerEvent('qb-clothing:client:loadPlayerClothing', saved.appearance, ped)
        return true
    end
    return false
end

function XSAppearance.openFirstCharacter()
    local mode = Config.FirstCharacter.clothing.mode
    if mode == 'auto' then mode = XSAppearance.mode() end
    if mode == 'illenium-appearance' then TriggerEvent('illenium-appearance:client:openClothingShopMenu', true)
    elseif mode == 'fivem-appearance' then TriggerEvent('fivem-appearance:client:openClothingShopMenu', true)
    elseif mode == 'qb-clothing' then TriggerEvent('qb-clothes:client:CreateFirstCharacter')
    elseif mode == 'event' and Config.FirstCharacter.clothing.event ~= '' then TriggerEvent(Config.FirstCharacter.clothing.event) end
end
