// things.js — the objects in a bath scene
// Hose (the water tank buddy), Drop (one drop of water), Tub (the bathtub),
// Bubble (soap bubbles, splashes, hearts, speech bubbles) and Sounds.

// ---------------------------------------------------------------
// Hose: "Splashy", a little water-drop friend holding a shower head.
// The shower head swings up and down by itself.
// HOLD the button = water sprays out. LET GO = it stops.
// ---------------------------------------------------------------
class Hose {
  constructor() {
    this.x = 168; // pivot of the shower head
    this.y = 455;
    this.angle = -40; // degrees, negative = up
    this.power = 0.6; // how strong the water is (0..1)
    this.swingTime = 0;
    this.speed = 1;
    this.squash = 0;
    this.happy = 0; // seconds of happy face (when you get a duck)
    this.hop = 0;
    this.spraying = false;
    this.minA = 15; // the swing goes from 15 to 70 degrees
    this.maxA = 70;
  }

  reset(speed, minA = 15, maxA = 70) {
    this.speed = speed;
    this.minA = minA;
    this.maxA = maxA;
    this.swingTime = random(10);
  }

  update(dt, spraying, pressure) {
    // the shower head always swings slowly up and down
    this.swingTime += dt * this.speed * 0.012;
    this.angle = -map(sin(this.swingTime), -1, 1, this.minA, this.maxA);
    this.power = pressure;
    this.spraying = spraying;
    this.squash = lerp(this.squash, spraying ? 1 : 0, 0.2);
  }

  // the water tank buddy hops when something good happens
  updateMood(dt) {
    this.happy = max(0, this.happy - dt / 60);
    this.hop = this.happy > 0 ? abs(sin(this.happy * 12)) * 12 : lerp(this.hop, 0, 0.3);
  }

  // where does the water come out?
  tip() {
    let a = radians(this.angle);
    return { x: this.x + cos(a) * 64, y: this.y + sin(a) * 64, a };
  }

  speedFromPower(p) {
    return lerp(7, 19.5, p) * WATER_PUNCH;
  }

  // a soft dotted line: where the water will go right now
  drawGuide(game) {
    let sim = simulateArc(game, -this.angle, this.power);
    let show = floor(sim.points.length * (game.cfg.guide || 1));
    noStroke();
    for (let i = 4; i < show; i += 6) {
      let k = i / max(1, show);
      fill(255, 255, 255, (this.spraying ? 70 : 170) - k * 60);
      circle(sim.points[i][0], sim.points[i][1], 7 - k * 3);
    }
  }

  draw(spraying, game) {
    if (game && !spraying) this.drawGuide(game);
    push();
    // the little body (a water drop with a face)
    let bx = this.x - 70;
    let by = 560 - this.hop;
    let wob = spraying ? sin(frameCount * 0.6) * 2 : 0;
    // hose from the body to the shower head
    noFill();
    stroke(INK);
    strokeWeight(13);
    bezier(bx + 30, by - 10, bx + 70, by - 20, this.x - 40, this.y + 60, this.x, this.y);
    stroke("#ffb347");
    strokeWeight(8);
    bezier(bx + 30, by - 10, bx + 70, by - 20, this.x - 40, this.y + 60, this.x, this.y);

    translate(bx, by);
    scale(1 + wob * 0.01, 1 - wob * 0.01);
    noStroke();
    fill(0, 0, 0, 30);
    ellipse(0, 52, 110, 16);
    // feet
    fill("#5fb2f5");
    stroke(INK);
    strokeWeight(3);
    ellipse(-22, 48, 30, 16);
    ellipse(22, 48, 30, 16);
    // body = a water drop. FIXED WATER (week 8): the body is the water tank,
    // so you can SEE how much water is left inside it.
    let tankLeft = game && game.tankMax ? game.tank / game.tankMax : 1;
    let bodyShape = () => {
      beginShape();
      vertex(0, -78);
      bezierVertex(18, -50, 52, -22, 52, 8);
      bezierVertex(52, 38, 28, 52, 0, 52);
      bezierVertex(-28, 52, -52, 38, -52, 8);
      bezierVertex(-52, -22, -18, -50, 0, -78);
      endShape(CLOSE);
    };
    fill("#e4f3ff"); // empty part of the tank
    bodyShape();
    drawingContext.save();
    noStroke();
    bodyShape();
    drawingContext.clip();
    let topY = lerp(52, -78, tankLeft); // water line inside the body
    fill(tankLeft < 0.25 ? "#ff9fb8" : "#7cc6ff"); // pink when almost empty
    beginShape();
    vertex(-60, 60);
    for (let x = -60; x <= 60; x += 10) vertex(x, topY + sin(frameCount * 0.12 + x * 0.08) * (spraying ? 4 : 2));
    vertex(60, 60);
    endShape(CLOSE);
    drawingContext.restore();
    noFill();
    stroke(INK);
    strokeWeight(3);
    bodyShape();
    noStroke();
    fill(255, 255, 255, 150);
    ellipse(-24, -10, 14, 30); // shine
    // arms (one holds the hose)
    stroke(INK);
    strokeWeight(3);
    fill("#7cc6ff");
    let wave = this.happy > 0 ? sin(frameCount * 0.4) * 10 : 0;
    ellipse(-50, 14 + wave, 18, 22);
    ellipse(46, 4 - wave, 18, 22);
    // face
    noStroke();
    fill(INK);
    if (this.happy > 0) {
      noFill();
      stroke(INK);
      strokeWeight(3.5);
      arc(-15, 2, 13, 11, PI, TWO_PI);
      arc(15, 2, 13, 11, PI, TWO_PI);
      noStroke();
    } else if (spraying) {
      stroke(INK);
      strokeWeight(3);
      line(-20, -4, -11, 2);
      line(-20, 8, -11, 2);
      line(20, -4, 11, 2);
      line(20, 8, 11, 2);
      noStroke();
    } else {
      let blink = frameCount % 200 < 6;
      ellipse(-14, 2, 9, blink ? 2 : 13);
      ellipse(14, 2, 9, blink ? 2 : 13);
      fill(255);
      ellipse(-12, -1, 3, 4);
      ellipse(16, -1, 3, 4);
    }
    fill(255, 140, 170, 150);
    ellipse(-27, 14, 13, 7);
    ellipse(27, 14, 13, 7);
    fill(INK);
    if (spraying) ellipse(0, 18, 10, 12); // "ooo!"
    else arc(0, 15, 13, 10, 0, PI);
    if (game && game.tankMax) {
      textFont(HEAD);
      textAlign(CENTER, CENTER);
      textSize(17);
      fill(tankLeft < 0.25 ? C.pink : INK);
      text("WATER " + ceil(tankLeft * 100) + "%", 0, 74);
    }
    pop();

    // the shower head
    push();
    translate(this.x, this.y);
    rotate(radians(this.angle));
    if (spraying) translate(-4 + sin(frameCount * 1.7) * 1.5, sin(frameCount * 2.3) * 1); // WATER PUNCH: recoil
    stroke(INK);
    strokeWeight(3);
    fill("#ffb347");
    rect(-8, -9, 46, 18, 8); // handle
    fill("#ffd08a");
    ellipse(52, 0, 30, 44); // the round head
    fill("#ffffff");
    noStroke();
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (abs(i) + abs(j) < 2) circle(58 + i * 2, j * 10 + i * 6, 4);
    pop();
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
    this.r = random(4, 6);
  }

  update(dt) {
    this.px = this.x;
    this.py = this.y;
    this.vy += WATER_GRAVITY * dt;
    this.vx += game.wind * WATER_PUNCH * WATER_PUNCH * dt; // wind pushes the water
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // week 8: bounce off a tree trunk or a big leaf
    if (bounceOff(game, this.px, this.py, this) && random() < 0.25) game.splashAt(this.x, this.y);
    if (this.y > FLOOR + 6 || this.x > W + 40 || this.x < -40) this.alive = false;
  }

  draw() {
    noStroke();
    if (this.foam) {
      // week 8: foam (white) or face mask (green) is a soft round blob
      fill(game.cfg.foam === "mask" ? "#a9dc8a" : "#ffffff");
      stroke(INK);
      strokeWeight(1.5);
      circle(this.x, this.y, this.r * 2.4);
      return;
    }
    fill(C.water[0], C.water[1], C.water[2], 230);
    let a = atan2(this.vy, this.vx);
    let stretch = 2.2 + mag(this.vx, this.vy) * 0.07; // fast water = long drops
    push();
    translate(this.x, this.y);
    rotate(a);
    ellipse(0, 0, this.r * stretch, this.r * 1.8);
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
    this.noMat = !!cfg.noMat;
    this.mud = !!cfg.mud; // the rhino wants a MUD bath
    this.slide = cfg.slide || 0; // week 8: more water = the tub slides
    this.slideT = 0;
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
    let x = this.baseX;
    if (this.move) x += sin(this.t * this.moveSpeed * 1.6) * this.move;
    if (this.slide) {
      // empty tub = it stays. The more water, the more it slides (and a little faster)
      let k = pow(constrain(this.target / max(0.3, this.band[1]), 0, 1), 1.5);
      this.slideT += (dt / 60) * (0.5 + k);
      x += sin(this.slideT * 1.4) * this.slide * k;
    }
    this.x = x;
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
    if (!this.noMat) {
      fill(mat[0]);
      rect(this.x - this.w * 0.7, FLOOR + 6, this.w * 1.4, 34, 17);
      fill(mat[1]);
      for (let x = this.x - this.w * 0.6; x < this.x + this.w * 0.62; x += 22) circle(x, FLOOR + 23, 11);
    }
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

  // a soft "shhh" while the water sprays
  streamStart() {
    if (!this.ctx || this.stream) return;
    let n = this.ctx.sampleRate * 1;
    let buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    let d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    let src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    let f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 2600;
    f.Q.value = 0.8;
    let g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 0.08);
    src.connect(f).connect(g).connect(this.ctx.destination);
    src.start();
    this.stream = { src, g };
  }

  streamStop() {
    if (!this.ctx || !this.stream) return;
    let { src, g } = this.stream;
    g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
    src.stop(this.ctx.currentTime + 0.12);
    this.stream = null;
  }

  // "plip" — higher and higher as the tub fills up
  plopLevel(level) {
    if (millis() - this.lastPlop < 55) return;
    this.lastPlop = millis();
    let f = 320 + constrain(level, 0, 1.2) * 900;
    this.tone(f, 0.08, "sine", 0.07, f * 0.7);
  }

  oops() {
    this.tone(400, 0.12, "square", 0.06, 200);
    this.tone(300, 0.18, "square", 0.06, 150, 0.1);
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

