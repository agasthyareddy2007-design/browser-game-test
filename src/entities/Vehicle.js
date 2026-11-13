import * as THREE from 'three';
import { VehiclePhysics } from './VehiclePhysics.js';
import { VehicleModels } from './VehicleModels.js';

export class Vehicle {
  constructor(scene, soundSystem, type = 'supercar', options = {}) {
    this.scene = scene;
    this.sound = soundSystem;
    this.type = type;

    // Names & Stats
    this.name = options.name || this.getDefaultName(type);
    this.health = 100;
    this.maxHealth = 100;
    this.isDestroyed = false;
    this.isOccupied = false;

    // Lights & Strobes
    this.headlightsOn = false;
    this.isSirenActive = false;
    this.strobeTimer = 0;

    // Physics
    this.physics = new VehiclePhysics(options.physicsConfig || this.getDefaultPhysics(type));

    // 3D Mesh
    this.mesh = this.createVehicleMesh(type, options);
    if (options.position) {
      this.mesh.position.copy(options.position);
    }
    if (options.rotationY) {
      this.mesh.rotation.y = options.rotationY;
    }
    this.scene.add(this.mesh);

    // Damage smoke particles
    this.smokeParticles = [];
  }

  getDefaultName(type) {
    switch (type) {
      case 'supercar': return 'BANSHEE GT';
      case 'muscle': return 'DOMINATOR V8';
      case 'police': return 'VCPD INTERCEPTOR';
      case 'taxi': return 'VICE CAB';
      case 'suv': return 'PATRIOT 4x4';
      case 'convertible': return 'STINGER SPYDER';
      case 'pickup': return 'BOBCAT TRUCK';
      case 'sedan': return 'ADMIRAL';
      case 'ambulance': return 'METRO EMS';
      case 'tank': return 'RHINO TANK';
      case 'helicopter': return 'MAVERICK';
      default: return 'CIVILIAN CAR';
    }
  }

  getDefaultPhysics(type) {
    switch (type) {
      case 'supercar':
        return { topSpeed: 46, acceleration: 32, braking: 42, grip: 0.95, steerAngleMax: 0.62, mass: 1300 };
      case 'muscle':
        return { topSpeed: 40, acceleration: 35, braking: 36, grip: 0.88, steerAngleMax: 0.58, mass: 1650 };
      case 'police':
        return { topSpeed: 42, acceleration: 30, braking: 38, grip: 0.93, steerAngleMax: 0.60, mass: 1550 };
      case 'taxi':
        return { topSpeed: 38, acceleration: 26, braking: 34, grip: 0.91, steerAngleMax: 0.58, mass: 1450 };
      case 'suv':
        return { topSpeed: 36, acceleration: 24, braking: 32, grip: 0.89, steerAngleMax: 0.52, mass: 2200 };
      case 'convertible':
        return { topSpeed: 44, acceleration: 31, braking: 40, grip: 0.94, steerAngleMax: 0.62, mass: 1250 };
      case 'pickup':
        return { topSpeed: 35, acceleration: 23, braking: 30, grip: 0.88, steerAngleMax: 0.50, mass: 2100 };
      case 'sedan':
        return { topSpeed: 37, acceleration: 25, braking: 34, grip: 0.90, steerAngleMax: 0.56, mass: 1500 };
      case 'ambulance':
        return { topSpeed: 34, acceleration: 22, braking: 32, grip: 0.88, steerAngleMax: 0.48, mass: 2800 };
      case 'tank':
        return { topSpeed: 20, acceleration: 15, braking: 30, grip: 0.98, steerAngleMax: 0.38, mass: 15000 };
      case 'helicopter':
        return { topSpeed: 45, acceleration: 20, braking: 20, grip: 1.0, steerAngleMax: 0.5 };
      default:
        return { topSpeed: 36, acceleration: 25, braking: 34, grip: 0.90, steerAngleMax: 0.55, mass: 1500 };
    }
  }

  createVehicleMesh(type, options) {
    const col = options.primaryColor;
    switch (type) {
      case 'supercar':
        return VehicleModels.createSupercarMesh(col || 0xff2244, options.stripeColor || 0xffffff);
      case 'muscle':
        return VehicleModels.createMuscleCarMesh(col || 0x1f51c7);
      case 'police':
        return VehicleModels.createPoliceCruiserMesh();
      case 'taxi':
        return VehicleModels.createTaxiMesh();
      case 'suv':
        return VehicleModels.createSUVMesh(col || 0x2d3436);
      case 'convertible':
        return VehicleModels.createConvertibleMesh(col || 0x00b894);
      case 'pickup':
        return VehicleModels.createPickupMesh(col || 0xb33939);
      case 'sedan':
        return VehicleModels.createSedanMesh(col || 0x2c3e50);
      case 'ambulance':
        return VehicleModels.createAmbulanceMesh();
      case 'tank':
        return VehicleModels.createTankMesh();
      case 'helicopter':
        return VehicleModels.createHelicopterMesh();
      default:
        return VehicleModels.createSedanMesh(col || 0x4a69bd);
    }
  }

  toggleHeadlights() {
    this.headlightsOn = !this.headlightsOn;
  }

  toggleSiren() {
    if (this.type !== 'police' && this.type !== 'ambulance') return;
    this.isSirenActive = !this.isSirenActive;
    if (this.isSirenActive) {
      this.sound.startPoliceSiren();
    } else {
      this.sound.stopPoliceSiren();
    }
  }

  takeDamage(amount) {
    if (this.isDestroyed) return;
    this.health = Math.max(0, this.health - amount);
    this.sound.playCarCrash(0.6);

    if (this.health <= 0) {
      this.explode();
    }
  }

  repair() {
    this.health = 100;
    this.isDestroyed = false;
  }

  explode() {
    this.isDestroyed = true;
    this.sound.playExplosion();

    // Damage appearance: charred dark mesh
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(() => new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }));
        } else {
          child.material = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
        }
      }
    });

    if (this.physics) {
      this.physics.speed = 0;
    }
  }

  update(delta, input, buildingColliders) {
    // 1. Helicopter flight physics
    if (this.type === 'helicopter') {
      this.updateHelicopter(delta, input);
      return;
    }

    // 2. Police / Ambulance Strobe flashing
    if (this.mesh.userData.strobes && (this.isSirenActive || this.type === 'police')) {
      this.strobeTimer += delta * 12;
      const isRedPhase = Math.sin(this.strobeTimer) > 0;
      if (this.mesh.userData.strobes.red) {
        this.mesh.userData.strobes.red.visible = isRedPhase;
      }
      if (this.mesh.userData.strobes.blue) {
        this.mesh.userData.strobes.blue.visible = !isRedPhase;
      }
    }

    // 3. Ground Car Physics
    if (this.physics && !this.isDestroyed) {
      const transform = {
        position: this.mesh.position,
        rotation: this.mesh.rotation
      };

      const result = this.physics.update(delta, input, transform, buildingColliders);

      // Rotate wheels visually
      if (this.mesh.userData.wheels) {
        const wheelRotDelta = (this.physics.speed / 0.42) * delta;
        for (let i = 0; i < this.mesh.userData.wheels.length; i++) {
          const w = this.mesh.userData.wheels[i];
          w.group.rotation.x += wheelRotDelta;
          if (w.isFront) {
            w.group.rotation.y = this.physics.steerAngle;
          }
        }
      }

      // Audio engine update
      if (this.isOccupied) {
        const speedRatio = Math.min(1, Math.abs(this.physics.speed) / this.physics.topSpeed);
        const rpmRatio = (speedRatio * 3.5) % 1.0;
        const isAccel = input ? input.getAxisVertical() !== 0 : false;
        this.sound.updateEngine(rpmRatio, speedRatio, isAccel);
      }
    }
  }

  updateHelicopter(delta, input) {
    if (this.mesh.userData.mainRotor) {
      this.mesh.userData.mainRotor.rotation.y += delta * 25;
    }
    if (this.mesh.userData.tailRotor) {
      this.mesh.userData.tailRotor.rotation.x += delta * 30;
    }

    if (!input || !this.isOccupied) return;

    let throttle = input.getAxisVertical();
    let steer = input.getAxisHorizontal();
    let ascend = input.isDown('Space');
    let descend = input.isDown('ShiftLeft');

    // Yaw
    this.mesh.rotation.y -= steer * delta * 2.2;

    // Forward/Backward pitch & speed
    const forwardVec = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    this.mesh.position.addScaledVector(forwardVec, throttle * 28 * delta);
    this.mesh.rotation.x = throttle * 0.22;

    // Altitude
    if (ascend) this.mesh.position.y += 18 * delta;
    if (descend) this.mesh.position.y = Math.max(0.4, this.mesh.position.y - 14 * delta);

    if (this.mesh.position.y < 0.4) this.mesh.position.y = 0.4;
  }
}
