local function replaceTokens(value, replacements)
    if not replacements then return value end
    for key, replacement in pairs(replacements) do
        value = value:gsub('%%{' .. key .. '}', tostring(replacement))
    end
    return value
end

function CipherLocale(key, replacements)
    local selected = Locales[Config.Locale] or Locales.en or {}
    return replaceTokens(selected[key] or ('<' .. key .. '>'), replacements)
end

function CipherLocaleTable()
    return Locales[Config.Locale] or Locales.en or {}
end
