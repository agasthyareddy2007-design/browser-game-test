import * as THREE from 'three';

export class RemotePlayer {
  constructor(scene, soundSystem, data) {
    this.scene = scene;
    this.sound = soundSystem;
    this.id = data.id;
    this.username = data.username || 'Player';
    this.color = data.color || 0x00d2d3;

    this.position = new THREE.Vector3(
      data.pos ? data.pos[0] : 8,
      data.pos ? data.pos[1] : 0.25,
      data.pos ? data.pos[2] : 18
    );
    this.targetPos = this.position.clone();

    this.rotationY = data.rot ? data.rot[0] : 0;
    this.targetRotY = this.rotationY;

    this.aimPitch = data.rot ? data.rot[1] : 0;
    this.targetAimPitch = this.aimPitch;

    this.health = data.health || 100;
    this.maxHealth = 100;
    this.armor = data.armor || 100;
    this.isDead = false;

    this.animState = 'idle';
    this.isAiming = false;
    this.currentWeapon = 'pistol';
    this.vehicleData = null;

    this.walkCycle = 0;

    // Create 3D Avatar & Overhead Nameplate
    this.createMesh();
    this.createNameplate();
  }

  createMesh() {
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;

    const shirtMat = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.7,
      metalness: 0.15
    });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1f2428, roughness: 0.9 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.8 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x221a15, roughness: 0.9 });

    // Torso / Body
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.32), shirtMat);
    this.torso.position.y = 1.05;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Head
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 0.32), skinMat);
    this.head.position.y = 1.62;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Hair
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.34), hairMat);
    hair.position.y = 1.76;
    this.group.add(hair);

    // Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.38, 1.32, 0);
    const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), shirtMat);
    lArmMesh.position.y = -0.25;
    lArmMesh.castShadow = true;
    this.leftArm.add(lArmMesh);
    this.group.add(this.leftArm);

    // Right Arm (holds weapon)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.38, 1.32, 0);
    const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), shirtMat);
    rArmMesh.position.y = -0.25;
    rArmMesh.castShadow = true;
    this.rightArm.add(rArmMesh);

    // Hand Weapon Attachment Bone
    this.weaponBone = new THREE.Group();
    this.weaponBone.position.set(0, -0.55, 0.1);
    this.rightArm.add(this.weaponBone);
    this.group.add(this.rightArm);

    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.16, 0.72, 0);
    const lLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.22), pantsMat);
    lLegMesh.position.y = -0.36;
    lLegMesh.castShadow = true;
    this.leftLeg.add(lLegMesh);
    this.group.add(this.leftLeg);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.16, 0.72, 0);
    const rLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.22), pantsMat);
    rLegMesh.position.y = -0.36;
    rLegMesh.castShadow = true;
    this.rightLeg.add(rLegMesh);
    this.group.add(this.rightLeg);

    this.scene.add(this.group);
  }

  createNameplate() {
    this.nameplateCanvas = document.createElement('canvas');
    this.nameplateCanvas.width = 256;
    this.nameplateCanvas.height = 64;
    this.nameplateCtx = this.nameplateCanvas.getContext('2d');

    this.nameplateTexture = new THREE.CanvasTexture(this.nameplateCanvas);
    this.nameplateTexture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: this.nameplateTexture,
      transparent: true,
      depthTest: false
    });
    this.nameplateSprite = new THREE.Sprite(spriteMat);
    this.nameplateSprite.scale.set(2.4, 0.6, 1);
    this.nameplateSprite.position.set(0, 2.2, 0);
    this.group.add(this.nameplateSprite);

    this.updateNameplateTexture();
  }

  updateNameplateTexture() {
    const ctx = this.nameplateCtx;
    const w = this.nameplateCanvas.width;
    const h = this.nameplateCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background pill
    ctx.fillStyle = 'rgba(15, 20, 28, 0.85)';
    ctx.beginPath();
    ctx.roundRect(16, 4, w - 32, h - 8, 12);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#' + (this.color ? this.color.toString(16).padStart(6, '0') : '00d2d3');
    ctx.lineWidth = 3;
    ctx.stroke();

    // Username text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(this.username, w / 2, 8);

    // Mini Health Bar
    const barW = w - 64;
    const barH = 6;
    const barX = 32;
    const barY = 38;

    // Bar background
    ctx.fillStyle = '#333333';
    ctx.fillRect(barX, barY, barW, barH);

    // Bar fill
    const fillW = Math.max(0, (this.health / this.maxHealth) * barW);
    ctx.fillStyle = this.health > 50 ? '#2ecc71' : (this.health > 25 ? '#f39c12' : '#e74c3c');
    ctx.fillRect(barX, barY, fillW, barH);

    this.nameplateTexture.needsUpdate = true;
  }

  applySync(data) {
    if (data.pos) {
      this.targetPos.set(data.pos[0], data.pos[1], data.pos[2]);
    }
    if (data.rot) {
      this.targetRotY = data.rot[0];
      this.targetAimPitch = data.rot[1];
    }
    this.animState = data.anim || 'idle';
    this.isAiming = !!data.aim;

    if (data.weapon && data.weapon !== this.currentWeapon) {
      this.currentWeapon = data.weapon;
    }

    if (data.health !== undefined && data.health !== this.health) {
      this.health = data.health;
      this.updateNameplateTexture();
      if (this.health <= 0 && !this.isDead) {
        this.die();
      } else if (this.health > 0 && this.isDead) {
        this.respawn();
      }
    }

    this.vehicleData = data.vehicle || null;
  }

  die() {
    this.isDead = true;
    this.group.rotation.x = -Math.PI / 2;
    this.group.position.y = 0.25;
  }

  respawn() {
    this.isDead = false;
    this.group.rotation.x = 0;
  }

  playGunfire(origin, dir, weaponId, weaponSystem) {
    if (!weaponSystem) return;

    const oVec = new THREE.Vector3(origin[0], origin[1], origin[2]);
    const dVec = new THREE.Vector3(dir[0], dir[1], dir[2]);

    // Visual muzzle flash & tracers
    weaponSystem.showMuzzleFlash(oVec);
    weaponSystem.spawnAnimatedBullet(oVec, dVec, 0, 180, 90, null, null);

    // Gunfire SFX
    if (weaponId === 'pistol') this.sound.playPistolShot();
    else if (weaponId === 'smg') this.sound.playSMGShot();
    else if (weaponId === 'shotgun') this.sound.playShotgunShot();
    else if (weaponId === 'rpg') this.sound.playExplosion();
  }

  update(delta) {
    // 1. Smoothly interpolate position towards target
    this.position.lerp(this.targetPos, Math.min(1, delta * 18));
    this.group.position.copy(this.position);

    // 2. Smoothly interpolate heading / rotation
    let diff = this.targetRotY - this.rotationY;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.rotationY += diff * Math.min(1, delta * 18);

    if (!this.isDead) {
      this.group.rotation.y = this.rotationY;
    }

    // 3. In Vehicle check
    if (this.vehicleData) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    if (this.isDead) return;

    // 4. Limb Animations
    const isMoving = this.animState === 'walk' || this.animState === 'sprint';
    if (isMoving) {
      const rate = this.animState === 'sprint' ? 14 : 9;
      this.walkCycle += delta * rate;
      const swing = Math.sin(this.walkCycle) * (this.animState === 'sprint' ? 0.75 : 0.5);

      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;

      if (!this.isAiming) {
        this.leftArm.rotation.x = -swing * 0.8;
        this.rightArm.rotation.x = swing * 0.8;
      }
    } else {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      if (!this.isAiming) {
        this.leftArm.rotation.x = 0;
        this.rightArm.rotation.x = 0;
      }
    }

    // 5. Aiming posture
    if (this.isAiming) {
      this.rightArm.rotation.x = -Math.PI / 2 + this.targetAimPitch;
      this.leftArm.rotation.x = -Math.PI / 2.4;
      this.leftArm.rotation.y = 0.35;
    } else {
      this.leftArm.rotation.y = 0;
    }
  }

  dispose() {
    if (this.nameplateTexture) this.nameplateTexture.dispose();
    if (this.group) {
      this.scene.remove(this.group);
      this.group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    }
  }
}
