import * as THREE from 'three';
import { Vehicle } from './Vehicle.js';
import { Pedestrian } from './Pedestrian.js';

export class TrafficManager {
  // Reusable scratch vectors for zero GC overhead
  static _forward = new THREE.Vector3();
  static _toOther = new THREE.Vector3();
  static _toPlayer = new THREE.Vector3();

  constructor(scene, soundSystem, roadNetwork, buildings) {
    this.scene = scene;
    this.sound = soundSystem;
    this.roadNetwork = roadNetwork;
    this.buildings = buildings;

    this.vehicles = [];
    this.pedestrians = [];

    this.maxVehicles = 22;
    this.maxPedestrians = 42;

    this.spawnTimer = 0;
    this.pedSpawnTimer = 0;

    // Initial populating
    this.populateInitialCity();
  }

  populateInitialCity() {
    // 1. Starter Sports Car
    const starterCar = new Vehicle(this.scene, this.sound, 'supercar', {
      position: new THREE.Vector3(8, 0, 18),
      rotationY: Math.PI / 2,
      primaryColor: 0xff3355,
      stripeColor: 0xffffff
    });
    this.vehicles.push(starterCar);

    // 2. Muscle Car near Commercial block
    const muscleCar = new Vehicle(this.scene, this.sound, 'muscle', {
      position: new THREE.Vector3(-45, 0, 75),
      rotationY: 0,
      primaryColor: 0x1177ff
    });
    this.vehicles.push(muscleCar);

    // 3. Yellow Taxi on Main Avenue
    const taxiCar = new Vehicle(this.scene, this.sound, 'taxi', {
      position: new THREE.Vector3(12, 0, -50),
      rotationY: 0
    });
    this.vehicles.push(taxiCar);

    // 4. Stinger Convertible along Vice Beachfront
    const convertible = new Vehicle(this.scene, this.sound, 'convertible', {
      position: new THREE.Vector3(85, 0, 25),
      rotationY: Math.PI / 2,
      primaryColor: 0x00d2d3
    });
    this.vehicles.push(convertible);

    // 5. Patriot 4x4 SUV near Docks
    const suvCar = new Vehicle(this.scene, this.sound, 'suv', {
      position: new THREE.Vector3(-85, 0, -45),
      rotationY: Math.PI,
      primaryColor: 0x2d3436
    });
    this.vehicles.push(suvCar);

    // 6. Police Cruiser outside Police Station
    const copCruiser = new Vehicle(this.scene, this.sound, 'police', {
      position: new THREE.Vector3(135, 0, -115),
      rotationY: Math.PI
    });
    this.vehicles.push(copCruiser);

    // 7. Attack Helicopter on Downtown Rooftop Helipad
    if (this.buildings.interactiveLocations.helipads.length > 0) {
      const heliPos = this.buildings.interactiveLocations.helipads[0];
      const heli = new Vehicle(this.scene, this.sound, 'helicopter', {
        position: heliPos.clone()
      });
      this.vehicles.push(heli);
    }

    // 8. Initial Pedestrians (spawned close to starter spawn so streets are immediately alive)
    const starterPos = new THREE.Vector3(8, 0, 18);
    const nearbyWps = this.roadNetwork.sidewalkWaypoints.filter(wp => {
      const d = wp.distanceTo(starterPos);
      return d >= 8 && d <= 90;
    });

    const wpPool = nearbyWps.length >= 10 ? nearbyWps : this.roadNetwork.sidewalkWaypoints;
    for (let i = 0; i < Math.min(26, wpPool.length); i++) {
      const wp = wpPool[i];
      const ped = new Pedestrian(this.scene, this.sound, wp.clone(), this.roadNetwork.sidewalkWaypoints);
      this.pedestrians.push(ped);
    }
  }

  spawnCivilianCar(nearPos) {
    if (this.vehicles.length >= this.maxVehicles) return;

    const waypoints = this.roadNetwork.trafficWaypoints;
    if (!waypoints || waypoints.length === 0) return;

    let targetWp = null;
    for (let attempts = 0; attempts < 10; attempts++) {
      const candidate = waypoints[Math.floor(Math.random() * waypoints.length)];
      const dist = nearPos ? nearPos.distanceTo(candidate.pos) : 60;
      if (dist >= 45 && dist <= 125) {
        targetWp = candidate;
        break;
      }
    }

    if (!targetWp) return;

    const types = [
      'supercar', 'muscle', 'taxi', 'suv', 'convertible',
      'pickup', 'sedan', 'sedan', 'police', 'ambulance'
    ];
    const carType = types[Math.floor(Math.random() * types.length)];
    const colors = [
      0xff3b30, 0x007aff, 0xffcc00, 0x34c759, 0xaf52de,
      0xff9500, 0x5856d6, 0xff2d55, 0x34495e, 0xecf0f1
    ];

    const car = new Vehicle(this.scene, this.sound, carType, {
      position: targetWp.pos.clone(),
      rotationY: Math.atan2(targetWp.dir.x, targetWp.dir.z),
      primaryColor: colors[Math.floor(Math.random() * colors.length)]
    });

    car.aiWaypoint = targetWp;
    car.physics.speed = 10 + Math.random() * 8; // Ambient driving speed
    this.vehicles.push(car);
  }

  spawnPedestrian(nearPos) {
    if (this.pedestrians.length >= this.maxPedestrians) return;

    const waypoints = this.roadNetwork.sidewalkWaypoints;
    if (!waypoints || waypoints.length === 0) return;

    let targetWp = null;
    for (let attempts = 0; attempts < 8; attempts++) {
      const candidate = waypoints[Math.floor(Math.random() * waypoints.length)];
      const dist = nearPos ? nearPos.distanceTo(candidate) : 40;
      if (dist >= 20 && dist <= 80) {
        targetWp = candidate;
        break;
      }
    }

    if (!targetWp) return;

    const ped = new Pedestrian(this.scene, this.sound, targetWp.clone(), waypoints);
    this.pedestrians.push(ped);
  }

  getClosestVehicle(pos, maxDist = 4.5) {
    let closest = null;
    let minDist = maxDist;

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v.isDestroyed) continue;
      const d = pos.distanceTo(v.mesh.position);
      if (d < minDist) {
        minDist = d;
        closest = v;
      }
    }
    return closest;
  }

  alertPedestriansNear(pos, radius = 35) {
    for (let i = 0; i < this.pedestrians.length; i++) {
      const ped = this.pedestrians[i];
      if (!ped.isDead && ped.group.position.distanceTo(pos) < radius) {
        ped.triggerPanic();
      }
    }
  }

  update(delta, playerPos, playerVehicle, player) {
    this.spawnTimer += delta;
    const carInterval = this.vehicles.length < 12 ? 0.8 : 1.8;
    if (this.spawnTimer > carInterval) {
      this.spawnTimer = 0;
      if (playerPos) this.spawnCivilianCar(playerPos);
    }

    this.pedSpawnTimer += delta;
    const pedInterval = this.pedestrians.length < 20 ? 0.6 : 1.4;
    if (this.pedSpawnTimer > pedInterval) {
      this.pedSpawnTimer = 0;
      if (playerPos) {
        this.spawnPedestrian(playerPos);
        if (this.pedestrians.length < 15) {
          this.spawnPedestrian(playerPos);
        }
      }
    }

    // Update Ambient Vehicles AI
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const car = this.vehicles[i];

      // If player is driving this car, its physics are handled by player controller
      if (car.isOccupied) {
        car.update(delta, null, this.buildings.buildingColliders);
        continue;
      }

      // Recycle distant ambient traffic
      if (playerPos && car.mesh.position.distanceTo(playerPos) > 175 && car !== playerVehicle) {
        this.scene.remove(car.mesh);
        this.vehicles.splice(i, 1);
        continue;
      }

      // Ambient AI driving
      if (car.physics && !car.isDestroyed && car.type !== 'helicopter') {
        TrafficManager._forward.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.mesh.rotation.y);

        let shouldBrake = false;

        // Efficient collision avoidance check
        for (let j = 0; j < this.vehicles.length; j++) {
          const other = this.vehicles[j];
          if (other === car) continue;
          TrafficManager._toOther.subVectors(other.mesh.position, car.mesh.position);
          const distSq = TrafficManager._toOther.lengthSq();
          if (distSq < 100) {
            const dist = Math.sqrt(distSq);
            TrafficManager._toOther.multiplyScalar(1 / dist);
            if (TrafficManager._forward.dot(TrafficManager._toOther) > 0.72) {
              shouldBrake = true;
              break;
            }
          }
        }

        if (playerPos) {
          TrafficManager._toPlayer.subVectors(playerPos, car.mesh.position);
          const pDistSq = TrafficManager._toPlayer.lengthSq();
          if (pDistSq < 64) {
            const pDist = Math.sqrt(pDistSq);
            TrafficManager._toPlayer.multiplyScalar(1 / pDist);
            if (TrafficManager._forward.dot(TrafficManager._toPlayer) > 0.65) {
              shouldBrake = true;
            }
          }
        }

        if (shouldBrake) {
          car.physics.speed = Math.max(0, car.physics.speed - delta * 25);
        } else {
          car.physics.speed = Math.min(16, car.physics.speed + delta * 9);
        }

        // Advance along heading
        car.mesh.position.x += TrafficManager._forward.x * car.physics.speed * delta;
        car.mesh.position.z += TrafficManager._forward.z * car.physics.speed * delta;
      }

      car.update(delta, null, this.buildings.buildingColliders);
    }

    // Update Pedestrians
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const ped = this.pedestrians[i];

      if (playerPos && ped.group.position.distanceTo(playerPos) > 130) {
        ped.dispose();
        this.pedestrians.splice(i, 1);
        continue;
      }

      ped.update(delta, playerPos, player);
    }
  }
}
