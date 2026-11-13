import * as THREE from 'three';

export class WeaponSystem {
  // Shared geometries and materials for bullet tracers, sparks, and shell casings
  static tracerGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.75, 5);
  static tracerMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });

  static casingGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.09, 5);
  static casingMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });

  static sparkGeo = new THREE.SphereGeometry(0.04, 4, 4);
  static sparkMatYellow = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
  static sparkMatMetal = new THREE.MeshBasicMaterial({ color: 0xffffff });
  static sparkMatBlood = new THREE.MeshBasicMaterial({ color: 0xee1111 });
  static sparkMatDust = new THREE.MeshBasicMaterial({ color: 0x95a5a6, transparent: true, opacity: 0.75 });

  constructor(scene, soundSystem) {
    this.scene = scene;
    this.sound = soundSystem;

    // Arsenal definitions
    this.weapons = {
      fists: {
        id: 'fists',
        name: 'FISTS',
        icon: '👊',
        fireRate: 0.28,
        damage: 25,
        range: 3.0,
        isMelee: true,
        clipSize: Infinity,
        clip: Infinity,
        reserve: Infinity,
        unlocked: true
      },
      pistol: {
        id: 'pistol',
        name: '9MM PISTOL',
        icon: '🔫',
        fireRate: 0.18,
        damage: 42,
        range: 110,
        bulletSpeed: 180,
        spread: 0.012,
        clipSize: 12,
        clip: 12,
        reserve: 72,
        unlocked: true
      },
      smg: {
        id: 'smg',
        name: 'MICRO SMG',
        icon: '⚡',
        fireRate: 0.08,
        damage: 26,
        range: 90,
        bulletSpeed: 170,
        spread: 0.032,
        clipSize: 30,
        clip: 30,
        reserve: 180,
        unlocked: true
      },
      shotgun: {
        id: 'shotgun',
        name: 'PUMP SHOTGUN',
        icon: '💥',
        fireRate: 0.65,
        damage: 20,
        pellets: 8,
        range: 65,
        bulletSpeed: 140,
        spread: 0.065,
        clipSize: 6,
        clip: 6,
        reserve: 36,
        unlocked: true
      },
      rpg: {
        id: 'rpg',
        name: 'RPG-7 LAUNCHER',
        icon: '🚀',
        fireRate: 1.4,
        damage: 320,
        isProjectile: true,
        bulletSpeed: 65,
        clipSize: 1,
        clip: 1,
        reserve: 8,
        unlocked: true
      }
    };

    // Rotate tracer geometry once
    if (!WeaponSystem.tracerGeoRotated) {
      WeaponSystem.tracerGeo.rotateX(Math.PI / 2);
      WeaponSystem.casingGeo.rotateX(Math.PI / 2);
      WeaponSystem.tracerGeoRotated = true;
    }

    this.weaponOrder = ['fists', 'pistol', 'smg', 'shotgun', 'rpg'];
    this.currentWeaponIndex = 1; // 9mm Pistol
    this.fireTimer = 0;

    // Visual animated entities
    this.activeBullets = [];
    this.activeSparks = [];
    this.activeCasings = [];
    this.activeRockets = [];

    // Muzzle Flash
    this.muzzleFlash = null;
    this.muzzleFlashTimer = 0;
    this.createMuzzleFlash();

    // Recoil state for character animation
    this.recoilOffset = 0;
    this.recoilPitch = 0;

    // 3D Weapon Models
    this.weaponMeshes = {};
    this.createWeaponMeshes();
  }

  createMuzzleFlash() {
    const flashGroup = new THREE.Group();

    // Multi-point starburst flash
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.95 });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.04), starMat);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.04), starMat);
    const p3 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.35), starMat);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));

    flashGroup.add(p1, p2, p3, core);
    flashGroup.visible = false;

    this.muzzleFlash = flashGroup;
    this.scene.add(this.muzzleFlash);
  }

  createWeaponMeshes() {
    const pMat = new THREE.MeshStandardMaterial({ color: 0x1f2428, metalness: 0.8, roughness: 0.3 });

    // Pistol
    const pGroup = new THREE.Group();
    const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.34), pMat);
    const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), pMat);
    pGrip.position.set(0, -0.1, -0.08);
    pGroup.add(pSlide, pGrip);
    this.weaponMeshes.pistol = pGroup;

    // SMG
    const smgGroup = new THREE.Group();
    const smgBody = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, 0.46), pMat);
    const smgMag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.25, 0.09), pMat);
    smgMag.position.set(0, -0.15, 0.05);
    smgGroup.add(smgBody, smgMag);
    this.weaponMeshes.smg = smgGroup;

    // Shotgun
    const shotGroup = new THREE.Group();
    const shotBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.82), pMat);
    shotGroup.add(shotBarrel);
    this.weaponMeshes.shotgun = shotGroup;

    // RPG
    const rpgGroup = new THREE.Group();
    const rpgTube = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.15, 8), new THREE.MeshStandardMaterial({ color: 0x3d4432, roughness: 0.6 }));
    rpgTube.rotation.x = Math.PI / 2;
    rpgGroup.add(rpgTube);
    this.weaponMeshes.rpg = rpgGroup;
  }

  getCurrentWeapon() {
    return this.weapons[this.weaponOrder[this.currentWeaponIndex]];
  }

  selectWeaponByIndex(idx) {
    if (idx >= 0 && idx < this.weaponOrder.length) {
      this.currentWeaponIndex = idx;
    }
  }

  cycleNext() {
    this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weaponOrder.length;
  }

  cyclePrev() {
    this.currentWeaponIndex = (this.currentWeaponIndex - 1 + this.weaponOrder.length) % this.weaponOrder.length;
  }

  unlockAllWeapons() {
    for (const key in this.weapons) {
      const w = this.weapons[key];
      w.unlocked = true;
      if (w.clipSize !== Infinity) {
        w.clip = w.clipSize;
        w.reserve = 999;
      }
    }
  }

  attachToPlayerBone(bone) {
    while (bone.children.length > 0) {
      bone.remove(bone.children[0]);
    }

    const current = this.getCurrentWeapon();
    if (current.id !== 'fists' && this.weaponMeshes[current.id]) {
      bone.add(this.weaponMeshes[current.id]);
    }
  }

  shoot(player, cameraController, trafficManager, onCrimeCommitted, multiplayerClient = null) {
    const current = this.getCurrentWeapon();
    if (this.fireTimer > 0) return false;

    // Melee punch
    if (current.isMelee) {
      this.fireTimer = current.fireRate;
      player.triggerPunch();
      this.checkMeleeHit(player, trafficManager, onCrimeCommitted, multiplayerClient);
      return true;
    }

    // Ammo check
    if (current.clip <= 0) {
      this.reload();
      return false;
    }

    // Fire weapon
    current.clip--;
    this.fireTimer = current.fireRate;

    // NO camera shake! Zero screen vibration!
    // Weapon recoil animation on the character model's arm
    this.recoilOffset = 0.10;
    this.recoilPitch = 0.24;

    // Audio SFX
    if (current.id === 'pistol') this.sound.playPistolShot();
    else if (current.id === 'smg') this.sound.playSMGShot();
    else if (current.id === 'shotgun') this.sound.playShotgunShot();
    else if (current.id === 'rpg') this.sound.playExplosion();

    // Muzzle position & direction
    const muzzlePos = player.position.clone();
    muzzlePos.y += 1.35;
    const shootDir = cameraController.lookAtPosition.clone().normalize();
    muzzlePos.addScaledVector(shootDir, 0.65);

    this.showMuzzleFlash(muzzlePos);

    // Broadcast gunfire to remote multiplayer players in room
    if (multiplayerClient && multiplayerClient.isConnected) {
      multiplayerClient.sendShoot(current.id, muzzlePos, shootDir);
    }

    // Eject spinning brass shell casing to the right
    if (current.id !== 'rpg') {
      this.ejectShellCasing(muzzlePos, shootDir, cameraController.yaw);
    }

    // Alert ambient pedestrians & police
    trafficManager.alertPedestriansNear(player.position, 65);
    if (onCrimeCommitted) onCrimeCommitted('gunfire');

    if (current.id === 'rpg') {
      this.spawnRocket(muzzlePos, shootDir);
    } else if (current.id === 'shotgun') {
      for (let p = 0; p < current.pellets; p++) {
        const spreadDir = shootDir.clone();
        spreadDir.x += (Math.random() - 0.5) * current.spread;
        spreadDir.y += (Math.random() - 0.5) * current.spread;
        spreadDir.z += (Math.random() - 0.5) * current.spread;
        spreadDir.normalize();
        this.spawnAnimatedBullet(muzzlePos, spreadDir, current.damage, current.bulletSpeed, current.range, trafficManager, onCrimeCommitted);
      }
    } else {
      const spreadDir = shootDir.clone();
      if (current.spread) {
        spreadDir.x += (Math.random() - 0.5) * current.spread;
        spreadDir.y += (Math.random() - 0.5) * current.spread;
        spreadDir.z += (Math.random() - 0.5) * current.spread;
        spreadDir.normalize();
      }
      this.spawnAnimatedBullet(muzzlePos, spreadDir, current.damage, current.bulletSpeed, current.range, trafficManager, onCrimeCommitted);
    }

    return true;
  }

  showMuzzleFlash(pos) {
    if (this.muzzleFlash) {
      this.muzzleFlash.position.copy(pos);
      this.muzzleFlash.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.muzzleFlash.visible = true;
      this.muzzleFlashTimer = 0.04; // 40ms snappy flash
    }
  }

  ejectShellCasing(pos, shootDir, camYaw) {
    const casingMesh = new THREE.Mesh(WeaponSystem.casingGeo, WeaponSystem.casingMat);
    casingMesh.position.copy(pos);

    // Eject to the right and slightly up
    const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
    const vel = right.clone().multiplyScalar(2.2 + Math.random() * 1.5);
    vel.y = 1.8 + Math.random() * 1.2;
    vel.addScaledVector(shootDir, (Math.random() - 0.5) * 0.8);

    this.scene.add(casingMesh);
    this.activeCasings.push({
      mesh: casingMesh,
      vel,
      rotSpeed: (Math.random() - 0.5) * 20,
      life: 1.8,
      bounced: false
    });
  }

  spawnAnimatedBullet(origin, dir, damage, speed, maxRange, trafficManager, onCrimeCommitted) {
    // 3D Visual Bullet Tracer Mesh (reusing shared geometry & material!)
    const bulletMesh = new THREE.Mesh(WeaponSystem.tracerGeo, WeaponSystem.tracerMat);
    bulletMesh.position.copy(origin);
    bulletMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    this.scene.add(bulletMesh);

    this.activeBullets.push({
      mesh: bulletMesh,
      pos: origin.clone(),
      dir: dir.clone(),
      speed: speed || 180,
      damage: damage,
      traveled: 0,
      maxRange: maxRange || 100,
      onCrimeCommitted
    });
  }

  spawnSparks(hitPos, hitNormal, type = 'concrete') {
    let mat = WeaponSystem.sparkMatYellow;
    let count = 6;

    if (type === 'metal') {
      mat = WeaponSystem.sparkMatMetal;
      count = 8;
    } else if (type === 'blood') {
      mat = WeaponSystem.sparkMatBlood;
      count = 6;
    } else if (type === 'dust') {
      mat = WeaponSystem.sparkMatDust;
      count = 5;
    }

    for (let i = 0; i < count; i++) {
      const pMesh = new THREE.Mesh(WeaponSystem.sparkGeo, mat);
      pMesh.position.copy(hitPos);
      this.scene.add(pMesh);

      const vel = hitNormal ? hitNormal.clone() : new THREE.Vector3(0, 1, 0);
      vel.x += (Math.random() - 0.5) * 3.5;
      vel.y += Math.random() * 3.0 + 0.8;
      vel.z += (Math.random() - 0.5) * 3.5;

      this.activeSparks.push({
        mesh: pMesh,
        vel,
        life: 0.22 + Math.random() * 0.15
      });
    }
  }

  checkMeleeHit(player, trafficManager, onCrimeCommitted, multiplayerClient = null) {
    const punchOrigin = player.position.clone();
    punchOrigin.y += 1.2;

    // Check remote multiplayer players
    if (multiplayerClient && multiplayerClient.remotePlayers) {
      for (const rp of multiplayerClient.remotePlayers.values()) {
        if (rp.isDead) continue;
        const d = punchOrigin.distanceTo(rp.group.position);
        if (d < 2.8) {
          this.spawnSparks(rp.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), null, 'blood');
          multiplayerClient.sendHit(rp.id, 35, 'fists');
          return;
        }
      }
    }

    for (let i = 0; i < trafficManager.pedestrians.length; i++) {
      const ped = trafficManager.pedestrians[i];
      if (ped.isDead) continue;
      const d = punchOrigin.distanceTo(ped.group.position);
      if (d < 2.8) {
        ped.takeDamage(35, punchOrigin, player);
        this.spawnSparks(ped.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), null, 'blood');
        if (onCrimeCommitted) onCrimeCommitted('punch');
        return;
      }
    }
  }

  spawnRocket(origin, dir) {
    const rocketMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.85, 8),
      new THREE.MeshStandardMaterial({ color: 0x445533, roughness: 0.5 })
    );
    rocketMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    rocketMesh.position.copy(origin);
    this.scene.add(rocketMesh);

    this.activeRockets.push({
      mesh: rocketMesh,
      pos: origin.clone(),
      dir: dir.clone(),
      speed: 65,
      life: 3.0
    });
  }

  reload() {
    const current = this.getCurrentWeapon();
    if (current.clip < current.clipSize && current.reserve > 0) {
      const needed = current.clipSize - current.clip;
      const take = Math.min(needed, current.reserve);
      current.clip += take;
      current.reserve -= take;
    }
  }

  update(delta, trafficManager, cameraController, player, multiplayerClient = null) {
    if (this.fireTimer > 0) {
      this.fireTimer -= delta;
    }

    // Muzzle flash timer
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= delta;
      if (this.muzzleFlashTimer <= 0 && this.muzzleFlash) {
        this.muzzleFlash.visible = false;
      }
    }

    // Weapon kickback recoil recovery on player arm/bone
    if (player && player.weaponBone && this.recoilOffset > 0.001) {
      this.recoilOffset -= delta * 0.8;
      this.recoilPitch -= delta * 2.2;
      if (this.recoilOffset < 0) this.recoilOffset = 0;
      if (this.recoilPitch < 0) this.recoilPitch = 0;
      player.weaponBone.position.z = 0.1 - this.recoilOffset;
      player.weaponBone.rotation.x = -this.recoilPitch;
    }

    // 1. Update Ejected Brass Shell Casings
    for (let i = this.activeCasings.length - 1; i >= 0; i--) {
      const c = this.activeCasings[i];
      c.life -= delta;
      c.vel.y -= 14 * delta; // Gravity
      c.mesh.position.addScaledVector(c.vel, delta);
      c.mesh.rotation.z += c.rotSpeed * delta;

      // Ground bounce
      if (c.mesh.position.y <= 0.25) {
        c.mesh.position.y = 0.25;
        c.vel.y = -c.vel.y * 0.4;
        c.vel.x *= 0.6;
        c.vel.z *= 0.6;
        c.bounced = true;
      }

      if (c.life <= 0) {
        this.scene.remove(c.mesh);
        this.activeCasings.splice(i, 1);
      }
    }

    // 2. Update Active Animated Bullet Tracers
    const ray = new THREE.Ray();
    const hitPoint = new THREE.Vector3();
    const pedCenter = new THREE.Vector3();
    const pedSphere = new THREE.Sphere(new THREE.Vector3(), 0.95);
    const carBox = new THREE.Box3();

    for (let i = this.activeBullets.length - 1; i >= 0; i--) {
      const b = this.activeBullets[i];
      const stepDist = b.speed * delta;
      b.traveled += stepDist;

      const prevPos = b.pos.clone();
      b.pos.addScaledVector(b.dir, stepDist);
      b.mesh.position.copy(b.pos);

      // Raycast segment along trajectory for accurate collision
      ray.set(prevPos, b.dir);
      let hitOccurred = false;

      // Check Remote Multiplayer Players
      if (multiplayerClient && multiplayerClient.remotePlayers) {
        for (const rp of multiplayerClient.remotePlayers.values()) {
          if (rp.isDead) continue;
          pedCenter.copy(rp.group.position).add(new THREE.Vector3(0, 0.9, 0));
          pedSphere.center = pedCenter;

          if (ray.intersectsSphere(pedSphere)) {
            this.spawnSparks(b.pos, null, 'blood');
            multiplayerClient.sendHit(rp.id, b.damage, 'bullet');
            hitOccurred = true;
            break;
          }
        }
      }

      // Check Ambient Pedestrians
      if (!hitOccurred) {
        for (let p = 0; p < trafficManager.pedestrians.length; p++) {
          const ped = trafficManager.pedestrians[p];
          if (ped.isDead) continue;
          pedCenter.copy(ped.group.position).add(new THREE.Vector3(0, 0.9, 0));
          pedSphere.center = pedCenter;

          if (ray.intersectsSphere(pedSphere)) {
            ped.takeDamage(b.damage, prevPos, player);
            this.spawnSparks(b.pos, null, 'blood');
            if (b.onCrimeCommitted) b.onCrimeCommitted('pedestrian_hit');
            hitOccurred = true;
            break;
          }
        }
      }

      // Check Vehicles
      if (!hitOccurred) {
        for (let v = 0; v < trafficManager.vehicles.length; v++) {
          const car = trafficManager.vehicles[v];
          if (car.isDestroyed) continue;
          carBox.setFromObject(car.mesh);

          if (ray.intersectBox(carBox, hitPoint)) {
            car.takeDamage(b.damage);
            this.spawnSparks(hitPoint, null, 'metal');
            hitOccurred = true;
            break;
          }
        }
      }

      // Ground or Max Range check
      if (hitOccurred || b.pos.y <= 0.22 || b.traveled >= b.maxRange) {
        if (!hitOccurred && b.pos.y <= 0.22) {
          this.spawnSparks(b.pos, new THREE.Vector3(0, 1, 0), 'dust');
        }
        this.scene.remove(b.mesh);
        this.activeBullets.splice(i, 1);
      }
    }

    // 3. Update Spark & Dust Particles
    for (let i = this.activeSparks.length - 1; i >= 0; i--) {
      const sp = this.activeSparks[i];
      sp.life -= delta;
      sp.vel.y -= 12 * delta; // Gravity
      sp.mesh.position.addScaledVector(sp.vel, delta);

      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        this.activeSparks.splice(i, 1);
      }
    }

    // 4. Update RPG Rockets
    for (let i = this.activeRockets.length - 1; i >= 0; i--) {
      const r = this.activeRockets[i];
      r.life -= delta;
      r.pos.addScaledVector(r.dir, r.speed * delta);
      r.mesh.position.copy(r.pos);

      // Smoke puff behind rocket
      if (Math.random() > 0.4) {
        this.spawnSparks(r.pos, null, 'dust');
      }

      if (r.pos.y <= 0.3 || r.life <= 0) {
        this.explodeRocket(r.pos, trafficManager);
        this.scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        this.activeRockets.splice(i, 1);
      }
    }
  }

  explodeRocket(pos, trafficManager) {
    this.sound.playExplosion();

    // Large explosive debris sparks
    this.spawnSparks(pos, new THREE.Vector3(0, 1, 0), 'metal');
    this.spawnSparks(pos, new THREE.Vector3(0, 1, 0), 'dust');

    for (let i = 0; i < trafficManager.vehicles.length; i++) {
      const v = trafficManager.vehicles[i];
      if (pos.distanceTo(v.mesh.position) < 18) {
        v.takeDamage(160);
      }
    }

    for (let i = 0; i < trafficManager.pedestrians.length; i++) {
      const p = trafficManager.pedestrians[i];
      if (pos.distanceTo(p.group.position) < 18) {
        p.takeDamage(200);
      }
    }
  }
}
