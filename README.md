<h1 align="center">XS-MultiCharacter</h1>

<p align="center">A cinematic identity, character selection, and spawn flow for <strong>QBox</strong> and <strong>QBCore</strong>.</p>

<p align="center">
  <a href="https://github.com/XyraL/XS-MultiCharacter/releases"><img src="https://img.shields.io/github/v/release/XyraL/XS-MultiCharacter?style=flat-square&color=ff7ad9&label=release" alt="Latest release"></a>
  <img src="https://img.shields.io/badge/framework-QBox%20%7C%20QBCore-55dcff?style=flat-square" alt="framework">
  <img src="https://img.shields.io/badge/price-free-30d158?style=flat-square" alt="price">
  <a href="https://discord.gg/XRURAw4TM2"><img src="https://img.shields.io/badge/support-discord-5865F2?style=flat-square" alt="support"></a>
</p>

<p align="center">
  <a href="https://github.com/XyraL/XS-MultiCharacter/releases">Releases</a> &nbsp;·&nbsp;
  <a href="https://discord.gg/XRURAw4TM2">Support</a>
</p>

---

XS-MultiCharacter is a clean, modern character screen. Every character is a card with their photo on it, taken from their own ped, and the one you pick lifts out of the row while a glass panel shows their job, money, playtime and where they were last seen.

New characters get a simple form with the starter kit laid out next to it, then land at the airport in a short arrival scene. Spawning uses the same cards for places, and the camera flies to each one as you pick it.

## Features

- Qbox and QBCore support
- Modern card-based character, creation, spawn and delete screens
- A photo of every character, taken from their own ped
- Starter kit for new characters: cash, bank money and any items
- Short arrival scene for brand new characters, skippable
- Character records for staff: search every character and fix a name or date of birth
- Saved appearance previews for illenium-appearance, fivem-appearance, and qb-clothing
- Remembers a ped a character was put in, without adding a ped picker
- Character animations with job-specific presets
- Character details with support for fields from other resources
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
- ACE-protected slot manager and character records
- No in-session character switching command

## Requirements

- `oxmysql`
- `qbx_core` or `qb-core`
- An appearance resource if you want saved clothing and first-character setup
- `qbx_apartments` or `qb-apartments` if you want starting apartments

## Install

1. Put `XS-MultiCharacter` in your resources folder.
2. Start it after the framework, oxmysql, appearance, and apartment resources.
3. Add `ensure XS-MultiCharacter` to `server.cfg`.
4. Disable the multicharacter resource that came with the framework.
5. Check the three files in `config/` before starting the server.

Qbox needs this in `qbx_core/config/client.lua`:

```lua
useExternalCharacters = true
```

QBCore servers should stop or remove `qb-multicharacter`. Do not run two character selectors together.

It creates its three small tables automatically by default. If you turn automatic table creation off, import `sql/xs_multichar.sql` yourself.

## Where everything is

- `config/shared.lua` has character rules, first-time setup, and spawn locations.
- `config/client.lua` has the scene, cameras, photos, the arrival scene, animations, integrations, and the accent colours.
- `config/server.lua` has slots, the starter kit, the appearance table, detail fields, and cooldowns.
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

## The look

The name in the top corner and the accent colours are in `Config.Client.UI`:

```lua
title = 'XYRAL',
accent = '#ff7ad9',
accentTo = '#8b7bff'
```

The two accent colours make the gradient on the picked card, the logo and the starter cash. Put the same colour in both for a flat accent.

The `show...` options in the same table hide fields you do not want in the details panel.

## Starter kit

Every brand new character gets the starter kit once, the moment they are made. It is in `Config.Server.StarterKit`:

```lua
money = { cash = 5000, bank = 0 },
items = {
    { name = 'phone', amount = 1 },
    { name = { 'water', 'water_bottle' }, amount = 10 },
    { name = { 'burger', 'sandwich' }, amount = 10 },
    { name = 'id_card', amount = 1, metadata = 'idcard' },
    { name = 'driver_license', amount = 1, metadata = 'license' }
}
```

A list of names uses the first one your inventory has, so one kit works on ox_inventory and qb-inventory. An item your inventory does not know is skipped and named in the server console. `'idcard'` and `'license'` fill in the new character's own details, and use qbx_idcard when it is running.

The money is on top of the framework's normal starting money. The framework's own starter items are handed out by its own character screen, which this replaces, so add anything else you want new players to have here.

The create screen shows the kit next to the form, so players see what they are getting before they make the character.

## Character photos

Each character's photo is taken from their own ped while the character screen is open: hidden copies stand behind the camera for the cards, and the character you are looking at is photographed live. Nothing is stored. Turn it off in `Config.Client.Photos`.

## First arrival

A brand new character lands in a short arrival scene before the apartment and clothing screens: a couple of camera shots over the airport with a welcome card. Players can skip it with Space.

The shots, the time of day and the place on the welcome card are in `Config.Client.Arrival`. Each shot glides the camera from `from` to `to` while looking at `lookAt`. Set `enabled = false` to go straight to the apartment screen.

## Character activity

It tracks:

- Previous character selection time
- Total session playtime
- The date it started tracking the character
- Last saved district, calculated from the framework position

Playtime is written when the player unloads, disconnects, or the resource stops. It does not run a repeating save query. Existing characters begin tracking the first time they appear in the selector after this update.

Turn activity off in `Config.Server.Activity`, or hide it without disabling collection through `Config.Client.UI.showActivity`.

## Scene effects

`Config.Client.SceneEffects` controls the character scene timecycle, depth of field, and slow orbit. Every effect can be disabled separately. This resource does not start, stop, or replace GTA audio scenes.

## Character records

Give staff the configured ACE:

```cfg
add_ace group.admin xs.multichar.admin allow
```

Then use `/charslots` in game. The first tab shows online players with their character count, effective slots, and persistent overrides.

The second tab searches every character on the server, online or not, by name, citizen ID or license. Pick one to fix their first name, last name, or date of birth. A character in play is updated straight away; anyone else gets the change the next time they load in. Every change is printed to the server console and fires `XS-MultiCharacter:server:characterEdited`.

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
add_ace group.supporter xs.slots.6 allow
add_ace group.vip xs.slots.8 allow
```

You can also give one license a fixed override:

```lua
identifiers = {
    ['license:abc123'] = 8
}
```

Another resource can provide a slot count at runtime:

```lua
exports['XS-MultiCharacter']:RegisterSlotProvider(function(source, currentSlots)
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
    ace = 'xs.spawn.pillbox'
}
```

By default, passing any listed rule grants access. Add `requireAll = true` when the character must pass every rule. Available checks are `jobs`, `gangs`, `citizenids`, and `ace`.

The server checks the permission again when a spawn is picked. Hiding a button in the UI is not treated as security.

For more custom logic:

```lua
exports['XS-MultiCharacter']:RegisterSpawnProvider(function(source, playerData, location)
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

## Saved peds

There is no ped picker anywhere in this resource. It only remembers the model a character is already in.

If an admin or another resource sets a character to a ped, that model is saved with its components and props. The character screen shows the ped instead of the freemode preview, and the character spawns back in it on the next login. Put the character back on a freemode model and the saved ped is dropped, so it goes back to its normal clothing.

The ped is applied after the clothing resource has loaded the saved skin, then held for a few seconds in case that resource loads late. Timings are in `Config.Client.PedPersistence`.

`Config.Server.Ped` decides which models are worth remembering:

```lua
allowed = { 'a_m_m_farmer_01' },
blocked = { 'a_c_chop' }
```

Leave `allowed` empty to remember any ped. Names and hashes both work.

Turn it off in `Config.Server.Ped.enabled`. Turn off `Config.Client.PedPersistence.enabled` as well if you want the client to stop watching the model.

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

## Detail fields

The details panel shows occupation, position, affiliation, phone, nationality, account number, money, playtime, and where the character was last seen. Display toggles are in the client config.

Extra fields from the server config or other resources are added as rows at the bottom of the panel.

Simple metadata fields can be added in the server config:

```lua
metadataFields = {
    { key = 'callsign', label = 'Callsign' }
}
```

Other resources can add calculated information without editing this resource:

```lua
exports['XS-MultiCharacter']:RegisterDossierProvider(function(source, citizenid, playerRow, dossier)
    return {
        { label = 'Reputation', value = 'Trusted' },
        { label = 'Crew', value = 'Southside Customs' }
    }
end)
```

## Exports

Server:

```lua
exports['XS-MultiCharacter']:GetAllowedSlots(source)
exports['XS-MultiCharacter']:GetSelectedCharacter(source)
exports['XS-MultiCharacter']:CanUseSpawn(source, spawnId)
exports['XS-MultiCharacter']:RegisterSlotProvider(callback)
exports['XS-MultiCharacter']:RegisterDossierProvider(callback)
exports['XS-MultiCharacter']:RegisterSpawnProvider(callback)
exports['XS-MultiCharacter']:SetSlotOverride(license, slots, updatedBy)
exports['XS-MultiCharacter']:ResetSlotOverride(license)
```

Client:

```lua
exports['XS-MultiCharacter']:GetSelectedCharacter()
exports['XS-MultiCharacter']:IsSelectingCharacter()
```

## Events

Server-side lifecycle events:

```lua
XS-MultiCharacter:server:characterSelected -- source, playerData
XS-MultiCharacter:server:characterCreated  -- source, playerData
XS-MultiCharacter:server:characterDeleting -- source, citizenid
XS-MultiCharacter:server:characterDeleted  -- source, citizenid
XS-MultiCharacter:server:characterSpawned  -- source, playerData, spawnId
XS-MultiCharacter:server:starterKitGiven   -- source, citizenid, given
XS-MultiCharacter:server:characterEdited   -- adminSource, citizenid, before, after
```

Client-side lifecycle events:

```lua
XS-MultiCharacter:client:characterPreviewed -- character, previewPed
XS-MultiCharacter:client:characterSelected  -- citizenid, isNew, playerData
XS-MultiCharacter:client:spawnPreviewed     -- citizenid, location
XS-MultiCharacter:client:characterSpawned   -- citizenid, spawnId, coords
```

These are local lifecycle events for integrations. The resource does not expose an event or command that logs a player out and reopens character selection.

## First character flow

The default flow is:

```text
New character -> Arrival -> Apartment -> Clothing
```

The standard Qbox and QBCore apartment resources open first-character clothing after the apartment is picked, so it leaves that handoff to them. This keeps the apartment selector and clothing menu from opening over each other.

Auto only knows `qbx_apartments` and `qb-apartments`. If yours is a renamed fork, put its name in `Config.FirstCharacter.apartments.resource` so the handoff still happens.

With no apartment resource to hand off to, it spawns at `Config.Spawn.default` and opens clothing itself. Before it does, it waits for anything else that took the screen to close, and drops out entirely if another resource opens the first-character editor first. Timings are in `Config.FirstCharacter.clothing`.

Clothing opens with `qb-clothes:client:CreateFirstCharacter`, which qb-clothing, illenium-appearance, and fivem-appearance all listen for. If yours uses a different event, put it in `Config.FirstCharacter.clothing.firstCharacterEvent`.

If you use a custom apartment event that does not open clothing, set `Config.FirstCharacter.apartments.opensClothingAfterSelection` to `false`. It will use the clothing-first fallback and watch the events in `Config.FirstCharacter.clothing.finishedEvents` before opening your apartment event.

## Before going live

- Test the full new-character flow with the exact appearance and apartment versions on your server.
- Test one existing male and female character to confirm the saved appearance query matches your table.
- Check every camera location for interiors or map assets that only your server loads, including the arrival shots.
- Make sure the starter kit item names exist in your inventory. Anything missing is named in the server console.
- Keep spawn IDs unique.
- Grant `xs.multichar.admin` only to staff who should manage slot limits and edit character names.
- Do not start the old multicharacter resource beside this one.

## Documentation

Full setup guide, requirements and troubleshooting:
**[xyralscripts.dev/docs-xs-multicharacter](https://xyralscripts.dev/docs-xs-multicharacter)**

## Support

- **Found a bug?** [Open an issue](https://github.com/XyraL/XS-MultiCharacter/issues)
- **Need setup help?** [Join the Discord](https://discord.gg/XRURAw4TM2) — check the setup guide first, it usually has the answer

## My other scripts

All free, all source-available.

| Script | What it is |
|---|---|
| **[XS-CriminalTablet](https://github.com/XyraL/XS-CriminalTablet)** | modular criminal device for QBox and QBCore — gang ops, blackmarket and boosting in one encrypted tablet. |
| **[XS-MDT](https://github.com/XyraL/XS-MDT)** | multi-department MDT for QBox — police, EMS and fire with live CAD, records, patient care and a live unit map. |
| **[XS-AdminMenu](https://github.com/XyraL/XS-AdminMenu)** | advanced admin suite for QBox and QBCore — player management, bans, reports, inventory tools and entity inspection. |
| **[XS-Drone](https://github.com/XyraL/XS-Drone)** | deployable police drone for QBox and QBCore — smooth flight, thermal, spotlight, tracker darts and real counterplay. |
| **[XS-Trucking](https://github.com/XyraL/XS-Trucking)** | civilian trucking job for QBox and QBCore — live route map, truck ownership, fuel and maintenance, and companies. |
| **[XS-Dispatch](https://github.com/XyraL/XS-Dispatch)** | multi-department live dispatch for QBox and QBCore — responder tracking, priority calls, TAC radio and provider integrations. |

## License

Free to use on any server you own or operate, including commercial ones.
**Do not redistribute or resell** — see [LICENSE](LICENSE) for the full terms.
