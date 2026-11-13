import * as THREE from 'three';

export class VehicleModels {
  // Shared common materials to minimize draw calls and shader state changes
  static sharedMaterials = null;

  static getSharedMaterials() {
    if (!VehicleModels.sharedMaterials) {
      VehicleModels.sharedMaterials = {
        black: new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.85, metalness: 0.2 }),
        chrome: new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.2, metalness: 0.9 }),
        glass: new THREE.MeshStandardMaterial({ color: 0x1a2e3b, roughness: 0.1, metalness: 0.85, transparent: true, opacity: 0.75 }),
        white: new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.35, metalness: 0.1 }),
        yellowTaxi: new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.3, metalness: 0.2 }),
        policeDark: new THREE.MeshStandardMaterial({ color: 0x11161d, roughness: 0.4, metalness: 0.5 }),
        headlight: new THREE.MeshBasicMaterial({ color: 0xffffff }),
        taillight: new THREE.MeshBasicMaterial({ color: 0xff1e1e }),
        strobeRed: new THREE.MeshBasicMaterial({ color: 0xff1122 }),
        strobeBlue: new THREE.MeshBasicMaterial({ color: 0x1166ff }),
        taxiSign: new THREE.MeshBasicMaterial({ color: 0xffea00 }),
        wheelRubber: new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.95 }),
        wheelRim: new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.8, roughness: 0.25 })
      };
    }
    return VehicleModels.sharedMaterials;
  }

  // Common wheel geometry
  static wheelGeo = null;
  static rimGeo = null;

  static getWheelGeometries(radius = 0.42) {
    if (!VehicleModels.wheelGeo) {
      VehicleModels.wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10);
      VehicleModels.wheelGeo.rotateZ(Math.PI / 2);

      VehicleModels.rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.34, 6);
      VehicleModels.rimGeo.rotateZ(Math.PI / 2);
    }
    return { wheelGeo: VehicleModels.wheelGeo, rimGeo: VehicleModels.rimGeo };
  }

  /* 1. SUPERCAR (Banshee GT) */
  static createSupercarMesh(primaryColor = 0xff2244, stripeColor = 0xffffff) {
    const group = new THREE.Group();
    const mats = VehicleModels.getSharedMaterials();
    const bodyMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.2, metalness: 0.8 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: stripeColor, roughness: 0.3 });

    // Lower Chassis
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.52, 4.4), bodyMat);
    lowerBody.position.y = 0.52;
    lowerBody.castShadow = true;
    group.add(lowerBody);

    // Twin Racing Stripes
    const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 4.42), stripeMat);
    stripe1.position.set(-0.25, 0.79, 0);
    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 4.42), stripeMat);
    stripe2.position.set(0.25, 0.79, 0);
    group.add(stripe1, stripe2);

    // Low aerodynamic cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.46, 2.2), mats.glass);
    cabin.position.set(0, 0.94, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    // Rear Spoiler Wing
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.4), mats.black);
    spoiler.position.set(0, 1.15, -2.0);
    const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.15), mats.black);
    strutL.position.set(-0.75, 0.95, -2.0);
    const strutR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.15), mats.black);
    strutR.position.set(0.75, 0.95, -2.0);
    group.add(spoiler, strutL, strutR);

    // Headlights & Tail lights
    VehicleModels.addLights(group, 2.1, 4.4, 0.58);
    group.userData.wheels = VehicleModels.addWheels(group, 2.0, 4.4, 0.40);
    return group;
  }

  /* 2. MUSCLE CAR (Dominator V8) */
  static createMuscleCarMesh(primaryColor = 0x1f51c7) {
    const group = new THREE.Group();
    const mats = VehicleModels.getSharedMaterials();
    const bodyMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.35, metalness: 0.65 });

    // Angular heavy body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.65, 4.6), bodyMat);
    body.position.y = 0.62;
    body.castShadow = true;
    group.add(body);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.52, 2.3), mats.glass);
    cabin.position.set(0, 1.12, -0.3);
    cabin.castShadow = true;
    group.add(cabin);

    // Chrome Supercharger Blower protruding from hood
    const blower = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.35, 0.75), mats.chrome);
    blower.position.set(0, 1.05, 1.15);
    blower.castShadow = true;
    group.add(blower);

    VehicleModels.addLights(group, 2.15, 4.6, 0.65);
    group.userData.wheels = VehicleModels.addWheels(group, 2.1, 4.6, 0.44);
    return group;
  }

  /* 3. POLICE CRUISER (VCPD Interceptor) */
  static createPoliceCruiserMesh() {
    const group = new THREE.Group();
    const mats = VehicleModels.getSharedMaterials();

    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.58, 4.6), mats.policeDark);
    lowerBody.position.y = 0.6;
    lowerBody.castShadow = true;
    group.add(lowerBody);

    const doors = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.5, 2.2), mats.white);
    doors.position.set(0, 0.65, 0);
    group.add(doors);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.5, 2.2), mats.glass);
    cabin.position.set(0, 1.05, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    // Front push bullbar
    const bullbar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.2), mats.black);
    bullbar.position.set(0, 0.55, 2.35);
    group.add(bullbar);

    // Rooftop Strobe Lightbar
    const lightBarBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.3), mats.chrome);
    lightBarBase.position.set(0, 1.34, -0.2);
    const strobeRed = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.25), mats.strobeRed);
    strobeRed.position.set(-0.35, 1.42, -0.2);
    const strobeBlue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.25), mats.strobeBlue);
    strobeBlue.position.set(0.35, 1.42, -0.2);
    group.add(lightBarBase, strobeRed, strobeBlue);

    VehicleModels.addLights(group, 2.1, 4.6, 0.65);
    group.userData.strobes = { red: strobeRed, blue: strobeBlue };
    group.userData.wheels = VehicleModels.addWheels(group, 2.05, 4.6, 0.42);
    return group;
  }

  /* 4. TAXI CAB (Vice Cab) */
  static createTaxiMesh() {
    const group = new THREE.Group();
    const mats = VehicleModels.getSharedMaterials();

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 4.5), mats.yellowTaxi);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.52, 2.3), mats.glass);
    cabin.position.set(0, 1.08, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    // Illuminated roof TAXI sign
    const signBox = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.3), mats.taxiSign);
    signBox.position.set(0, 1.42, 0.1);
    group.add(signBox);

    VehicleModels.addLights(group, 2.1, 4.5, 0.65);
    group.userData.wheels = VehicleModels.addWheels(group, 2.05, 4.5, 0.42);
    return group;
  }

  /* 5. SUV / OFF-ROAD 4x4 (Patriot 4x4) */
  static createSUVMesh(primaryColor = 0x2d3436) {
    const group = new THREE.Group();
    const mats = VehicleModels.getSharedMaterials();
    const bodyMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.6, metalness: 0.3 });

    // High ground clearance body
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.75, 4.6), bodyMat);
    lowerBody.position.y = 0.8;
    lowerBody.castShadow = true;
    group.add(lowerBody);

    // Tall boxy cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.85, 3.2), mats.glass);
    cabin.position.set(0, 1.5, -0.4);
    cabin.castShadow = true;
    group.add(cabin);

    // Roof rack with luggage
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 2.4), mats.black);
    rack.position.set(0, 1.98, -0.4);
    group.add(rack);

    // Spare tire mounted on back trunk
    const spareTire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10), mats.wheelRubber);
    spareTire.position.set(0, 1.0, -2.4);
    group.add(spareTire);

    VehicleModels.addLights(group, 2.25, 4.6, 0.85);
    group.userData.wheels = VehicleModels.addWheels(group, 2.2, 4.6, 0.52);
    return group;
  }

  /* 6. CONVERTIBLE SPYDER (Stinger Spyder) */
  static createConvertibleMesh(primaryColor = 0x00b894) {
    const group = new THREE.Group();
    const mats = VehicleModels.getSharedMaterials();
    const bodyMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.25, metalness: 0.75 });
    const interiorMat = new THREE.MeshStandardMaterial({ color: 0x9b59b6, roughness: 0.8 }); // Stylish retro interior

    // Sleek low-slung body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.52, 4.3), bodyMat);
    body.position.y = 0.52;
    body.castShadow = true;
    group.add(body);

    // Open cockpit tub
    const interior = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 1.8), interiorMat);
    interior.position.set(0, 0.65, -0.2);
    group.add(interior);

    // Dual headrest sports seats
    const seatL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.45), mats.black);
    seatL.position.set(-0.45, 0.82, -0.35);
    const seatR = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.45), mats.black);
    seatR.position.set(0.45, 0.82, -0.35);
    group.add(seatL, seatR);

    // Raked aerodynamic windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.4, 0.08), mats.glass);
    windshield.position.set(0, 0.88, 0.55);
    windshield.rotation.x = -Math.PI / 6;
    group.add(windshield);

    VehicleModels.addLights(group, 2.1, 4.3, 0.58);
    group.userData.wheels = VehicleModels.addWheels(group, 2.05, 4.3, 0.40);
    return group;
  }

  /* 7. PICKUP TRUCK (Bobcat) */
  static createPickupMesh(primaryColor = 0xb33939) {
    const group = new THREE.Group();
    const mats = VehicleModels.getSharedMaterials();
    const bodyMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.6, metalness: 0.3 });

    // Chassis
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.6, 4.8), bodyMat);
    base.position.y = 0.65;
    base.castShadow = true;
    group.add(base);

    // Front 2-door Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.65, 1.8), mats.glass);
    cabin.position.set(0, 1.2, 0.4);
    cabin.castShadow = true;
    group.add(cabin);

    // Open Truck Bed walls
    const bedWallL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 2.2), bodyMat);
    bedWallL.position.set(-0.95, 1.05, -1.25);
    const bedWallR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 2.2), bodyMat);
    bedWallR.position.set(0.95, 1.05, -1.25);
    const tailgate = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 0.15), bodyMat);
    tailgate.position.set(0, 1.05, -2.35);
    group.add(bedWallL, bedWallR, tailgate);

    VehicleModels.addLights(group, 2.15, 4.8, 0.7);
    group.userData.wheels = VehicleModels.addWheels(group, 2.1, 4.8, 0.46);
    return group;
  }

  /* 8. CIVILIAN LUXURY SEDAN (Admiral) */
  static createSedanMesh(primaryColor = 0x2c3e50) {
    const group = new THREE.Group();
    const mats = VehicleModels.getSharedMaterials();
    const bodyMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.4, metalness: 0.5 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.6, 4.7), bodyMat);
    body.position.y = 0.62;
    body.castShadow = true;
    group.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.55, 2.6), mats.glass);
    cabin.position.set(0, 1.12, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    VehicleModels.addLights(group, 2.1, 4.7, 0.65);
    group.userData.wheels = VehicleModels.addWheels(group, 2.05, 4.7, 0.42);
    return group;
  }

  /* 9. AMBULANCE (Metro EMS) */
  static createAmbulanceMesh() {
    const group = new THREE.Group();
    const mats = VehicleModels.getSharedMaterials();

    // White base chassis
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.7, 5.0), mats.white);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);

    // Front driver cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 1.7), mats.glass);
    cabin.position.set(0, 1.4, 1.2);
    cabin.castShadow = true;
    group.add(cabin);

    // Large rear medical box module
    const boxModule = new THREE.Mesh(new THREE.BoxGeometry(2.25, 1.25, 3.2), mats.white);
    boxModule.position.set(0, 1.65, -0.8);
    boxModule.castShadow = true;
    group.add(boxModule);

    // Red Cross emblems on side
    const crossRed = new THREE.MeshBasicMaterial({ color: 0xee2222 });
    const crossL1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.2), crossRed);
    crossL1.position.set(-1.14, 1.65, -0.8);
    const crossL2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.6), crossRed);
    crossL2.position.set(-1.14, 1.65, -0.8);
    group.add(crossL1, crossL2);

    const crossR1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.2), crossRed);
    crossR1.position.set(1.14, 1.65, -0.8);
    const crossR2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.6), crossRed);
    crossR2.position.set(1.14, 1.65, -0.8);
    group.add(crossR1, crossR2);

    // Emergency Flashing Red Lightbar
    const strobeRed = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.3), mats.strobeRed);
    strobeRed.position.set(0, 2.35, 1.0);
    group.add(strobeRed);

    VehicleModels.addLights(group, 2.25, 5.0, 0.8);
    group.userData.strobes = { red: strobeRed };
    group.userData.wheels = VehicleModels.addWheels(group, 2.2, 5.0, 0.48);
    return group;
  }

  /* 10. TANK (Rhino Tank) */
  static createTankMesh() {
    const group = new THREE.Group();
    const camoMat = new THREE.MeshStandardMaterial({ color: 0x3d4d38, roughness: 0.85, metalness: 0.3 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x222620, roughness: 0.9 });

    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 5.6), camoMat);
    hull.position.y = 1.0;
    hull.castShadow = true;
    group.add(hull);

    const trackL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 5.8), darkMat);
    trackL.position.set(-1.6, 0.5, 0);
    const trackR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 5.8), darkMat);
    trackR.position.set(1.6, 0.5, 0);
    group.add(trackL, trackR);

    const turretGroup = new THREE.Group();
    turretGroup.position.set(0, 1.7, -0.2);

    const turret = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 2.4), camoMat);
    turret.castShadow = true;
    turretGroup.add(turret);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.2, 10), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.1, 2.5);
    barrel.castShadow = true;
    turretGroup.add(barrel);

    group.add(turretGroup);
    group.userData.turret = turretGroup;
    group.userData.barrel = barrel;

    return group;
  }

  /* 11. HELICOPTER (Maverick) */
  static createHelicopterMesh() {
    const group = new THREE.Group();
    const mats = VehicleModels.getSharedMaterials();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.4, metalness: 0.6 });

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 3.8), bodyMat);
    cabin.position.set(0, 1.6, 0);
    cabin.castShadow = true;
    group.add(cabin);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.4), mats.glass);
    glass.position.set(0, 1.7, 1.6);
    group.add(glass);

    const tailBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 5.2, 8), bodyMat);
    tailBoom.rotation.x = Math.PI / 2;
    tailBoom.position.set(0, 1.8, -3.8);
    group.add(tailBoom);

    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.8), bodyMat);
    tailFin.position.set(0, 2.2, -6.2);
    group.add(tailFin);

    const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.12), mats.black);
    tailRotor.position.set(0.15, 2.3, -6.2);
    group.add(tailRotor);
    group.userData.tailRotor = tailRotor;

    for (const sx of [-0.9, 0.9]) {
      const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 6), mats.black);
      skid.rotation.x = Math.PI / 2;
      skid.position.set(sx, 0.35, 0.2);
      group.add(skid);

      const strut1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), mats.black);
      strut1.position.set(sx, 0.75, 1.0);
      const strut2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), mats.black);
      strut2.position.set(sx, 0.75, -0.8);
      group.add(strut1, strut2);
    }

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8), mats.black);
    mast.position.set(0, 2.7, 0.2);
    group.add(mast);

    const rotorBlades = new THREE.Group();
    rotorBlades.position.set(0, 3.0, 0.2);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 5.0), mats.black);
      blade.position.z = 2.4;
      blade.rotation.y = (i / 4) * Math.PI * 2;
      rotorBlades.add(blade);
    }
    group.add(rotorBlades);
    group.userData.mainRotor = rotorBlades;

    return group;
  }

  /* Headlights & Taillights builder */
  static addLights(group, width, length, height) {
    const mats = VehicleModels.getSharedMaterials();
    const halfW = width * 0.36;
    const halfL = length * 0.5;

    // Headlights
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.08), mats.headlight);
    hl.position.set(-halfW, height, halfL);
    const hr = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.08), mats.headlight);
    hr.position.set(halfW, height, halfL);

    // Taillights
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.08), mats.taillight);
    tl.position.set(-halfW, height, -halfL);
    const tr = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.08), mats.taillight);
    tr.position.set(halfW, height, -halfL);

    group.add(hl, hr, tl, tr);
  }

  /* Wheels builder */
  static addWheels(group, trackWidth, wheelbase, wheelRadius) {
    const mats = VehicleModels.getSharedMaterials();
    const { wheelGeo, rimGeo } = VehicleModels.getWheelGeometries(wheelRadius);

    const wheels = [];
    const positions = [
      { x: -trackWidth / 2, y: wheelRadius, z: wheelbase / 2 - 0.7, isFront: true },
      { x: trackWidth / 2, y: wheelRadius, z: wheelbase / 2 - 0.7, isFront: true },
      { x: -trackWidth / 2, y: wheelRadius, z: -wheelbase / 2 + 0.8, isFront: false },
      { x: trackWidth / 2, y: wheelRadius, z: -wheelbase / 2 + 0.8, isFront: false }
    ];

    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(p.x, p.y, p.z);

      const tire = new THREE.Mesh(wheelGeo, mats.wheelRubber);
      tire.castShadow = true;
      wheelGroup.add(tire);

      const rim = new THREE.Mesh(rimGeo, mats.wheelRim);
      wheelGroup.add(rim);

      group.add(wheelGroup);
      wheels.push({ group: wheelGroup, isFront: p.isFront });
    }

    return wheels;
  }
}
