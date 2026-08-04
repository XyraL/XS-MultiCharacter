fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'Cipher-MultiCharacter'
author 'XyraL'
description 'A clean multicharacter and spawn flow for Qbox and QBCore.'
version '2.1.2'

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
    'client/main.lua'
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'config/server.lua',
    'integrations/server/*.lua',
    'bridge/server.lua',
    'server/main.lua'
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/css/style.css',
    'html/css/admin.css',
    'html/js/app.js',
    'sql/*.sql'
}

dependencies { 'oxmysql' }
