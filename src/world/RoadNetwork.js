import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';

export class RoadNetwork {
  constructor(scene) {
    this.scene = scene;
    
    // Grid parameters
    this.gridSize = 5; // 5x5 avenues = 4x4 blocks
    this.blockSize = 90; // Size of each city block between avenues
    this.roadWidth = 16; // 4 lanes
    this.sidewalkWidth = 3.5;
    this.totalSpan = (this.gridSize - 1) * (this.blockSize + this.roadWidth);
    this.halfSpan = this.totalSpan / 2;

    this.roadSegments = [];
    this.intersections = [];
    this.trafficWaypoints = [];
    this.sidewalkWaypoints = [];

    // Shared Textures (generated once, never cloned)
    this.roadTextureH = TextureGenerator.createRoadTexture();
    this.roadTextureH.wrapS = THREE.RepeatWrapping;
    this.roadTextureH.wrapT = THREE.RepeatWrapping;
    this.roadTextureH.repeat.set(this.blockSize / 16, 1);

    this.roadTextureV = TextureGenerator.createRoadTexture();
    this.roadTextureV.wrapS = THREE.RepeatWrapping;
    this.roadTextureV.wrapT = THREE.RepeatWrapping;
    this.roadTextureV.repeat.set(1, this.blockSize / 16);

    this.intersectionTexture = TextureGenerator.createIntersectionTexture();
    this.sidewalkTexture = TextureGenerator.createSidewalkTexture();

    this.buildNetwork();
  }

  buildNetwork() {
    const avenuePositions = [];
    for (let i = 0; i < this.gridSize; i++) {
      const pos = -this.halfSpan + i * (this.blockSize + this.roadWidth);
      avenuePositions.push(pos);
    }

    // Shared Single Materials (drastically reduces draw calls & VRAM)
    const horizRoadMat = new THREE.MeshStandardMaterial({
      map: this.roadTextureH,
      roughness: 0.85,
      metalness: 0.1
    });

    const vertRoadMat = new THREE.MeshStandardMaterial({
      map: this.roadTextureV,
      roughness: 0.85,
      metalness: 0.1
    });

    const interMat = new THREE.MeshStandardMaterial({
      map: this.intersectionTexture,
      roughness: 0.85,
      metalness: 0.1
    });

    const sidewalkMat = new THREE.MeshStandardMaterial({
      map: this.sidewalkTexture,
      roughness: 0.9,
      metalness: 0.05
    });

    // 1. Intersections
    const interGeo = new THREE.PlaneGeometry(this.roadWidth, this.roadWidth);
    interGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < avenuePositions.length; i++) {
      for (let j = 0; j < avenuePositions.length; j++) {
        const x = avenuePositions[i];
        const z = avenuePositions[j];

        const interMesh = new THREE.Mesh(interGeo, interMat);
        interMesh.position.set(x, 0.02, z);
        interMesh.receiveShadow = true;
        this.scene.add(interMesh);

        this.intersections.push({ x, z, gridI: i, gridJ: j });
      }
    }

    // 2. Road Segments between Intersections
    const segLen = this.blockSize;

    const horizGeo = new THREE.PlaneGeometry(segLen, this.roadWidth);
    horizGeo.rotateX(-Math.PI / 2);

    const vertGeo = new THREE.PlaneGeometry(this.roadWidth, segLen);
    vertGeo.rotateX(-Math.PI / 2);

    // Horizontal segments
    for (let i = 0; i < this.gridSize - 1; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const x = (avenuePositions[i] + avenuePositions[i + 1]) / 2;
        const z = avenuePositions[j];

        const hMesh = new THREE.Mesh(horizGeo, horizRoadMat);
        hMesh.position.set(x, 0.02, z);
        hMesh.rotation.y = Math.PI / 2;
        hMesh.receiveShadow = true;
        this.scene.add(hMesh);

        this.roadSegments.push({
          type: 'horizontal',
          x1: avenuePositions[i] + this.roadWidth / 2,
          x2: avenuePositions[i + 1] - this.roadWidth / 2,
          z: z
        });
      }
    }

    // Vertical segments
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize - 1; j++) {
        const x = avenuePositions[i];
        const z = (avenuePositions[j] + avenuePositions[j + 1]) / 2;

        const vMesh = new THREE.Mesh(vertGeo, vertRoadMat);
        vMesh.position.set(x, 0.02, z);
        vMesh.receiveShadow = true;
        this.scene.add(vMesh);

        this.roadSegments.push({
          type: 'vertical',
          x: x,
          z1: avenuePositions[j] + this.roadWidth / 2,
          z2: avenuePositions[j + 1] - this.roadWidth / 2
        });
      }
    }

    // 3. Sidewalks
    const curbHeight = 0.22;
    for (let i = 0; i < this.gridSize - 1; i++) {
      for (let j = 0; j < this.gridSize - 1; j++) {
        const blockMinX = avenuePositions[i] + this.roadWidth / 2;
        const blockMaxX = avenuePositions[i + 1] - this.roadWidth / 2;
        const blockMinZ = avenuePositions[j] + this.roadWidth / 2;
        const blockMaxZ = avenuePositions[j + 1] - this.roadWidth / 2;
        const bW = blockMaxX - blockMinX;
        const bD = blockMaxZ - blockMinZ;
        const cx = (blockMinX + blockMaxX) / 2;
        const cz = (blockMinZ + blockMaxZ) / 2;

        const swGeo = new THREE.BoxGeometry(bW, curbHeight, bD);
        const swMesh = new THREE.Mesh(swGeo, sidewalkMat);
        swMesh.position.set(cx, curbHeight / 2, cz);
        swMesh.receiveShadow = true;
        this.scene.add(swMesh);

        const offset = 1.8;
        const step = 18;

        // Walkable perimeter loops around each city block
        for (let x = blockMinX + offset; x < blockMaxX - offset; x += step) {
          this.sidewalkWaypoints.push(new THREE.Vector3(x, curbHeight, blockMinZ + offset));
        }
        for (let z = blockMinZ + offset; z < blockMaxZ - offset; z += step) {
          this.sidewalkWaypoints.push(new THREE.Vector3(blockMaxX - offset, curbHeight, z));
        }
        for (let x = blockMaxX - offset; x > blockMinX + offset; x -= step) {
          this.sidewalkWaypoints.push(new THREE.Vector3(x, curbHeight, blockMaxZ - offset));
        }
        for (let z = blockMaxZ - offset; z > blockMinZ + offset; z -= step) {
          this.sidewalkWaypoints.push(new THREE.Vector3(blockMinX + offset, curbHeight, z));
        }
      }
    }

    // 4. Traffic Waypoints
    this.generateTrafficWaypoints(avenuePositions);
  }

  generateTrafficWaypoints(avenues) {
    const laneOffset = 4.0;

    for (let i = 0; i < avenues.length; i++) {
      const roadCoord = avenues[i];
      for (let z = -this.halfSpan - 40; z <= this.halfSpan + 40; z += 30) {
        this.trafficWaypoints.push({
          pos: new THREE.Vector3(roadCoord + laneOffset, 0.5, z),
          dir: new THREE.Vector3(0, 0, 1),
          roadType: 'vertical',
          roadCoord: roadCoord
        });
        this.trafficWaypoints.push({
          pos: new THREE.Vector3(roadCoord - laneOffset, 0.5, z),
          dir: new THREE.Vector3(0, 0, -1),
          roadType: 'vertical',
          roadCoord: roadCoord
        });
      }

      for (let x = -this.halfSpan - 40; x <= this.halfSpan + 40; x += 30) {
        this.trafficWaypoints.push({
          pos: new THREE.Vector3(x, 0.5, roadCoord - laneOffset),
          dir: new THREE.Vector3(1, 0, 0),
          roadType: 'horizontal',
          roadCoord: roadCoord
        });
        this.trafficWaypoints.push({
          pos: new THREE.Vector3(x, 0.5, roadCoord + laneOffset),
          dir: new THREE.Vector3(-1, 0, 0),
          roadType: 'horizontal',
          roadCoord: roadCoord
        });
      }
    }
  }

  getClosestWaypoint(pos, maxDist = 35) {
    let closest = null;
    let minDist = maxDist;
    for (let i = 0; i < this.trafficWaypoints.length; i++) {
      const wp = this.trafficWaypoints[i];
      const d = pos.distanceTo(wp.pos);
      if (d < minDist) {
        minDist = d;
        closest = wp;
      }
    }
    return closest;
  }
}
