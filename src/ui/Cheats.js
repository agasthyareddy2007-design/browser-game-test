import { Vehicle } from '../entities/Vehicle.js';
import * as THREE from 'three';

export class CheatsMenu {
  constructor(game) {
    this.game = game;
    this.modal = document.getElementById('pause-modal');
    this.statusEl = document.getElementById('cheat-status-msg');
    this.inputEl = document.getElementById('cheat-text-input');
    this.isPaused = false;

    this.setupListeners();
    this.populateMissionsTab();
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.modal.classList.remove('hidden');
      if (this.game.input) this.game.input.exitPointerLock();
    } else {
      this.modal.classList.add('hidden');
      if (this.game.input) this.game.input.requestPointerLock();
    }
  }

  setupListeners() {
    // Tabs
    const tabs = this.modal.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        const tabName = btn.dataset.tab;
        this.modal.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        const activeContent = document.getElementById('tab-' + tabName);
        if (activeContent) activeContent.classList.remove('hidden');
        if (tabName === 'multiplayer') this.updateMultiplayerPanel();
      });
    });

    // Multiplayer Disconnect
    const discBtn = document.getElementById('mp-disconnect-btn');
    if (discBtn) {
      discBtn.addEventListener('click', () => {
        if (this.game.multiplayerClient) {
          this.game.multiplayerClient.disconnect();
          this.game.hud.hideMultiplayerBadge();
          this.updateMultiplayerPanel();
        }
      });
    }

    // Resume button
    document.getElementById('resume-btn').addEventListener('click', () => {
      this.togglePause();
    });

    // Cheat buttons
    this.modal.querySelectorAll('.cheat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cheat = btn.dataset.cheat;
        this.executeCheat(cheat);
      });
    });

    // Cheat text submit
    const submitBtn = document.getElementById('cheat-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.submitTextCheat();
      });
    }
    if (this.inputEl) {
      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.submitTextCheat();
        }
      });
    }

    // Radio station selector
    this.modal.querySelectorAll('.radio-item').forEach(item => {
      item.addEventListener('click', () => {
        const stationIdx = parseInt(item.dataset.station, 10);
        const name = this.game.sound.setRadioStation(stationIdx);
        this.game.hud.setRadioName(name);
        this.modal.querySelectorAll('.radio-item').forEach(r => r.classList.remove('active'));
        item.classList.add('active');
      });
    });

    // Settings
    const invertY = document.getElementById('setting-invert-y');
    if (invertY) {
      invertY.checked = this.game.cameraController.invertY;
      invertY.addEventListener('change', (e) => {
        this.game.cameraController.invertY = e.target.checked;
        this.setStatus(`MOUSE LOOK: ${e.target.checked ? 'INVERTED' : 'NORMAL (STANDARD)'}`, '#ffcc00');
      });
    }

    const sensSlider = document.getElementById('setting-sensitivity');
    if (sensSlider) {
      sensSlider.addEventListener('input', (e) => {
        this.game.cameraController.mouseSensitivity = 0.0008 + (e.target.value / 100) * 0.0035;
      });
    }

    const shadowsSelect = document.getElementById('setting-shadows');
    if (shadowsSelect) {
      shadowsSelect.addEventListener('change', (e) => {
        if (e.target.value === 'low') {
          this.game.renderer.shadowMap.enabled = false;
        } else {
          this.game.renderer.shadowMap.enabled = true;
        }
      });
    }

    const vol = document.getElementById('setting-volume');
    if (vol) vol.addEventListener('input', (e) => this.game.sound.setMasterVolume(e.target.value / 100));

    const mus = document.getElementById('setting-music');
    if (mus) mus.addEventListener('input', (e) => this.game.sound.setMusicVolume(e.target.value / 100));

    const sfx = document.getElementById('setting-sfx');
    if (sfx) sfx.addEventListener('input', (e) => this.game.sound.setSfxVolume(e.target.value / 100));
  }

  submitTextCheat() {
    const text = this.inputEl.value.trim().toUpperCase();
    this.inputEl.value = '';
    if (!text) return;

    const aliases = {
      'GUNS': 'guns',
      'WEAPONS': 'guns',
      'BIGGUNS': 'guns',
      'HEALTH': 'health',
      'ASPIRINE': 'health',
      'HESOYAM': 'health',
      'MONEY': 'cash',
      'CASH': 'cash',
      'SUPERCAR': 'supercar',
      'CAR': 'supercar',
      'GETTHEREFAST': 'supercar',
      'MUSCLE': 'muscle',
      'POLICE': 'police',
      'COP': 'police',
      'TANK': 'tank',
      'PANZER': 'tank',
      'HELI': 'heli',
      'HELICOPTER': 'heli',
      'CLEARHEAT': 'clearheat',
      'LEAVEMEALONE': 'clearheat',
      'MAXHEAT': 'maxheat',
      'DAYNIGHT': 'daynight',
      'REPAIRS': 'repairs'
    };

    const action = aliases[text];
    if (action) {
      this.executeCheat(action);
    } else {
      this.setStatus('UNKNOWN CHEAT CODE', '#ff3344');
    }
  }

  executeCheat(code) {
    const p = this.game.player;
    const sound = this.game.sound;

    switch (code) {
      case 'guns':
        this.game.weaponSystem.unlockAllWeapons();
        this.setStatus('CHEAT ACTIVATED: ALL WEAPONS & MAX AMMO!', '#38ef7d');
        sound.playCashSound();
        break;

      case 'health':
        p.heal(100);
        p.addArmor(100);
        if (p.currentVehicle) p.currentVehicle.repair();
        this.setStatus('CHEAT ACTIVATED: 100% HEALTH & ARMOR!', '#38ef7d');
        sound.playCashSound();
        break;

      case 'cash':
        p.addCash(50000);
        this.setStatus('CHEAT ACTIVATED: +$50,000 CASH ADDED!', '#38ef7d');
        break;

      case 'supercar':
        this.spawnPlayerVehicle('supercar', 0xff0044);
        this.setStatus('CHEAT ACTIVATED: BANSHEE GT SUPERCAR SPAWNED!', '#38ef7d');
        break;

      case 'muscle':
        this.spawnPlayerVehicle('muscle', 0x2266dd);
        this.setStatus('CHEAT ACTIVATED: DOMINATOR V8 MUSCLE SPAWNED!', '#38ef7d');
        break;

      case 'police':
        this.spawnPlayerVehicle('police');
        this.setStatus('CHEAT ACTIVATED: POLICE CRUISER SPAWNED!', '#38ef7d');
        break;

      case 'tank':
        this.spawnPlayerVehicle('tank');
        this.setStatus('CHEAT ACTIVATED: RHINO TANK SPAWNED! 💥', '#38ef7d');
        break;

      case 'heli':
        this.spawnPlayerVehicle('helicopter');
        this.setStatus('CHEAT ACTIVATED: MAVERICK HELICOPTER SPAWNED!', '#38ef7d');
        break;

      case 'clearheat':
        this.game.policeManager.clearWantedLevel();
        this.setStatus('CHEAT ACTIVATED: WANTED HEAT CLEARED!', '#38ef7d');
        break;

      case 'maxheat':
        this.game.policeManager.setWantedLevel(5);
        this.setStatus('CHEAT ACTIVATED: ⭐⭐⭐⭐⭐ 5-STAR HEAT!', '#ff3344');
        break;

      case 'daynight':
        this.game.skyLighting.toggleDayNight();
        this.setStatus('CHEAT ACTIVATED: TIME OF DAY TOGGLED!', '#38ef7d');
        break;

      case 'repairs':
        if (p.currentVehicle) {
          p.currentVehicle.repair();
          this.setStatus('CHEAT ACTIVATED: VEHICLE FULLY REPAIRED!', '#38ef7d');
        } else {
          this.setStatus('NOT INSIDE A VEHICLE!', '#ffaa00');
        }
        break;
    }
  }

  spawnPlayerVehicle(type, primaryColor) {
    const p = this.game.player;
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.group.rotation.y);
    const spawnPos = p.position.clone().addScaledVector(forward, 5.0);
    spawnPos.y = (type === 'helicopter') ? 0.5 : 0.25;

    const v = new Vehicle(this.game.scene, this.game.sound, type, {
      position: spawnPos,
      rotationY: p.group.rotation.y,
      primaryColor: primaryColor
    });

    this.game.trafficManager.vehicles.push(v);
  }

  setStatus(msg, color) {
    if (this.statusEl) {
      this.statusEl.textContent = msg;
      this.statusEl.style.color = color;
      setTimeout(() => {
        if (this.statusEl.textContent === msg) {
          this.statusEl.textContent = '';
        }
      }, 3500);
    }
  }

  populateMissionsTab() {
    const container = document.getElementById('missions-list');
    if (!container || !this.game.missionManager) return;

    container.innerHTML = '';
    for (const m of this.game.missionManager.availableMissions) {
      const item = document.createElement('div');
      item.className = 'mission-item';
      item.innerHTML = `
        <div>
          <h4>${m.title}</h4>
          <p>Contact: <b>${m.giver}</b> | Reward: <b>$${m.reward.toLocaleString()}</b></p>
          <p style="font-size: 11px; margin-top: 2px;">${m.desc}</p>
        </div>
        <button class="mission-start-btn" data-mission="${m.id}">START</button>
      `;
      item.querySelector('button').addEventListener('click', () => {
        this.game.missionManager.startMission(m.id);
        this.togglePause();
      });
      container.appendChild(item);
    }
  }

  updateMultiplayerPanel() {
    const statusEl = document.getElementById('mp-pause-status');
    const roomEl = document.getElementById('mp-pause-room-code');
    const listEl = document.getElementById('mp-players-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    const mp = this.game.multiplayerClient;

    if (!mp || !mp.isConnected) {
      if (statusEl) {
        statusEl.textContent = 'STATUS: OFFLINE / SOLO';
        statusEl.style.color = '#8ea1b7';
      }
      if (roomEl) roomEl.textContent = 'ROOM: NONE';
      listEl.innerHTML = '<div style="color: #7b8e9f; font-size: 12px; padding: 12px;">You are currently playing offline. Host or join a room from the start menu to play multiplayer.</div>';
      return;
    }

    if (statusEl) {
      statusEl.textContent = 'STATUS: CONNECTED (ONLINE)';
      statusEl.style.color = '#2ecc71';
    }
    if (roomEl) roomEl.textContent = `ROOM: ${mp.roomCode}`;

    // Add local player
    const selfItem = document.createElement('div');
    selfItem.className = 'mp-player-item';
    selfItem.innerHTML = `
      <div class="mp-player-name">
        <span style="color: #${mp.color ? mp.color.toString(16).padStart(6, '0') : '00d2d3'}">●</span>
        <span>${escapeHtml(mp.username)}</span>
        <span class="mp-player-badge">YOU</span>
      </div>
      <div class="mp-player-status">${this.game.player.isInVehicle ? 'Driving ' + this.game.player.currentVehicle.name : 'On Foot'}</div>
    `;
    listEl.appendChild(selfItem);

    // Add remote players
    for (const rp of mp.remotePlayers.values()) {
      const pItem = document.createElement('div');
      pItem.className = 'mp-player-item';
      pItem.innerHTML = `
        <div class="mp-player-name">
          <span style="color: #${rp.color ? rp.color.toString(16).padStart(6, '0') : '00d2d3'}">●</span>
          <span>${escapeHtml(rp.username)}</span>
        </div>
        <div class="mp-player-status">${rp.vehicleData ? 'In ' + rp.vehicleData.name : 'On Foot'}</div>
      `;
      listEl.appendChild(pItem);
    }
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
