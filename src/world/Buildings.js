import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';

export class Buildings {
  constructor(scene, roadNetwork, skyLighting) {
    this.scene = scene;
    this.roadNetwork = roadNetwork;
    this.skyLighting = skyLighting;

    this.buildingColliders = []; // Bounding boxes for collision detection
    this.interactiveLocations = {
      payNSpray: null,
      ammuNation: null,
      hospital: null,
      policeStation: null,
      stuntRamps: [],
      helipads: []
    };

    this.windowTextures = {
      blue: TextureGenerator.createBuildingWindowTexture('#263d59', 0.45),
      dark: TextureGenerator.createBuildingWindowTexture('#1d2430', 0.35),
      warm: TextureGenerator.createBuildingWindowTexture('#3f332c', 0.5),
      decoPink: TextureGenerator.createBuildingWindowTexture('#5c3848', 0.4),
      decoCyan: TextureGenerator.createBuildingWindowTexture('#27545b', 0.4)
    };

    this.buildCityDistricts();
  }

  buildCityDistricts() {
    const avenuePositions = [];
    for (let i = 0; i < this.roadNetwork.gridSize; i++) {
      const pos = -this.roadNetwork.halfSpan + i * (this.roadNetwork.blockSize + this.roadNetwork.roadWidth);
      avenuePositions.push(pos);
    }

    // 4x4 Blocks
    for (let bx = 0; bx < this.roadNetwork.gridSize - 1; bx++) {
      for (let bz = 0; bz < this.roadNetwork.gridSize - 1; bz++) {
        const minX = avenuePositions[bx] + this.roadNetwork.roadWidth / 2 + this.roadNetwork.sidewalkWidth;
        const maxX = avenuePositions[bx + 1] - this.roadNetwork.roadWidth / 2 - this.roadNetwork.sidewalkWidth;
        const minZ = avenuePositions[bz] + this.roadNetwork.roadWidth / 2 + this.roadNetwork.sidewalkWidth;
        const maxZ = avenuePositions[bz + 1] - this.roadNetwork.roadWidth / 2 - this.roadNetwork.sidewalkWidth;

        // Assign district flavor based on grid coordinates
        if (bx === 0 && bz === 0) {
          // Block (0,0): Industrial Shipping Docks & Warehouses
          this.buildIndustrialBlock(minX, maxX, minZ, maxZ);
        } else if (bx === 0 && bz === 1) {
          // Block (0,1): Multi-Level Parking Garage with Stunt Ramp
          this.buildParkingGarageBlock(minX, maxX, minZ, maxZ);
        } else if (bx === 3 && bz === 0) {
          // Block (3,0): Police Precinct & Headquarters
          this.buildPolicePrecinctBlock(minX, maxX, minZ, maxZ);
        } else if (bx === 3 && bz === 3) {
          // Block (3,3): Metropolis General Hospital
          this.buildHospitalBlock(minX, maxX, minZ, maxZ);
        } else if (bx === 1 && bz === 3) {
          // Block (1,3): Commercial District (Ammu-Nation + Pay 'n' Spray + Gas Station)
          this.buildCommercialBlock(minX, maxX, minZ, maxZ);
        } else if (bx >= 2) {
          // Vice Beachfront Promenade / Art Deco District
          this.buildArtDecoBlock(minX, maxX, minZ, maxZ, bx, bz);
        } else {
          // Downtown Financial District (Skyscrapers)
          this.buildDowntownBlock(minX, maxX, minZ, maxZ, bx, bz);
        }
      }
    }
  }

  /* ----------------- DOWNTOWN SKYSCRAPERS ----------------- */
  buildDowntownBlock(minX, maxX, minZ, maxZ, bx, bz) {
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const bW = maxX - minX;
    const bD = maxZ - minZ;

    // Center skyscraper
    const towerW = bW * 0.65;
    const towerD = bD * 0.65;
    const towerH = 75 + Math.random() * 45;

    const towerMat = new THREE.MeshStandardMaterial({
      map: this.windowTextures.blue,
      roughness: 0.35,
      metalness: 0.4
    });

    const towerGeo = new THREE.BoxGeometry(towerW, towerH, towerD);
    const towerMesh = new THREE.Mesh(towerGeo, towerMat);
    towerMesh.position.set(cx, towerH / 2 + 0.25, cz);
    towerMesh.castShadow = true;
    towerMesh.receiveShadow = true;
    this.scene.add(towerMesh);
    this.registerBuildingCollider(cx, cz, towerW, towerD, towerH);

    // Helipad on the tallest skyscraper in downtown
    if (bx === 1 && bz === 1) {
      this.createHelipad(cx, towerH + 0.3, cz, 16);
      this.interactiveLocations.helipads.push(new THREE.Vector3(cx, towerH + 1.0, cz));
    }

    // Neon logo on tower
    const neonTexture = TextureGenerator.createNeonSignTexture(
      (bx + bz) % 2 === 0 ? 'CYBERDYNE' : 'V-BANK CORP',
      '#00e5ff',
      '#0088ff'
    );
    const neonMat = new THREE.MeshBasicMaterial({
      map: neonTexture,
      transparent: true
    });
    const neonGeo = new THREE.PlaneGeometry(24, 6);
    const neonMesh = new THREE.Mesh(neonGeo, neonMat);
    neonMesh.position.set(cx, towerH - 8, cz + towerD / 2 + 0.1);
    this.scene.add(neonMesh);

    // Flanking lower corporate buildings
    const cornerW = (bW - towerW) * 0.85;
    const cornerH = 24 + Math.random() * 15;
    const cMat = new THREE.MeshStandardMaterial({
      map: this.windowTextures.dark,
      roughness: 0.5,
      metalness: 0.2
    });
    
    // Add two small satellite buildings
    const sat1Geo = new THREE.BoxGeometry(cornerW, cornerH, towerD * 0.8);
    const sat1 = new THREE.Mesh(sat1Geo, cMat);
    sat1.position.set(minX + cornerW / 2, cornerH / 2 + 0.25, cz);
    sat1.castShadow = true;
    sat1.receiveShadow = true;
    this.scene.add(sat1);
    this.registerBuildingCollider(sat1.position.x, cz, cornerW, towerD * 0.8, cornerH);
  }

  /* ----------------- VICE ART DECO & BEACH BOULEVARD ----------------- */
  buildArtDecoBlock(minX, maxX, minZ, maxZ, bx, bz) {
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const bW = maxX - minX;
    const bD = maxZ - minZ;

    // 2-3 colorful Art Deco hotels with neon overhangs and stepped roofs
    const hotelW = bW * 0.44;
    const hotelD = bD * 0.85;
    const hotelH = 28 + Math.random() * 12;

    const colors = [0xff6b8b, 0x2ed573, 0x00d2d3, 0xffa502, 0x70a1ff];
    const hotelColor = colors[(bx + bz) % colors.length];

    const hotelMat = new THREE.MeshStandardMaterial({
      color: hotelColor,
      roughness: 0.7,
      metalness: 0.1
    });

    const hotel1Geo = new THREE.BoxGeometry(hotelW, hotelH, hotelD);
    const hotel1 = new THREE.Mesh(hotel1Geo, hotelMat);
    hotel1.position.set(minX + hotelW / 2 + 2, hotelH / 2 + 0.25, cz);
    hotel1.castShadow = true;
    hotel1.receiveShadow = true;
    this.scene.add(hotel1);
    this.registerBuildingCollider(hotel1.position.x, cz, hotelW, hotelD, hotelH);

    // Neon hotel sign
    const signNames = ['OCEAN VIEW', 'THE MARLIN', 'TROPICANA', 'SUNSET BAY'];
    const signName = signNames[(bx + bz) % signNames.length];
    const neonTex = TextureGenerator.createNeonSignTexture(signName, '#ff007f', '#ff0055');
    const neonMat = new THREE.MeshBasicMaterial({ map: neonTex, transparent: true });
    const neonMesh = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.5), neonMat);
    neonMesh.position.set(hotel1.position.x, hotelH - 4, cz + hotelD / 2 + 0.1);
    this.scene.add(neonMesh);

    // Second hotel
    const hotel2Mat = new THREE.MeshStandardMaterial({
      color: colors[(bx + bz + 2) % colors.length],
      roughness: 0.7
    });
    const hotel2 = new THREE.Mesh(hotel1Geo, hotel2Mat);
    hotel2.position.set(maxX - hotelW / 2 - 2, hotelH / 2 + 0.25, cz);
    hotel2.castShadow = true;
    hotel2.receiveShadow = true;
    this.scene.add(hotel2);
    this.registerBuildingCollider(hotel2.position.x, cz, hotelW, hotelD, hotelH);
  }

  /* ----------------- PARKING GARAGE WITH STUNT RAMP ----------------- */
  buildParkingGarageBlock(minX, maxX, minZ, maxZ) {
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const bW = maxX - minX;
    const bD = maxZ - minZ;

    // 3-floor parking deck
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x6e7b8b, roughness: 0.85 });
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x485563, roughness: 0.9 });

    const deckH = 14;
    const deckGeo = new THREE.BoxGeometry(bW * 0.8, deckH, bD * 0.8);
    const garage = new THREE.Mesh(deckGeo, deckMat);
    garage.position.set(cx, deckH / 2 + 0.25, cz);
    garage.castShadow = true;
    garage.receiveShadow = true;
    this.scene.add(garage);
    this.registerBuildingCollider(cx, cz, bW * 0.8, bD * 0.8, deckH);

    // Stunt Ramp on top of parking garage launching off the roof!
    this.createStuntRamp(cx, deckH + 0.25, cz - 15, 10, 3.5, 16, Math.PI);
    this.interactiveLocations.stuntRamps.push(new THREE.Vector3(cx, deckH + 2.0, cz - 15));

    // Sign
    const signTex = TextureGenerator.createNeonSignTexture('METRO PARKING', '#ffcc00', '#ff9900');
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
    sign.position.set(cx, deckH - 2, cz + (bD * 0.8) / 2 + 0.1);
    this.scene.add(sign);
  }

  /* ----------------- COMMERCIAL: AMMU-NATION & PAY'N'SPRAY ----------------- */
  buildCommercialBlock(minX, maxX, minZ, maxZ) {
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const bW = maxX - minX;
    const bD = maxZ - minZ;

    // 1. Ammu-Nation Gun Store
    const ammuW = 32;
    const ammuD = 24;
    const ammuH = 9;
    const ammuMat = new THREE.MeshStandardMaterial({ color: 0x802b2b, roughness: 0.7 });
    const ammuMesh = new THREE.Mesh(new THREE.BoxGeometry(ammuW, ammuH, ammuD), ammuMat);
    ammuMesh.position.set(minX + ammuW / 2 + 4, ammuH / 2 + 0.25, minZ + ammuD / 2 + 4);
    ammuMesh.castShadow = true;
    ammuMesh.receiveShadow = true;
    this.scene.add(ammuMesh);
    this.registerBuildingCollider(ammuMesh.position.x, ammuMesh.position.z, ammuW, ammuD, ammuH);

    // Ammu-Nation Neon Sign
    const ammuSignTex = TextureGenerator.createNeonSignTexture('AMMU-NATION', '#ff2222', '#ff0000');
    const ammuSign = new THREE.Mesh(new THREE.PlaneGeometry(20, 5), new THREE.MeshBasicMaterial({ map: ammuSignTex, transparent: true }));
    ammuSign.position.set(ammuMesh.position.x, ammuH - 1.5, ammuMesh.position.z + ammuD / 2 + 0.1);
    this.scene.add(ammuSign);

    // Ammu-Nation Interactive Door Zone
    this.interactiveLocations.ammuNation = new THREE.Vector3(ammuMesh.position.x, 0.5, ammuMesh.position.z + ammuD / 2 + 4);

    // 2. Pay 'n' Spray Garage (drive-in bay)
    const pnsW = 30;
    const pnsD = 26;
    const pnsH = 9;
    const pnsMat = new THREE.MeshStandardMaterial({ color: 0x1f5c38, roughness: 0.7 });
    const pnsMesh = new THREE.Mesh(new THREE.BoxGeometry(pnsW, pnsH, pnsD), pnsMat);
    pnsMesh.position.set(maxX - pnsW / 2 - 4, pnsH / 2 + 0.25, maxZ - pnsD / 2 - 4);
    pnsMesh.castShadow = true;
    pnsMesh.receiveShadow = true;
    this.scene.add(pnsMesh);
    this.registerBuildingCollider(pnsMesh.position.x, pnsMesh.position.z, pnsW, pnsD, pnsH);

    // Pay 'n' Spray Neon Sign
    const pnsSignTex = TextureGenerator.createNeonSignTexture("PAY 'N' SPRAY", '#00ff88', '#00cc66');
    const pnsSign = new THREE.Mesh(new THREE.PlaneGeometry(20, 5), new THREE.MeshBasicMaterial({ map: pnsSignTex, transparent: true }));
    pnsSign.position.set(pnsMesh.position.x, pnsH - 1.5, pnsMesh.position.z - pnsD / 2 - 0.1);
    pnsSign.rotation.y = Math.PI;
    this.scene.add(pnsSign);

    // Interactive spray bay location
    this.interactiveLocations.payNSpray = new THREE.Vector3(pnsMesh.position.x, 0.5, pnsMesh.position.z - pnsD / 2 - 5);

    // 3. Gas Station Canopy & Pumps
    const gasCanopy = new THREE.Mesh(
      new THREE.BoxGeometry(26, 1, 16),
      new THREE.MeshStandardMaterial({ color: 0xffe600 })
    );
    gasCanopy.position.set(minX + 20, 6, maxZ - 20);
    this.scene.add(gasCanopy);

    // Canopy pillars
    for (const px of [-10, 10]) {
      for (const pz of [-6, 6]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        pillar.position.set(gasCanopy.position.x + px, 3, gasCanopy.position.z + pz);
        this.scene.add(pillar);
      }
    }

    // Fuel pumps (can explode if shot!)
    this.createGasPumps(gasCanopy.position.x, gasCanopy.position.z);
  }

  /* ----------------- POLICE PRECINCT ----------------- */
  buildPolicePrecinctBlock(minX, maxX, minZ, maxZ) {
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const bW = maxX - minX;
    const bD = maxZ - minZ;

    const pdW = bW * 0.75;
    const pdD = bD * 0.65;
    const pdH = 18;

    const pdMat = new THREE.MeshStandardMaterial({ color: 0x243242, roughness: 0.6 });
    const pd = new THREE.Mesh(new THREE.BoxGeometry(pdW, pdH, pdD), pdMat);
    pd.position.set(cx, pdH / 2 + 0.25, cz);
    pd.castShadow = true;
    pd.receiveShadow = true;
    this.scene.add(pd);
    this.registerBuildingCollider(cx, cz, pdW, pdD, pdH);

    // Police Sign
    const pdSignTex = TextureGenerator.createNeonSignTexture('LCPD 1st PRECINCT', '#3388ff', '#0055ff');
    const pdSign = new THREE.Mesh(new THREE.PlaneGeometry(24, 5.5), new THREE.MeshBasicMaterial({ map: pdSignTex, transparent: true }));
    pdSign.position.set(cx, pdH - 3, cz + pdD / 2 + 0.1);
    this.scene.add(pdSign);

    this.interactiveLocations.policeStation = new THREE.Vector3(cx, 0.5, cz + pdD / 2 + 8);
  }

  /* ----------------- HOSPITAL ----------------- */
  buildHospitalBlock(minX, maxX, minZ, maxZ) {
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const bW = maxX - minX;
    const bD = maxZ - minZ;

    const hospW = bW * 0.8;
    const hospD = bD * 0.7;
    const hospH = 22;

    const hospMat = new THREE.MeshStandardMaterial({ color: 0xdde5ed, roughness: 0.5 });
    const hosp = new THREE.Mesh(new THREE.BoxGeometry(hospW, hospH, hospD), hospMat);
    hosp.position.set(cx, hospH / 2 + 0.25, cz);
    hosp.castShadow = true;
    hosp.receiveShadow = true;
    this.scene.add(hosp);
    this.registerBuildingCollider(cx, cz, hospW, hospD, hospH);

    // Red Cross and Hospital Sign
    const hospSignTex = TextureGenerator.createNeonSignTexture('METROPOLIS GENERAL HOSPITAL', '#ff3344', '#ff0033');
    const hospSign = new THREE.Mesh(new THREE.PlaneGeometry(32, 5.5), new THREE.MeshBasicMaterial({ map: hospSignTex, transparent: true }));
    hospSign.position.set(cx, hospH - 3, cz + hospD / 2 + 0.1);
    this.scene.add(hospSign);

    this.interactiveLocations.hospital = new THREE.Vector3(cx, 0.5, cz + hospD / 2 + 8);
  }

  /* ----------------- INDUSTRIAL SHIPPING DOCKS ----------------- */
  buildIndustrialBlock(minX, maxX, minZ, maxZ) {
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const bW = maxX - minX;
    const bD = maxZ - minZ;

    // Warehouse
    const whW = bW * 0.55;
    const whD = bD * 0.75;
    const whH = 14;

    const whMat = new THREE.MeshStandardMaterial({ color: 0x546270, roughness: 0.9 });
    const wh = new THREE.Mesh(new THREE.BoxGeometry(whW, whH, whD), whMat);
    wh.position.set(minX + whW / 2 + 4, whH / 2 + 0.25, cz);
    wh.castShadow = true;
    wh.receiveShadow = true;
    this.scene.add(wh);
    this.registerBuildingCollider(wh.position.x, cz, whW, whD, whH);

    // Shipping Containers in colorful stacks (red, blue, orange, green)
    const containerColors = [0xbf2c25, 0x1f5c8c, 0xd47a1e, 0x2e7544];
    const conW = 6.0;
    const conH = 2.6;
    const conD = 12.0;

    for (let i = 0; i < 6; i++) {
      const col = containerColors[i % containerColors.length];
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, metalness: 0.3 });
      const stackHeight = 1 + (i % 2);

      for (let s = 0; s < stackHeight; s++) {
        const conMesh = new THREE.Mesh(new THREE.BoxGeometry(conW, conH, conD), mat);
        const posX = maxX - 12 - (i % 3) * (conW + 2);
        const posZ = cz - 15 + Math.floor(i / 3) * (conD + 4);
        conMesh.position.set(posX, s * conH + conH / 2 + 0.25, posZ);
        conMesh.castShadow = true;
        conMesh.receiveShadow = true;
        this.scene.add(conMesh);
        this.registerBuildingCollider(posX, posZ, conW, conD, conH * stackHeight);
      }
    }
  }

  /* ----------------- HELIPAD MESH ----------------- */
  createHelipad(x, y, z, size = 16) {
    const padGeo = new THREE.CylinderGeometry(size / 2, size / 2, 0.4, 24);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(128, 128, 100, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 120px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', 128, 130);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
    const mesh = new THREE.Mesh(padGeo, mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
  }

  /* ----------------- STUNT RAMPS ----------------- */
  createStuntRamp(x, y, z, width = 8, height = 3.5, length = 12, rotationY = 0) {
    // Sloped ramp geometry
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(length, height);
    shape.lineTo(length, 0);
    shape.closePath();

    const extrudeSettings = { depth: width, bevelEnabled: false };
    const rampGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    rampGeo.center();

    const rampMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      roughness: 0.6,
      metalness: 0.2
    });

    const ramp = new THREE.Mesh(rampGeo, rampMat);
    ramp.position.set(x, y + height / 2, z);
    ramp.rotation.y = rotationY;
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    this.scene.add(ramp);
  }

  /* ----------------- GAS PUMPS ----------------- */
  createGasPumps(cx, cz) {
    const pumpGeo = new THREE.BoxGeometry(1.2, 2.2, 1.2);
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0xff3333, metalness: 0.4 });
    for (const offset of [-4, 4]) {
      const pump = new THREE.Mesh(pumpGeo, pumpMat);
      pump.position.set(cx + offset, 1.1 + 0.25, cz);
      pump.castShadow = true;
      this.scene.add(pump);
      this.registerBuildingCollider(pump.position.x, pump.position.z, 1.5, 1.5, 2.5);
    }
  }

  registerBuildingCollider(x, z, width, depth, height) {
    this.buildingColliders.push({
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
      height: height,
      center: new THREE.Vector3(x, height / 2, z),
      box: new THREE.Box3(
        new THREE.Vector3(x - width / 2, 0, z - depth / 2),
        new THREE.Vector3(x + width / 2, height, z + depth / 2)
      )
    });
  }

  checkCollision(point, radius = 0.5) {
    for (const col of this.buildingColliders) {
      if (point.x + radius >= col.minX && point.x - radius <= col.maxX &&
          point.z + radius >= col.minZ && point.z - radius <= col.maxZ &&
          point.y <= col.height) {
        return col;
      }
    }
    return null;
  }
}
