import * as THREE from 'three';

export class CameraController {
  // Scratch vectors to eliminate GC in render loop
  static _desiredCamPos = new THREE.Vector3();
  static _rayOrigin = new THREE.Vector3();
  static _rayDir = new THREE.Vector3();
  static _hitTarget = new THREE.Vector3();
  static _targetLookAt = new THREE.Vector3();

  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Camera angles
    this.yaw = 0;
    this.pitch = 0.2; // Radians
    this.targetYaw = 0;
    this.targetPitch = 0.2;

    this.invertY = false;
    this.mouseSensitivity = 0.0022;

    // Target tracking
    this.targetPosition = new THREE.Vector3(0, 1.5, 0);
    this.lookAtPosition = new THREE.Vector3();

    // Mode: 'foot', 'aim', 'vehicle', 'helicopter', 'wasted'
    this.mode = 'foot';
    this.isLookingBack = false;

    // Distances & Heights
    this.currentDistance = 4.0;
    this.targetDistance = 4.0;
    this.currentHeight = 1.4;
    this.targetHeight = 1.4;
    this.shoulderOffset = 0.45;

    // Vehicle auto-follow timer
    this.timeSinceLastMouseMove = 0;

    // Smoothed collision avoidance
    this.smoothObstacleDist = 4.0;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'aim') {
      this.targetDistance = 1.9;
      this.targetHeight = 1.55;
      this.shoulderOffset = 0.65;
    } else if (mode === 'vehicle') {
      this.targetDistance = 6.5;
      this.targetHeight = 2.2;
      this.shoulderOffset = 0.0;
    } else if (mode === 'helicopter') {
      this.targetDistance = 11.5;
      this.targetHeight = 4.2;
      this.shoulderOffset = 0.0;
    } else {
      // foot
      this.targetDistance = 4.0;
      this.targetHeight = 1.4;
      this.shoulderOffset = 0.45;
    }
  }

  update(delta, targetPos, input, collisionObstacles = [], currentVehicle = null) {
    const dx = input.mouse.dx;
    const dy = input.mouse.dy;

    // Track user mouse input
    if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
      this.timeSinceLastMouseMove = 0;

      // Precision ADS sensitivity
      const sens = (this.mode === 'aim') ? this.mouseSensitivity * 0.65 : this.mouseSensitivity;

      // Mouse Look Axis:
      // Moving mouse RIGHT (dx > 0) -> view turns RIGHT
      this.targetYaw -= dx * sens;

      // Moving mouse UP (dy < 0 in browser) -> view tilts UP
      // Moving mouse DOWN (dy > 0 in browser) -> view tilts DOWN
      const pitchDelta = (this.invertY ? -dy : dy) * sens;
      this.targetPitch += pitchDelta;
    } else {
      this.timeSinceLastMouseMove += delta;
    }

    // Vehicle auto-camera follow (classic GTA camera trail)
    if (this.mode === 'vehicle' && currentVehicle && !this.isLookingBack) {
      const carSpeed = currentVehicle.physics ? currentVehicle.physics.speed : 0;
      if (Math.abs(carSpeed) > 2.0 && this.timeSinceLastMouseMove > 0.65) {
        const carYaw = currentVehicle.mesh.rotation.y + (carSpeed >= 0 ? 0 : Math.PI);
        let diff = carYaw - this.targetYaw;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.targetYaw += diff * Math.min(1, delta * 3.5);
      }
    }

    // Pitch Clamping
    if (this.mode === 'vehicle') {
      this.targetPitch = Math.max(-0.05, Math.min(0.65, this.targetPitch));
    } else if (this.mode === 'aim') {
      this.targetPitch = Math.max(-0.7, Math.min(0.8, this.targetPitch));
    } else {
      this.targetPitch = Math.max(-0.6, Math.min(0.95, this.targetPitch));
    }

    // Smooth angle interpolation (eliminates jerkiness)
    const smoothFactor = Math.min(1, delta * 24);
    this.yaw += (this.targetYaw - this.yaw) * smoothFactor;
    this.pitch += (this.targetPitch - this.pitch) * smoothFactor;

    // Look back check [C]
    this.isLookingBack = input.isDown('KeyC');

    // Smooth distance and height transitions
    this.currentDistance += (this.targetDistance - this.currentDistance) * Math.min(1, delta * 9);
    this.currentHeight += (this.targetHeight - this.currentHeight) * Math.min(1, delta * 9);

    // Follow target position smoothly
    this.targetPosition.lerp(targetPos, Math.min(1, delta * 15));

    // Active angle calculation
    let activeYaw = this.yaw;
    if (this.isLookingBack) {
      activeYaw += Math.PI;
    }

    // Spherical coordinate offsets
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(activeYaw);
    const cosYaw = Math.cos(activeYaw);

    const offsetX = sinYaw * cosPitch * this.currentDistance;
    const offsetY = sinPitch * this.currentDistance + this.currentHeight;
    const offsetZ = cosYaw * cosPitch * this.currentDistance;

    // Shoulder offset
    const rightX = cosYaw * this.shoulderOffset;
    const rightZ = -sinYaw * this.shoulderOffset;

    CameraController._desiredCamPos.set(
      this.targetPosition.x + offsetX + rightX,
      this.targetPosition.y + offsetY,
      this.targetPosition.z + offsetZ + rightZ
    );

    // Smooth building collision avoidance (prevents clipping through walls without popping)
    if (collisionObstacles.length > 0 && this.mode !== 'wasted') {
      CameraController._rayOrigin.set(
        this.targetPosition.x,
        this.targetPosition.y + this.currentHeight * 0.8,
        this.targetPosition.z
      );
      CameraController._rayDir.subVectors(CameraController._desiredCamPos, CameraController._rayOrigin).normalize();
      const maxDist = CameraController._rayOrigin.distanceTo(CameraController._desiredCamPos);
      let closestHitDist = maxDist;

      const ray = new THREE.Ray(CameraController._rayOrigin, CameraController._rayDir);
      for (let i = 0; i < collisionObstacles.length; i++) {
        const col = collisionObstacles[i];
        if (col.box && ray.intersectBox(col.box, CameraController._hitTarget)) {
          const d = CameraController._rayOrigin.distanceTo(CameraController._hitTarget);
          if (d < closestHitDist) {
            closestHitDist = d;
          }
        }
      }

      const targetHitDist = (closestHitDist < maxDist - 0.2)
        ? Math.max(0.85, closestHitDist - 0.25)
        : maxDist;

      this.smoothObstacleDist += (targetHitDist - this.smoothObstacleDist) * Math.min(1, delta * 16);

      if (this.smoothObstacleDist < maxDist) {
        CameraController._desiredCamPos.copy(CameraController._rayOrigin)
          .addScaledVector(CameraController._rayDir, this.smoothObstacleDist);
      }
    }

    // Position camera stably (NO random shaking!)
    this.camera.position.copy(CameraController._desiredCamPos);

    // Look at target point
    CameraController._targetLookAt.set(
      this.targetPosition.x + rightX * 0.75,
      this.targetPosition.y + this.currentHeight * 0.75,
      this.targetPosition.z + rightZ * 0.75
    );
    this.camera.lookAt(CameraController._targetLookAt);

    // Store look direction for shooting raycasts
    this.camera.getWorldDirection(this.lookAtPosition);
  }
}
