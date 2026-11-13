export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.mouse = {
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      isLocked: false,
      leftButton: false,
      rightButton: false,
      leftJustPressed: false,
      wheelDelta: 0
    };

    this.onKeyDownCallbacks = [];
    this.sensitivity = 0.0022;

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        for (const cb of this.onKeyDownCallbacks) {
          cb(e);
        }
        return;
      }

      this.keys[e.code] = true;
      this.keys[e.key.toLowerCase()] = true;
      
      for (const cb of this.onKeyDownCallbacks) {
        cb(e);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.keys[e.key.toLowerCase()] = false;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouse.leftButton = true;
        this.mouse.leftJustPressed = true;
      }
      if (e.button === 2) {
        this.mouse.rightButton = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouse.leftButton = false;
      }
      if (e.button === 2) {
        this.mouse.rightButton = false;
      }
    });

    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('wheel', (e) => {
      this.mouse.wheelDelta = Math.sign(e.deltaY);
    }, { passive: true });

    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.canvas || this.mouse.isLocked) {
        this.mouse.dx += e.movementX;
        this.mouse.dy += e.movementY;
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.mouse.isLocked = (document.pointerLockElement === this.canvas);
    });
  }

  requestPointerLock() {
    if (this.canvas && this.canvas.requestPointerLock) {
      try {
        const promise = this.canvas.requestPointerLock();
        if (promise && promise.catch) {
          promise.catch(() => {
            // Suppress programmatic pointer lock rejection without user gesture
          });
        }
      } catch (err) {
        // Suppress pointer lock error
      }
    }
  }

  exitPointerLock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  onKeyDown(callback) {
    this.onKeyDownCallbacks.push(callback);
  }

  isDown(codeOrKey) {
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
      return false;
    }
    return !!this.keys[codeOrKey] || !!this.keys[codeOrKey.toLowerCase()];
  }

  getAxisHorizontal() {
    let axis = 0;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) axis += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) axis -= 1;
    return axis;
  }

  getAxisVertical() {
    let axis = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) axis += 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) axis -= 1;
    return axis;
  }

  update() {
    // Reset frame-specific flags
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.mouse.leftJustPressed = false;
    this.mouse.wheelDelta = 0;
  }
}
