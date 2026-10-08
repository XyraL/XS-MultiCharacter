fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'XS-MultiCharacter'
author 'XyraL'
description 'A modern multicharacter and spawn flow for Qbox and QBCore.'
version '3.0.1'

shared_scripts {
    'config/shared.lua',
    'locales/*.lua',
    'shared/locale.lua',
    'shared/validation.lua'
}

client_scripts {
    'config/client.lua',
    'integrations/client/*.lua',
    'bridge/client.lua',
    'client/photos.lua',
    'client/arrival.lua',
    'client/main.lua'
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'config/server.lua',
    'integrations/server/*.lua',
    'bridge/server.lua',
    'server/starter.lua',
    'server/main.lua'
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/css/profiles.css',
    'html/css/admin.css',
    'html/js/icons.js',
    'html/js/app.js',
    'html/js/admin.js',
    'sql/*.sql'
}

dependencies { 'oxmysql' }
