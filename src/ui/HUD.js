export class HUD {
  constructor() {
    // DOM Elements
    this.cashEl = document.getElementById('cash-display');
    this.starsEl = document.getElementById('wanted-stars');
    this.weaponIconEl = document.getElementById('weapon-icon');
    this.ammoClipEl = document.getElementById('ammo-clip');
    this.ammoReserveEl = document.getElementById('ammo-reserve');
    this.weaponNameEl = document.getElementById('weapon-name');
    this.timeEl = document.getElementById('time-display');

    this.healthBar = document.getElementById('health-bar');
    this.armorBar = document.getElementById('armor-bar');
    this.staminaBar = document.getElementById('stamina-bar');

    this.vehicleCard = document.getElementById('hud-bottom-right');
    this.vehicleNameEl = document.getElementById('vehicle-name');
    this.speedValueEl = document.getElementById('speed-value');
    this.nitroBar = document.getElementById('nitro-bar');
    this.damageBar = document.getElementById('car-damage-bar');
    this.radioEl = document.getElementById('radio-station');

    this.missionCard = document.getElementById('mission-card');
    this.missionTitleEl = document.getElementById('mission-title');
    this.missionDescEl = document.getElementById('mission-desc');
    this.missionDistEl = document.getElementById('mission-dist');

    this.actionPrompt = document.getElementById('action-prompt');
    this.promptBadge = this.actionPrompt ? this.actionPrompt.querySelector('.key-badge') : null;
    this.promptText = document.getElementById('prompt-text');

    this.bannerWasted = document.getElementById('banner-wasted');
    this.bannerBusted = document.getElementById('banner-busted');
    this.bannerPassed = document.getElementById('banner-passed');
    this.passedTitle = document.getElementById('passed-mission-name');
    this.passedReward = document.getElementById('passed-reward');

    this.crosshair = document.getElementById('crosshair');
    this.districtBanner = document.getElementById('district-banner');

    // Multiplayer DOM Elements
    this.mpRoomBadge = document.getElementById('mp-room-badge');
    this.mpRoomCodeDisplay = document.getElementById('mp-room-code-display');
    this.mpPlayerCountEl = document.getElementById('mp-player-count');
    this.mpKillFeed = document.getElementById('mp-killfeed');
    this.mpChatMessages = document.getElementById('mp-chat-messages');
    this.mpChatInputRow = document.getElementById('mp-chat-input-row');
    this.mpChatInput = document.getElementById('mp-chat-input');
    this.mpNotification = document.getElementById('mp-notification');
    this.mpNoticeTimer = null;

    // Cached Star DOM elements (queried once, never re-queried every frame)
    this.starSpans = this.starsEl ? Array.from(this.starsEl.querySelectorAll('.star')) : [];

    // State caches to eliminate unnecessary browser style invalidations / reflows
    this.currentDisplayedCash = -1;
    this.cachedHealth = -1;
    this.cachedArmor = -1;
    this.cachedStamina = -1;
    this.cachedHeat = -1;
    this.cachedFlashing = null;
    this.cachedWeaponId = '';
    this.cachedClip = -1;
    this.cachedReserve = -1;
    this.cachedAiming = false;
    this.cachedTime = '';
    this.cachedDistrict = '';
    this.cachedVehicleName = '';
    this.cachedSpeed = -1;
    this.cachedNitro = -1;
    this.cachedDamage = -1;
    this.cachedInVehicle = null;
    this.cachedMissionKey = '';
    this.cachedMissionDist = -1;
    this.cachedPromptText = '';
  }

  update(player, vehicle, policeManager, missionManager, skyLighting, weaponSystem, currentDistrict) {
    // 1. Cash Roll Animation
    if (this.currentDisplayedCash !== player.cash) {
      if (this.currentDisplayedCash === -1) {
        this.currentDisplayedCash = player.cash;
      } else {
        const diff = player.cash - this.currentDisplayedCash;
        this.currentDisplayedCash += Math.sign(diff) * Math.ceil(Math.abs(diff) * 0.15);
      }
      const str = Math.abs(this.currentDisplayedCash).toString().padStart(8, '0');
      this.cashEl.textContent = '$' + str;
    }

    // 2. Health, Armor, Stamina (only update DOM width when integer percentage changes)
    const hPct = Math.round(Math.max(0, (player.health / player.maxHealth) * 100));
    if (hPct !== this.cachedHealth) {
      this.cachedHealth = hPct;
      this.healthBar.style.width = hPct + '%';
    }

    const aPct = Math.round(Math.max(0, (player.armor / player.maxArmor) * 100));
    if (aPct !== this.cachedArmor) {
      this.cachedArmor = aPct;
      this.armorBar.style.width = aPct + '%';
    }

    const sPct = Math.round(Math.max(0, (player.stamina / player.maxStamina) * 100));
    if (sPct !== this.cachedStamina) {
      this.cachedStamina = sPct;
      this.staminaBar.style.width = sPct + '%';
    }

    // 3. Wanted Stars (diff check before touching class lists)
    const heat = policeManager.wantedLevel;
    const isFlashing = policeManager.isEvading;
    if (heat !== this.cachedHeat || isFlashing !== this.cachedFlashing) {
      this.cachedHeat = heat;
      this.cachedFlashing = isFlashing;
      for (let idx = 0; idx < this.starSpans.length; idx++) {
        const star = this.starSpans[idx];
        if (idx < heat) {
          star.classList.add('active');
          if (isFlashing) star.classList.add('flashing');
          else star.classList.remove('flashing');
        } else {
          star.classList.remove('active', 'flashing');
        }
      }
    }

    // 4. Weapon & Ammo
    const weapon = weaponSystem.getCurrentWeapon();
    if (weapon.id !== this.cachedWeaponId) {
      this.cachedWeaponId = weapon.id;
      this.weaponIconEl.textContent = weapon.icon;
      this.weaponNameEl.textContent = weapon.name;
    }

    if (weapon.clip !== this.cachedClip || weapon.reserve !== this.cachedReserve) {
      this.cachedClip = weapon.clip;
      this.cachedReserve = weapon.reserve;
      if (weapon.clipSize === Infinity) {
        this.ammoClipEl.textContent = '∞';
        this.ammoReserveEl.textContent = '∞';
      } else {
        this.ammoClipEl.textContent = weapon.clip;
        this.ammoReserveEl.textContent = weapon.reserve;
      }
    }

    // Aim Crosshair mode
    if (player.isAiming !== this.cachedAiming) {
      this.cachedAiming = player.isAiming;
      if (player.isAiming) {
        this.crosshair.classList.add('aiming');
      } else {
        this.crosshair.classList.remove('aiming');
      }
    }

    // 5. Time of Day (formatted string changes only once every 3-4 seconds)
    if (skyLighting) {
      const timeStr = skyLighting.getTimeFormatted();
      if (timeStr !== this.cachedTime) {
        this.cachedTime = timeStr;
        this.timeEl.textContent = timeStr;
      }
    }

    // 6. District Name
    if (currentDistrict && currentDistrict !== this.cachedDistrict) {
      this.cachedDistrict = currentDistrict;
      this.districtBanner.textContent = currentDistrict;
    }

    // 7. Vehicle Dashboard
    const inVeh = player.isInVehicle && vehicle;
    if (inVeh !== this.cachedInVehicle) {
      this.cachedInVehicle = inVeh;
      if (inVeh) {
        this.vehicleCard.classList.remove('hidden');
      } else {
        this.vehicleCard.classList.add('hidden');
      }
    }

    if (inVeh) {
      if (vehicle.name !== this.cachedVehicleName) {
        this.cachedVehicleName = vehicle.name;
        this.vehicleNameEl.textContent = vehicle.name;
      }

      const spd = Math.round(Math.abs(vehicle.physics ? vehicle.physics.speed : 0) * 2.237);
      if (spd !== this.cachedSpeed) {
        this.cachedSpeed = spd;
        this.speedValueEl.textContent = spd;
      }

      if (vehicle.physics) {
        const nVal = Math.round(vehicle.physics.nitro);
        if (nVal !== this.cachedNitro) {
          this.cachedNitro = nVal;
          this.nitroBar.style.width = nVal + '%';
        }
      }

      const dmg = Math.round(Math.max(0, 100 - vehicle.health));
      if (dmg !== this.cachedDamage) {
        this.cachedDamage = dmg;
        this.damageBar.style.width = dmg + '%';
      }
    }

    // 8. Mission Card
    const hasMission = missionManager && missionManager.activeMission;
    if (hasMission) {
      const mKey = `${missionManager.activeMission.title}_${missionManager.missionStage}`;
      if (mKey !== this.cachedMissionKey) {
        this.cachedMissionKey = mKey;
        this.missionCard.classList.remove('hidden');
        this.missionTitleEl.textContent = missionManager.activeMission.title;
        this.missionDescEl.textContent = missionManager.getCurrentObjectiveText();
      }

      const dist = missionManager.getObjectiveDistance(player.position);
      if (dist !== this.cachedMissionDist) {
        this.cachedMissionDist = dist;
        this.missionDistEl.textContent = dist !== null ? dist + 'm' : '--';
      }
    } else if (this.cachedMissionKey !== '') {
      this.cachedMissionKey = '';
      this.missionCard.classList.add('hidden');
    }
  }

  showPrompt(key, text) {
    const fullKey = `${key}:${text}`;
    if (fullKey !== this.cachedPromptText) {
      this.cachedPromptText = fullKey;
      this.actionPrompt.classList.remove('hidden');
      if (this.promptBadge) this.promptBadge.textContent = key;
      this.promptText.textContent = text;
    }
  }

  hidePrompt() {
    if (this.cachedPromptText !== '') {
      this.cachedPromptText = '';
      this.actionPrompt.classList.add('hidden');
    }
  }

  setRadioName(name) {
    if (this.radioEl) {
      this.radioEl.textContent = '📻 ' + name;
    }
  }

  showWasted() {
    this.bannerWasted.classList.remove('hidden');
    setTimeout(() => {
      this.bannerWasted.classList.add('hidden');
    }, 3500);
  }

  showBusted() {
    this.bannerBusted.classList.remove('hidden');
    setTimeout(() => {
      this.bannerBusted.classList.add('hidden');
    }, 3500);
  }

  showMissionPassed(mission) {
    this.passedTitle.textContent = mission.title;
    this.passedReward.textContent = `+ $${mission.reward.toLocaleString()}`;
    this.bannerPassed.classList.remove('hidden');
    setTimeout(() => {
      this.bannerPassed.classList.add('hidden');
    }, 4500);
  }

  /* Multiplayer UI Methods */
  showMultiplayerBadge(roomCode, count = 1) {
    if (this.mpRoomBadge) {
      this.mpRoomBadge.classList.remove('hidden');
      if (this.mpRoomCodeDisplay) this.mpRoomCodeDisplay.textContent = `ROOM: ${roomCode}`;
      if (this.mpPlayerCountEl) this.mpPlayerCountEl.textContent = `${count} ONLINE`;
    }
  }

  updateMultiplayerCount(count) {
    if (this.mpPlayerCountEl) {
      this.mpPlayerCountEl.textContent = `${count} ONLINE`;
    }
  }

  hideMultiplayerBadge() {
    if (this.mpRoomBadge) {
      this.mpRoomBadge.classList.add('hidden');
    }
  }

  showMultiplayerNotice(text) {
    if (!this.mpNotification) return;
    this.mpNotification.textContent = text;
    this.mpNotification.classList.remove('hidden');
    if (this.mpNoticeTimer) clearTimeout(this.mpNoticeTimer);
    this.mpNoticeTimer = setTimeout(() => {
      this.mpNotification.classList.add('hidden');
    }, 3800);
  }

  addKillFeedEntry(killerName, victimName, weaponId) {
    if (!this.mpKillFeed) return;

    const entry = document.createElement('div');
    entry.className = 'kill-entry';

    const weaponIcons = {
      fists: '👊',
      pistol: '🔫 9MM',
      smg: '⚡ SMG',
      shotgun: '💥 SHOTGUN',
      rpg: '🚀 RPG',
      bullet: '🔫'
    };
    const weaponText = weaponIcons[weaponId] || '🔫';

    entry.innerHTML = `
      <span class="kill-killer">${killerName}</span>
      <span class="kill-weapon">${weaponText}</span>
      <span class="kill-victim">${victimName}</span>
    `;

    this.mpKillFeed.appendChild(entry);
    setTimeout(() => {
      if (entry.parentElement) entry.parentElement.removeChild(entry);
    }, 6000);
  }

  addChatMessage(sender, text, color) {
    if (!this.mpChatMessages) return;

    const msg = document.createElement('div');
    msg.className = 'chat-msg';

    const colorHex = '#' + (color ? color.toString(16).padStart(6, '0') : '00d2d3');
    msg.innerHTML = `
      <span class="chat-sender" style="color: ${colorHex}">${sender}:</span>
      <span class="chat-text">${escapeHtml(text)}</span>
    `;

    this.mpChatMessages.appendChild(msg);

    // Fade out old messages after 9 seconds
    setTimeout(() => {
      msg.style.opacity = '0.35';
    }, 7000);
    setTimeout(() => {
      if (msg.parentElement) msg.parentElement.removeChild(msg);
    }, 11000);

    // Auto scroll down
    this.mpChatMessages.scrollTop = this.mpChatMessages.scrollHeight;
  }

  isChatInputOpen() {
    return this.mpChatInputRow && !this.mpChatInputRow.classList.contains('hidden');
  }

  openChatInput() {
    if (this.mpChatInputRow && this.mpChatInput) {
      this.mpChatInputRow.classList.remove('hidden');
      this.mpChatInput.value = '';
      this.mpChatInput.focus();
    }
  }

  closeChatInput() {
    if (this.mpChatInputRow && this.mpChatInput) {
      this.mpChatInputRow.classList.add('hidden');
      this.mpChatInput.blur();
    }
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
