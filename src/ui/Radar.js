export class Radar {
  constructor(canvasId, fullMapCanvasId, roadNetwork, buildings) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.fullCanvas = document.getElementById(fullMapCanvasId);
    this.fullCtx = this.fullCanvas ? this.fullCanvas.getContext('2d') : null;

    this.roadNetwork = roadNetwork;
    this.buildings = buildings;

    this.zoom = 0.52;

    // High-performance offscreen pre-rendered map canvas
    this.cachedMapCanvas = document.createElement('canvas');
    this.cachedMapCanvas.width = 600;
    this.cachedMapCanvas.height = 600;
    this.cachedMapCtx = this.cachedMapCanvas.getContext('2d');
    this.mapHalfSize = 300;

    this.preRenderStaticMap();
  }

  preRenderStaticMap() {
    const ctx = this.cachedMapCtx;
    const w = this.cachedMapCanvas.width;
    const h = this.cachedMapCanvas.height;
    const half = this.mapHalfSize;

    // Ocean background
    ctx.fillStyle = '#0a101d';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(half, half);

    // City Island Base
    const span = this.roadNetwork.halfSpan + 35;
    ctx.fillStyle = '#18202c';
    ctx.fillRect(-span, -span, span * 2, span * 2);

    // Block Sidewalk platforms
    ctx.fillStyle = '#253244';
    const avenuePositions = [];
    for (let i = 0; i < this.roadNetwork.gridSize; i++) {
      const pos = -this.roadNetwork.halfSpan + i * (this.roadNetwork.blockSize + this.roadNetwork.roadWidth);
      avenuePositions.push(pos);
    }

    for (let i = 0; i < this.roadNetwork.gridSize - 1; i++) {
      for (let j = 0; j < this.roadNetwork.gridSize - 1; j++) {
        const minX = avenuePositions[i] + this.roadNetwork.roadWidth / 2;
        const maxX = avenuePositions[i + 1] - this.roadNetwork.roadWidth / 2;
        const minZ = avenuePositions[j] + this.roadNetwork.roadWidth / 2;
        const maxZ = avenuePositions[j + 1] - this.roadNetwork.roadWidth / 2;
        ctx.fillRect(minX, minZ, maxX - minX, maxZ - minZ);
      }
    }

    // Asphalt Roads
    ctx.strokeStyle = '#323d4f';
    ctx.lineWidth = this.roadNetwork.roadWidth;
    ctx.lineCap = 'square';

    for (let i = 0; i < this.roadNetwork.roadSegments.length; i++) {
      const seg = this.roadNetwork.roadSegments[i];
      ctx.beginPath();
      if (seg.type === 'horizontal') {
        ctx.moveTo(seg.x1 - 10, seg.z);
        ctx.lineTo(seg.x2 + 10, seg.z);
      } else {
        ctx.moveTo(seg.x, seg.z1 - 10);
        ctx.lineTo(seg.x, seg.z2 + 10);
      }
      ctx.stroke();
    }

    // Intersections
    ctx.fillStyle = '#323d4f';
    for (let i = 0; i < this.roadNetwork.intersections.length; i++) {
      const inter = this.roadNetwork.intersections[i];
      ctx.fillRect(
        inter.x - this.roadNetwork.roadWidth / 2,
        inter.z - this.roadNetwork.roadWidth / 2,
        this.roadNetwork.roadWidth,
        this.roadNetwork.roadWidth
      );
    }

    // Permanent Landmarks
    const locs = this.buildings.interactiveLocations;
    if (locs.payNSpray) {
      ctx.fillStyle = '#38ef7d';
      ctx.beginPath();
      ctx.arc(locs.payNSpray.x, locs.payNSpray.z, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    if (locs.ammuNation) {
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(locs.ammuNation.x, locs.ammuNation.z, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    if (locs.hospital) {
      ctx.fillStyle = '#ff77aa';
      ctx.beginPath();
      ctx.arc(locs.hospital.x, locs.hospital.z, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    if (locs.policeStation) {
      ctx.fillStyle = '#3388ff';
      ctx.beginPath();
      ctx.arc(locs.policeStation.x, locs.policeStation.z, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  update(playerPos, cameraYaw, trafficManager, policeManager, missionManager, multiplayerClient = null) {
    if (!this.ctx || !playerPos) return;

    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = width / 2 - 2;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // 1. Draw Pre-rendered Map with ONE fast blit!
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-cameraYaw);
    ctx.scale(this.zoom, this.zoom);

    // Fast image blit
    ctx.drawImage(
      this.cachedMapCanvas,
      -this.mapHalfSize - playerPos.x,
      -this.mapHalfSize - playerPos.z
    );

    // 2. Draw Dynamic Vehicle blips
    if (trafficManager) {
      for (let i = 0; i < trafficManager.vehicles.length; i++) {
        const v = trafficManager.vehicles[i];
        if (v.isDestroyed) continue;
        const vx = v.mesh.position.x - playerPos.x;
        const vz = v.mesh.position.z - playerPos.z;

        // Skip blips outside radar circle
        if (vx * vx + vz * vz > 14000) continue;

        ctx.fillStyle = (v.type === 'police') ? '#3388ff' : (v.type === 'tank' ? '#ff4400' : '#ffe600');
        ctx.beginPath();
        ctx.arc(v.mesh.position.x - playerPos.x, v.mesh.position.z - playerPos.z, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Draw Police Pursuit Blips
    if (policeManager && policeManager.policeSquad.length > 0) {
      const isRed = Math.floor(performance.now() / 180) % 2 === 0;
      for (let i = 0; i < policeManager.policeSquad.length; i++) {
        const cop = policeManager.policeSquad[i];
        if (!cop.vehicle || cop.vehicle.isDestroyed) continue;

        const px = cop.vehicle.mesh.position.x - playerPos.x;
        const pz = cop.vehicle.mesh.position.z - playerPos.z;

        ctx.fillStyle = isRed ? '#ff2222' : '#2288ff';
        ctx.beginPath();
        ctx.arc(px, pz, 5.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Draw Remote Multiplayer Players
    if (multiplayerClient && multiplayerClient.remotePlayers) {
      for (const rp of multiplayerClient.remotePlayers.values()) {
        if (rp.isDead) continue;
        const rpx = rp.position.x - playerPos.x;
        const rpz = rp.position.z - playerPos.z;
        if (rpx * rpx + rpz * rpz > 22000) continue;

        ctx.fillStyle = '#' + (rp.color ? rp.color.toString(16).padStart(6, '0') : '00d2d3');
        ctx.beginPath();
        ctx.arc(rpx, rpz, 5.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 5. Draw Mission Waypoint Blip
    if (missionManager && missionManager.activeMission) {
      const stage = missionManager.activeMission.stages[missionManager.missionStage];
      if (stage && stage.target) {
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(stage.target.x - playerPos.x, stage.target.z - playerPos.z, 6.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore(); // Restore rotated canvas

    // 5. Draw Player White Arrow in Center (Always points straight UP)
    ctx.fillStyle = '#00ffcc';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx - 5, cy + 6);
    ctx.lineTo(cx, cy + 3);
    ctx.lineTo(cx + 5, cy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Radar border ring
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  renderFullscreenMap(playerPos, missionManager, multiplayerClient = null) {
    if (!this.fullCtx || !this.fullCanvas) return;
    const ctx = this.fullCtx;
    const w = this.fullCanvas.width;
    const h = this.fullCanvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.cachedMapCanvas, 0, 0, w, h);

    const scale = w / (this.mapHalfSize * 2);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);

    // Remote Players
    if (multiplayerClient && multiplayerClient.remotePlayers) {
      for (const rp of multiplayerClient.remotePlayers.values()) {
        if (rp.isDead) continue;
        ctx.fillStyle = '#' + (rp.color ? rp.color.toString(16).padStart(6, '0') : '00d2d3');
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rp.position.x, rp.position.z, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(rp.username, rp.position.x, rp.position.z - 9);
      }
    }

    // Player position
    if (playerPos) {
      ctx.fillStyle = '#00ffcc';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(playerPos.x, playerPos.z, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Mission target
    if (missionManager && missionManager.activeMission) {
      const stage = missionManager.activeMission.stages[missionManager.missionStage];
      if (stage && stage.target) {
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(stage.target.x, stage.target.z, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
