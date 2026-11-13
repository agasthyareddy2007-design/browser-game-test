import * as THREE from 'three';

export class Props {
  constructor(scene, roadNetwork, skyLighting) {
    this.scene = scene;
    this.roadNetwork = roadNetwork;
    this.skyLighting = skyLighting;

    this.fireHydrants = [];
    this.pickups = [];
    this.waterParticles = [];

    this.spawnProps();
  }

  spawnProps() {
    const avenues = [];
    for (let i = 0; i < this.roadNetwork.gridSize; i++) {
      const pos = -this.roadNetwork.halfSpan + i * (this.roadNetwork.blockSize + this.roadNetwork.roadWidth);
      avenues.push(pos);
    }

    // Collect positions for Instanced street lamps and palm trees
    const lampPositions = [];
    const palmPositions = [];

    for (let i = 0; i < avenues.length; i++) {
      for (let j = 0; j < avenues.length; j++) {
        const x = avenues[i];
        const z = avenues[j];
        const offset = this.roadNetwork.roadWidth / 2 + 1.2;

        lampPositions.push(new THREE.Vector3(x + offset, 0.25, z + offset));
        lampPositions.push(new THREE.Vector3(x - offset, 0.25, z - offset));

        // Fire hydrants
        if ((i + j) % 2 === 0) {
          this.createFireHydrant(x + offset + 2, z - offset - 1);
        }

        // Palm trees along beachside
        if (x > 0 && Math.abs(z) < this.roadNetwork.halfSpan) {
          palmPositions.push(new THREE.Vector3(x + offset + 3, 0.25, z + 25));
        }
      }
    }

    // 1. Build Instanced Street Lamps (1 Draw Call for all poles!)
    this.buildInstancedStreetLamps(lampPositions);

    // 2. Build Instanced Palm Trees (2 Draw Calls for all palm trees!)
    this.buildInstancedPalmTrees(palmPositions);

    // 3. Spawn Pickups
    this.spawnFloatingPickups();
  }

  buildInstancedStreetLamps(positions) {
    if (positions.length === 0) return;

    // Single merged or instanced lamp post
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7.5, 6);
    poleGeo.translate(0, 3.75, 0);

    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 5);
    armGeo.rotateZ(Math.PI / 3);
    armGeo.translate(-0.8, 7.2, 0);

    // Merge pole and arm for 1 single instanced draw call
    const postMat = new THREE.MeshStandardMaterial({ color: 0x3a4454, metalness: 0.8, roughness: 0.3 });
    const lampInstanced = new THREE.InstancedMesh(poleGeo, postMat, positions.length);
    lampInstanced.castShadow = true;

    // Bulb instanced mesh
    const bulbGeo = new THREE.SphereGeometry(0.3, 6, 6);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffea88 });
    const bulbInstanced = new THREE.InstancedMesh(bulbGeo, bulbMat, positions.length);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < positions.length; i++) {
      dummy.position.copy(positions[i]);
      dummy.updateMatrix();
      lampInstanced.setMatrixAt(i, dummy.matrix);

      dummy.position.set(positions[i].x - 1.6, positions[i].y + 6.8, positions[i].z);
      dummy.updateMatrix();
      bulbInstanced.setMatrixAt(i, dummy.matrix);
    }

    lampInstanced.instanceMatrix.needsUpdate = true;
    bulbInstanced.instanceMatrix.needsUpdate = true;

    this.scene.add(lampInstanced);
    this.scene.add(bulbInstanced);

    this.skyLighting.registerEmissive(bulbInstanced, 0xffea88);
  }

  buildInstancedPalmTrees(positions) {
    if (positions.length === 0) return;

    // Trunk instanced mesh
    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.5, 9, 6);
    trunkGeo.translate(0, 4.5, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5b3a, roughness: 0.9 });
    const trunkInstanced = new THREE.InstancedMesh(trunkGeo, trunkMat, positions.length);
    trunkInstanced.castShadow = true;

    // Fronds instanced mesh (7 fronds per tree)
    const frondGeo = new THREE.BoxGeometry(0.6, 0.08, 4.2);
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x228833, roughness: 0.6 });
    const totalFronds = positions.length * 6;
    const frondsInstanced = new THREE.InstancedMesh(frondGeo, frondMat, totalFronds);
    frondsInstanced.castShadow = true;

    const dummy = new THREE.Object3D();
    let frondIdx = 0;

    for (let i = 0; i < positions.length; i++) {
      dummy.position.copy(positions[i]);
      dummy.rotation.set(0, 0, 0.08);
      dummy.updateMatrix();
      trunkInstanced.setMatrixAt(i, dummy.matrix);

      // Fronds
      for (let f = 0; f < 6; f++) {
        dummy.position.set(positions[i].x, positions[i].y + 8.8, positions[i].z);
        dummy.rotation.set(0.45, (f / 6) * Math.PI * 2, 0);
        dummy.updateMatrix();
        frondsInstanced.setMatrixAt(frondIdx++, dummy.matrix);
      }
    }

    trunkInstanced.instanceMatrix.needsUpdate = true;
    frondsInstanced.instanceMatrix.needsUpdate = true;

    this.scene.add(trunkInstanced);
    this.scene.add(frondsInstanced);
  }

  createFireHydrant(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0.25, z);

    const redMat = new THREE.MeshStandardMaterial({ color: 0xee2222, metalness: 0.4, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.9, 8), redMat);
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), redMat);
    cap.position.y = 0.9;
    group.add(cap);

    this.scene.add(group);
    this.fireHydrants.push({
      group,
      position: new THREE.Vector3(x, 0.25, z),
      broken: false,
      erupting: false
    });
  }

  spawnFloatingPickups() {
    const pickupDefs = [
      { type: 'cash', amount: 500, pos: new THREE.Vector3(20, 1.0, 20) },
      { type: 'cash', amount: 1000, pos: new THREE.Vector3(-80, 1.0, 60) },
      { type: 'health', pos: new THREE.Vector3(120, 1.0, -120) },
      { type: 'armor', pos: new THREE.Vector3(-120, 1.0, -80) },
      { type: 'weapon', weapon: 'smg', pos: new THREE.Vector3(-40, 1.0, -40) },
      { type: 'weapon', weapon: 'shotgun', pos: new THREE.Vector3(80, 1.0, 120) },
      { type: 'weapon', weapon: 'rpg', pos: new THREE.Vector3(-140, 15.0, -140) }
    ];

    for (const def of pickupDefs) {
      this.createPickup(def);
    }
  }

  createPickup(def) {
    const group = new THREE.Group();
    group.position.copy(def.pos);

    let mesh;
    if (def.type === 'cash') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, emissive: 0x1a7d42, emissiveIntensity: 0.5 });
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 1.4), mat);
    } else if (def.type === 'health') {
      const mat = new THREE.MeshStandardMaterial({ color: 0xff3344, emissive: 0x990011, emissiveIntensity: 0.6 });
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), mat);
    } else if (def.type === 'armor') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x3399ff, emissive: 0x0044bb, emissiveIntensity: 0.6 });
      mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.6), mat);
    } else {
      const mat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xaa7700, emissiveIntensity: 0.6 });
      mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.3), mat);
    }

    group.add(mesh);
    this.scene.add(group);

    this.pickups.push({
      ...def,
      group,
      mesh,
      collected: false,
      baseY: def.pos.y
    });
  }

  update(delta, playerPos, onCollectPickup) {
    const time = performance.now() * 0.003;
    for (let i = 0; i < this.pickups.length; i++) {
      const p = this.pickups[i];
      if (p.collected) continue;
      p.mesh.rotation.y += delta * 2.5;
      p.group.position.y = p.baseY + Math.sin(time + p.pos.x) * 0.25;

      if (playerPos && playerPos.distanceTo(p.group.position) < 2.0) {
        p.collected = true;
        this.scene.remove(p.group);
        if (onCollectPickup) onCollectPickup(p);
      }
    }

    // Hydrant water particles
    for (let i = this.waterParticles.length - 1; i >= 0; i--) {
      const wp = this.waterParticles[i];
      wp.mesh.position.addScaledVector(wp.velocity, delta);
      wp.velocity.y -= 15 * delta;

      if (wp.mesh.position.y < 0.2) {
        wp.mesh.position.copy(wp.origin);
        wp.mesh.position.y += 0.5;
        wp.velocity.set(
          (Math.random() - 0.5) * 2.0,
          7 + Math.random() * 5,
          (Math.random() - 0.5) * 2.0
        );
      }
    }
  }
}
