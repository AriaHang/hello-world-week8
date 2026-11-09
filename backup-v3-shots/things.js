// things.js — the objects in a bath scene
// Hose (the water tank buddy), Drop (one drop of water), Tub (the bathtub),
// Bubble (soap bubbles, splashes, hearts, speech bubbles) and Sounds.

// ---------------------------------------------------------------
// Hose
// A cute water tank with a nozzle on top.
// While you hold the button, the nozzle swings and the tank pumps.
// ---------------------------------------------------------------
class Hose {
  constructor() {
    this.x = 150; // pivot of the nozzle
    this.y = 470;
    this.angle = -40; // degrees, negative = up
    this.power = 0; // 0..1
    this.holdTime = 0;
    this.swingTime = 0;
    this.speed = 1;
    this.squash = 0;
    this.happy = 0; // seconds of happy face (when you get a duck)
    this.hop = 0;
  }

  reset(speed) {
    this.speed = speed;
    this.power = 0;
    this.holdTime = 0;
    this.swingTime = random(10);
  }

  // Two steps, one at a time (like golf games):
  //   phase "angle": the water gun swings slowly up and down. TAP = stop it here.
  //   phase "power": HOLD = the power goes up (and slowly down again). LET GO = shoot.
  update(dt, phase, holding) {
    if (phase === "angle") {
      this.swingTime += dt * this.speed * 0.014; // slow and calm
      this.angle = -map(sin(this.swingTime), -1, 1, 15, 70);
      this.power = lerp(this.power, 0, 0.2);
    } else if (holding) {
      this.holdTime += dt / 60;
      // 0 -> 1 in 1.8 seconds, then back down, then up again...
      let k = (this.holdTime / 1.8) % 2;
      this.power = k < 1 ? k : 2 - k;
    } else {
      this.power = lerp(this.power, 0, 0.2);
    }
    this.squash = lerp(this.squash, this.power, 0.3);
  }

  // the water tank buddy hops when something good happens
  updateMood(dt) {
    this.happy = max(0, this.happy - dt / 60);
    this.hop = this.happy > 0 ? abs(sin(this.happy * 12)) * 12 : lerp(this.hop, 0, 0.3);
  }

  startHold() {
    this.holdTime = 0;
  }

  // where does the water come out?
  tip() {
    let a = radians(this.angle);
    return { x: this.x + cos(a) * 64, y: this.y + sin(a) * 64, a };
  }

  // simulate one drop (no randomness) and draw its path as dots
  // the guide only shows the FIRST part of the path (like in golf and Angry Birds).
  // Easy islands show more, later islands show less.
  drawGuide(game) {
    let sim = simulateArc(game, -this.angle, this.power);
    let show = floor(sim.points.length * (game.cfg.guide || 0.5));
    noStroke();
    for (let i = 0; i < show; i += 5) {
      let k = i / max(1, show);
      // soft white dot with a light blue center (like little bubbles)
      fill(255, 255, 255, 235 - k * 150);
      circle(sim.points[i][0], sim.points[i][1], 15 - k * 6);
      fill(124, 198, 255, 220 - k * 150);
      circle(sim.points[i][0], sim.points[i][1], 8 - k * 3);
    }
  }

  speedFromPower(p) {
    return lerp(7, 19.5, p);
  }

  draw(holding, game, phase = "angle") {
    push();
    // hose pipe from the wall
    noFill();
    stroke("#7fb8e6");
    strokeWeight(14);
    bezier(-20, 560, 30, 560, 60, 590, 95, 585);

    // tank (it swells with power)
    let s = 1 + this.squash * 0.12;
    translate(this.x, 545 - this.hop);
    scale(s, 1 / s);
    noStroke();
    fill(0, 0, 0, 25);
    ellipse(0, 68, 120, 18);
    // little feet
    fill("#5fb2f5");
    ellipse(-28, 64, 34, 18);
    ellipse(28, 64, 34, 18);
    // little hands (they wave when you hold)
    let wave = holding || this.happy > 0 ? sin(frameCount * 0.4) * (this.happy > 0 ? 14 : 6) : 0;
    ellipse(-60, 10 + wave, 20, 26);
    ellipse(60, 10 - wave, 20, 26);
    fill("#7cc6ff");
    stroke(INK);
    strokeWeight(3.5);
    rect(-55, -60, 110, 125, 40);
    noStroke();
    fill("#a9dbff");
    rect(-42, -48, 30, 70, 20); // shine
    // water inside the tank (shows the power)
    fill(70, 150, 235, 200);
    let ph = 90 * this.power;
    rect(-40, 52 - ph, 80, ph, 12);
    // face
    fill(C.ink);
    let blink = frameCount % 200 < 6;
    if (this.happy > 0) {
      // happy face  ^ ^
      noFill();
      stroke(C.ink);
      strokeWeight(3.5);
      arc(-17, -6, 14, 12, PI, TWO_PI);
      arc(17, -6, 14, 12, PI, TWO_PI);
      noStroke();
    } else if (holding) {
      // concentrating face  > <
      stroke(C.ink);
      strokeWeight(3);
      line(-22, -14, -12, -8);
      line(-22, -2, -12, -8);
      line(22, -14, 12, -8);
      line(22, -2, 12, -8);
      noStroke();
    } else {
      ellipse(-17, -8, 9, blink ? 2 : 13);
      ellipse(17, -8, 9, blink ? 2 : 13);
      fill(255);
      ellipse(-15, -11, 3, 4);
      ellipse(19, -11, 3, 4);
    }
    fill(255, 140, 170, 140);
    ellipse(-30, 6, 14, 8);
    ellipse(30, 6, 14, 8);
    fill(C.ink);
    arc(0, 4, 14, 10, 0, PI);
    pop();

    // nozzle
    push();
    translate(this.x, this.y);
    rotate(radians(this.angle));
    noStroke();
    fill("#ffb347");
    stroke(INK);
    strokeWeight(3);
    rect(-6, -12, 70, 24, 10);
    fill("#ff9a3c");
    rect(52, -15, 18, 30, 6);
    fill("#ffd08a");
    rect(4, -8, 40, 6, 3);
    pop();
    fill("#ffb347");
    noStroke();
    circle(this.x, this.y, 30);

    // aim dots: show the direction
    let t = this.tip();
    noStroke();
    for (let i = 1; i <= 4; i++) {
      fill(255, 255, 255, 230 - i * 40);
      circle(t.x + cos(t.a) * i * 22, t.y + sin(t.a) * i * 22, 9 - i);
    }

    // guide line: while holding, show where the water will go
    if (holding && game) this.drawGuide(game);
    // a little lock shows the direction is chosen
    if (phase === "power") {
      let lx = t.x + cos(t.a) * 112;
      let ly = t.y + sin(t.a) * 112;
      push();
      stroke(INK);
      strokeWeight(3);
      noFill();
      arc(lx, ly - 6, 16, 18, PI, TWO_PI);
      fill(C.yellow);
      rect(lx - 11, ly - 6, 22, 17, 4);
      pop();
    }

    // power ring
    if (holding) {
      noFill();
      stroke(255, 255, 255, 160);
      strokeWeight(8);
      arc(this.x, 545, 160, 160, -PI * 0.75, PI * 0.25);
      stroke(lerpColor(color(C.mint), color(C.pink), this.power));
      arc(this.x, 545, 160, 160, -PI * 0.75, -PI * 0.75 + PI * this.power);
    }
  }
}

// ---------------------------------------------------------------
// Drop
// One drop of water flying in an arc (gravity pulls it down).
// ---------------------------------------------------------------
class Drop {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.alive = true;
    this.r = random(5, 7.5);
  }

  update(dt) {
    this.px = this.x;
    this.py = this.y;
    this.vy += GRAVITY * dt;
    this.vx += game.wind * dt; // wind pushes the water
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y > FLOOR + 6 || this.x > W + 40 || this.x < -40) this.alive = false;
  }

  draw() {
    noStroke();
    fill(C.water[0], C.water[1], C.water[2], 230);
    let a = atan2(this.vy, this.vx);
    push();
    translate(this.x, this.y);
    rotate(a);
    ellipse(0, 0, this.r * 2.6, this.r * 1.8);
    fill(255, 255, 255, 200);
    ellipse(-1, -2, this.r * 0.8, this.r * 0.5);
    pop();
  }
}

// ---------------------------------------------------------------
// Tub
// A clear bathtub. It knows its water level and catches drops.
// ---------------------------------------------------------------
class Tub {
  constructor(cfg) {
    this.baseX = cfg.tub.x;
    this.x = cfg.tub.x;
    this.w = cfg.tub.w;
    this.h = cfg.tub.h;
    this.move = cfg.tub.move || 0;
    this.moveSpeed = cfg.tub.moveSpeed || 0;
    this.capacity = cfg.capacity;
    this.band = cfg.band;
    this.toy = cfg.animal === "duck" ? "boat" : "duck";
    this.mud = !!cfg.mud; // the rhino wants a MUD bath
    this.water = this.mud ? [150, 104, 66] : C.water;
    this.style = cfg.world; // "home" | "savanna" | "jungle"
    this.drops = 0; // how many drops are inside
    this.level = 0; // shown level (smooth)
    this.t = 0;
  }

  get top() {
    return FLOOR - 26 - this.h; // the tub stands on little feet
  }

  get target() {
    return this.drops / this.capacity;
  }

  update(dt) {
    this.t += dt / 60;
    if (this.move) this.x = this.baseX + sin(this.t * this.moveSpeed * 1.6) * this.move;
    this.level = lerp(this.level, this.target, 0.08);
  }

  // is this point over the open top of the tub?
  isOverOpening(x) {
    return x > this.x - this.w / 2 + 4 && x < this.x + this.w / 2 - 4;
  }

  // is this point hitting the tub's wall?
  hitsWall(x, y) {
    let inside = x > this.x - this.w / 2 - 6 && x < this.x + this.w / 2 + 6;
    return inside && y > this.top && y < FLOOR;
  }

  drawBack() {
    push();
    noStroke();
    // fluffy bath mat under the tub
    let mats = { savanna: ["#e3c27a", "#efd59a"], jungle: ["#7cc06a", "#97d486"] };
    let mat = mats[this.style] || ["#c9b6ff", "#dccfff"];
    fill(mat[0]);
    rect(this.x - this.w * 0.7, FLOOR + 6, this.w * 1.4, 34, 17);
    fill(mat[1]);
    for (let x = this.x - this.w * 0.6; x < this.x + this.w * 0.62; x += 22) circle(x, FLOOR + 23, 11);
    // shadow
    fill(0, 0, 0, 25);
    ellipse(this.x, FLOOR + 4, this.w * 1.05, 20);
    // feet
    fill(this.style === "savanna" ? "#c98d5e" : this.style === "jungle" ? "#8cc25a" : "#ffcf5a");
    for (let s of [-1, 1]) {
      ellipse(this.x + s * (this.w / 2 - 22), FLOOR - 10, 26, 30);
    }
    // back of the tub (light, see-through)
    fill(255, 255, 255, 120);
    rect(this.x - this.w / 2, this.top, this.w, this.h, 8, 8, this.h * 0.45, this.h * 0.45);
    pop();
  }

  drawWater() {
    let lv = min(this.level, 1.08);
    if (lv <= 0.005) return;
    push();
    let innerTop = this.top + 6;
    let innerH = this.h - 12;
    let surface = innerTop + innerH * (1 - min(lv, 1));
    // clip to the tub shape
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.roundRect
      ? drawingContext.roundRect(this.x - this.w / 2 + 6, innerTop, this.w - 12, innerH, [4, 4, this.h * 0.4, this.h * 0.4])
      : drawingContext.rect(this.x - this.w / 2 + 6, innerTop, this.w - 12, innerH);
    drawingContext.clip();
    noStroke();
    fill(this.water[0], this.water[1], this.water[2], this.mud ? 220 : 170);
    beginShape();
    for (let x = this.x - this.w / 2; x <= this.x + this.w / 2 + 10; x += 10) {
      vertex(x, surface + sin(x * 0.06 + frameCount * 0.12) * 3);
    }
    vertex(this.x + this.w / 2, FLOOR);
    vertex(this.x - this.w / 2, FLOOR);
    endShape(CLOSE);
    drawingContext.restore();

    // bath foam on the surface (mud bubbles for the rhino)
    fill(this.mud ? color(190, 150, 110) : color(255, 255, 255, 235));
    randomSeed(floor(this.baseX));
    let n = floor(this.w / 16);
    for (let i = 0; i < n; i++) {
      let fx = this.x - this.w / 2 + 14 + ((this.w - 28) * i) / (n - 1);
      let r = random(10, 20) * min(1, lv * 4);
      circle(fx, surface - 2 + sin(frameCount * 0.05 + i) * 2, r);
    }
    randomSeed(millis());

    // a little toy floats on the water
    if (lv > 0.08 && !this.mud) {
      let tx = this.x - this.w * 0.3;
      let ty = surface - 6 + sin(frameCount * 0.07) * 3;
      if (this.toy === "boat") drawBoat(tx, ty, 1);
      else drawRubberDuck(tx, ty, 0.9);
    }

    // overflowing water
    if (this.level > 1) {
      fill(this.water[0], this.water[1], this.water[2], 170);
      for (let s of [-1, 1]) {
        let ex = this.x + s * (this.w / 2 + 4);
        rect(ex - 5, this.top, 10, FLOOR - this.top, 5);
      }
      ellipse(this.x, FLOOR + 6, this.w * 1.5, 18);
    }
    pop();
  }

  drawFront() {
    push();
    // glass-like body
    noFill();
    stroke(255);
    strokeWeight(6);
    rect(this.x - this.w / 2, this.top, this.w, this.h, 8, 8, this.h * 0.45, this.h * 0.45);
    stroke(C.ink);
    strokeWeight(2.5);
    rect(this.x - this.w / 2 - 3, this.top - 3, this.w + 6, this.h + 6, 10, 10, this.h * 0.47, this.h * 0.47);
    // shine
    stroke(255, 255, 255, 200);
    strokeWeight(5);
    line(this.x - this.w / 2 + 16, this.top + 18, this.x - this.w / 2 + 16, this.top + this.h * 0.55);
    // rim
    noStroke();
    fill(this.style === "savanna" ? "#f2c58a" : this.style === "jungle" ? "#c9ef9c" : "#ffffff");
    rect(this.x - this.w / 2 - 10, this.top - 10, this.w + 20, 14, 7);
    fill(C.ink);
    rect(this.x - this.w / 2 - 10, this.top + 1, this.w + 20, 3, 2);

    // the perfect zone: two dashed lines + a heart
    let innerTop = this.top + 6;
    let innerH = this.h - 12;
    let y1 = innerTop + innerH * (1 - this.band[1]);
    let y2 = innerTop + innerH * (1 - this.band[0]);
    stroke(C.pink);
    strokeWeight(2.5);
    drawingContext.setLineDash([7, 6]);
    line(this.x - this.w / 2 + 8, y1, this.x + this.w / 2 - 8, y1);
    line(this.x - this.w / 2 + 8, y2, this.x + this.w / 2 - 8, y2);
    drawingContext.setLineDash([]);
    noStroke();
    fill(C.pink);
    drawHeart(this.x + this.w / 2 + 22, (y1 + y2) / 2, 16);
    pop();
  }
}

// ---------------------------------------------------------------
// Bubble
// Little things that float or pop: soap bubbles, splashes, hearts.
// ---------------------------------------------------------------
class Bubble {
  constructor(x, y, kind) {
    this.x = x;
    this.y = y;
    this.kind = kind; // "soap" | "splash" | "heart" | "puddle" | "text"
    this.life = 1;
    this.vx = random(-1.5, 1.5);
    this.vy = kind === "splash" ? random(-5, -2) : random(-1.6, -0.6);
    this.r = kind === "soap" ? random(8, 22) : kind === "heart" ? random(14, 22) : random(3, 6);
    if (kind === "puddle") this.r = random(18, 30);
    if (kind === "confetti") {
      this.vx = random(-6, 6);
      this.vy = random(-12, -5);
      this.r = random(6, 11);
      this.spin = random(TWO_PI);
      this.col = random(["#ffd84d", "#ff8fb1", "#7fdcb5", "#7cc6ff", "#c9b6ff", "#f2a33a"]);
    }
  }

  update(dt) {
    if (this.kind === "pop") {
      this.y -= 1.2 * dt;
      this.life -= 0.018 * dt;
      return;
    }
    if (this.kind === "text") {
      this.y -= 0.5 * dt;
      this.life -= 0.012 * dt;
      return;
    }
    if (this.kind === "confetti") {
      this.vy += 0.25 * dt;
      this.vx *= 0.98;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.spin += 0.15 * dt;
      this.life -= 0.006 * dt;
      return;
    }
    if (this.kind === "splash") this.vy += GRAVITY * dt;
    if (this.kind === "puddle") {
      this.life -= 0.006 * dt;
      return;
    }
    this.x += (this.vx + (this.kind === "soap" ? sin(frameCount * 0.05 + this.r) * 0.5 : 0)) * dt;
    this.y += this.vy * dt;
    this.life -= (this.kind === "splash" ? 0.04 : 0.008) * dt;
  }

  draw() {
    push();
    let a = this.life * 255;
    if (this.kind === "confetti") {
      translate(this.x, this.y);
      rotate(this.spin);
      fill(this.col);
      stroke(INK);
      strokeWeight(1.5);
      rect(-this.r / 2, -this.r / 4, this.r, this.r / 2, 2);
    } else if (this.kind === "pop") {
      let k = min(1, (1 - this.life) * 6);
      translate(this.x, this.y);
      scale(0.5 + 0.6 * easeOutBack(k));
      rotate(-0.08);
      textFont(HEAD);
      textSize(34);
      textAlign(CENTER, CENTER);
      strokeJoin(ROUND);
      stroke(59, 47, 35, a);
      strokeWeight(9);
      fill(this.col || "#ffd84d");
      drawingContext.globalAlpha = this.life;
      text(this.str, 0, 0);
    } else if (this.kind === "text") {
      // a little speech bubble
      let k = min(1, (1 - this.life) * 8); // pop in
      translate(this.x, this.y);
      scale(0.6 + 0.4 * easeOutBack(k));
      textFont(BODY);
      textStyle(BOLD);
      textSize(22);
      textAlign(CENTER, CENTER);
      let w = textWidth(this.str) + 30;
      fill(255, 255, 255, a);
      stroke(59, 51, 85, a);
      strokeWeight(3);
      rect(-w / 2, -22, w, 44, 22);
      triangle(-8, 20, 8, 20, -14, 34);
      noStroke();
      fill(59, 51, 85, a);
      text(this.str, 0, 0);
    } else if (this.kind === "soap") {
      noFill();
      stroke(255, 255, 255, a);
      strokeWeight(2);
      circle(this.x, this.y, this.r * 2);
      noStroke();
      fill(255, 255, 255, a * 0.8);
      circle(this.x - this.r * 0.35, this.y - this.r * 0.35, this.r * 0.4);
    } else if (this.kind === "heart") {
      noStroke();
      fill(255, 143, 177, a);
      drawHeart(this.x, this.y, this.r);
    } else if (this.kind === "puddle") {
      noStroke();
      fill(C.water[0], C.water[1], C.water[2], a * 0.5);
      ellipse(this.x, FLOOR + 3, this.r * 2, 8);
    } else {
      noStroke();
      fill(C.water[0], C.water[1], C.water[2], a);
      circle(this.x, this.y, this.r * 2);
    }
    pop();
  }
}

// ---------------------------------------------------------------
// Sounds
// Tiny sounds made with the Web Audio API (no sound files needed).
// ---------------------------------------------------------------
class Sounds {
  constructor() {
    this.ctx = null;
    this.lastPlop = 0;
  }

  start() {
    if (!this.ctx) {
      let AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  tone(freq, dur, type = "sine", vol = 0.15, slideTo = null, delay = 0) {
    if (!this.ctx) return;
    let t = this.ctx.currentTime + delay;
    let o = this.ctx.createOscillator();
    let g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  splash() {
    if (!this.ctx) return;
    let n = this.ctx.sampleRate * 0.35;
    let buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    let d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    let src = this.ctx.createBufferSource();
    src.buffer = buf;
    let f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1800;
    let g = this.ctx.createGain();
    g.gain.value = 0.25;
    src.connect(f).connect(g).connect(this.ctx.destination);
    src.start();
  }

  plop() {
    if (millis() - this.lastPlop < 70) return;
    this.lastPlop = millis();
    this.tone(random(500, 800), 0.09, "sine", 0.08, 220);
  }

  win() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, "triangle", 0.15, null, i * 0.11));
  }

  fail() {
    this.tone(330, 0.3, "triangle", 0.15, 220);
    this.tone(247, 0.4, "triangle", 0.15, 160, 0.25);
  }

  pop() {
    this.tone(520, 0.12, "sine", 0.14, 900);
  }

  tick() {
    this.tone(880, 0.06, "triangle", 0.08);
  }

  tweet() {
    this.tone(1800, 0.08, "sine", 0.08, 2600);
    this.tone(2000, 0.08, "sine", 0.08, 2800, 0.12);
  }

  // a little voice for each animal
  voice(name) {
    if (name === "quack") return this.quack();
    if (name === "meow") return this.tone(700, 0.25, "triangle", 0.1, 1000);
    if (name === "woof") {
      this.tone(320, 0.1, "sawtooth", 0.07, 200);
      this.tone(330, 0.1, "sawtooth", 0.07, 200, 0.16);
    }
    if (name === "hum") {
      this.tone(170, 0.15, "sine", 0.18, 140);
      this.tone(200, 0.2, "sine", 0.18, 160, 0.17);
    }
    if (name === "grunt") this.tone(130, 0.22, "sawtooth", 0.08, 90);
    if (name === "trumpet") {
      this.tone(420, 0.35, "sawtooth", 0.07, 760);
      this.tone(760, 0.2, "square", 0.04, 640, 0.3);
    }
    if (name === "squeak") {
      this.tone(1000, 0.07, "sine", 0.09, 1300);
      this.tone(1100, 0.07, "sine", 0.09, 1400, 0.1);
    }
    if (name === "ribbit") {
      this.tone(480, 0.06, "square", 0.05, 380);
      this.tone(500, 0.08, "square", 0.05, 360, 0.09);
    }
    if (name === "whistle") this.tone(1400, 0.25, "sine", 0.08, 1900);
  }

  shutter() {
    this.tone(2400, 0.03, "square", 0.06, 1200);
    this.tone(1600, 0.05, "square", 0.05, 800, 0.06);
  }

  duck() {
    this.tone(880, 0.08, "square", 0.05, 1320);
    this.tone(1320, 0.12, "triangle", 0.08, 1760, 0.07);
  }

  quack() {
    this.tone(620, 0.15, "sawtooth", 0.06, 380);
  }

  meow() {
    this.tone(700, 0.35, "triangle", 0.12, 1100);
    this.tone(1100, 0.2, "triangle", 0.1, 600, 0.3);
  }
}

