<h1 align="center">Cipher MultiCharacter</h1>

<p align="center">A cinematic identity, character selection, and spawn flow for <strong>QBox</strong> and <strong>QBCore</strong>.</p>

<p align="center">
  <a href="https://github.com/XyraL/cipher-multicharacter/releases"><img src="https://img.shields.io/github/v/release/XyraL/cipher-multicharacter?style=flat-square&color=ff7ad9&label=release" alt="Latest release"></a>
  <img src="https://img.shields.io/badge/framework-QBox%20%7C%20QBCore-55dcff?style=flat-square" alt="framework">
  <img src="https://img.shields.io/badge/price-free-30d158?style=flat-square" alt="price">
  <a href="https://discord.gg/XRURAw4TM2"><img src="https://img.shields.io/badge/support-discord-5865F2?style=flat-square" alt="support"></a>
</p>

<p align="center">
  <a href="https://github.com/XyraL/cipher-multicharacter/releases">Releases</a> &nbsp;·&nbsp;
  <a href="https://discord.gg/XRURAw4TM2">Support</a>
</p>

---

Cipher MultiCharacter treats character selection as an identity system instead of a row of save slots while remaining straightforward to install.

The character screen loads the player's saved appearance, gives each character a proper dossier, and puts the preview ped into an animation that can change with their job. The spawn screen uses actual map cameras instead of showing another flat menu.

## Features

- Qbox and QBCore support
- Saved appearance previews for illenium-appearance, fivem-appearance, and qb-clothing
- Character animations with job-specific presets
- Cipher identity dossier with support for fields from other resources
- Cinematic spawn cameras
- Last location support
- Per-character spawn permissions
- Configurable slots through ACE, license overrides, or another resource
- Locales, split config files, and startup config checks
- Separate adapters for appearance, apartments, housing, and weather
- Server and client events for other resources
- Categorized spawn locations
- Persistent character activity information
- Configurable visual scene effects without audio scene changes
- ACE-protected admin slot manager
- No in-session character switching command

## Requirements

- `oxmysql`
- `qbx_core` or `qb-core`
- An appearance resource if you want saved clothing and first-character setup
- `qbx_apartments` or `qb-apartments` if you want starting apartments

## Install

1. Put `Cipher-MultiCharacter` in your resources folder.
2. Start it after the framework, oxmysql, appearance, and apartment resources.
3. Add `ensure Cipher-MultiCharacter` to `server.cfg`.
4. Disable the multicharacter resource that came with the framework.
5. Check the three files in `config/` before starting the server.

Qbox needs this in `qbx_core/config/client.lua`:

```lua
useExternalCharacters = true
```

QBCore servers should stop or remove `qb-multicharacter`. Do not run two character selectors together.

Cipher creates its two small tables automatically by default. If you turn automatic table creation off, import `sql/cipher_multichar.sql` yourself.

## Where everything is

- `config/shared.lua` has character rules, first-time setup, and spawn locations.
- `config/client.lua` has the scene, cameras, animations, integrations, and UI style.
- `config/server.lua` has slots, the appearance table, dossier fields, and cooldowns.
- `locales/en.lua` has every player-facing line used by the script.
- `integrations/` contains the small adapters. This is the place to edit for a renamed or custom resource.

The resource checks its config at startup. Bad framework names, duplicate spawn IDs, missing coords, unsafe appearance table names, and invalid slot settings will show as `CONFIG ERROR` in the console.

## Spawn categories

Categories are defined above the spawn locations in `config/shared.lua`. Give a location a matching category ID:

```lua
{
    id = 'pillbox',
    category = 'city',
    label = 'Pillbox Medical',
    -- the rest of the location
}
```

Empty categories are hidden automatically. Last location has its own configurable category, and locations without a category use `defaultCategory`.

## Character activity

Cipher tracks:

- Previous character selection time
- Total session playtime
- The date Cipher started tracking the character
- Last saved district, calculated from the framework position

Playtime is written when the player unloads, disconnects, or the resource stops. It does not run a repeating save query. Existing characters begin tracking the first time they appear in the selector after this update.

Turn activity off in `Config.Server.Activity`, or hide it without disabling collection through `Config.Client.UI.showActivity`.

## Scene effects

`Config.Client.SceneEffects` controls the character scene timecycle, depth of field, and slow orbit. Every effect can be disabled separately. This resource does not start, stop, or replace GTA audio scenes.

## Admin slot manager

Give staff the configured ACE:

```cfg
add_ace group.admin cipher.multichar.admin allow
```

Then use `/charslots` in game to open the manager. It shows online players, current character count, effective slots, and persistent overrides.

The direct command form also works:

```text
/charslots 12 8
/charslots 12 reset
```

Changing an override does not log the target out or reopen their character selector. The new limit applies the next time their character list is loaded.

## Character slots

The default and maximum slot count are in `config/server.lua`.

ACE rules use the highest value a player has:

```cfg
add_ace group.supporter cipher.slots.6 allow
add_ace group.vip cipher.slots.8 allow
```

You can also give one license a fixed override:

```lua
identifiers = {
    ['license:abc123'] = 8
}
```

Another resource can provide a slot count at runtime:

```lua
exports['Cipher-MultiCharacter']:RegisterSlotProvider(function(source, currentSlots)
    if IsPlayerAceAllowed(source, 'myserver.founder') then
        return 10
    end
end)
```

The value is always clamped to `Config.Server.Slots.maximum`.

## Spawn permissions

An unrestricted location only needs its normal details:

```lua
{
    id = 'pillbox',
    label = 'Pillbox Medical',
    description = 'The main entrance',
    district = 'Pillbox Hill',
    coords = vec4(298.52, -584.61, 43.26, 70.0),
    camera = vec3(314.0, -594.0, 54.0),
    lookAt = vec3(298.52, -584.61, 43.26)
}
```

Add a permission table to restrict it:

```lua
permission = {
    jobs = { police = 0, ambulance = 2 },
    ace = 'cipher.spawn.pillbox'
}
```

By default, passing any listed rule grants access. Add `requireAll = true` when the character must pass every rule. Available checks are `jobs`, `gangs`, `citizenids`, and `ace`.

The server checks the permission again when a spawn is picked. Hiding a button in the UI is not treated as security.

For more custom logic:

```lua
exports['Cipher-MultiCharacter']:RegisterSpawnProvider(function(source, playerData, location)
    if location.id == 'event_hub' then
        return GlobalState.eventOpen == true
    end
end)
```

Returning `false` blocks the location. Returning `nil` leaves the normal result alone.

## Saved appearances

The default query expects this common layout:

```text
playerskins: id, citizenid, model, skin, active
```

If your appearance resource renamed its table or columns, change `Config.Server.Appearance`. SQL identifiers are validated before any query is built.

The client adapter is selected automatically. You can force it in `Config.Client.Integrations.appearance` if more than one clothing resource happens to be installed.

## Character animations

Animation presets and job mappings are in `config/client.lua`:

```lua
byJob = {
    police = 'guard',
    ambulance = 'clipboard',
    mechanic = 'lean'
}
```

Presets can use a scenario or an animation dictionary. Unknown jobs use the default preset.

## Dossier fields

The standard dossier includes identity, occupation, position, affiliation, phone, nationality, account number, and money. Display toggles are in the client config.

Simple metadata fields can be added in the server config:

```lua
metadataFields = {
    { key = 'callsign', label = 'Callsign' }
}
```

Other resources can add calculated information without editing Cipher:

```lua
exports['Cipher-MultiCharacter']:RegisterDossierProvider(function(source, citizenid, playerRow, dossier)
    return {
        { label = 'Reputation', value = 'Trusted' },
        { label = 'Crew', value = 'Southside Customs' }
    }
end)
```

## Exports

Server:

```lua
exports['Cipher-MultiCharacter']:GetAllowedSlots(source)
exports['Cipher-MultiCharacter']:GetSelectedCharacter(source)
exports['Cipher-MultiCharacter']:CanUseSpawn(source, spawnId)
exports['Cipher-MultiCharacter']:RegisterSlotProvider(callback)
exports['Cipher-MultiCharacter']:RegisterDossierProvider(callback)
exports['Cipher-MultiCharacter']:RegisterSpawnProvider(callback)
exports['Cipher-MultiCharacter']:SetSlotOverride(license, slots, updatedBy)
exports['Cipher-MultiCharacter']:ResetSlotOverride(license)
```

Client:

```lua
exports['Cipher-MultiCharacter']:GetSelectedCharacter()
exports['Cipher-MultiCharacter']:IsSelectingCharacter()
```

## Events

Server-side lifecycle events:

```lua
cipher-multichar:server:characterSelected -- source, playerData
cipher-multichar:server:characterCreated  -- source, playerData
cipher-multichar:server:characterDeleting -- source, citizenid
cipher-multichar:server:characterDeleted  -- source, citizenid
cipher-multichar:server:characterSpawned  -- source, playerData, spawnId
```

Client-side lifecycle events:

```lua
cipher-multichar:client:characterPreviewed -- character, previewPed
cipher-multichar:client:characterSelected  -- citizenid, isNew, playerData
cipher-multichar:client:spawnPreviewed     -- citizenid, location
cipher-multichar:client:characterSpawned   -- citizenid, spawnId, coords
```

These are local lifecycle events for integrations. The resource does not expose an event or command that logs a player out and reopens character selection.

## First character flow

The default flow is:

```text
Identity -> Apartment -> Clothing
```

The standard Qbox and QBCore apartment resources open first-character clothing after the apartment is picked, so Cipher leaves that handoff to them. This keeps the apartment selector and clothing menu from opening over each other.

If you use a custom apartment event that does not open clothing, set `Config.FirstCharacter.apartments.opensClothingAfterSelection` to `false`. Cipher will use the clothing-first fallback and watch the events in `Config.FirstCharacter.clothing.finishedEvents` before opening your apartment event.

## Before going live

- Test the full new-character flow with the exact appearance and apartment versions on your server.
- Test one existing male and female character to confirm the saved appearance query matches your table.
- Check every camera location for interiors or map assets that only your server loads.
- Keep spawn IDs unique.
- Grant `cipher.multichar.admin` only to staff who should manage persistent slot limits.
- Do not start the old multicharacter resource beside this one.

## Documentation

Full setup guide, requirements and troubleshooting:
**[xyralscripts.dev/docs-cipher-multicharacter](https://xyralscripts.dev/docs-cipher-multicharacter)**

## Support

- **Found a bug?** [Open an issue](https://github.com/XyraL/cipher-multicharacter/issues)
- **Need setup help?** [Join the Discord](https://discord.gg/XRURAw4TM2) — check the setup guide first, it usually has the answer

## The rest of the Cipher line

All free, all source-available.

| Script | What it is |
|---|---|
| **[Cipher](https://github.com/XyraL/cipher)** | modular criminal device for QBox and QBCore — gang ops, blackmarket and boosting in one encrypted tablet. |
| **[Cipher MDT](https://github.com/XyraL/cipher-mdt)** | multi-department MDT for QBox — police, EMS and fire with live CAD, records, patient care and a live unit map. |
| **[Cipher Admin](https://github.com/XyraL/cipher-admin)** | advanced admin suite for QBox and QBCore — player management, bans, reports, inventory tools and entity inspection. |
| **[Cipher Drone](https://github.com/XyraL/cipher-drone)** | deployable police drone for QBox and QBCore — smooth flight, thermal, spotlight, tracker darts and real counterplay. |
| **[Cipher Trucking](https://github.com/XyraL/cipher-trucking)** | civilian trucking job for QBox and QBCore — live route map, truck ownership, fuel and maintenance, and companies. |
| **[Cipher Dispatch](https://github.com/XyraL/cipher-dispatch)** | multi-department live dispatch for QBox and QBCore — responder tracking, priority calls, TAC radio and provider integrations. |

## License

Free to use on any server you own or operate, including commercial ones.
**Do not redistribute or resell** — see [LICENSE](LICENSE) for the full terms.
