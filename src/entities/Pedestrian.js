import * as THREE from 'three';

export class Pedestrian {
  // Shared geometries to minimize memory and GPU draw state changes
  static torsoGeo = new THREE.BoxGeometry(0.44, 0.60, 0.28);
  static headGeo = new THREE.BoxGeometry(0.26, 0.28, 0.26);
  static armGeo = new THREE.BoxGeometry(0.14, 0.52, 0.14);
  static legGeo = new THREE.BoxGeometry(0.16, 0.62, 0.16);
  static hatGeo = new THREE.BoxGeometry(0.32, 0.10, 0.32);

  // Scratch vectors to eliminate GC memory churn in game loops
  static _tempVec = new THREE.Vector3();
  static _toWp = new THREE.Vector3();
  static _fleeDir = new THREE.Vector3();

  constructor(scene, soundSystem, position, waypoints = [], archetype = null) {
    this.scene = scene;
    this.sound = soundSystem;
    this.waypoints = waypoints;
    this.currentWaypointIndex = Math.floor(Math.random() * Math.max(1, waypoints.length));

    // Choose archetype: 'citizen', 'businessman', 'beachgoer', 'retro', 'gangster', 'cop'
    const archetypes = ['citizen', 'citizen', 'businessman', 'beachgoer', 'retro', 'gangster', 'cop'];
    this.archetype = archetype || archetypes[Math.floor(Math.random() * archetypes.length)];

    // Stats & Behaviors
    this.maxHealth = this.archetype === 'gangster' ? 85 : (this.archetype === 'cop' ? 90 : 50);
    this.health = this.maxHealth;
    this.isDead = false;
    this.state = 'walk'; // 'walk', 'panic', 'flee', 'fight', 'ragdoll'
    this.panicTimer = 0;
    this.attackTimer = 0;

    this.walkSpeed = 1.4 + Math.random() * 0.8;
    this.fleeSpeed = 5.8 + Math.random() * 1.6;

    this.position = position.clone();
    this.velocity = new THREE.Vector3();

    this.createMesh();
  }

  createMesh() {
    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    let shirtColor, pantsColor, skinColor = 0xdeb887;
    let hasHat = false;
    let hatColor = 0x111111;

    switch (this.archetype) {
      case 'businessman':
        shirtColor = 0x1f2c39; // Navy suit jacket
        pantsColor = 0x1f2c39; // Matching dress slacks
        break;
      case 'beachgoer':
        shirtColor = 0xff6b8b; // Coral pink Hawaiian shirt
        pantsColor = 0xe0e6ed; // Khaki/white shorts
        hasHat = true;
        hatColor = 0xf5cd79; // Straw sunhat
        break;
      case 'retro':
        shirtColor = 0x00d2d3; // Vibrant Vice teal tracksuit
        pantsColor = 0xff9ff3; // Pastel pink trackpants
        break;
      case 'gangster':
        shirtColor = 0x181818; // Black leather motorcycle jacket
        pantsColor = 0x2d3436; // Dark ripped denim
        hasHat = true;
        hatColor = 0xb33939; // Red street bandana
        break;
      case 'cop':
        shirtColor = 0x224488; // Police blue uniform shirt
        pantsColor = 0x162238; // Police navy trousers
        hasHat = true;
        hatColor = 0x162238; // Police service cap
        break;
      default: // civilian
        const shirts = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xe67e22, 0x1abc9c];
        const pants = [0x34495e, 0x2c3e50, 0x7f8c8d, 0x1e272e, 0x4b6584];
        shirtColor = shirts[Math.floor(Math.random() * shirts.length)];
        pantsColor = pants[Math.floor(Math.random() * pants.length)];
        break;
    }

    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.9 });

    // Torso
    this.torso = new THREE.Mesh(Pedestrian.torsoGeo, shirtMat);
    this.torso.position.y = 0.95;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Head
    this.head = new THREE.Mesh(Pedestrian.headGeo, skinMat);
    this.head.position.y = 1.45;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Optional Hat
    if (hasHat) {
      const hatMat = new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.7 });
      const hat = new THREE.Mesh(Pedestrian.hatGeo, hatMat);
      hat.position.y = 1.62;
      this.group.add(hat);
    }

    // Arms
    this.leftArm = new THREE.Mesh(Pedestrian.armGeo, shirtMat);
    this.leftArm.position.set(-0.31, 0.95, 0);
    this.rightArm = new THREE.Mesh(Pedestrian.armGeo, shirtMat);
    this.rightArm.position.set(0.31, 0.95, 0);
    this.group.add(this.leftArm, this.rightArm);

    // Legs
    this.leftLeg = new THREE.Mesh(Pedestrian.legGeo, pantsMat);
    this.leftLeg.position.set(-0.13, 0.35, 0);
    this.rightLeg = new THREE.Mesh(Pedestrian.legGeo, pantsMat);
    this.rightLeg.position.set(0.13, 0.35, 0);
    this.group.add(this.leftLeg, this.rightLeg);

    this.scene.add(this.group);
  }

  takeDamage(amount, fromPos = null, player = null) {
    if (this.isDead) return;
    this.health -= amount;

    if (this.health <= 0) {
      this.die();
    } else {
      // Tough gangsters or cops fight back if attacked!
      if (this.archetype === 'gangster' || this.archetype === 'cop') {
        this.state = 'fight';
        this.targetToFight = fromPos ? fromPos.clone() : null;
      } else {
        // Civilians flee in terror
        this.state = 'panic';
        this.panicTimer = 8.0;
      }
    }
  }

  die() {
    this.isDead = true;
    this.state = 'ragdoll';
    this.group.rotation.x = -Math.PI / 2;
    this.group.position.y = 0.22;
    this.sound.playPunch();

    // Drop cash pickup at pedestrian location
    this.spawnCashDrop();
  }

  spawnCashDrop() {
    const cashValue = 15 + Math.floor(Math.random() * 65);
    const dropGeo = new THREE.BoxGeometry(0.5, 0.12, 0.8);
    const dropMat = new THREE.MeshStandardMaterial({
      color: 0x2ecc71,
      emissive: 0x1e824c,
      emissiveIntensity: 0.6
    });
    const cashMesh = new THREE.Mesh(dropGeo, dropMat);
    cashMesh.position.set(this.group.position.x, 0.35, this.group.position.z);
    this.scene.add(cashMesh);

    this.cashDrop = {
      mesh: cashMesh,
      amount: cashValue,
      collected: false
    };
  }

  triggerPanic() {
    if (this.isDead) return;
    if (this.archetype === 'gangster' || this.archetype === 'cop') {
      this.state = 'fight';
    } else {
      this.state = 'panic';
      this.panicTimer = 6.0;
    }
  }

  update(delta, playerPos, player) {
    // Check cash drop collection
    if (this.cashDrop && !this.cashDrop.collected && playerPos) {
      this.cashDrop.mesh.rotation.y += delta * 3.5;
      if (playerPos.distanceTo(this.cashDrop.mesh.position) < 2.0) {
        this.cashDrop.collected = true;
        this.scene.remove(this.cashDrop.mesh);
        if (player) {
          player.addCash(this.cashDrop.amount);
        }
      }
    }

    if (this.isDead) return;

    if (this.state === 'fight' && playerPos) {
      // Gangster / Cop approaches player to attack
      Pedestrian._tempVec.subVectors(playerPos, this.group.position);
      Pedestrian._tempVec.y = 0;
      const dist = Pedestrian._tempVec.length();

      if (dist > 1.8) {
        Pedestrian._tempVec.normalize();
        this.velocity.x = Pedestrian._tempVec.x * (this.walkSpeed * 1.6);
        this.velocity.z = Pedestrian._tempVec.z * (this.walkSpeed * 1.6);
        this.group.rotation.y = Math.atan2(Pedestrian._tempVec.x, Pedestrian._tempVec.z);
      } else {
        // In melee range: punch player!
        this.velocity.x = 0;
        this.velocity.z = 0;
        this.attackTimer += delta;
        if (this.attackTimer > 0.8) {
          this.attackTimer = 0;
          if (player) {
            player.takeDamage(12);
            this.sound.playPunch();
          }
        }
      }
    } else if (this.state === 'panic') {
      this.panicTimer -= delta;
      if (this.panicTimer <= 0) this.state = 'walk';

      // Flee directly away from player
      if (playerPos) {
        Pedestrian._fleeDir.subVectors(this.group.position, playerPos);
        Pedestrian._fleeDir.y = 0;
        Pedestrian._fleeDir.normalize();
        this.velocity.x = Pedestrian._fleeDir.x * this.fleeSpeed;
        this.velocity.z = Pedestrian._fleeDir.z * this.fleeSpeed;
        this.group.rotation.y = Math.atan2(Pedestrian._fleeDir.x, Pedestrian._fleeDir.z);
      }
    } else if (this.waypoints.length > 0) {
      // Normal sidewalk patrol
      const targetWp = this.waypoints[this.currentWaypointIndex];
      Pedestrian._toWp.subVectors(targetWp, this.group.position);
      Pedestrian._toWp.y = 0;
      const dist = Pedestrian._toWp.length();

      if (dist < 2.0) {
        this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
      } else {
        Pedestrian._toWp.normalize();
        this.velocity.x = Pedestrian._toWp.x * this.walkSpeed;
        this.velocity.z = Pedestrian._toWp.z * this.walkSpeed;
        this.group.rotation.y = Math.atan2(Pedestrian._toWp.x, Pedestrian._toWp.z);
      }
    }

    // Apply movement
    this.group.position.x += this.velocity.x * delta;
    this.group.position.z += this.velocity.z * delta;

    // Limb walking animations
    const isMoving = Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1;
    if (isMoving) {
      const animRate = this.state === 'panic' ? 14 : 7;
      const walkCycle = Math.sin(performance.now() * 0.001 * animRate);
      this.leftLeg.rotation.x = walkCycle * 0.55;
      this.rightLeg.rotation.x = -walkCycle * 0.55;
      this.leftArm.rotation.x = -walkCycle * 0.45;
      this.rightArm.rotation.x = walkCycle * 0.45;
    } else {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
    }
  }

  dispose() {
    if (this.cashDrop && this.cashDrop.mesh) {
      this.scene.remove(this.cashDrop.mesh);
    }
    this.scene.remove(this.group);
  }
}
