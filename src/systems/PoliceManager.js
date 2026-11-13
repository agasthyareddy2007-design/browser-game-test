import * as THREE from 'three';
import { Vehicle } from '../entities/Vehicle.js';

export class PoliceManager {
  constructor(scene, soundSystem, trafficManager, buildings) {
    this.scene = scene;
    this.sound = soundSystem;
    this.trafficManager = trafficManager;
    this.buildings = buildings;

    this.wantedLevel = 0; // 0 to 5
    this.wantedTimer = 0; // Evasion countdown timer
    this.isEvading = false;
    this.bustedTimer = 0;

    this.policeSquad = [];
    this.spawnCooldown = 0;
  }

  setWantedLevel(level) {
    this.wantedLevel = Math.max(0, Math.min(5, level));
    if (this.wantedLevel > 0) {
      this.wantedTimer = 20.0;
      this.isEvading = false;
      this.sound.startPoliceSiren();
    } else {
      this.clearWantedLevel();
    }
  }

  addHeat(amount = 1) {
    this.setWantedLevel(this.wantedLevel + amount);
  }

  clearWantedLevel() {
    this.wantedLevel = 0;
    this.wantedTimer = 0;
    this.isEvading = false;
    this.sound.stopPoliceSiren();

    // Despawn chasing police squad
    for (const cop of this.policeSquad) {
      if (cop.vehicle && !cop.vehicle.isOccupied) {
        this.scene.remove(cop.vehicle.mesh);
      }
    }
    this.policeSquad = [];
  }

  reportCrime(crimeType) {
    if (crimeType === 'punch' && this.wantedLevel === 0) {
      this.setWantedLevel(1);
    } else if (crimeType === 'carjack' && this.wantedLevel < 2) {
      this.setWantedLevel(1);
    } else if (crimeType === 'gunfire' && this.wantedLevel < 2) {
      this.setWantedLevel(2);
    } else if (crimeType === 'pedestrian_hit') {
      this.addHeat(1);
    }
  }

  spawnPolicePursuit(playerPos) {
    if (this.wantedLevel <= 0 || !playerPos) return;

    // Maximum cruisers based on heat
    const maxCruisers = Math.min(4, this.wantedLevel);
    if (this.policeSquad.length >= maxCruisers) return;

    // Spawn cruiser behind or ahead of player on road
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = 65 + Math.random() * 25;
    const spawnPos = new THREE.Vector3(
      playerPos.x + Math.cos(spawnAngle) * spawnDist,
      0.5,
      playerPos.z + Math.sin(spawnAngle) * spawnDist
    );

    // If 5 stars, spawn Military Tank! Otherwise Police Cruiser
    const vehicleType = (this.wantedLevel === 5 && Math.random() > 0.5) ? 'tank' : 'police';

    const cruiser = new Vehicle(this.scene, this.sound, vehicleType, {
      position: spawnPos,
      rotationY: Math.random() * Math.PI * 2
    });

    cruiser.toggleSiren();
    this.policeSquad.push({
      vehicle: cruiser,
      shootTimer: 0
    });
    this.trafficManager.vehicles.push(cruiser);
  }

  update(delta, player, cameraController, onBusted) {
    if (this.wantedLevel <= 0) return;

    // Spawn pursuit vehicles
    this.spawnCooldown += delta;
    if (this.spawnCooldown > 4.0) {
      this.spawnCooldown = 0;
      this.spawnPolicePursuit(player.position);
    }

    // Check line-of-sight & proximity to police
    let anyPoliceNear = false;
    for (let i = this.policeSquad.length - 1; i >= 0; i--) {
      const cop = this.policeSquad[i];
      const car = cop.vehicle;

      if (car.isDestroyed) {
        this.policeSquad.splice(i, 1);
        continue;
      }

      const dist = car.mesh.position.distanceTo(player.position);
      if (dist < 80) {
        anyPoliceNear = true;
      }

      // Police pursuit AI: steer towards player
      const toPlayer = player.position.clone().sub(car.mesh.position);
      toPlayer.y = 0;
      const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);

      // Smooth turn towards player
      let angleDiff = targetAngle - car.mesh.rotation.y;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      car.mesh.rotation.y += angleDiff * Math.min(1, delta * 3.5);

      // Accelerate towards player (ramming speed!)
      const pursuitSpeed = 24 + this.wantedLevel * 4;
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.mesh.rotation.y);
      car.mesh.position.addScaledVector(forward, pursuitSpeed * delta);
      car.physics.speed = pursuitSpeed;

      // Ramming damage if hitting player
      if (dist < 4.0) {
        player.takeDamage(12 * delta, false);
      }

      // Busted check: if player is on foot, close to cop car (<4m), and low speed
      if (!player.isInVehicle && dist < 4.2 && player.velocity.length() < 2.0) {
        this.bustedTimer += delta;
        if (this.bustedTimer > 1.8) {
          this.bustedTimer = 0;
          if (onBusted) onBusted();
          return;
        }
      } else {
        this.bustedTimer = 0;
      }
    }

    // Evasion timer
    if (!anyPoliceNear) {
      this.isEvading = true;
      this.wantedTimer -= delta;
      if (this.wantedTimer <= 0) {
        this.clearWantedLevel();
      }
    } else {
      this.isEvading = false;
      this.wantedTimer = 18.0; // Reset countdown when spotted
    }
  }
}
