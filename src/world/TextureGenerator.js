import * as THREE from 'three';

export class TextureGenerator {
  static createRoadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark asphalt base with subtle grain
    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle asphalt noise
    for (let i = 0; i < 8000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    // Yellow center double divider line
    ctx.fillStyle = '#e6b800';
    ctx.fillRect(252, 0, 3, 512);
    ctx.fillRect(257, 0, 3, 512);

    // Dashed white lane lines
    ctx.fillStyle = '#ffffff';
    ctx.setLineDash([28, 20]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#e0e0e0';

    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(384, 0);
    ctx.lineTo(384, 512);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  static createIntersectionTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, 512, 512);

    // Pedestrian zebra crossings on all 4 borders
    ctx.fillStyle = '#ffffff';
    // Top
    for (let x = 60; x < 452; x += 36) {
      ctx.fillRect(x, 12, 22, 50);
    }
    // Bottom
    for (let x = 60; x < 452; x += 36) {
      ctx.fillRect(x, 450, 22, 50);
    }
    // Left
    for (let y = 60; y < 452; y += 36) {
      ctx.fillRect(12, y, 50, 22);
    }
    // Right
    for (let y = 60; y < 452; y += 36) {
      ctx.fillRect(450, y, 50, 22);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  static createSidewalkTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Concrete slab color
    ctx.fillStyle = '#9eabb8';
    ctx.fillRect(0, 0, 256, 256);

    // Paving slab grid lines
    ctx.strokeStyle = '#7c8a98';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 128, 128);
    ctx.strokeRect(128, 0, 128, 128);
    ctx.strokeRect(0, 128, 128, 128);
    ctx.strokeRect(128, 128, 128, 128);

    // Fine texture noise
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  static createBuildingWindowTexture(tint = '#3a506b', litProbability = 0.4) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Building facade wall
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, 256, 256);

    // Window grid
    const cols = 8;
    const rows = 8;
    const winW = 18;
    const winH = 22;
    const padX = (256 - cols * winW) / (cols + 1);
    const padY = (256 - rows * winH) / (rows + 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = padX + c * (winW + padX);
        const y = padY + r * (winH + padY);

        const isLit = Math.random() < litProbability;
        if (isLit) {
          // Warm interior light or cyan office light
          ctx.fillStyle = Math.random() > 0.3 ? '#ffe082' : '#80d8ff';
        } else {
          // Dark glass reflection
          ctx.fillStyle = '#101720';
        }

        ctx.fillRect(x, y, winW, winH);

        // Window border frame
        ctx.strokeStyle = '#222b38';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, winW, winH);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  static createNeonSignTexture(text, primaryColor, glowColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(10, 14, 24, 0.9)';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.font = 'bold 54px "Montserrat", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 18;
    ctx.fillStyle = primaryColor;
    ctx.fillText(text, 256, 64);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}
