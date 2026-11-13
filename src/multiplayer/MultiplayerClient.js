import { RemotePlayer } from './RemotePlayer.js';

export class MultiplayerClient {
  constructor(engine) {
    this.engine = engine;
    this.ws = null;

    this.isConnected = false;
    this.isConnecting = false;
    this.roomCode = null;
    this.playerId = null;
    this.username = localStorage.getItem('vice_username') || 'Player_' + Math.floor(Math.random() * 900 + 100);
    this.color = 0x00d2d3;

    this.remotePlayers = new Map();
    this.syncTimer = 0;
    this.syncInterval = 1 / 22; // 22 syncs per second (~45ms)

    // Callbacks for UI events
    this.onConnected = null;
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;
    this.onChatReceived = null;
    this.onKillFeed = null;
    this.onRoomUpdated = null;
  }

  connect(roomCode, username) {
    if (this.isConnecting || this.isConnected) return;

    this.roomCode = (roomCode || 'VICE').trim().toUpperCase();
    if (username) {
      this.username = username.trim().slice(0, 16);
      localStorage.setItem('vice_username', this.username);
    }

    this.isConnecting = true;

    // Try primary dedicated port 5174, then fallback to same host path /game-ws
    const host = window.location.hostname || 'localhost';
    const primaryUrl = `ws://${host}:5174`;
    const fallbackUrl = `ws://${window.location.host}/game-ws`;

    this.attemptConnection(primaryUrl, () => {
      console.log('[Multiplayer] Fallback to', fallbackUrl);
      this.attemptConnection(fallbackUrl);
    });
  }

  attemptConnection(url, onFail = null) {
    let socketOpened = false;

    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      this.isConnecting = false;
      if (onFail) onFail();
      return;
    }

    this.ws.onopen = () => {
      socketOpened = true;
      this.isConnected = true;
      this.isConnecting = false;

      // Send join request
      const playerPos = this.engine.player ? this.engine.player.position : { x: 8, y: 0.25, z: 18 };
      this.ws.send(JSON.stringify({
        type: 'join',
        room: this.roomCode,
        username: this.username,
        pos: [playerPos.x, playerPos.y, playerPos.z]
      }));

      if (this.onConnected) this.onConnected(this.roomCode);
    };

    this.ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (err) {
        return;
      }
      this.handleServerMessage(data);
    };

    this.ws.onerror = (err) => {
      if (!socketOpened) {
        if (onFail) onFail();
        else this.isConnecting = false;
      }
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      this.isConnecting = false;
      this.clearRemotePlayers();
      if (this.onRoomUpdated) this.onRoomUpdated(0);
    };
  }

  handleServerMessage(data) {
    switch (data.type) {
      case 'welcome': {
        this.playerId = data.playerId;
        this.roomCode = data.room;
        this.color = data.color;

        // Apply our assigned player color to our own character shirt
        if (this.engine.player && this.engine.player.torso) {
          this.engine.player.torso.material.color.setHex(this.color);
        }

        // Spawn any existing remote players in this room
        if (data.players) {
          for (const pData of data.players) {
            this.addRemotePlayer(pData);
          }
        }

        if (this.onRoomUpdated) this.onRoomUpdated(this.remotePlayers.size + 1);
        this.showNotification(`Joined Room "${this.roomCode}" as ${this.username}`);
        break;
      }

      case 'player_joined': {
        if (data.player && data.player.id !== this.playerId) {
          this.addRemotePlayer(data.player);
          if (this.onPlayerJoined) this.onPlayerJoined(data.player);
          if (this.onRoomUpdated) this.onRoomUpdated(this.remotePlayers.size + 1);
          this.showNotification(`${data.player.username} joined the session`);
        }
        break;
      }

      case 'sync': {
        const rp = this.remotePlayers.get(data.id);
        if (rp) {
          rp.applySync(data);
        }
        break;
      }

      case 'shoot': {
        const rp = this.remotePlayers.get(data.id);
        if (rp) {
          rp.playGunfire(data.origin, data.dir, data.weaponId, this.engine.weaponSystem);
        }
        break;
      }

      case 'damaged': {
        // We were shot by another player!
        if (this.engine.player && !this.engine.player.isDead) {
          this.engine.player.takeDamage(data.damage);
          this.engine.weaponSystem.spawnSparks(
            this.engine.player.position.clone().add({ x: 0, y: 1.2, z: 0 }),
            null,
            'blood'
          );

          if (this.engine.player.isDead) {
            // Send kill broadcast
            this.sendKill(data.attackerName, this.username, data.weaponId);
          }
        }
        break;
      }

      case 'kill_feed': {
        if (this.onKillFeed) {
          this.onKillFeed(data.killerName, data.victimName, data.weaponId);
        }
        break;
      }

      case 'chat': {
        if (this.onChatReceived) {
          this.onChatReceived(data.username, data.text, data.color);
        }
        break;
      }

      case 'player_left': {
        this.removeRemotePlayer(data.id);
        if (this.onPlayerLeft) this.onPlayerLeft(data.username);
        if (this.onRoomUpdated) this.onRoomUpdated(this.remotePlayers.size + 1);
        this.showNotification(`${data.username} left the session`);
        break;
      }
    }
  }

  addRemotePlayer(pData) {
    if (this.remotePlayers.has(pData.id)) return;
    const rp = new RemotePlayer(this.engine.scene, this.engine.sound, pData);
    this.remotePlayers.set(pData.id, rp);
  }

  removeRemotePlayer(id) {
    const rp = this.remotePlayers.get(id);
    if (rp) {
      rp.dispose();
      this.remotePlayers.delete(id);
    }
  }

  clearRemotePlayers() {
    for (const rp of this.remotePlayers.values()) {
      rp.dispose();
    }
    this.remotePlayers.clear();
  }

  sendShoot(weaponId, origin, dir) {
    if (!this.isConnected || !this.ws) return;
    this.ws.send(JSON.stringify({
      type: 'shoot',
      weaponId,
      origin: [Number(origin.x.toFixed(2)), Number(origin.y.toFixed(2)), Number(origin.z.toFixed(2))],
      dir: [Number(dir.x.toFixed(3)), Number(dir.y.toFixed(3)), Number(dir.z.toFixed(3))]
    }));
  }

  sendHit(targetPlayerId, damage, weaponId) {
    if (!this.isConnected || !this.ws) return;
    this.ws.send(JSON.stringify({
      type: 'hit',
      targetId: targetPlayerId,
      damage,
      weaponId
    }));
  }

  sendKill(killerName, victimName, weaponId) {
    if (!this.isConnected || !this.ws) return;
    this.ws.send(JSON.stringify({
      type: 'kill',
      killerName,
      victimName,
      weaponId
    }));
  }

  sendChat(text) {
    if (!this.isConnected || !this.ws || !text.trim()) return;
    this.ws.send(JSON.stringify({
      type: 'chat',
      text: text.trim()
    }));
  }

  update(delta) {
    // 1. Update and animate all remote players
    for (const rp of this.remotePlayers.values()) {
      rp.update(delta);
    }

    // 2. Transmit local player state at syncInterval
    if (this.isConnected && this.ws && this.engine.player) {
      this.syncTimer += delta;
      if (this.syncTimer >= this.syncInterval) {
        this.syncTimer = 0;
        this.transmitLocalState();
      }
    }
  }

  transmitLocalState() {
    const p = this.engine.player;
    if (!p) return;

    const pos = [Number(p.position.x.toFixed(2)), Number(p.position.y.toFixed(2)), Number(p.position.z.toFixed(2))];
    const rot = [
      Number(p.group.rotation.y.toFixed(2)),
      Number((this.engine.cameraController ? this.engine.cameraController.pitch : 0).toFixed(2))
    ];
    const vel = [Number(p.velocity.x.toFixed(1)), Number(p.velocity.y.toFixed(1)), Number(p.velocity.z.toFixed(1))];

    let anim = 'idle';
    if (p.isSprinting) anim = 'sprint';
    else if (Math.abs(p.velocity.x) > 0.1 || Math.abs(p.velocity.z) > 0.1) anim = 'walk';

    const weapon = this.engine.weaponSystem ? this.engine.weaponSystem.getCurrentWeapon().id : 'pistol';

    let vehicle = null;
    if (p.isInVehicle && p.currentVehicle) {
      vehicle = {
        name: p.currentVehicle.name,
        type: p.currentVehicle.type,
        speed: p.currentVehicle.physics ? Math.round(p.currentVehicle.physics.speed) : 0
      };
    }

    this.ws.send(JSON.stringify({
      type: 'sync',
      pos,
      rot,
      vel,
      anim,
      aim: p.isAiming,
      weapon,
      vehicle,
      health: p.health,
      armor: p.armor
    }));
  }

  showNotification(text) {
    if (this.engine.hud && this.engine.hud.showMultiplayerNotice) {
      this.engine.hud.showMultiplayerNotice(text);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.clearRemotePlayers();
    if (this.onRoomUpdated) this.onRoomUpdated(0);
  }
}
