import * as THREE from 'three';
import { InputManager } from './Input.js';
import { SoundEffects } from './Audio.js';
import { CameraController } from './CameraController.js';
import { SkyAndLighting } from '../world/SkyAndLighting.js';
import { Water } from '../world/Water.js';
import { RoadNetwork } from '../world/RoadNetwork.js';
import { Buildings } from '../world/Buildings.js';
import { Props } from '../world/Props.js';
import { Player } from '../entities/Player.js';
import { TrafficManager } from '../entities/TrafficManager.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { PoliceManager } from '../systems/PoliceManager.js';
import { MissionManager } from '../missions/MissionManager.js';
import { Radar } from '../ui/Radar.js';
import { HUD } from '../ui/HUD.js';
import { CheatsMenu } from '../ui/Cheats.js';
import { MultiplayerClient } from '../multiplayer/MultiplayerClient.js';

export class Engine {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.lastTime = performance.now();
    this.elapsedTime = 0;

    // Scene & Renderer
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Camera
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1200);

    // Systems
    this.input = new InputManager(this.canvas);
    this.sound = new SoundEffects();
    this.cameraController = new CameraController(this.camera, this.canvas);

    this.skyLighting = new SkyAndLighting(this.scene);
    this.water = new Water(this.scene);
    this.roadNetwork = new RoadNetwork(this.scene);
    this.buildings = new Buildings(this.scene, this.roadNetwork, this.skyLighting);
    this.props = new Props(this.scene, this.roadNetwork, this.skyLighting);

    this.player = new Player(this.scene, this.sound);
    this.trafficManager = new TrafficManager(this.scene, this.sound, this.roadNetwork, this.buildings);
    this.weaponSystem = new WeaponSystem(this.scene, this.sound);
    this.policeManager = new PoliceManager(this.scene, this.sound, this.trafficManager, this.buildings);
    this.missionManager = new MissionManager(
      this.scene,
      this.sound,
      this.player,
      this.trafficManager,
      this.policeManager,
      this.buildings
    );

    this.radar = new Radar('radar-canvas', 'fullmap-canvas', this.roadNetwork, this.buildings);
    this.hud = new HUD();
    this.cheatsMenu = new CheatsMenu(this);
    this.multiplayerClient = new MultiplayerClient(this);

    // State
    this.isRunning = false;
    this.isMapOpen = false;
    this.currentDistrict = 'DOWNTOWN METROPOLIS';

    this.setupEvents();
    this.setupMultiplayer();
  }

  setupMultiplayer() {
    this.multiplayerClient.onConnected = (room) => {
      this.hud.showMultiplayerBadge(room, 1);
    };

    this.multiplayerClient.onRoomUpdated = (count) => {
      this.hud.updateMultiplayerCount(count);
      if (this.cheatsMenu && this.cheatsMenu.updateMultiplayerPanel) {
        this.cheatsMenu.updateMultiplayerPanel();
      }
    };

    this.multiplayerClient.onKillFeed = (killer, victim, weapon) => {
      this.hud.addKillFeedEntry(killer, victim, weapon);
    };

    this.multiplayerClient.onChatReceived = (sender, text, color) => {
      this.hud.addChatMessage(sender, text, color);
    };

    // Chat input event listeners
    const chatInput = document.getElementById('mp-chat-input');
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = chatInput.value.trim();
          if (val) {
            this.multiplayerClient.sendChat(val);
          }
          this.hud.closeChatInput();
          this.input.requestPointerLock();
        } else if (e.key === 'Escape') {
          this.hud.closeChatInput();
          this.input.requestPointerLock();
        }
      });
    }
  }

  setupEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Populate username input if remembered
    const usernameInput = document.getElementById('mp-username-input');
    if (usernameInput) {
      usernameInput.value = this.multiplayerClient.username || 'Player';
    }

    const launchGameCommon = () => {
      document.getElementById('start-screen').classList.add('hidden');
      this.input.requestPointerLock();
      this.sound.resume();
      this.sound.startRadio();
      this.hud.setRadioName(this.sound.radioTracks[0].name);
      this.isRunning = true;
    };

    // Host / Create Room Button
    const hostBtn = document.getElementById('mp-host-btn');
    if (hostBtn) {
      hostBtn.addEventListener('click', () => {
        const username = usernameInput ? usernameInput.value : 'Player';
        const roomInput = document.getElementById('mp-room-input');
        let room = roomInput ? roomInput.value.trim().toUpperCase() : '';
        if (!room) {
          const randCodes = ['VICE', 'PALM', 'NEON', 'CITY', 'HEIST', 'TURBO'];
          room = randCodes[Math.floor(Math.random() * randCodes.length)];
          if (roomInput) roomInput.value = room;
        }
        this.multiplayerClient.connect(room, username);
        launchGameCommon();
      });
    }

    // Join Room Button
    const joinBtn = document.getElementById('mp-join-btn');
    if (joinBtn) {
      joinBtn.addEventListener('click', () => {
        const username = usernameInput ? usernameInput.value : 'Player';
        const roomInput = document.getElementById('mp-room-input');
        const room = roomInput ? (roomInput.value.trim().toUpperCase() || 'VICE') : 'VICE';
        this.multiplayerClient.connect(room, username);
        launchGameCommon();
      });
    }

    // Start Screen Solo (Offline)
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        launchGameCommon();
      });
    }

    // Canvas click to re-lock pointer
    this.canvas.addEventListener('click', () => {
      if (this.isRunning && !this.cheatsMenu.isPaused && !this.isMapOpen) {
        this.input.requestPointerLock();
      }
    });

    // Fullscreen Map Modal Close button
    const closeMapBtn = document.getElementById('close-map-btn');
    if (closeMapBtn) {
      closeMapBtn.addEventListener('click', () => {
        this.toggleFullMap();
      });
    }

    // Keyboard Hotkeys
    this.input.onKeyDown((e) => {
      if (!this.isRunning) return;

      // ESC or P: Pause / Cheats Menu
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.isMapOpen) {
          this.toggleFullMap();
        } else {
          this.cheatsMenu.togglePause();
        }
      }

      // M: Fullscreen Map
      if (e.code === 'KeyM') {
        if (!this.cheatsMenu.isPaused) {
          this.toggleFullMap();
        }
      }

      // F or Enter: Enter / Exit Vehicle
      if (e.code === 'KeyF' || e.code === 'Enter') {
        this.toggleVehicleEnterExit();
      }

      // H: Horn or Police Siren
      if (e.code === 'KeyH') {
        if (this.player.isInVehicle && this.player.currentVehicle) {
          if (this.player.currentVehicle.type === 'police') {
            this.player.currentVehicle.toggleSiren();
          } else {
            this.sound.playHorn(true);
            setTimeout(() => this.sound.playHorn(false), 300);
          }
        }
      }

      // L: Headlights toggle
      if (e.code === 'KeyL') {
        if (this.player.isInVehicle && this.player.currentVehicle) {
          this.player.currentVehicle.toggleHeadlights();
        }
      }

      // R: Radio station cycle
      if (e.code === 'KeyR') {
        if (this.player.isInVehicle) {
          const stationName = this.sound.cycleRadioStation();
          this.hud.setRadioName(stationName);
        }
      }

      // E: Interactive Shop or Garage
      if (e.code === 'KeyE') {
        this.handleContextInteraction();
      }

      // T: In-game Multiplayer Chat
      if (e.code === 'KeyT') {
        if (!this.cheatsMenu.isPaused && !this.isMapOpen && !this.hud.isChatInputOpen()) {
          e.preventDefault();
          this.hud.openChatInput();
          this.input.exitPointerLock();
          return;
        }
      }

      // 1-5: Weapon select
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code)) {
        const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
        this.weaponSystem.selectWeaponByIndex(idx);
        this.weaponSystem.attachToPlayerBone(this.player.weaponBone);
      }
    });

    // Mission callbacks
    this.missionManager.onMissionCompleted = (m) => {
      this.hud.showMissionPassed(m);
    };

    // Attach starting weapon to player bone
    this.weaponSystem.attachToPlayerBone(this.player.weaponBone);
  }

  toggleFullMap() {
    this.isMapOpen = !this.isMapOpen;
    const modal = document.getElementById('fullmap-modal');
    if (this.isMapOpen) {
      modal.classList.remove('hidden');
      this.input.exitPointerLock();
      this.radar.renderFullscreenMap(this.player.position, this.missionManager, this.multiplayerClient);
    } else {
      modal.classList.add('hidden');
      this.input.requestPointerLock();
    }
  }

  toggleVehicleEnterExit() {
    if (this.player.isInVehicle) {
      // Exit Vehicle
      const car = this.player.currentVehicle;
      car.isOccupied = false;
      this.sound.stopEngine();

      // Spawn player on left side of car
      const leftVec = new THREE.Vector3(-1.8, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.mesh.rotation.y);
      this.player.position.copy(car.mesh.position).add(leftVec);
      this.player.position.y = 0.25;
      this.player.velocity.set(0, 0, 0);
      this.player.isInVehicle = false;
      this.player.currentVehicle = null;

      this.cameraController.setMode('foot');
    } else {
      // Enter Vehicle check
      const closest = this.trafficManager.getClosestVehicle(this.player.position, 4.5);
      if (closest && !closest.isDestroyed) {
        this.player.isInVehicle = true;
        this.player.currentVehicle = closest;
        closest.isOccupied = true;

        if (closest.type === 'helicopter') {
          this.cameraController.setMode('helicopter');
        } else {
          this.cameraController.setMode('vehicle');
          this.sound.startEngine(closest.type);
        }

        // Carjacking crime report if not own car
        this.policeManager.reportCrime('carjack');
      }
    }
  }

  handleContextInteraction() {
    const pPos = this.player.position;
    const locs = this.buildings.interactiveLocations;

    // Pay 'n' Spray Garage check
    if (locs.payNSpray && pPos.distanceTo(locs.payNSpray) < 8.0) {
      if (this.player.isInVehicle && this.player.currentVehicle) {
        this.player.currentVehicle.repair();
        this.policeManager.clearWantedLevel();
        this.sound.playCashSound();
        this.cheatsMenu.setStatus("PAY 'N' SPRAY: CAR REPAIRED & HEAT WIPED!", '#38ef7d');
      }
    }

    // Ammu-Nation Store check
    if (locs.ammuNation && pPos.distanceTo(locs.ammuNation) < 7.0) {
      if (this.player.cash >= 1000) {
        this.player.cash -= 1000;
        this.weaponSystem.unlockAllWeapons();
        this.player.addArmor(100);
        this.sound.playCashSound();
        this.cheatsMenu.setStatus('AMMU-NATION: PURCHASED FULL WEAPONS & KEVLAR ARMOR!', '#38ef7d');
      } else {
        this.cheatsMenu.setStatus('AMMU-NATION: NEED $1,000 CASH!', '#ff3344');
      }
    }
  }

  determineDistrict(pos) {
    if (pos.x < -40 && pos.z < -40) return 'INDUSTRIAL SHIPPING DOCKS';
    if (pos.x > 30) return 'VICE BEACH BOULEVARD';
    if (pos.z > 40) return 'MIDTOWN COMMERCIAL DISTRICT';
    return 'DOWNTOWN METROPOLIS';
  }

  handlePlayerDeath() {
    this.hud.showWasted();
    this.sound.playWastedSound();
    this.policeManager.clearWantedLevel();

    // Respawn at Hospital after 3.2 seconds
    setTimeout(() => {
      const hospPos = this.buildings.interactiveLocations.hospital || new THREE.Vector3(0, 0.25, 0);
      this.player.respawn(hospPos.clone().add(new THREE.Vector3(0, 0, 5)));
      this.player.cash = Math.max(0, this.player.cash - 500); // Hospital fee
      if (this.player.isInVehicle) {
        this.player.isInVehicle = false;
        this.player.currentVehicle = null;
        this.cameraController.setMode('foot');
      }
    }, 3200);
  }

  handlePlayerBusted() {
    this.hud.showBusted();
    this.sound.playWastedSound();
    this.policeManager.clearWantedLevel();

    // Respawn at Police precinct after 3.2 seconds
    setTimeout(() => {
      const pdPos = this.buildings.interactiveLocations.policeStation || new THREE.Vector3(0, 0.25, 0);
      this.player.respawn(pdPos.clone().add(new THREE.Vector3(0, 0, 5)));
      this.player.cash = Math.max(0, this.player.cash - 1000); // Bail fee
      if (this.player.isInVehicle) {
        this.player.isInVehicle = false;
        this.player.currentVehicle = null;
        this.cameraController.setMode('foot');
      }
    }, 3200);
  }

  start() {
    this.lastTime = performance.now();
    this.loop();
  }

  loop() {
    requestAnimationFrame(() => this.loop());

    const now = performance.now();
    const delta = Math.min(0.1, (now - this.lastTime) * 0.001);
    this.lastTime = now;
    this.elapsedTime += delta;
    const elapsedTime = this.elapsedTime;

    if (!this.cheatsMenu.isPaused) {
      // 1. Mouse wheel weapon cycling
      if (this.input.mouse.wheelDelta !== 0) {
        if (this.input.mouse.wheelDelta > 0) this.weaponSystem.cycleNext();
        else this.weaponSystem.cyclePrev();
        this.weaponSystem.attachToPlayerBone(this.player.weaponBone);
      }

      // 2. Weapon shooting / attack input
      if (this.input.mouse.leftButton && !this.isMapOpen && !this.hud.isChatInputOpen()) {
        this.weaponSystem.shoot(
          this.player,
          this.cameraController,
          this.trafficManager,
          (crime) => this.policeManager.reportCrime(crime),
          this.multiplayerClient
        );
      }

      // 3. Aim Mode
      if (this.input.mouse.rightButton && !this.player.isInVehicle) {
        this.cameraController.setMode('aim');
      } else if (!this.player.isInVehicle && this.cameraController.mode === 'aim') {
        this.cameraController.setMode('foot');
      }

      // 4. Update Player
      this.player.update(
        delta,
        this.input,
        this.cameraController,
        this.buildings.buildingColliders
      );

      // Death check
      if (this.player.isDead && !this._isHandlingDeath) {
        this._isHandlingDeath = true;
        this.handlePlayerDeath();
        setTimeout(() => { this._isHandlingDeath = false; }, 3500);
      }

      // 5. Update Current Driven Vehicle
      if (this.player.isInVehicle && this.player.currentVehicle) {
        this.player.currentVehicle.update(delta, this.input, this.buildings.buildingColliders);
        this.player.position.copy(this.player.currentVehicle.mesh.position);
      }

      // 6. Update Camera Target
      const camTarget = this.player.isInVehicle
        ? this.player.currentVehicle.mesh.position
        : this.player.position;

      this.cameraController.update(
        delta,
        camTarget,
        this.input,
        this.buildings.buildingColliders,
        this.player.currentVehicle
      );

      // 7. Update Weapons, Projectiles, and Tracers
      this.weaponSystem.update(delta, this.trafficManager, this.cameraController, this.player, this.multiplayerClient);

      // 7b. Update Multiplayer Network & Remote Players
      if (this.multiplayerClient) {
        this.multiplayerClient.update(delta);
      }

      // 8. Update Traffic & Ambient Pedestrians
      this.trafficManager.update(delta, this.player.position, this.player.currentVehicle, this.player);

      // 9. Update Wanted & Police Pursuit
      this.policeManager.update(delta, this.player, this.cameraController, () => {
        this.handlePlayerBusted();
      });

      // 10. Update Active Missions
      this.missionManager.update(delta, this.player.position, this.player.currentVehicle);

      // 11. Update Sky, Day/Night Cycle, Water & Props
      this.skyLighting.update(delta, this.player.position);
      this.water.update(elapsedTime);
      this.props.update(delta, this.player.position, (pickup) => {
        if (pickup.type === 'cash') this.player.addCash(pickup.amount);
        else if (pickup.type === 'health') { this.player.heal(50); this.sound.playCashSound(); }
        else if (pickup.type === 'armor') { this.player.addArmor(50); this.sound.playCashSound(); }
        else if (pickup.type === 'weapon') {
          this.weaponSystem.weapons[pickup.weapon].unlocked = true;
          this.weaponSystem.weapons[pickup.weapon].reserve += 60;
          this.sound.playCashSound();
        }
      });

      // 12. District check
      this.currentDistrict = this.determineDistrict(this.player.position);

      // 13. Context Action Prompts
      if (!this.player.isInVehicle) {
        const nearCar = this.trafficManager.getClosestVehicle(this.player.position, 4.5);
        if (nearCar) {
          this.hud.showPrompt('F', `ENTER ${nearCar.name}`);
        } else if (this.buildings.interactiveLocations.payNSpray && this.player.position.distanceTo(this.buildings.interactiveLocations.payNSpray) < 8.0) {
          this.hud.showPrompt('E', 'PAY \'N\' SPRAY GARAGE');
        } else if (this.buildings.interactiveLocations.ammuNation && this.player.position.distanceTo(this.buildings.interactiveLocations.ammuNation) < 7.0) {
          this.hud.showPrompt('E', 'AMMU-NATION: BUY ARSENAL & ARMOR ($1,000)');
        } else {
          this.hud.hidePrompt();
        }
      } else {
        this.hud.showPrompt('F', 'EXIT VEHICLE');
      }

      // 14. Update Minimap Radar & HUD
      this.radar.update(
        this.player.position,
        this.cameraController.yaw,
        this.trafficManager,
        this.policeManager,
        this.missionManager,
        this.multiplayerClient
      );

      this.hud.update(
        this.player,
        this.player.currentVehicle,
        this.policeManager,
        this.missionManager,
        this.skyLighting,
        this.weaponSystem,
        this.currentDistrict
      );
    }

    // Reset frame input delta
    this.input.update();

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}
