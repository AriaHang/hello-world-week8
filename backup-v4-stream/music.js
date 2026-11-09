// music.js — a small happy tune, made with code (no music files)
//
// Every 8th note we decide what to play:
//   bass  = the root of the chord (C, A minor, F, G ... a very common pop loop)
//   tune  = random notes from the "pentatonic" scale (they always sound nice together)
//   shaker = a tiny "tss" on the off-beats
// Press M to turn the music on / off.

class Music {
  constructor(sounds) {
    this.sounds = sounds;
    this.on = true;
    this.playing = false;
    this.tempo = 104;
    this.step = 0;
    this.nextTime = 0;
    this.lastNote = 2;
  }

  get ctx() {
    return this.sounds.ctx;
  }

  start() {
    if (this.playing || !this.ctx) return;
    this.playing = true;
    this.master = this.ctx.createGain();
    this.master.gain.value = this.on ? 0.5 : 0;
    this.master.connect(this.ctx.destination);
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 30);
  }

  toggle() {
    this.on = !this.on;
    if (this.master) this.master.gain.setTargetAtTime(this.on ? 0.5 : 0, this.ctx.currentTime, 0.05);
  }

  setTempo(bpm) {
    this.tempo = bpm;
  }

  // look a little bit ahead and put notes on the audio timeline
  schedule() {
    let eighth = 60 / this.tempo / 2;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += eighth;
      this.step++;
    }
  }

  playStep(step, t) {
    let bar = floor(step / 8) % 4;
    let beat = step % 8;
    let roots = [48, 45, 41, 43]; // C, A, F, G
    let root = roots[bar];

    // bass on beats 1 and 3 (and a little pickup)
    if (beat === 0 || beat === 4) this.note(root - 12, t, 0.35, "triangle", 0.22);
    if (beat === 7 && bar === 3) this.note(root - 10, t, 0.15, "triangle", 0.15);

    // a soft chord on beat 1
    if (beat === 0) {
      let third = bar === 1 ? 3 : 4; // A minor has a small third
      for (let n of [root + 12, root + 12 + third, root + 19]) this.note(n, t, 0.6, "sine", 0.03);
    }

    // the tune: walk up and down the pentatonic scale
    let scale = [60, 62, 64, 67, 69, 72, 74, 76];
    if (random() < (beat % 2 === 0 ? 0.7 : 0.35)) {
      this.lastNote = constrain(this.lastNote + floor(random(-2, 3)), 0, scale.length - 1);
      this.note(scale[this.lastNote], t, 0.18, "triangle", 0.06);
    }

    // shaker on the off-beats
    if (beat % 2 === 1) this.noise(t, 0.03, 0.025);
  }

  note(midi, t, dur, type, vol) {
    let o = this.ctx.createOscillator();
    let g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(t, dur, vol) {
    if (!this.noiseBuf) {
      let n = this.ctx.sampleRate * 0.1;
      this.noiseBuf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      let d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    let src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    let f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 6000;
    let g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}
