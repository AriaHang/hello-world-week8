// challenges.js — the things that make each bath a little puzzle
//
//  • Rubber ducks float in the air (like the stars in "Cut the Rope" and the
//    ducks in "Where's My Water"). Hit them with your water to collect them.
//    Ducks = stars. You can spend an extra splash just to get a duck,
//    but be careful: water that lands in the tub still counts!
//  • Obstacles: rocks and branches block the water.
//  • Wind: blows the water left or right.
//  • Timer: on the later islands the bath water gets cold!

// ---------------------------------------------------------------
// Simulate one drop (no randomness). Used for the guide line,
// the "last shot" trail, and to place the ducks where you CAN reach them.
// ---------------------------------------------------------------
function simulateArc(g, deg, power, maxSteps = 400) {
  let hose = g.hose;
  let a = radians(-deg);
  let x = hose.x + cos(a) * 64;
  let y = hose.y + sin(a) * 64;
  let v = hose.speedFromPower(power);
  let vx = cos(a) * v;
  let vy = sin(a) * v;
  let points = [];
  let result = "miss";
  for (let i = 0; i < maxSteps; i++) {
    let py = y;
    vy += GRAVITY;
    vx += g.wind;
    x += vx;
    y += vy;
    points.push([x, y]);
    if (hitsObstacle(g, x, y)) { result = "block"; break; }
    if (g.animal.hitsBird(x, y)) { result = "bird"; break; }
    if (g.animal.hitsHead(x, y)) { result = "head"; break; }
    if (vy > 0 && py <= g.tub.top && y > g.tub.top && g.tub.isOverOpening(x)) { result = "in"; break; }
    if (g.tub.hitsWall(x, y) && !g.tub.isOverOpening(x)) break;
    if (y > FLOOR || x > W + 20 || x < -20) break;
  }
  return { points, result };
}

// ---------------------------------------------------------------
// Ducks
// ---------------------------------------------------------------
class Duck {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.phase = random(TWO_PI);
    this.got = false;
    this.t = 0; // animation after it is collected
  }

  get by() {
    return this.y + sin(frameCount * 0.05 + this.phase) * 5;
  }

  update(dt) {
    if (this.got) this.t += dt / 60;
  }

  touches(x, y) {
    return !this.got && dist(x, y, this.x, this.by) < 26;
  }

  draw() {
    if (this.got && this.t > 0.6) return;
    push();
    if (this.got) {
      // pop up and fade away
      let k = this.t / 0.6;
      translate(this.x, this.by - k * 60);
      scale(1 + k * 0.6);
      drawingContext.globalAlpha = 1 - k;
    } else {
      translate(this.x, this.by);
      // soft glow ring so you can see it on every background
      noStroke();
      fill(255, 255, 255, 110);
      circle(0, 0, 54);
    }
    rotate(sin(frameCount * 0.05 + this.phase) * 0.15);
    drawRubberDuck(0, 3, 1.15);
    pop();
  }
}

function placeDucks(g, wi, ai) {
  randomSeed(1000 + wi * 10 + ai); // the same ducks every time you play this level
  let arcs = [];
  for (let deg = 18; deg <= 68; deg += 2) {
    for (let p = 0.1; p <= 0.95; p += 0.05) {
      let s = simulateArc(g, deg, p);
      if (s.points.length > 20) arcs.push(s);
    }
  }
  let good = arcs.filter((s) => s.result === "in");
  let others = arcs.filter((s) => s.result !== "in");
  let ducks = [];

  let okSpot = (x, y) => {
    if (x < 270 || x > W - 70 || y < 110 || y > FLOOR - 70) return false;
    if (y < 110 && (x < 460 || x > 1040)) return false; // keep away from the top bars
    if (abs(x - g.tub.x) < g.tub.w / 2 + 40 && y > g.tub.top - 130) return false; // not on the tub
    for (let d of ducks) if (dist(x, y, d.x, d.y) < 150) return false;
    return true;
  };

  let pickFrom = (list, from, to) => {
    for (let tries = 0; tries < 200 && list.length; tries++) {
      let s = random(list);
      let k = floor(random(from, to) * s.points.length);
      let [x, y] = s.points[k];
      if (okSpot(x, y)) {
        ducks.push(new Duck(x, y));
        return true;
      }
    }
    return false;
  };

  pickFrom(good, 0.35, 0.7); // one duck on a path that also fills the tub
  pickFrom(others.length ? others : good, 0.3, 0.8); // two ducks that need a smart extra splash
  if (!pickFrom(others.length ? others : good, 0.3, 0.8)) pickFrom(arcs, 0.3, 0.8);
  while (ducks.length < 3) pickFrom(arcs, 0.2, 0.9) || ducks.push(new Duck(random(400, 900), random(150, 300)));
  randomSeed(millis());
  return ducks;
}

// ---------------------------------------------------------------
// Obstacles
// ---------------------------------------------------------------
function hitsObstacle(g, x, y) {
  for (let o of g.cfg.obstacles || []) {
    if (x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h) return true;
  }
  return false;
}

function drawObstacles(g) {
  for (let o of g.cfg.obstacles || []) {
    push();
    stroke(INK);
    strokeWeight(3.5);
    strokeJoin(ROUND);
    if (o.kind === "rock") {
      fill("#c7b29a");
      rect(o.x, o.y, o.w, o.h + 10, 26, 26, 6, 6);
      noStroke();
      fill("#d9c7b0");
      ellipse(o.x + o.w * 0.35, o.y + 30, o.w * 0.35, 22);
      fill("#b39d84");
      ellipse(o.x + o.w * 0.65, o.y + o.h * 0.6, o.w * 0.3, 18);
    } else if (o.kind === "branch") {
      fill("#a8673f");
      rect(o.x, o.y, o.w, o.h, o.h / 2);
      noStroke();
      fill("#5cc46a");
      for (let i = 0; i < 5; i++) ellipse(o.x + 20 + i * (o.w - 40) / 4, o.y + o.h + 10 + (i % 2) * 8, 34, 16);
      stroke("#8b5a3c");
      strokeWeight(2);
      line(o.x + 15, o.y + o.h / 2, o.x + o.w - 15, o.y + o.h / 2);
    } else if (o.kind === "stump") {
      fill("#a8673f");
      rect(o.x, o.y, o.w, o.h + 10, 10, 10, 0, 0);
      fill("#d6a77a");
      ellipse(o.x + o.w / 2, o.y + 4, o.w, 18);
      noFill();
      stroke("#a8673f");
      ellipse(o.x + o.w / 2, o.y + 4, o.w * 0.5, 8);
    }
    pop();
  }
}

// ---------------------------------------------------------------
// Wind: a little flag shows which way and how strong
// ---------------------------------------------------------------
function drawWind(g) {
  if (!g.wind) return;
  let dir = g.wind > 0 ? 1 : -1;
  let x = 60, y = 290; // next to the water gun
  push();
  stroke(INK);
  strokeWeight(3);
  line(x, y, x, y + 90);
  let wave = sin(frameCount * 0.25) * 6;
  fill(C.red);
  beginShape();
  vertex(x, y);
  vertex(x + dir * 50, y + 10 + wave);
  vertex(x, y + 30);
  endShape(CLOSE);
  noStroke();
  fill(INK);
  textFont(HEAD);
  textSize(18);
  textAlign(CENTER, CENTER);
  text("WIND", x, y + 108);
  // little leaves flying with the wind
  fill("#8fbf55");
  for (let i = 0; i < 6; i++) {
    let lx = (frameCount * 3 * dir + i * 230) % (W + 100);
    if (lx < 0) lx += W + 100;
    let ly = 160 + i * 60 + sin(frameCount * 0.05 + i) * 20;
    ellipse(lx - 50, ly, 16, 8);
  }
  pop();
}

// ---------------------------------------------------------------
// Timer: a thermometer. When it is empty, the water is cold!
// ---------------------------------------------------------------
function drawTimer(g) {
  if (!g.cfg.timer) return;
  let k = constrain(g.timeLeft / g.cfg.timer, 0, 1);
  let x = W - 200, y = 96, w = 170, h = 26;
  push();
  fill(0, 0, 0, 40);
  noStroke();
  rect(x + 4, y + 6, w, h, h / 2);
  fill(C.cream);
  stroke(INK);
  strokeWeight(3);
  rect(x, y, w, h, h / 2);
  noStroke();
  fill(lerpColor(color("#7cc6ff"), color("#ff8a65"), k));
  rect(x + 4, y + 4, (w - 8) * k, h - 8, (h - 8) / 2);
  fill(INK);
  textFont(HEAD);
  textSize(16);
  textAlign(CENTER, CENTER);
  text(k > 0.3 ? "WARM WATER  " + ceil(g.timeLeft) + "s" : "HURRY!  " + ceil(g.timeLeft) + "s", x + w / 2, y + h / 2 + 1);
  pop();
}

// faint dots: where your last splash went (like in Angry Birds)
function drawLastTrail(g) {
  if (!g.lastTrail) return;
  push();
  noStroke();
  fill(255, 255, 255, 120);
  for (let i = 0; i < g.lastTrail.length; i += 6) circle(g.lastTrail[i][0], g.lastTrail[i][1], 5);
  pop();
}
