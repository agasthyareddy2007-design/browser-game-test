# METROPOLIS: VICE DISTRICT - 3D Open World Action Game

A full-featured, open-world 3D browser crime action game inspired by Grand Theft Auto (GTA). Built with Three.js, Web Audio API, and modern WebGL.

---

## 🌟 Key Features

### 🏙️ Metropolis Open-World Environment
- **Multi-District Layout**:
  - **Downtown Financial District**: Towering corporate skyscrapers, rooftop helipads, neon billboards, glass facades.
  - **Vice Beach Promenade**: Art Deco pastel hotels, neon lighting, sandy beach avenues, swaying palm trees.
  - **Industrial Shipping Docks**: Cargo container mazes, warehouse garages, industrial cranes.
  - **Midtown Commercial**: Ammu-Nation gun shop, Pay 'n' Spray garage, gas station with explosive pumps.
- **Dynamic Sky & Day/Night Cycle**:
  - Real-time rotating sun and moon with soft dynamic shadows.
  - Ambient transitions (crisp daylight, golden hour dusk, glowing cyberpunk night with illuminated neon and streetlights).
- **Interactive Street Environment**:
  - Fire hydrants that rupture and blast a towering geyser of water particles when hit or shot!
  - Street lamps that can be collided with and illuminate at night.
  - Multi-level parking garage and mega stunt ramps for insane aerial jumps.
  - Surrounding ocean with animated wave physics.

---

### 🚗 Drivable Vehicles & Arcade Physics
- **Multiple Vehicle Classes**:
  1. **Banshee GT**: Exotic supercar with twin racing stripes, massive rear spoiler, extreme acceleration and drift capability.
  2. **Dominator V8**: Bulky muscle car with exposed supercharger scoop, deep engine roar, and burnout smoke.
  3. **VCPD Interceptor**: Police patrol cruiser with dual strobe red & blue lightbars, siren, and reinforced push bullbar.
  4. **Rhino Tank**: Secret military heavy vehicle with a 360° rotating turret and high-explosive cannon!
  5. **Maverick Attack Helicopter**: Free-flight rotor physics (takeoff, hover, altitude climb, yaw, pitch, roll).
- **Arcade Vehicle Dynamics**:
  - Raycast & box suspension, steering with high-speed scaling.
  - Drifting & handbrake power slides with tire skidmarks and smoke emitters.
  - Nitro Boost (Shift) with speed punch and FOV kick.
  - Vehicle damage, engine smoke, fire, and catastrophic explosions.
  - Working headlights [L], horn / police siren [H], and radio stations [R].

---

### 🏃 Character Controller & Combat Arsenal
- **Procedural 3D Character Rig**:
  - Smooth third-person orbital camera (360° mouse look with collision avoidance).
  - Walk, sprint, stamina depletion, jump, and punch combos.
  - Aim-down-sights (Right Click) over-the-shoulder view with tactical crosshair.
  - Seamless enter/exit vehicle transitions [F].
  - Hospital and Police Station respawns with slow-mo "WASTED" and "BUSTED" cinematic cameras.
- **Weapons Arsenal**:
  1. **Fists**: Melee combos with physical knockback.
  2. **9mm Pistol**: Semi-automatic sidearm with punchy gunshot transients and tracers.
  3. **Micro SMG**: High-rate-of-fire machine gun (capable of drive-by shooting while in a vehicle!).
  4. **Combat Shotgun**: 8-pellet spread blast with devastating close-range stopping power.
  5. **RPG-7 Rocket Launcher**: Flying rocket projectile with smoke trail and massive explosive shockwave radius!

---

### 🚔 5-Star Wanted System & Police Pursuit
- **Wanted Star Ratings (1 - 5 Stars)**:
  - **1 Star**: Investigated by local patrol units for carjacking or assault.
  - **2 Stars**: Active cruiser chase with sirens wailing, ramming, and sidearm gunfire.
  - **3 Stars**: Multiple cruisers perform aggressive PIT maneuvers and roadblocks.
  - **4 Stars**: SWAT tactical enforcers with high-speed pursuit.
  - **5 Stars**: Maximum heat — Military Rhino Tanks dispatched to intercept player!
- **Evasion & Pay 'n' Spray**:
  - Evade line of sight in back alleys for 18 seconds to drop heat.
  - Drive into the Pay 'n' Spray garage for an instant vehicle repair, fresh coat of paint, and wanted level wipe.

---

### 🎯 Story Missions & Activities
- **Mission 1: The Grand Theft Auto** (*Contact: Tony the Fixer*)
  - Infiltrate the downtown rooftop parking garage, steal the prototype supercar, evade 2-star police heat, and deliver to Tony's Chop Shop!
- **Mission 2: Syndicate Dock Ambush** (*Contact: Vito the Don*)
  - Ambush rival syndicate guards at the industrial docks, eliminate goons, and seize the $15,000 cash briefcase.
- **Mission 3: Nitro Speed Run / Bomb Van** (*Contact: Speedy Pete*)
  - A bomb has been rigged! Maintain speed above 35 MPH and hit all city checkpoints before time runs out!

---

### 📻 Procedural Web Audio Synth & Radio Stations
- Zero external MP3 dependencies — 100% procedural Web Audio synthesizer:
  - Dynamic engine sound modulated by vehicle RPM and throttle.
  - Tire screeches, metal crashes, gunshots, rocket launches, and explosions.
  - Two-tone police sirens.
  - 3 procedural synthesized radio music stations:
    1. **Vice Synthwave FM** (124 BPM retro outrun synth).
    2. **Metro Drift Phonk** (138 BPM 808 sub & cowbell lead).
    3. **Ocean Drive Lo-Fi** (85 BPM Rhodes chill chords).
    4. **Radio Off**.

---

### 🌐 LAN / Same-Network Multiplayer
- **Join by Room Code & Username**:
  - Host a private room with any custom Room Code (e.g., `VICE`, `7788`, `TURBO`).
  - Friends on the same Wi-Fi / LAN network or machine can enter their own username and the matching Room Code to connect instantly!
- **Real-Time Synchronized Combat & World**:
  - Live 3D avatars with overhead nameplates, customizable shirts, and health bars.
  - Smooth 22Hz interpolated position and orientation synchronization.
  - Synchronized weapon fire, animated bullet tracers, muzzle flash, and hit reaction sparks.
  - Live PvP damage, kills, and kill feed notifications (e.g. `Alpha [9MM] Bravo`).
  - Remote players rendered live as colored blips on the GPS radar minimap and fullscreen map.
- **In-Game Text Chat**:
  - Press `T` anytime to open the chat console.
  - Type messages and press `Enter` to broadcast to all players in your room.
- **Multiplayer Pause Menu Panel**:
  - Press `ESC` -> click the `MULTIPLAYER` tab to view the active player roster, driver/on-foot status, room code, and one-click leave button.

---

## 🎮 Controls

| Key | Action |
| --- | --- |
| **W, A, S, D** | Move Character / Steer Vehicle / Fly Helicopter |
| **Mouse** | 360° Camera Look / Weapon Aiming |
| **Left Click (LMB)** | Melee Punch / Shoot Weapon / Vehicle Fire |
| **Right Click (RMB)** | Aim Down Sights (Zoom) |
| **F or Enter** | Enter / Exit Vehicle or Helicopter |
| **Spacebar** | Jump (Foot) / Handbrake Drift (Car) / Ascend (Heli) |
| **Left Shift** | Sprint (Foot) / Nitro Boost (Car) / Descend (Heli) |
| **1, 2, 3, 4, 5** | Select Weapon (Fists, Pistol, SMG, Shotgun, RPG) |
| **Mouse Wheel** | Cycle Next / Previous Weapon |
| **T** | Multiplayer In-Game Chat |
| **H** | Honk Horn (Car) / Police Siren Strobe |
| **L** | Toggle Car Headlights |
| **R** | Cycle Radio Station |
| **C** | Rearview Mirror / Look Back Camera |
| **M** | Fullscreen Metropolis GPS Map |
| **ESC or P** | Pause Menu / Cheat Codes Console |

---

## ⚡ Secret Cheat Codes
Open the Pause Menu (`ESC` or `P`) to click cheat buttons, or type any of the following classic cheat codes:

- `GUNS` — All weapons unlocked with maximum ammunition.
- `HEALTH` — 100% Health + 100% Kevlar Armor + Vehicle Repair.
- `CASH` — Instant +$50,000 cash bonus.
- `SUPERCAR` — Spawns a tuned Banshee GT supercar right in front of you.
- `MUSCLE` — Spawns the Dominator V8 muscle car.
- `POLICE` — Spawns a Police Cruiser.
- `TANK` — Spawns the unstoppable Rhino Tank.
- `HELI` — Spawns the Maverick Helicopter.
- `CLEARHEAT` — Clears all active wanted stars immediately.
- `MAXHEAT` — Sets wanted level to 5-Star Maximum Heat!
- `DAYNIGHT` — Fast-forwards the time of day (day/night toggle).
- `REPAIRS` — Fully repairs current vehicle.

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start Vite development server & WebSocket multiplayer server
npm run dev

# Or run the standalone Node production server
npm run server

# Build production bundle
npm run build
```

### 🤝 Playing with Friends on Same Wi-Fi / LAN
1. Find the host computer's Local IPv4 Address (run `ipconfig` on Windows or `ifconfig` on Mac/Linux — e.g. `192.168.1.50`).
2. Have friends open that IP in their browser: `http://<HOST_IP>:5173/` (e.g. `http://192.168.1.50:5173/`).
3. Enter your desired **Username** and agree on a **Room Code** (e.g. `VICE`).
4. Click **HOST / CREATE ROOM** or **JOIN ROOM CODE** to play together in real-time!
