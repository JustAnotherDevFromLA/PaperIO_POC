# Papel.io Patch Notes

## v1.4 - The Global Competition & Polish Update
*May 12, 2026*

This patch transforms Papel.io from a purely local experience into a truly global competition, introducing a backend-powered leaderboard, rigorous in-game session timing, and bulletproof fixes for mobile browser audio policies.

### 🌍 Global Leaderboard API
* **True Global Rankings:** Shifted from `localStorage` to a serverless Vercel API powered by an Upstash Redis database. Players worldwide now compete on the exact same leaderboard.
* **Smart Sorting:** The leaderboard mathematically ranks players by identifying the absolute **Highest Score** (territory controlled) followed strictly by the **Lowest Time** (fastest match completion).
* **Offline Resilience:** The game engine gracefully falls back to local storage caching if the global API or your internet connection drops, ensuring your high scores are never lost.
* **UI Integration:** Added slick new Leaderboard toggle buttons to both the Main Menu and Game Over screens, displaying the Top 100 global runs.

### ⏱️ Synchronized HUD Timer
* **Real-time Session Tracking:** A dynamic timer has been injected directly into the HUD, giving players a live view of their match duration.
* **Cinematic Engine Sync:** To preserve true "game engine time," the timer now purposefully continues to tick while you are dead and waiting to respawn. However, it dynamically fast-forwards at **2x speed** to perfectly mirror the internal engine's accelerated respawn sequence.

### 🎵 iOS Web Audio Unlocker
* **Bulletproof Audio Context:** Fixed a pervasive issue where modern mobile browsers (especially iOS WebKit) would aggressively suspend the game's sound engine. 
* **Zero-Latency Audio Engine:** The exact millisecond you tap the screen, the game now generates an invisible 10ms transient oscillator tone to forcibly "unlock" Apple's media restrictions permanently.
* **Graceful Suspensions:** Hardened all sound playback functions (`playHitSound`, `playTurnSound`) with aggressive `.resume()` checks and Promise catchers to prevent game-crashing DOM Exceptions when audio thread drift occurs.

### ⚙️ Bug Fixes
* **Menu Navigation:** Fixed a regression where clicking the "Menu" button from the Game Over screen would fail to wipe the cinematic crown overlays and unmount the DOM properly.

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
