// Bath Time! — a one button game
// Hello World — Xinyu (Aria) Hang
//
// Every little animal needs a bath, but each one wants a different amount of water.
//
// ONE BUTTON (space / click / tap):
//   HOLD    -> the hose swings up and down by itself (direction)
//              and the water tank pumps up and down (power)
//   LET GO  -> splash! The water flies in an arc.
//
// Fill the tub until the water is between the two dashed lines.
// Too little = still dirty. Too much = it overflows.
// Each animal has its own rule (the kitten hates water on her face!).
//
// The game is a small "state machine":
//   title -> intro -> aim -> fly -> (aim again | result) -> intro (next level) ... -> end

// ---------------------------------------------------------------
// Settings
// ---------------------------------------------------------------
const W = 1280; // the game is designed at this size, then scaled to fit the window
const H = 720;
const FLOOR = 612;
const GRAVITY = 0.32;

let S = 1, OX = 0, OY = 0; // scale + offset to fit the window
let game, sfx;
let FONT = "Fredoka, 'Baloo 2', 'Arial Rounded MT Bold', sans-serif";

// colors
const C = {
  tile: "#cdeef0",
  grout: "#e9fbfb",
  wainscot: "#ffd9e2",
  floor: "#f6cfa7",
  floorLine: "#eab98c",
  ink: "#3b3355",
  water: [118, 196, 255],
  pink: "#ff8fb1",
  yellow: "#ffd84d",
  mint: "#7fdcb5",
};

// ---------------------------------------------------------------
// Levels: every animal has its own tub, water need and rule
// band = [min, max] water level (0 = empty, 1 = full) that counts as "perfect"
// shotSize = how many drops come out in one splash
// capacity = how many drops fill the tub to the top
// ---------------------------------------------------------------
const LEVELS = [
  {
    animal: "duck", name: "Duckling",
    rule: "Fill the tub up to the lines.\nDucks LOVE a splash on the head!",
    tub: { x: 700, w: 210, h: 110 }, shotSize: 30, capacity: 70,
    band: [0.34, 0.66], shots: 3, swing: 1.0, face: "love",
  },
  {
    animal: "puppy", name: "Puppy",
    rule: "Puppy rolled in the mud.\nThis one needs TWO good splashes.",
    tub: { x: 800, w: 230, h: 120 }, shotSize: 30, capacity: 80,
    band: [0.62, 0.88], shots: 4, swing: 1.25, face: "shake",
  },
  {
    animal: "kitten", name: "Kitten",
    rule: "Just a little water, please.\nDo NOT splash her face!",
    tub: { x: 720, w: 170, h: 92 }, shotSize: 12, capacity: 40,
    band: [0.2, 0.5], shots: 3, swing: 1.4, face: "scared", headShift: 0.2,
  },
  {
    animal: "frog", name: "Froggy",
    rule: "The tub is floating around!\nWait for the right moment.",
    tub: { x: 820, w: 175, h: 96, move: 160, moveSpeed: 0.9 }, shotSize: 24, capacity: 60,
    band: [0.3, 0.62], shots: 4, swing: 1.1, face: "love",
  },
  {
    animal: "elephant", name: "Big Ellie",
    rule: "A HUGE tub, far away.\nShe needs three full splashes.",
    tub: { x: 1040, w: 260, h: 150 }, shotSize: 40, capacity: 140,
    band: [0.74, 0.96], shots: 5, swing: 1.15, face: "none",
  },
];

// ---------------------------------------------------------------
// Class 1: Hose
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
  }

  reset(speed) {
    this.speed = speed;
    this.power = 0;
    this.holdTime = 0;
    this.swingTime = random(10);
  }

  update(dt, holding) {
    // the nozzle always swings slowly; faster while holding
    this.swingTime += dt * (holding ? 1 : 0.35) * this.speed * 0.022; // slow and calm
    this.angle = -map(sin(this.swingTime), -1, 1, 12, 72);

    if (holding) {
      this.holdTime += dt / 60;
      // power goes 0 -> 1 -> 0 -> 1 ... like a pump
      this.power = (1 - cos(this.holdTime * TWO_PI / 2.8)) / 2;
    } else {
      this.power = lerp(this.power, 0, 0.2);
    }
    this.squash = lerp(this.squash, this.power, 0.3);
  }

  // where does the water come out?
  tip() {
    let a = radians(this.angle);
    return { x: this.x + cos(a) * 64, y: this.y + sin(a) * 64, a };
  }

  // simulate one drop (no randomness) and draw its path as dots
  drawGuide(game) {
    let tub = game.tub;
    let animal = game.animal;
    let t = this.tip();
    let v = this.speedFromPower(this.power);
    let x = t.x, y = t.y, vx = cos(t.a) * v, vy = sin(t.a) * v;
    let result = "miss";
    let points = [];
    for (let i = 0; i < 300; i++) {
      let py = y;
      vy += GRAVITY;
      x += vx;
      y += vy;
      if (i % 5 === 0) points.push([x, y]);
      if (animal.hitsHead(x, y)) { result = "head"; break; }
      if (vy > 0 && py <= tub.top && y > tub.top && tub.isOverOpening(x)) { result = "in"; break; }
      if (tub.hitsWall(x, y) && !tub.isOverOpening(x)) break;
      if (y > FLOOR || x > W) break;
    }
    // dotted path
    noStroke();
    for (let i = 0; i < points.length; i++) {
      let k = i / points.length;
      // soft white dot with a light blue center (like little bubbles)
      fill(255, 255, 255, 235 - k * 90);
      circle(points[i][0], points[i][1], 15 - k * 4);
      fill(124, 198, 255, 220 - k * 90);
      circle(points[i][0], points[i][1], 8 - k * 2);
    }
    // landing mark: green = in the tub, pink = face, grey = miss
    let col = result === "in" ? C.mint : result === "head" ? C.pink : "#ffffff";
    noFill();
    stroke(col);
    strokeWeight(4);
    circle(x, y, 24 + sin(frameCount * 0.08) * 2);
    noStroke();
  }

  speedFromPower(p) {
    return lerp(7, 19.5, p);
  }

  draw(holding, game) {
    push();
    // hose pipe from the wall
    noFill();
    stroke("#7fb8e6");
    strokeWeight(14);
    bezier(-20, 560, 30, 560, 60, 590, 95, 585);

    // tank (it swells with power)
    let s = 1 + this.squash * 0.12;
    translate(this.x, 545);
    scale(s, 1 / s);
    noStroke();
    fill(0, 0, 0, 25);
    ellipse(0, 68, 120, 18);
    // little feet
    fill("#5fb2f5");
    ellipse(-28, 64, 34, 18);
    ellipse(28, 64, 34, 18);
    // little hands (they wave when you hold)
    let wave = holding ? sin(frameCount * 0.4) * 6 : 0;
    ellipse(-60, 10 + wave, 20, 26);
    ellipse(60, 10 - wave, 20, 26);
    fill("#7cc6ff");
    rect(-55, -60, 110, 125, 40);
    fill("#a9dbff");
    rect(-42, -48, 30, 70, 20); // shine
    // water inside the tank (shows the power)
    fill(70, 150, 235, 200);
    let ph = 90 * this.power;
    rect(-40, 52 - ph, 80, ph, 12);
    // face
    fill(C.ink);
    let blink = frameCount % 200 < 6;
    if (holding) {
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
// Class 2: Drop
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
// Class 3: Tub
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
    fill("#c9b6ff");
    rect(this.x - this.w * 0.7, FLOOR + 6, this.w * 1.4, 34, 17);
    fill("#dccfff");
    for (let x = this.x - this.w * 0.6; x < this.x + this.w * 0.62; x += 22) circle(x, FLOOR + 23, 11);
    // shadow
    fill(0, 0, 0, 25);
    ellipse(this.x, FLOOR + 4, this.w * 1.05, 20);
    // feet
    fill("#ffcf5a");
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
    fill(C.water[0], C.water[1], C.water[2], 170);
    beginShape();
    for (let x = this.x - this.w / 2; x <= this.x + this.w / 2 + 10; x += 10) {
      vertex(x, surface + sin(x * 0.06 + frameCount * 0.12) * 3);
    }
    vertex(this.x + this.w / 2, FLOOR);
    vertex(this.x - this.w / 2, FLOOR);
    endShape(CLOSE);
    drawingContext.restore();

    // bath foam on the surface
    fill(255, 255, 255, 235);
    randomSeed(floor(this.baseX));
    let n = floor(this.w / 16);
    for (let i = 0; i < n; i++) {
      let fx = this.x - this.w / 2 + 14 + ((this.w - 28) * i) / (n - 1);
      let r = random(10, 20) * min(1, lv * 4);
      circle(fx, surface - 2 + sin(frameCount * 0.05 + i) * 2, r);
    }
    randomSeed(millis());

    // a little toy floats on the water
    if (lv > 0.08) {
      let tx = this.x - this.w * 0.3;
      let ty = surface - 6 + sin(frameCount * 0.07) * 3;
      if (this.toy === "boat") drawBoat(tx, ty, 1);
      else drawRubberDuck(tx, ty, 0.9);
    }

    // overflowing water
    if (this.level > 1) {
      fill(C.water[0], C.water[1], C.water[2], 170);
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
    fill("#ffffff");
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
// Class 4: Animal
// The animal sitting in the tub. Different animals = different looks.
// mood: "idle" | "happy" | "wet" | "scared" | "sad"
// ---------------------------------------------------------------
class Animal {
  constructor(cfg, tub) {
    this.type = cfg.animal;
    this.tub = tub;
    this.headShift = cfg.headShift || 0;
    this.mood = "idle";
    this.moodTimer = 0;
    this.dirt = 1; // 1 = very dirty, 0 = clean
    this.wobble = 0;
    this.r = { duck: 38, puppy: 44, kitten: 36, frog: 40, elephant: 60 }[this.type];
  }

  get hx() {
    return this.tub.x + this.tub.w * this.headShift;
  }

  get hy() {
    return this.tub.top - this.r * 0.35 + sin(frameCount * 0.05) * 2;
  }

  setMood(m, seconds = 1.2) {
    this.mood = m;
    this.moodTimer = seconds;
  }

  update(dt) {
    if (this.moodTimer > 0) {
      this.moodTimer -= dt / 60;
      if (this.moodTimer <= 0 && this.mood !== "happy" && this.mood !== "sad" && this.mood !== "scared") this.mood = "idle";
    }
    this.wobble = this.mood === "wet" ? sin(frameCount * 0.9) * 0.15 : lerp(this.wobble, 0, 0.2);
  }

  hitsHead(x, y) {
    return dist(x, y, this.hx, this.hy) < this.r * 0.95;
  }

  // body under the water
  drawBody() {
    let col = this.color();
    push();
    noStroke();
    fill(col);
    ellipse(this.hx, this.tub.top + this.r * 1.2, this.r * 2.3, this.r * 2.2);
    pop();
  }

  color() {
    return { duck: C.yellow, puppy: "#f3d2a6", kitten: "#cfc8e3", frog: "#94d96e", elephant: "#bcc3d6" }[this.type];
  }

  drawHead(px = this.hx, py = this.hy, sc = 1) {
    push();
    translate(px, py);
    scale(sc);
    rotate(this.wobble);
    let r = this.r;
    noStroke();
    let col = this.color();
    let t = this.type;

    // things behind the head
    if (t === "puppy") {
      fill("#b98a5e");
      push();
      rotate(0.35);
      ellipse(-r * 0.95, r * 0.15, r * 0.6, r * 1.2);
      pop();
      push();
      rotate(-0.35);
      ellipse(r * 0.95, r * 0.15, r * 0.6, r * 1.2);
      pop();
    }
    if (t === "kitten") {
      fill(col);
      triangle(-r * 0.85, -r * 0.3, -r * 0.6, -r * 1.15, -r * 0.15, -r * 0.75);
      triangle(r * 0.85, -r * 0.3, r * 0.6, -r * 1.15, r * 0.15, -r * 0.75);
      fill("#ffb6cf");
      triangle(-r * 0.68, -r * 0.45, -r * 0.58, -r * 0.92, -r * 0.3, -r * 0.7);
      triangle(r * 0.68, -r * 0.45, r * 0.58, -r * 0.92, r * 0.3, -r * 0.7);
    }
    if (t === "elephant") {
      fill("#a8b0c6");
      ellipse(-r * 1.0, -r * 0.05, r * 1.1, r * 1.3);
      ellipse(r * 1.0, -r * 0.05, r * 1.1, r * 1.3);
      fill("#f2b8c8");
      ellipse(-r * 1.0, -r * 0.05, r * 0.65, r * 0.85);
      ellipse(r * 1.0, -r * 0.05, r * 0.65, r * 0.85);
    }
    if (t === "frog") {
      fill(col);
      circle(-r * 0.48, -r * 0.72, r * 0.8);
      circle(r * 0.48, -r * 0.72, r * 0.8);
    }

    // head
    fill(col);
    if (t === "frog") ellipse(0, 0, r * 2.3, r * 1.75);
    else circle(0, 0, r * 2);

    // details on the head
    if (t === "duck") {
      // little hair curl
      noFill();
      stroke("#f2b800");
      strokeWeight(4);
      arc(-2, -r - 6, 14, 14, PI * 0.2, PI * 1.4);
      noStroke();
      fill("#ff9a3c");
      ellipse(r * 0.05, r * 0.32, r * 0.95, r * 0.42);
      fill("#ff7f2a");
      ellipse(r * 0.05, r * 0.42, r * 0.7, r * 0.18);
    }
    if (t === "puppy") {
      fill("#fff1dc");
      ellipse(0, r * 0.38, r * 1.0, r * 0.75);
      fill(C.ink);
      ellipse(0, r * 0.2, r * 0.32, r * 0.22);
      if (this.mood === "happy") {
        fill("#ff7a9a");
        ellipse(0, r * 0.62, r * 0.26, r * 0.32);
      }
      fill("#c99a6a");
      ellipse(r * 0.42, -r * 0.45, r * 0.45, r * 0.38); // a spot
    }
    if (t === "kitten") {
      fill("#ff9fbf");
      triangle(-r * 0.09, r * 0.18, r * 0.09, r * 0.18, 0, r * 0.3);
      stroke(C.ink);
      strokeWeight(1.5);
      for (let s of [-1, 1]) {
        line(s * r * 0.35, r * 0.3, s * r * 0.95, r * 0.2);
        line(s * r * 0.35, r * 0.38, s * r * 0.95, r * 0.42);
      }
      noStroke();
    }
    if (t === "elephant") {
      // trunk
      noFill();
      stroke(col);
      strokeWeight(r * 0.38);
      let up = this.mood === "happy";
      bezier(0, r * 0.2, 0, r * 0.9, up ? r * 0.7 : r * 0.3, up ? r * 0.5 : r * 1.1, up ? r * 0.8 : r * 0.7, up ? -r * 0.1 : r * 0.9);
      noStroke();
    }

    // eyes
    let ex = t === "frog" ? r * 0.48 : r * 0.38;
    let ey = t === "frog" ? -r * 0.72 : t === "elephant" ? -r * 0.15 : -r * 0.05;
    drawEyes(this.mood, ex, ey, r);

    // mouth
    fill(C.ink);
    stroke(C.ink);
    strokeWeight(2.5);
    noFill();
    if (t === "frog") {
      if (this.mood === "sad" || this.mood === "scared") arc(0, r * 0.35, r * 0.8, r * 0.3, PI, TWO_PI);
      else arc(0, r * 0.1, r * 1.3, r * 0.5, 0.1, PI - 0.1);
    } else if (t === "kitten" || t === "puppy") {
      if (this.mood === "scared") {
        noStroke();
        fill(C.ink);
        ellipse(0, r * 0.5, r * 0.22, r * 0.28);
      } else {
        arc(-r * 0.09, r * 0.34, r * 0.18, r * 0.16, 0, PI);
        arc(r * 0.09, r * 0.34, r * 0.18, r * 0.16, 0, PI);
      }
    }
    noStroke();

    // cheeks
    fill(255, 120, 160, this.mood === "happy" ? 170 : 110);
    let cy = t === "frog" ? r * 0.05 : r * 0.22;
    ellipse(-r * 0.62, cy, r * 0.36, r * 0.2);
    ellipse(r * 0.62, cy, r * 0.36, r * 0.2);

    // mud spots: they fade away as the bath fills up
    if (this.dirt > 0.02) {
      fill(150, 104, 62, 190 * this.dirt);
      ellipse(-r * 0.42, -r * 0.5, r * 0.32, r * 0.24);
      ellipse(-r * 0.3, -r * 0.62, r * 0.14, r * 0.12);
      ellipse(r * 0.55, r * 0.5, r * 0.24, r * 0.18);
      ellipse(r * 0.1, -r * 0.8, r * 0.18, r * 0.13);
    }

    // accessories
    if (t === "kitten") {
      // a pink bow on her ear
      fill(C.pink);
      push();
      translate(r * 0.55, -r * 0.82);
      rotate(0.4);
      triangle(0, 0, -r * 0.32, -r * 0.18, -r * 0.32, r * 0.18);
      triangle(0, 0, r * 0.32, -r * 0.18, r * 0.32, r * 0.18);
      fill("#ff6f9a");
      circle(0, 0, r * 0.16);
      pop();
    }
    if (t === "frog") {
      // a tiny golden crown
      fill("#ffd24d");
      stroke("#e8a800");
      strokeWeight(2);
      strokeJoin(ROUND);
      beginShape();
      vertex(-r * 0.28, -r * 0.62);
      vertex(-r * 0.28, -r * 0.95);
      vertex(-r * 0.14, -r * 0.78);
      vertex(0, -r * 1.02);
      vertex(r * 0.14, -r * 0.78);
      vertex(r * 0.28, -r * 0.95);
      vertex(r * 0.28, -r * 0.62);
      endShape(CLOSE);
      noStroke();
      fill(C.pink);
      circle(0, -r * 0.74, r * 0.1);
    }
    if (t === "elephant") {
      // a flower on her ear
      push();
      translate(-r * 1.05, -r * 0.55);
      fill("#ffffff");
      for (let i = 0; i < 5; i++) {
        let a = (i / 5) * TWO_PI;
        circle(cos(a) * r * 0.16, sin(a) * r * 0.16, r * 0.22);
      }
      fill(C.yellow);
      circle(0, 0, r * 0.18);
      pop();
    }
    if (t === "puppy") {
      // a little blue bow on the head
      fill("#7cc6ff");
      push();
      translate(-r * 0.15, -r * 0.92);
      triangle(0, 0, -r * 0.28, -r * 0.16, -r * 0.28, r * 0.16);
      triangle(0, 0, r * 0.28, -r * 0.16, r * 0.28, r * 0.16);
      fill("#4fa8ef");
      circle(0, 0, r * 0.14);
      pop();
    }

    // sweat drop when scared
    if (this.mood === "scared" || this.mood === "sad") {
      fill(150, 210, 255);
      ellipse(r * 0.85, -r * 0.55, r * 0.22, r * 0.32);
    }
    pop();

    // angry steam for the scared kitten
    if (this.mood === "scared" && this.type === "kitten") {
      push();
      noFill();
      stroke(255, 255, 255, 200);
      strokeWeight(3);
      for (let i = 0; i < 3; i++) {
        let sx = this.hx - 20 + i * 20;
        let sy = this.hy - this.r - 20 - ((frameCount * 0.8 + i * 10) % 30);
        arc(sx, sy, 10, 10, HALF_PI, PI + HALF_PI);
      }
      pop();
    }
  }
}

// draw eyes for every mood
function drawEyes(mood, ex, ey, r) {
  let blink = frameCount % 180 < 6;
  push();
  if (mood === "happy") {
    noFill();
    stroke(C.ink);
    strokeWeight(3.5);
    arc(-ex, ey + 3, r * 0.3, r * 0.3, PI, TWO_PI);
    arc(ex, ey + 3, r * 0.3, r * 0.3, PI, TWO_PI);
  } else if (mood === "scared" || mood === "wet") {
    stroke(C.ink);
    strokeWeight(3.5);
    let k = r * 0.13;
    line(-ex - k, ey - k, -ex + k, ey);
    line(-ex - k, ey + k, -ex + k, ey);
    line(ex + k, ey - k, ex - k, ey);
    line(ex + k, ey + k, ex - k, ey);
  } else if (mood === "sad") {
    noStroke();
    fill(C.ink);
    ellipse(-ex, ey + 2, r * 0.2, r * 0.14);
    ellipse(ex, ey + 2, r * 0.2, r * 0.14);
    stroke(C.ink);
    strokeWeight(2.5);
    line(-ex - r * 0.15, ey - r * 0.15, -ex + r * 0.1, ey - r * 0.08);
    line(ex + r * 0.15, ey - r * 0.15, ex - r * 0.1, ey - r * 0.08);
  } else {
    noStroke();
    fill(C.ink);
    ellipse(-ex, ey, r * 0.22, blink ? 2 : r * 0.3);
    ellipse(ex, ey, r * 0.22, blink ? 2 : r * 0.3);
    if (!blink) {
      fill(255);
      circle(-ex + r * 0.04, ey - r * 0.06, r * 0.08);
      circle(ex + r * 0.04, ey - r * 0.06, r * 0.08);
    }
  }
  pop();
}

// ---------------------------------------------------------------
// Class 5: Bubble
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
  }

  update(dt) {
    if (this.kind === "text") {
      this.y -= 0.5 * dt;
      this.life -= 0.012 * dt;
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
    if (this.kind === "text") {
      // a little speech bubble
      let k = min(1, (1 - this.life) * 8); // pop in
      translate(this.x, this.y);
      scale(0.6 + 0.4 * easeOutBack(k));
      textFont(FONT);
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
// Class 6: Sounds
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

  quack() {
    this.tone(620, 0.15, "sawtooth", 0.06, 380);
  }

  meow() {
    this.tone(700, 0.35, "triangle", 0.12, 1100);
    this.tone(1100, 0.2, "triangle", 0.1, 600, 0.3);
  }
}

// ---------------------------------------------------------------
// Class 7: Game
// The state machine. It decides what happens when you press or let go.
// ---------------------------------------------------------------
class Game {
  constructor() {
    this.state = "title";
    this.levelIndex = 0;
    this.totalStars = 0;
    this.starsPerLevel = [];
    this.hose = new Hose();
    this.drops = [];
    this.effects = [];
    this.holding = false;
    this.ignoreRelease = false;
    this.stateTime = 0;
    this.loadLevel(0);
    for (let i = 0; i < 14; i++) this.effects.push(new Bubble(random(W), random(H), "soap"));
  }

  get level() {
    return LEVELS[this.levelIndex];
  }

  loadLevel(i) {
    this.levelIndex = i;
    let cfg = LEVELS[i];
    this.tub = new Tub(cfg);
    this.animal = new Animal(cfg, this.tub);
    this.shotsLeft = cfg.shots;
    this.fired = 0;
    this.landed = 0;
    this.toEmit = 0;
    this.drops = [];
    this.failReason = "";
    this.hose.reset(cfg.swing);
  }

  setState(s) {
    this.state = s;
    this.stateTime = 0;
  }

  // ---------- ONE BUTTON ----------
  press() {
    sfx.start();
    if (this.state === "aim") {
      this.holding = true;
      return;
    }
    // every other screen: press = continue
    this.ignoreRelease = true;
    if (this.state === "title") {
      this.loadLevel(0);
      this.totalStars = 0;
      this.starsPerLevel = [];
      this.setState("intro");
    } else if (this.state === "intro" && this.stateTime > 0.3) {
      this.setState("aim");
    } else if (this.state === "result" && this.stateTime > 0.6) {
      if (this.win) {
        if (this.levelIndex + 1 < LEVELS.length) {
          this.loadLevel(this.levelIndex + 1);
          this.setState("intro");
        } else {
          this.setState("end");
        }
      } else {
        this.loadLevel(this.levelIndex); // try again
        this.setState("aim");
      }
    } else if (this.state === "end" && this.stateTime > 1) {
      this.setState("title");
    }
  }

  release() {
    if (this.ignoreRelease) {
      this.ignoreRelease = false;
      return;
    }
    if (this.state === "aim" && this.holding) {
      this.holding = false;
      this.fire();
    }
  }

  fire() {
    let tip = this.hose.tip();
    this.shot = { a: tip.a, v: this.hose.speedFromPower(this.hose.power) };
    this.toEmit = this.level.shotSize;
    this.emitTimer = 0;
    this.shotsLeft--;
    sfx.splash();
    this.setState("fly");
  }

  // ---------- UPDATE ----------
  update(dt) {
    this.stateTime += dt / 60;
    // the hose stays still while the water is flying
    if (this.state !== "fly") this.hose.update(dt, this.holding && this.state === "aim");
    this.tub.update(dt);
    this.animal.update(dt);
    // mud disappears as the water gets close to the perfect zone
    this.animal.dirt = 1 - constrain(this.tub.level / this.level.band[0], 0, 1);

    // pour out the drops of this splash over a short time
    if (this.state === "fly" && this.toEmit > 0) {
      let perFrame = max(1, this.level.shotSize / 16);
      for (let k = 0; k < perFrame && this.toEmit > 0; k++) {
        let tip = this.hose.tip();
        let a = this.shot.a + radians(random(-0.7, 0.7));
        let v = this.shot.v * random(0.985, 1.015);
        this.drops.push(new Drop(tip.x, tip.y, cos(a) * v, sin(a) * v));
        this.toEmit--;
        this.fired++;
      }
    }

    for (let d of this.drops) {
      d.update(dt);
      this.checkDrop(d);
    }
    this.drops = this.drops.filter((d) => d.alive);

    for (let e of this.effects) e.update(dt);
    this.effects = this.effects.filter((e) => e.life > 0 && e.y > -60);
    if (this.effects.filter((e) => e.kind === "soap").length < 10 && random() < 0.03) {
      this.effects.push(new Bubble(random(W), H + 20, "soap"));
    }
    if (this.animal.mood === "happy" && random() < 0.15) {
      this.effects.push(new Bubble(this.animal.hx + random(-60, 60), this.animal.hy - 20, random() < 0.5 ? "heart" : "soap"));
    }

    // a splash is finished when all drops are gone
    if (this.state === "fly" && this.toEmit === 0 && this.drops.length === 0 && this.stateTime > 0.4) {
      this.afterShot();
    }
  }

  checkDrop(d) {
    if (!d.alive) return;
    let tub = this.tub;
    let a = this.animal;
    let face = this.level.face;

    // 1. hits the animal's face
    if (a.hitsHead(d.x, d.y)) {
      d.alive = false;
      this.splashAt(d.x, d.y);
      if (face === "scared") {
        a.setMood("scared", 99);
        this.failReason = "You splashed Kitten's face!";
        this.say("MEOW!!");
        sfx.meow();
      } else if (face === "love") {
        a.setMood("happy", 0.8);
        if (this.animal.type === "duck") sfx.quack();
        this.say(this.animal.type === "duck" ? "Quack!" : "Hehe~");
        this.effects.push(new Bubble(d.x, d.y, "heart"));
      } else if (face === "shake") {
        a.setMood("wet", 0.9);
        this.say("Brrr!");
      }
      // the water still falls into the tub
      tub.drops++;
      this.landed++;
      return;
    }

    // 2. falls into the tub from above
    if (d.vy > 0 && d.py <= tub.top && d.y > tub.top && tub.isOverOpening(d.x)) {
      d.alive = false;
      tub.drops++;
      this.landed++;
      this.splashAt(d.x, tub.top);
      sfx.plop();
      return;
    }

    // 3. hits the side of the tub
    if (tub.hitsWall(d.x, d.y) && !tub.isOverOpening(d.x)) {
      d.alive = false;
      this.splashAt(d.x, d.y);
      return;
    }

    // 4. hits the floor
    if (d.y > FLOOR) {
      d.alive = false;
      this.splashAt(d.x, FLOOR);
      if (random() < 0.25) this.effects.push(new Bubble(d.x, FLOOR, "puddle"));
    }
  }

  // the animal says something (only one bubble at a time)
  say(str) {
    if (this.effects.some((e) => e.kind === "text" && e.life > 0.4)) return;
    let b = new Bubble(this.animal.hx + this.animal.r * 1.4, this.animal.hy - this.animal.r * 1.4, "text");
    b.str = str;
    this.effects.push(b);
  }

  splashAt(x, y) {
    for (let i = 0; i < 2; i++) this.effects.push(new Bubble(x, y, "splash"));
  }

  // after each splash: did we win, lose, or keep going?
  afterShot() {
    let lv = this.tub.target;
    let [lo, hi] = this.level.band;

    if (this.failReason) return this.finish(false);
    if (lv > hi) {
      this.failReason = lv > 1 ? "Oh no, it overflowed!" : "Too much water!";
      this.say("Too much!");
      this.animal.setMood("sad", 99);
      return this.finish(false);
    }
    if (lv >= lo) return this.finish(true);
    if (this.shotsLeft <= 0) {
      this.failReason = "Not enough water... still dirty!";
      this.say("Still dirty...");
      this.animal.setMood("sad", 99);
      return this.finish(false);
    }
    this.setState("aim"); // keep going
  }

  finish(win) {
    this.win = win;
    this.holding = false;
    if (win) {
      // stars: how much of your water landed in the tub?
      let accuracy = this.landed / max(1, this.fired);
      this.stars = accuracy > 0.8 ? 3 : accuracy > 0.55 ? 2 : 1;
      this.totalStars += this.stars;
      this.starsPerLevel[this.levelIndex] = this.stars;
      this.animal.setMood("happy", 99);
      this.say("Yay~!");
      sfx.win();
    } else {
      sfx.fail();
    }
    this.setState("result");
  }

  // ---------- DRAW ----------
  draw() {
    drawRoom();
    for (let e of this.effects) if (e.kind === "puddle") e.draw();

    if (this.state !== "title" && this.state !== "end") {
      this.tub.drawBack();
      this.animal.drawBody();
      this.tub.drawWater();
      this.tub.drawFront();
      this.animal.drawHead();
      this.hose.draw(this.holding && this.state === "aim", this);
      for (let d of this.drops) d.draw();
    }
    for (let e of this.effects) if (e.kind !== "puddle") e.draw();

    if (this.state === "title") drawTitle();
    else if (this.state === "intro") drawIntro(this.level, this.levelIndex);
    else if (this.state === "end") drawEnd(this.totalStars, this.starsPerLevel);
    else {
      drawHud(this);
      if (this.state === "result") drawResult(this);
    }
  }
}

// ---------------------------------------------------------------
// p5 setup + draw
// ---------------------------------------------------------------
function setup() {
  createCanvas(windowWidth, windowHeight);
  fitToWindow();
  sfx = new Sounds();
  game = new Game();
  textFont(FONT);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  fitToWindow();
}

function fitToWindow() {
  S = min(width / W, height / H);
  OX = (width - W * S) / 2;
  OY = (height - H * S) / 2;
}

function draw() {
  background("#bfe6ea");
  let dt = min(deltaTime / (1000 / 60), 2.5); // 1 = one normal frame
  game.update(dt);
  push();
  translate(OX, OY);
  scale(S);
  game.draw();
  pop();
}

// ---------------------------------------------------------------
// The ONE button: space / enter / click / tap
// ---------------------------------------------------------------
let buttonDown = false;

function buttonPress() {
  if (buttonDown) return; // ignore key repeat
  buttonDown = true;
  game.press();
}

function buttonRelease() {
  if (!buttonDown) return;
  buttonDown = false;
  game.release();
}

function keyPressed() {
  if (key === " " || keyCode === ENTER) {
    buttonPress();
    return false;
  }
}

function keyReleased() {
  if (key === " " || keyCode === ENTER) {
    buttonRelease();
    return false;
  }
}

function mousePressed() {
  buttonPress();
  return false;
}

function mouseReleased() {
  buttonRelease();
  return false;
}

// ---------------------------------------------------------------
// Drawing: room, screens, HUD
// ---------------------------------------------------------------
function drawRoom() {
  push();
  noStroke();
  // tiles (every other tile a little darker, like a checkerboard)
  fill(C.tile);
  rect(0, 0, W, FLOOR);
  for (let y = 0; y < 400; y += 64) {
    for (let x = 0; x < W; x += 64) {
      if ((x / 64 + y / 64) % 2 === 0) {
        fill("#c2e8ea");
        rect(x, y, 64, 64);
      }
    }
  }
  stroke(C.grout);
  strokeWeight(4);
  for (let x = 0; x <= W; x += 64) line(x, 0, x, 400);
  for (let y = 0; y <= 400; y += 64) line(0, y, W, y);
  noStroke();

  // flag garland at the top
  let flagCols = ["#ff9fbf", "#ffd84d", "#7fdcb5", "#9ad0ff", "#c9b6ff"];
  stroke("#ffffff");
  strokeWeight(3);
  noFill();
  bezier(-10, 18, 300, 70, 900, 70, W + 10, 18);
  noStroke();
  for (let i = 0; i < 22; i++) {
    let t = (i + 0.5) / 22;
    let x = bezierPoint(-10, 300, 900, W + 10, t);
    let y = bezierPoint(18, 70, 70, 18, t);
    fill(flagCols[i % flagCols.length]);
    let sway = sin(frameCount * 0.03 + i) * 2;
    triangle(x - 18, y, x + 18, y, x + sway, y + 34);
  }

  // pink wall below with polka dots
  fill(C.wainscot);
  rect(0, 400, W, FLOOR - 400);
  fill("#ffe9ef");
  for (let y = 430; y < FLOOR - 10; y += 40) {
    for (let x = ((y / 40) % 2) * 30 + 15; x < W; x += 60) circle(x, y, 12);
  }
  fill("#ffc4d2");
  rect(0, 396, W, 14, 7);

  // towel on a rail (left)
  fill("#ffffff");
  rect(250, 250, 130, 8, 4);
  fill("#ffb3c7");
  rect(268, 254, 94, 118, 0, 0, 16, 16);
  fill("#ff9fbf");
  rect(268, 330, 94, 10);
  rect(268, 348, 94, 6);
  fill("#ffffff");
  drawHeart(315, 290, 20);

  // shelf with a plant, shampoo and a rubber duck
  fill("#ffffff");
  rect(470, 210, 190, 12, 6);
  fill("#9ad38a");
  ellipse(500, 190, 22, 34);
  ellipse(515, 185, 22, 40);
  ellipse(530, 192, 22, 30);
  fill("#ff9f80");
  rect(495, 195, 40, 16, 4);
  fill("#c9b6ff");
  rect(552, 166, 26, 44, 8);
  fill("#ffffff");
  rect(558, 158, 14, 10, 3);
  drawRubberDuck(625, 196, 0.8);

  // round window with a cloud
  fill("#ffffff");
  circle(1120, 150, 150);
  fill("#a7dcff");
  circle(1120, 150, 126);
  fill("#ffffff");
  ellipse(1095, 160, 50, 22);
  ellipse(1120, 152, 40, 26);
  stroke("#ffffff");
  strokeWeight(6);
  line(1120, 87, 1120, 213);
  line(1057, 150, 1183, 150);
  noStroke();

  // floor
  fill(C.floor);
  rect(0, FLOOR, W, H - FLOOR);
  stroke(C.floorLine);
  strokeWeight(2);
  for (let y = FLOOR + 30; y < H; y += 34) line(0, y, W, y);
  noStroke();
  pop();
}

// a tiny rubber duck toy
function drawRubberDuck(x, y, s) {
  push();
  translate(x, y);
  scale(s);
  noStroke();
  fill(C.yellow);
  ellipse(0, 4, 36, 24);
  circle(-8, -10, 22);
  fill("#ff9a3c");
  ellipse(-21, -9, 12, 7);
  fill(C.ink);
  circle(-11, -13, 3.5);
  fill(255, 140, 170, 160);
  ellipse(-4, -6, 7, 4);
  pop();
}

// a tiny paper boat toy
function drawBoat(x, y, s) {
  push();
  translate(x, y);
  scale(s);
  noStroke();
  fill("#ff9fbf");
  quad(-20, -2, 20, -2, 13, 10, -13, 10);
  fill("#ffffff");
  triangle(-2, -2, -2, -30, 16, -6);
  pop();
}

function drawTitle() {
  push();
  fill(255, 255, 255, 150);
  noStroke();
  rect(0, 0, W, H);
  textAlign(CENTER, CENTER);
  let bob = sin(frameCount * 0.05) * 6;
  // big title with an outline
  textStyle(BOLD);
  textSize(120);
  stroke(C.ink);
  strokeWeight(14);
  strokeJoin(ROUND);
  fill("#7cc6ff");
  text("Bath Time!", W / 2, 220 + bob);
  noStroke();
  textSize(26);
  fill(C.ink);
  text("five little animals need a bath", W / 2, 320);

  // how to play
  textStyle(NORMAL);
  textSize(22);
  fill(C.ink);
  let y = 400;
  pill(W / 2 - 300, y - 26, 600, 110, "#ffffff");
  fill(C.ink);
  text("HOLD   →  the hose swings + the tank pumps", W / 2, y);
  text("LET GO  →  splash!", W / 2, y + 34);
  textSize(16);
  fill("#8a82a6");
  text("fill each tub up to the pink lines", W / 2, y + 64);

  // the five friends peek from the bottom
  for (let i = 0; i < LEVELS.length; i++) {
    let a = new Animal(LEVELS[i], game.tub);
    a.dirt = 0;
    let x = W / 2 + (i - 2) * 170;
    let y = 680 - abs(sin(frameCount * 0.05 + i)) * 12;
    a.drawHead(x, y, 0.8);
  }

  // blinking start
  if (frameCount % 60 < 42) {
    textStyle(BOLD);
    textSize(26);
    fill(C.pink);
    stroke(255);
    strokeWeight(6);
    text("press SPACE, click or tap to start", W / 2, 572);
    noStroke();
  }
  pop();
}

function drawIntro(cfg, i) {
  push();
  fill(59, 51, 85, 120);
  noStroke();
  rect(0, 0, W, H);
  pill(W / 2 - 340, 70, 680, 560, "#fffaf2");
  textAlign(CENTER, CENTER);
  fill("#8a82a6");
  textSize(20);
  text("LEVEL " + (i + 1) + " / " + LEVELS.length, W / 2, 110);
  // big portrait of the animal (dirty, waiting for a bath)
  let a = game.animal;
  let bob = sin(frameCount * 0.06) * 5;
  fill("#ffe3ec");
  circle(W / 2, 220 + bob, 190);
  a.drawHead(W / 2, 225 + bob, 70 / a.r);
  fill(C.ink);
  textStyle(BOLD);
  textSize(50);
  text(cfg.name, W / 2, 360);
  textStyle(NORMAL);
  textSize(24);
  text(cfg.rule, W / 2, 432);
  textSize(18);
  fill("#8a82a6");
  text(cfg.shots + " splashes  ·  " + cfg.shotSize + " drops per splash", W / 2, 500);
  if (frameCount % 60 < 42) {
    textStyle(BOLD);
    textSize(24);
    fill(C.pink);
    text("press to start", W / 2, 572);
  }
  pop();
}

function drawHud(g) {
  push();
  noStroke();
  textAlign(LEFT, CENTER);
  pill(24, 22, 300, 52, "#ffffff");
  noStroke();
  fill(C.ink);
  textStyle(BOLD);
  textSize(22);
  text(g.levelIndex + 1 + "/" + LEVELS.length + "  " + g.level.name, 44, 47);
  // shots left = little drops
  for (let i = 0; i < g.level.shots; i++) {
    let used = i >= g.shotsLeft;
    fill(used ? "#d8d4e6" : "#7cc6ff");
    noStroke();
    drawDropIcon(232 + i * 20, 48, 8);
  }
  // stars
  pill(W - 160, 22, 136, 52, "#ffffff");
  noStroke();
  fill(C.yellow);
  drawStar(W - 128, 48, 15);
  fill(C.ink);
  textSize(22);
  text("× " + g.totalStars, W - 105, 47);

  // hint
  if (g.state === "aim") {
    textAlign(CENTER, CENTER);
    textSize(18);
    fill(C.ink);
    textStyle(NORMAL);
    text(g.holding ? "let go to splash!" : "hold SPACE / mouse to aim + pump", 300, 680);
  }
  pop();
}

function drawResult(g) {
  push();
  let k = min(1, g.stateTime * 3); // pop-in animation
  translate(W / 2, 300);
  scale(0.8 + 0.2 * easeOutBack(k));
  pill(-280, -130, 560, 250, "#fffaf2");
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  if (g.win) {
    fill(C.ink);
    textSize(46);
    text(["So clean!", "Perfect bath!", "Squeaky clean!"][g.stars - 1], 0, -70);
    for (let i = 0; i < 3; i++) {
      fill(i < g.stars ? C.yellow : "#e4e0ee");
      drawStar(-60 + i * 60, 0, 24);
    }
    textStyle(NORMAL);
    textSize(16);
    fill("#8a82a6");
    text(round((g.landed / max(1, g.fired)) * 100) + "% of your water landed in the tub", 0, 48);
  } else {
    fill(C.ink);
    textSize(40);
    text("Oops!", 0, -70);
    textStyle(NORMAL);
    textSize(24);
    text(g.failReason, 0, -10);
  }
  if (g.stateTime > 0.6 && frameCount % 60 < 42) {
    textStyle(BOLD);
    textSize(20);
    fill(C.pink);
    let last = g.levelIndex === LEVELS.length - 1;
    text(g.win ? (last ? "press to finish" : "press for the next friend") : "press to try again", 0, 88);
  }
  pop();
}

function drawEnd(total, list) {
  push();
  fill(255, 255, 255, 170);
  noStroke();
  rect(0, 0, W, H);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(70);
  stroke(C.ink);
  strokeWeight(10);
  strokeJoin(ROUND);
  fill(C.yellow);
  text("Everyone is clean!", W / 2, 180);
  noStroke();
  fill(C.ink);
  textSize(30);
  text(total + " / " + LEVELS.length * 3 + " stars", W / 2, 270);
  textStyle(NORMAL);
  textSize(22);
  for (let i = 0; i < LEVELS.length; i++) {
    let y = 330 + i * 40;
    fill(C.ink);
    textAlign(RIGHT, CENTER);
    text(LEVELS[i].name, W / 2 - 20, y);
    for (let s = 0; s < 3; s++) {
      fill(s < (list[i] || 0) ? C.yellow : "#e4e0ee");
      drawStar(W / 2 + 20 + s * 30, y, 11);
    }
  }
  textAlign(CENTER, CENTER);
  let rank = total >= 14 ? "Bath Master" : total >= 10 ? "Bubble Pro" : "Splash Rookie";
  textStyle(BOLD);
  textSize(28);
  fill(C.pink);
  text(rank, W / 2, 560);
  if (frameCount % 60 < 42) {
    textSize(20);
    fill(C.ink);
    text("press to play again", W / 2, 620);
  }
  pop();
}

// ---------------------------------------------------------------
// Small shape helpers
// ---------------------------------------------------------------
function pill(x, y, w, h, col) {
  push();
  noStroke();
  fill(0, 0, 0, 30);
  rect(x + 4, y + 6, w, h, 26);
  fill(col);
  stroke(C.ink);
  strokeWeight(3);
  rect(x, y, w, h, 26);
  pop();
}

function drawHeart(x, y, s) {
  push();
  translate(x, y);
  beginShape();
  vertex(0, s * 0.35);
  bezierVertex(-s * 0.9, -s * 0.2, -s * 0.4, -s * 0.85, 0, -s * 0.35);
  bezierVertex(s * 0.4, -s * 0.85, s * 0.9, -s * 0.2, 0, s * 0.35);
  endShape(CLOSE);
  pop();
}

function drawStar(x, y, r) {
  push();
  translate(x, y);
  stroke(C.ink);
  strokeWeight(2.5);
  strokeJoin(ROUND);
  beginShape();
  for (let i = 0; i < 10; i++) {
    let a = -HALF_PI + (i * PI) / 5;
    let rr = i % 2 === 0 ? r : r * 0.48;
    vertex(cos(a) * rr, sin(a) * rr);
  }
  endShape(CLOSE);
  pop();
}

function drawDropIcon(x, y, r) {
  beginShape();
  vertex(x, y - r * 1.5);
  bezierVertex(x + r * 1.1, y - r * 0.2, x + r, y + r, x, y + r);
  bezierVertex(x - r, y + r, x - r * 1.1, y - r * 0.2, x, y - r * 1.5);
  endShape(CLOSE);
}

function easeOutBack(t) {
  let c1 = 1.70158;
  let c3 = c1 + 1;
  return 1 + c3 * pow(t - 1, 3) + c1 * pow(t - 1, 2);
}
