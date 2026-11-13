export class SoundEffects {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.engineGain = null;

    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.isEngineRunning = false;

    this.sirenOsc = null;
    this.sirenGain = null;
    this.isSirenPlaying = false;

    this.activeRadioStation = 0; // 0: Synthwave, 1: Phonk, 2: Lo-Fi, 3: Off
    this.radioInterval = null;
    this.radioBeatIndex = 0;
    this.radioTracks = [
      { name: "VICE SYNTHWAVE FM", tempo: 124 },
      { name: "METRO DRIFT PHONK", tempo: 138 },
      { name: "OCEAN DRIVE LO-FI", tempo: 85 },
      { name: "RADIO OFF", tempo: 0 }
    ];

    this.initAudioContext();
  }

  initAudioContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.85;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.65;
      this.musicGain.connect(this.masterGain);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      this.engineGain.connect(this.sfxGain);
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMasterVolume(val) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
    }
  }

  setMusicVolume(val) {
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
    }
  }

  setSfxVolume(val) {
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
    }
  }

  /* ----------------- VEHICLE ENGINE SYNTHESIZER ----------------- */
  startEngine(vehicleType = 'car') {
    if (!this.ctx || this.isEngineRunning) return;
    this.resume();

    const t = this.ctx.currentTime;
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(320, t);
    this.engineFilter.Q.setValueAtTime(3, t);

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(45, t);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(22.5, t);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);

    this.engineGain.gain.setValueAtTime(0.01, t);
    this.engineGain.gain.linearRampToValueAtTime(0.28, t + 0.3);

    this.engineOsc1.start(t);
    this.engineOsc2.start(t);
    this.isEngineRunning = true;
  }

  updateEngine(rpmRatio, speedRatio, isAccelerating) {
    if (!this.ctx || !this.isEngineRunning) return;
    const t = this.ctx.currentTime;
    
    // Calculate pitch based on RPM and speed
    const baseFreq = 40 + rpmRatio * 130 + speedRatio * 35;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.05);

    // Filter opens up as throttle increases
    const targetFilterCutoff = 250 + rpmRatio * 1800 + (isAccelerating ? 400 : 0);
    this.engineFilter.frequency.setTargetAtTime(targetFilterCutoff, t, 0.08);

    const targetGain = 0.18 + (isAccelerating ? 0.15 : 0.05) + speedRatio * 0.1;
    this.engineGain.gain.setTargetAtTime(targetGain, t, 0.08);
  }

  stopEngine() {
    if (!this.ctx || !this.isEngineRunning) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.linearRampToValueAtTime(0.001, t + 0.2);
    setTimeout(() => {
      try {
        if (this.engineOsc1) { this.engineOsc1.stop(); this.engineOsc1.disconnect(); }
        if (this.engineOsc2) { this.engineOsc2.stop(); this.engineOsc2.disconnect(); }
      } catch (e) {}
      this.isEngineRunning = false;
    }, 250);
  }

  /* ----------------- TIRE SCREECH / DRIFT ----------------- */
  playTireScreech(intensity = 1.0) {
    if (!this.ctx) return;
    this.resume();

    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.6));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400 + Math.random() * 300, this.ctx.currentTime);
    filter.Q.setValueAtTime(7.0, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.min(0.28, intensity * 0.28), this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start();
  }

  /* ----------------- CAR CRASH & COLLISION ----------------- */
  playCarCrash(volume = 1.0) {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Metallic thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);

    gain.gain.setValueAtTime(0.5 * volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.3);

    // Crunch noise
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4 * volume, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    noise.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(t);
  }

  /* ----------------- HORN & SIREN ----------------- */
  playHorn(active = true) {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    if (active && !this._hornOsc1) {
      this._hornOsc1 = this.ctx.createOscillator();
      this._hornOsc2 = this.ctx.createOscillator();
      this._hornGain = this.ctx.createGain();

      this._hornOsc1.type = 'sawtooth';
      this._hornOsc2.type = 'sawtooth';
      this._hornOsc1.frequency.setValueAtTime(370, t);
      this._hornOsc2.frequency.setValueAtTime(440, t);

      this._hornGain.gain.setValueAtTime(0.2, t);

      this._hornOsc1.connect(this._hornGain);
      this._hornOsc2.connect(this._hornGain);
      this._hornGain.connect(this.sfxGain);

      this._hornOsc1.start(t);
      this._hornOsc2.start(t);
    } else if (!active && this._hornOsc1) {
      try {
        this._hornGain.gain.setTargetAtTime(0.01, t, 0.05);
        this._hornOsc1.stop(t + 0.1);
        this._hornOsc2.stop(t + 0.1);
      } catch (e) {}
      this._hornOsc1 = null;
      this._hornOsc2 = null;
    }
  }

  startPoliceSiren() {
    if (!this.ctx || this.isSirenPlaying) return;
    this.resume();
    const t = this.ctx.currentTime;
    
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenGain = this.ctx.createGain();
    this.sirenOsc.type = 'sine';

    // Two-tone cycling wail
    this.sirenOsc.frequency.setValueAtTime(650, t);
    this.sirenOsc.frequency.linearRampToValueAtTime(950, t + 0.45);

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(1.1, t); // cycle rate
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(220, t);
    lfo.connect(lfoGain);
    lfoGain.connect(this.sirenOsc.frequency);
    lfo.start(t);
    this._sirenLfo = lfo;

    this.sirenGain.gain.setValueAtTime(0.18, t);

    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.sfxGain);
    this.sirenOsc.start(t);
    this.isSirenPlaying = true;
  }

  stopPoliceSiren() {
    if (!this.ctx || !this.isSirenPlaying) return;
    try {
      if (this.sirenOsc) { this.sirenOsc.stop(); this.sirenOsc.disconnect(); }
      if (this._sirenLfo) { this._sirenLfo.stop(); this._sirenLfo.disconnect(); }
    } catch (e) {}
    this.isSirenPlaying = false;
  }

  /* ----------------- WEAPONS SFX ----------------- */
  playPunch() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playPistolShot() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Transient crack
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.15);
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.18);

    // Gunshot noise body
    this._playNoiseBurst(0.16, 1200, 0.45);
  }

  playSMGShot() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.09);

    this._playNoiseBurst(0.08, 1500, 0.35);
  }

  playShotgunShot() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    // Heavy sub blast
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.35);
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.4);

    this._playNoiseBurst(0.35, 900, 0.7);
  }

  playExplosion() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Sub rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(15, t + 0.8);
    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.9);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.9);

    // Boom blast
    this._playNoiseBurst(0.8, 450, 0.9);
  }

  _playNoiseBurst(duration, cutoff, volume) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, this.ctx.currentTime);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start();
  }

  /* ----------------- UI JINGLES ----------------- */
  playCashSound() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    [987.77, 1318.51].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      gain.gain.setValueAtTime(0.3, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.25);
    });
  }

  playMissionPassed() {
    if (!this.ctx) return;
    this.resume();
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C E G C E
    const t = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.12);
      gain.gain.setValueAtTime(0.4, t + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.12 + 0.6);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.7);
    });
  }

  playWastedSound() {
    if (!this.ctx) return;
    this.resume();
    const notes = [311.13, 293.66, 261.63, 196.00]; // Eb D C G (dramatic minor)
    const t = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, t);

      osc.frequency.setValueAtTime(freq, t + i * 0.25);
      gain.gain.setValueAtTime(0.4, t + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.25 + 1.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.25);
      osc.stop(t + i * 0.25 + 1.3);
    });
  }

  /* ----------------- PROCEDURAL RADIO MUSIC STATIONS ----------------- */
  cycleRadioStation() {
    this.activeRadioStation = (this.activeRadioStation + 1) % this.radioTracks.length;
    this.startRadio();
    return this.radioTracks[this.activeRadioStation].name;
  }

  setRadioStation(index) {
    if (index >= 0 && index < this.radioTracks.length) {
      this.activeRadioStation = index;
      this.startRadio();
      return this.radioTracks[this.activeRadioStation].name;
    }
  }

  startRadio() {
    if (this.radioInterval) {
      clearInterval(this.radioInterval);
      this.radioInterval = null;
    }
    if (this.activeRadioStation === 3) {
      // Radio Off
      return;
    }
    if (!this.ctx) return;
    this.resume();

    const bpm = this.radioTracks[this.activeRadioStation].tempo;
    const intervalMs = (60 / bpm / 2) * 1000; // 8th notes

    this.radioBeatIndex = 0;
    this.radioInterval = setInterval(() => {
      this._playRadioStep(this.activeRadioStation, this.radioBeatIndex);
      this.radioBeatIndex = (this.radioBeatIndex + 1) % 32;
    }, intervalMs);
  }

  _playRadioStep(station, step) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;

    if (station === 0) {
      // VICE SYNTHWAVE FM: 80s arpeggio + four-on-the-floor beat
      // Kick on 0, 4, 8, 12...
      if (step % 4 === 0) {
        this._synthKick(t);
      }
      // Snare on 4, 12, 20, 28
      if (step % 8 === 4) {
        this._synthSnare(t);
      }
      // Arp note
      const arpNotes = [220, 261.63, 329.63, 440, 392, 329.63, 293.66, 261.63];
      const noteFreq = arpNotes[step % arpNotes.length];
      this._synthLead(t, noteFreq, 'sawtooth', 0.12, 0.15);

      // Bass note on offbeats
      if (step % 2 === 0) {
        const bassFreq = (step < 16) ? 55 : 43.65; // A1 or F1
        this._synthBass(t, bassFreq, 0.22);
      }
    } else if (station === 1) {
      // METRO DRIFT PHONK: Heavy cowbell melody, trap hats, 808 sub
      if (step % 8 === 0) this._synthKick(t, 65, 0.35); // Heavy 808
      if (step % 8 === 4) this._synthSnare(t);
      this._synthHiHat(t, step % 2 === 1);

      // Phonk cowbell lead
      const phonkLead = [440, 0, 523.25, 440, 659.25, 0, 587.33, 440];
      const freq = phonkLead[step % 8];
      if (freq > 0) {
        this._synthLead(t, freq, 'square', 0.08, 0.22, 2400);
      }
    } else if (station === 2) {
      // OCEAN DRIVE LO-FI: Chill Rhodes chords & soft groove
      if (step % 8 === 0) this._synthKick(t, 45, 0.18);
      if (step % 8 === 4) this._synthSnare(t, 0.12);
      if (step % 4 === 0) {
        // Soft chord pad
        const chords = [
          [261.63, 329.63, 392, 493.88], // Cmaj7
          [220, 261.63, 329.63, 392],    // Am7
          [174.61, 220, 261.63, 329.63], // Fmaj7
          [196, 246.94, 293.66, 349.23]  // G7
        ];
        const chord = chords[Math.floor(step / 8) % chords.length];
        chord.forEach(f => this._synthLead(t, f, 'sine', 0.45, 0.08, 1200));
      }
    }
  }

  _synthKick(t, baseFreq = 50, vol = 0.3) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, t + 0.08);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.17);
  }

  _synthSnare(t, vol = 0.22) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    gain.gain.setValueAtTime(vol * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.1);

    // Noise
    const bufSize = this.ctx.sampleRate * 0.1;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(vol, t);
    nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    noise.connect(nGain);
    nGain.connect(this.musicGain);
    noise.start(t);
  }

  _synthHiHat(t, open = false) {
    const bufSize = this.ctx.sampleRate * (open ? 0.08 : 0.03);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(open ? 0.08 : 0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.08 : 0.03));
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(t);
  }

  _synthBass(t, freq, vol = 0.25) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.23);
  }

  _synthLead(t, freq, type = 'sawtooth', dur = 0.12, vol = 0.15, cutoff = 1800) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
}
