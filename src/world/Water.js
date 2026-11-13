import * as THREE from 'three';

export class Water {
  constructor(scene, size = 1600) {
    this.scene = scene;
    this.size = size;

    this.initWater();
  }

  initWater() {
    const geo = new THREE.PlaneGeometry(this.size, this.size, 32, 32);
    geo.rotateX(-Math.PI / 2);

    // Procedural water ripple canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a3d62';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#1e75a8';
    ctx.lineWidth = 3;
    for (let y = 0; y < 256; y += 16) {
      ctx.beginPath();
      for (let x = 0; x < 256; x += 8) {
        const offset = Math.sin((x + y) * 0.08) * 4;
        if (x === 0) ctx.moveTo(x, y + offset);
        else ctx.lineTo(x, y + offset);
      }
      ctx.stroke();
    }

    this.waterTexture = new THREE.CanvasTexture(canvas);
    this.waterTexture.wrapS = THREE.RepeatWrapping;
    this.waterTexture.wrapT = THREE.RepeatWrapping;
    this.waterTexture.repeat.set(60, 60);

    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x0a4d7d,
      map: this.waterTexture,
      roughness: 0.15,
      metalness: 0.7,
      transparent: true,
      opacity: 0.90
    });

    this.mesh = new THREE.Mesh(geo, this.waterMat);
    this.mesh.position.y = -0.3;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }

  update(time) {
    // 100% GPU-accelerated UV scrolling wave animation (zero CPU vertex loops!)
    if (this.waterTexture) {
      this.waterTexture.offset.x = (time * 0.04) % 1;
      this.waterTexture.offset.y = (time * 0.03) % 1;
    }
  }
}
