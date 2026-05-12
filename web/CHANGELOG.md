# Papel.io Patch Notes

## v1.3 - The Rendering & Stability Update
*May 11, 2026*

This major patch focuses heavily on stabilizing the core rendering pipeline, refining cinematic game transitions, and ensuring absolute precision for territory captures and trail displays. All recent experimental optimizations that caused visual artifacts have been stripped away and replaced with bulletproof, mathematically precise drawing routines.

### 🎨 Rendering & Visual Polish
* **Perfectly Solid Trails:** Completely overhauled trail rendering. Trails are no longer drawn as overlapping discrete blocks (which caused dark alpha-blending spots and sub-pixel seams). Instead, trails are now rendered as a single, continuous mathematical stroke (`ctx.lineTo`) that connects seamlessly to your moving head.
* **Win Celebration Alignment:** Fixed a major bug where the player square and the crown would "float" away from each other during the end-of-game modal. The celebration jump animation now occurs directly on the physical board canvas rather than a detached full-screen overlay, ensuring perfect 1:1 alignment with the final cell you captured.
* **Shadow Removal:** Removed the harsh drop-shadow from the player/bot square on the game over celebration screen, leaving a much cleaner aesthetic.
* **Glow Precision:** Hitmarkers and death glows have been tightened up to strictly obey grid limits without sub-pixel bleeding.

### 🎥 Camera & Cinematic Transitions
* **Hard-Lock Gameplay Camera:** The camera now completely hard-locks to the player during active gameplay. This prevents panning interpolation lag and guarantees the player always has the maximum possible reaction time when approaching the edge of the board.
* **Snappier Respawn & Deaths:** The cinematic zoom-in/zoom-out effects triggered upon respawning or dying have been sped up by 2x to reduce downtime and get players back into the action faster.

### ⚙️ Engine Stability & Bug Fixes
* **Disappearing Trail Bug Fixed:** Identified and removed a faulty mathematical viewport-culling boundary that was causing portions of active trails to magically disappear when a player turned sharply inside enemy territory. 
* **Bulletproof Territory Capture:** Reverted highly aggressive O(1) area capture optimizations that accidentally broke the core logic for deleting trails trapped inside newly captured areas. The game now correctly processes physical boundary overlaps, preventing "ghost" trails or invisible death traps.

### 📱 PWA & Mobile Enhancements
* **Cache Bumping:** Aggressively bumped service worker caching to ensure mobile Safari and Chrome users immediately receive the overhauled `v1.3` rendering logic without needing to clear local app data.
