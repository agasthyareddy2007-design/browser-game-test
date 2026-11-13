import * as THREE from 'three';

export class VehiclePhysics {
  // Reusable scratch vectors to avoid GC allocations during render frames
  static _forwardVec = new THREE.Vector3();
  static _nextPos = new THREE.Vector3();

  constructor(config = {}) {
    this.topSpeed = config.topSpeed || 42; // m/s (~94 mph)
    this.reverseSpeed = config.reverseSpeed || 15;
    this.acceleration = config.acceleration || 28;
    this.braking = config.braking || 42;
    this.reverseAccel = config.reverseAccel || 16;
    this.drag = config.drag || 0.988;
    this.steerAngleMax = config.steerAngleMax || 0.60;
    this.steerSpeed = config.steerSpeed || 14.0;
    this.steerReturnSpeed = config.steerReturnSpeed || 20.0;
    this.grip = config.grip || 0.93;
    this.driftGrip = config.driftGrip || 0.52;
    this.mass = config.mass || 1400;

    // State
    this.speed = 0; // Forward speed in m/s
    this.steerAngle = 0;
    this.velocity = new THREE.Vector3();
    this.angularVelocity = 0;
    this.isDrifting = false;
    this.isBraking = false;
    this.isReversing = false;
    this.nitro = 100;
    this.isNitroActive = false;

    // Dynamic body tilt for weight transfer and suspension
    this.pitch = 0;
    this.roll = 0;
  }

  update(delta, input, transform, buildingColliders = []) {
    let throttle = 0;
    let steer = 0;
    let handbrake = false;
    let nitro = false;

    if (input) {
      throttle = input.getAxisVertical(); // 1 = W, -1 = S
      steer = -input.getAxisHorizontal(); // 1 = A (left), -1 = D (right)
      handbrake = input.isDown('Space');
      nitro = input.isDown('ShiftLeft') && this.nitro > 5;
    }

    // Nitro handling
    if (nitro && throttle > 0) {
      this.isNitroActive = true;
      this.nitro = Math.max(0, this.nitro - delta * 32);
    } else {
      this.isNitroActive = false;
      this.nitro = Math.min(100, this.nitro + delta * 16);
    }

    const accelMultiplier = this.isNitroActive ? 1.75 : 1.0;
    const maxForwardSpeed = this.isNitroActive ? this.topSpeed * 1.3 : this.topSpeed;

    // Responsive Throttle & Braking
    this.isBraking = false;
    this.isReversing = false;

    if (throttle > 0) {
      if (this.speed < -0.3) {
        // Moving backward: W brakes hard to 0
        this.speed += this.braking * delta;
        this.isBraking = true;
      } else {
        // Accelerate forward
        this.speed += this.acceleration * accelMultiplier * delta;
        if (this.speed > maxForwardSpeed) this.speed = maxForwardSpeed;
      }
    } else if (throttle < 0) {
      if (this.speed > 0.3) {
        // Moving forward: S brakes firmly
        this.speed -= this.braking * delta;
        this.isBraking = true;
      } else {
        // Reverse gear
        this.speed -= this.reverseAccel * delta;
        if (this.speed < -this.reverseSpeed) this.speed = -this.reverseSpeed;
        this.isReversing = true;
      }
    } else {
      // Natural rolling drag
      this.speed *= Math.pow(this.drag, delta * 60);
      if (Math.abs(this.speed) < 0.1) this.speed = 0;
    }

    // Handbrake drift mechanics
    this.isDrifting = handbrake && Math.abs(this.speed) > 4;
    if (handbrake) {
      this.speed *= Math.pow(0.95, delta * 60);
    }

    // Snappy steering with speed-dependent scaling
    const speedRatio = Math.min(1, Math.abs(this.speed) / this.topSpeed);
    const targetSteerAngle = steer * this.steerAngleMax * (1.0 - speedRatio * 0.32);

    const activeSteerRate = (steer === 0) ? this.steerReturnSpeed : this.steerSpeed;
    this.steerAngle += (targetSteerAngle - this.steerAngle) * Math.min(1, delta * activeSteerRate);

    // Turning yaw rotation (Ackerman low-speed boost for parking and tight corners)
    const turnBoost = (Math.abs(this.speed) < 9.0 && Math.abs(this.speed) > 0.2) ? 1.45 : 1.0;
    const driftBoost = this.isDrifting ? 1.7 : 1.0;

    if (Math.abs(this.speed) > 0.1) {
      // Kinematic vehicle turning rate
      const yawDelta = (this.speed / 3.7) * Math.tan(this.steerAngle) * turnBoost * driftBoost * delta;
      transform.rotation.y += yawDelta;
    }

    // Direction vector (reusable)
    VehiclePhysics._forwardVec.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), transform.rotation.y);

    // Velocity vector
    this.velocity.copy(VehiclePhysics._forwardVec).multiplyScalar(this.speed);

    // Dynamic Suspension Pitch & Roll
    const targetPitch = (throttle * -0.03 * accelMultiplier) + (this.isBraking ? 0.045 : 0);
    const targetRoll = -this.steerAngle * speedRatio * 0.11 * (this.isDrifting ? -0.4 : 1);
    this.pitch += (targetPitch - this.pitch) * delta * 12;
    this.roll += (targetRoll - this.roll) * delta * 12;

    // Next position
    VehiclePhysics._nextPos.copy(transform.position);
    VehiclePhysics._nextPos.x += this.velocity.x * delta;
    VehiclePhysics._nextPos.z += this.velocity.z * delta;

    // Building box collision with smooth sliding
    const carRadius = 1.5;
    let collided = false;

    for (let i = 0; i < buildingColliders.length; i++) {
      const b = buildingColliders[i];
      if (VehiclePhysics._nextPos.x + carRadius > b.minX && VehiclePhysics._nextPos.x - carRadius < b.maxX &&
          VehiclePhysics._nextPos.z + carRadius > b.minZ && VehiclePhysics._nextPos.z - carRadius < b.maxZ) {
        if (VehiclePhysics._nextPos.y < b.height) {
          collided = true;
          const dLeft = Math.abs((VehiclePhysics._nextPos.x + carRadius) - b.minX);
          const dRight = Math.abs(b.maxX - (VehiclePhysics._nextPos.x - carRadius));
          const dBottom = Math.abs((VehiclePhysics._nextPos.z + carRadius) - b.minZ);
          const dTop = Math.abs(b.maxZ - (VehiclePhysics._nextPos.z - carRadius));
          const minP = Math.min(dLeft, dRight, dBottom, dTop);

          if (minP === dLeft) VehiclePhysics._nextPos.x = b.minX - carRadius;
          else if (minP === dRight) VehiclePhysics._nextPos.x = b.maxX + carRadius;
          else if (minP === dBottom) VehiclePhysics._nextPos.z = b.minZ - carRadius;
          else VehiclePhysics._nextPos.z = b.maxZ + carRadius;

          // Wall scrape friction (slows down cleanly instead of jarring recoil)
          this.speed *= 0.75;
          break;
        }
      }
    }

    transform.position.copy(VehiclePhysics._nextPos);

    return {
      collided,
      isDrifting: this.isDrifting,
      speedMPH: Math.round(Math.abs(this.speed) * 2.23694)
    };
  }
}
