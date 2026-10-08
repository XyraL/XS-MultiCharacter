# Changelog

## 3.0.1

- New characters on Qbox get the qbx_properties apartment picker again, and the clothing editor waits until an apartment is picked
- The clothing editor also waits for any other screen that uses its own camera
- The arrival camera no longer flies into the airport. A shot that would pass through a building is raised until it is clear

## 3.0.0

New look, a starter kit, and a few new things for staff.

- New character screen: every character is a card with their photo, and a panel shows their details
- New characters get a starter kit: cash, bank and any items you set in config/server.lua
- The new character screen shows the starter kit, so players see what they get
- Brand new characters land at the airport in a short arrival scene. Space skips it
- Spawning uses cards for places. Click one to look at it, then spawn
- Staff can search every character in /charslots and fix a name or date of birth, online or offline
- Fixed a failed create or load leaving the player with no mouse
- Fixed a crash when a search or a message had a % in it

## Updating
Replace the whole folder, then copy your settings into the new config/client.lua and config/server.lua. The UI section changed and there are new starter kit, photos and arrival sections. No SQL to run.
