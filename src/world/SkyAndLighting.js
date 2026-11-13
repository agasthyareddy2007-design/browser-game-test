import * as THREE from 'three';

export class SkyAndLighting {
  constructor(scene) {
    this.scene = scene;
    this.timeOfDay = 0.45; // 0.0 to 1.0 (0.25 = sunrise, 0.5 = noon, 0.75 = sunset, 0.0/1.0 = midnight)
    this.dayDurationSeconds = 360; // 6 minutes per full day/night cycle
    this.isPaused = false;

    this.emissiveProps = [];

    this.initLights();
    this.initSky();
  }

  initLights() {
    // Ambient Light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    // Hemisphere Light (sky vs ground tint)
    this.hemiLight = new THREE.HemisphereLight(0x7fb5ff, 0x3d3028, 0.5);
    this.scene.add(this.hemiLight);

    // Directional Sun / Moon
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 250;

    const d = 65;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);
  }

  initSky() {
    // Large sky sphere dome
    const skyGeo = new THREE.SphereGeometry(600, 32, 16);
    this.skyMat = new THREE.MeshBasicMaterial({
      color: 0x6699ff,
      side: THREE.BackSide,
      fog: false
    });
    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMat);
    this.scene.add(this.skyMesh);

    // Fog
    this.scene.fog = new THREE.FogExp2(0x88b0e8, 0.0028);
  }

  registerEmissive(mesh, nightColorHex = 0xffe066) {
    this.emissiveProps.push({
      mesh,
      origIntensity: mesh.material.emissiveIntensity || 1.0,
      nightColor: new THREE.Color(nightColorHex)
    });
  }

  toggleDayNight() {
    // Jump between daytime and night
    this.timeOfDay = (this.timeOfDay < 0.3 || this.timeOfDay > 0.75) ? 0.5 : 0.9;
  }

  update(delta, playerPos) {
    if (!this.isPaused) {
      this.timeOfDay = (this.timeOfDay + delta / this.dayDurationSeconds) % 1.0;
    }

    // Keep sky & sun shadow center focused on player
    if (playerPos) {
      this.skyMesh.position.copy(playerPos);
      this.sunLight.target.position.copy(playerPos);
    }

    // Calculate sun angle
    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const sunX = Math.cos(sunAngle) * 200;
    const sunY = Math.sin(sunAngle) * 200;
    const sunZ = Math.sin(sunAngle * 0.5) * 80;

    if (playerPos) {
      this.sunLight.position.set(playerPos.x + sunX, playerPos.y + Math.max(10, sunY), playerPos.z + sunZ);
    } else {
      this.sunLight.position.set(sunX, Math.max(10, sunY), sunZ);
    }

    // Is it day or night?
    const isDay = sunY > 0;
    const duskFactor = Math.max(0, 1.0 - Math.abs(sunY) / 60); // Peaks around sunrise/sunset

    if (isDay) {
      // Day colors
      this.sunLight.color.setHSL(0.12 - duskFactor * 0.08, 0.8, 0.6 + (1 - duskFactor) * 0.3);
      this.sunLight.intensity = Math.max(0.2, (sunY / 200) * 1.5);

      this.ambientLight.intensity = 0.4 + (sunY / 200) * 0.35;
      this.ambientLight.color.set(0xf5f8ff);

      this.hemiLight.intensity = 0.5;
      this.skyMat.color.setHSL(0.58 - duskFactor * 0.45, 0.75, 0.55 - duskFactor * 0.2);
      this.scene.fog.color.copy(this.skyMat.color);
    } else {
      // Night colors
      this.sunLight.color.setHSL(0.62, 0.6, 0.4); // Pale moonlight
      this.sunLight.intensity = 0.2;

      this.ambientLight.intensity = 0.22;
      this.ambientLight.color.set(0x1a243a);

      this.hemiLight.intensity = 0.2;
      this.skyMat.color.setHex(0x060913);
      this.scene.fog.color.setHex(0x0a0f1d);
    }

    // Emissive props at night
    const nightGlow = !isDay ? 1.0 : (duskFactor > 0.4 ? (duskFactor - 0.4) * 1.6 : 0.0);
    for (const prop of this.emissiveProps) {
      if (prop.mesh && prop.mesh.material && prop.mesh.material.emissive) {
        prop.mesh.material.emissiveIntensity = prop.origIntensity * Math.max(0.1, nightGlow * 1.5);
      }
    }
  }

  getTimeFormatted() {
    // Returns "02:45 PM"
    const totalHours = this.timeOfDay * 24;
    const hours = Math.floor(totalHours);
    const minutes = Math.floor((totalHours - hours) * 60);
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const minStr = minutes < 10 ? '0' + minutes : minutes;
    return `${displayHours}:${minStr} ${ampm}`;
  }
}
