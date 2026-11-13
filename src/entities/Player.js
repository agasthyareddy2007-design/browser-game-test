import * as THREE from 'three';

export class Player {
  constructor(scene, soundSystem) {
    this.scene = scene;
    this.sound = soundSystem;

    // Stats
    this.health = 100;
    this.maxHealth = 100;
    this.armor = 100;
    this.maxArmor = 100;
    this.stamina = 100;
    this.maxStamina = 100;
    this.cash = 2500;
    this.isDead = false;

    // Movement Physics
    this.position = new THREE.Vector3(5.5, 0.25, 18);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.walkSpeed = 5.5;
    this.sprintSpeed = 10.2;
    this.jumpForce = 7.5;
    this.gravity = -22.0;
    this.isGrounded = true;
    this.isSprinting = false;
    this.isAiming = false;

    // Punch Melee Combo
    this.isPunching = false;
    this.punchTimer = 0;
    this.punchHand = 'right';

    // Vehicle state
    this.currentVehicle = null;
    this.isInVehicle = false;

    // Character Mesh Hierarchy
    this.createCharacterRig();
  }

  createCharacterRig() {
    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.8 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x1177bb, roughness: 0.7 }); // Hawaiian blue shirt
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x222b38, roughness: 0.85 }); // Dark jeans
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.9 });

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

  takeDamage(amount, sound = true) {
    if (this.isDead) return;

    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount);
      this.armor -= absorbed;
      amount -= absorbed;
    }

    if (amount > 0) {
      this.health -= amount;
      if (sound) this.sound.playPunch();
    }

    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addArmor(amount) {
    this.armor = Math.min(this.maxArmor, this.armor + amount);
  }

  addCash(amount) {
    this.cash += amount;
    this.sound.playCashSound();
  }

  triggerPunch() {
    if (this.isPunching) return;
    this.isPunching = true;
    this.punchTimer = 0.28;
    this.punchHand = this.punchHand === 'right' ? 'left' : 'right';
    this.sound.playPunch();
  }

  respawn(pos) {
    this.isDead = false;
    this.health = 100;
    this.armor = 50;
    this.stamina = 100;
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.group.visible = true;
    this.group.position.copy(this.position);
    this.group.rotation.set(0, 0, 0);
  }

  update(delta, input, cameraController, buildingColliders) {
    if (this.isDead) {
      // Ragdoll fall
      this.group.rotation.x = -Math.PI / 2;
      this.group.position.y = 0.25;
      return;
    }

    if (this.isInVehicle) {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;

    // Movement direction relative to camera yaw
    const forwardInput = input.getAxisVertical();
    const rightInput = input.getAxisHorizontal();
    const hasMoveInput = Math.abs(forwardInput) > 0.01 || Math.abs(rightInput) > 0.01;

    // Sprinting check
    this.isSprinting = hasMoveInput && input.isDown('ShiftLeft') && this.stamina > 5;
    if (this.isSprinting) {
      this.stamina = Math.max(0, this.stamina - delta * 20);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + delta * 15);
    }

    const currentSpeed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;

    // Calculate move vector from camera orientation
    const camYaw = cameraController.yaw;
    const forward = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));

    const moveDir = new THREE.Vector3();
    if (hasMoveInput) {
      moveDir.addScaledVector(forward, forwardInput);
      moveDir.addScaledVector(right, rightInput);
      moveDir.normalize();

      const targetVx = moveDir.x * currentSpeed;
      const targetVz = moveDir.z * currentSpeed;

      // Snappy acceleration (responsive, not sluggish)
      this.velocity.x += (targetVx - this.velocity.x) * Math.min(1, delta * 22);
      this.velocity.z += (targetVz - this.velocity.z) * Math.min(1, delta * 22);

      // Character faces direction of movement instantly/smoothly, unless aiming
      if (!this.isAiming) {
        const targetRot = Math.atan2(moveDir.x, moveDir.z);
        let rotDiff = targetRot - this.group.rotation.y;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        this.group.rotation.y += rotDiff * Math.min(1, delta * 24);
      }
    } else {
      // Clean, rapid deceleration without ice-sliding
      this.velocity.x += (0 - this.velocity.x) * Math.min(1, delta * 20);
      this.velocity.z += (0 - this.velocity.z) * Math.min(1, delta * 20);
      if (Math.abs(this.velocity.x) < 0.05) this.velocity.x = 0;
      if (Math.abs(this.velocity.z) < 0.05) this.velocity.z = 0;
    }

    // Aiming rotation: faces camera direction directly
    this.isAiming = input.mouse.rightButton;
    if (this.isAiming) {
      this.group.rotation.y = camYaw;
    }

    // Jump
    if (input.isDown('Space') && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }

    // Gravity
    this.velocity.y += this.gravity * delta;

    // Integrate position with building collision checks
    const nextPos = this.position.clone();
    nextPos.x += this.velocity.x * delta;
    nextPos.z += this.velocity.z * delta;
    nextPos.y += this.velocity.y * delta;

    // Collision check against buildings
    const playerRadius = 0.45;
    for (const b of buildingColliders) {
      if (nextPos.x + playerRadius > b.minX && nextPos.x - playerRadius < b.maxX &&
          nextPos.z + playerRadius > b.minZ && nextPos.z - playerRadius < b.maxZ) {
        if (nextPos.y < b.height) {
          // Push out horizontally along closest edge
          const distLeft = Math.abs((nextPos.x + playerRadius) - b.minX);
          const distRight = Math.abs(b.maxX - (nextPos.x - playerRadius));
          const distBottom = Math.abs((nextPos.z + playerRadius) - b.minZ);
          const distTop = Math.abs(b.maxZ - (nextPos.z - playerRadius));
          const minDist = Math.min(distLeft, distRight, distBottom, distTop);

          if (minDist === distLeft) nextPos.x = b.minX - playerRadius;
          else if (minDist === distRight) nextPos.x = b.maxX + playerRadius;
          else if (minDist === distBottom) nextPos.z = b.minZ - playerRadius;
          else nextPos.z = b.maxZ + playerRadius;
        }
      }
    }

    // Ground check (road level = 0.02, sidewalk = 0.25)
    if (nextPos.y <= 0.25) {
      nextPos.y = 0.25;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    this.position.copy(nextPos);
    this.group.position.copy(this.position);

    // Procedural skeletal animation (walking / sprinting / punching)
    this.animateLimbs(delta, hasMoveInput, currentSpeed);
  }

  animateLimbs(delta, isMoving, speed) {
    const time = performance.now() * 0.006 * (speed / 5.5);

    // Punch timer
    if (this.punchTimer > 0) {
      this.punchTimer -= delta;
      const punchPhase = Math.sin((0.28 - this.punchTimer) / 0.28 * Math.PI);
      if (this.punchHand === 'right') {
        this.rightArm.rotation.x = -Math.PI / 2 * punchPhase;
        this.rightArm.position.z = punchPhase * 0.4;
      } else {
        this.leftArm.rotation.x = -Math.PI / 2 * punchPhase;
        this.leftArm.position.z = punchPhase * 0.4;
      }
      if (this.punchTimer <= 0) {
        this.isPunching = false;
        this.rightArm.rotation.set(0, 0, 0);
        this.leftArm.rotation.set(0, 0, 0);
        this.rightArm.position.set(0.38, 1.32, 0);
        this.leftArm.position.set(-0.38, 1.32, 0);
      }
    }

    if (this.isAiming) {
      // Weapon raised pose
      this.rightArm.rotation.x = -Math.PI / 2;
      this.leftArm.rotation.x = -Math.PI / 2.5;
      this.leftArm.rotation.y = 0.4;
    } else if (!this.isPunching) {
      if (isMoving && this.isGrounded) {
        // Arm swings
        this.leftArm.rotation.x = Math.sin(time) * 0.65;
        this.rightArm.rotation.x = -Math.sin(time) * 0.65;
      } else {
        // Idle breathing
        const breath = Math.sin(performance.now() * 0.002) * 0.05;
        this.leftArm.rotation.x = breath;
        this.rightArm.rotation.x = breath;
      }
    }

    // Leg swings
    if (isMoving && this.isGrounded) {
      this.leftLeg.rotation.x = -Math.sin(time) * 0.75;
      this.rightLeg.rotation.x = Math.sin(time) * 0.75;
    } else if (!this.isGrounded) {
      // Airborne pose
      this.leftLeg.rotation.x = -0.4;
      this.rightLeg.rotation.x = 0.3;
    } else {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    }
  }
}
