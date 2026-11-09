// week8.js — new things from the Week 8 feedback (Hello World, "Human x Machine")
//
//  • BOUNCERS: a tree trunk or a big leaf in the scene. Water that hits it bounces back,
//    so there is a new way to get water into the tub (find the right angle!).
//  • SLIDE: with more water, some tubs start to slide (Rhino, Tapir).
//  • PRANKS: some animals have a personality and push water OUT of the tub
//    (Big Ellie sprays with her trunk, the Dart Frog kicks).
//  • STEPS: some baths have extra steps: water -> FOAM (or a face MASK) -> RINSE
//    (Puppy = foam, Hippo = green face mask).

const FOAM_HITS = 35; // how many foam drops on the head = full foam / full mask

// ---------------------------------------------------------------
// Bouncers (a line the water bounces off)
// o = { x, y, vx, vy } is changed when it bounces. Returns true if it bounced.
// The same code is used for real drops AND for the guide line (simulateArc).
// ---------------------------------------------------------------
function bounceOff(g, px, py, o) {
  if (!g.cfg || g.state === "rush" || g.state === "rushOver") return false;
  for (let b of g.cfg.bouncers || []) {
    // does the move (px,py) -> (o.x,o.y) cross the line b?
    let rx = o.x - px, ry = o.y - py;
    let sx = b.x2 - b.x1, sy = b.y2 - b.y1;
    let den = rx * sy - ry * sx;
    if (abs(den) < 1e-6) continue;
    let t = ((b.x1 - px) * sy - (b.y1 - py) * sx) / den;
    let u = ((b.x1 - px) * ry - (b.y1 - py) * rx) / den;
    if (t < 0 || t > 1 || u < 0 || u > 1) continue;
    // the normal of the line, facing the side the water came from
    let len = sqrt(sx * sx + sy * sy);
    let nx = -sy / len, ny = sx / len;
    if ((px - b.x1) * nx + (py - b.y1) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    let vn = o.vx * nx + o.vy * ny;
    if (vn >= 0) continue; // moving away already
    // bounce: lose some speed (0.45 = soft, like wood or a leaf)
    let tx = o.vx - vn * nx, ty = o.vy - vn * ny;
    o.vx = tx * 0.9 - vn * nx * 0.45;
    o.vy = ty * 0.9 - vn * ny * 0.45;
    o.x = px + rx * t + nx * 2;
    o.y = py + ry * t + ny * 2;
    return true;
  }
  return false;
}

function drawBouncers(g) {
  for (let b of g.cfg.bouncers || []) {
    push();
    strokeJoin(ROUND);
    if (b.kind === "trunk") {
      // a tall tree trunk (savanna). The water hits its LEFT side.
      let w = 46;
      stroke(INK);
      strokeWeight(3.5);
      fill("#b07a4f");
      quad(b.x1, b.y1, b.x1 + w, b.y1, b.x2 + w, b.y2 + 14, b.x2, b.y2 + 14);
      noStroke();
      fill("#8f5f3b");
      for (let i = 0; i < 6; i++) {
        let y = lerp(b.y1 + 40, b.y2 - 20, i / 5);
        let x = lerp(b.x1, b.x2, (y - b.y1) / (b.y2 - b.y1));
        rect(x + 10 + (i % 2) * 12, y, 14, 4, 2);
      }
      // the top of the tree (flat, like an acacia)
      stroke(INK);
      strokeWeight(3.5);
      fill("#8fbf55");
      ellipse(b.x1 + w / 2, b.y1 - 6, 190, 54);
      noStroke();
      fill("#a8d46b");
      ellipse(b.x1 + w / 2 - 30, b.y1 - 14, 80, 20);
    } else if (b.kind === "leaf") {
      // a big standing leaf (rainforest)
      let mx = (b.x1 + b.x2) / 2, my = (b.y1 + b.y2) / 2;
      let a = atan2(b.y2 - b.y1, b.x2 - b.x1);
      let len = dist(b.x1, b.y1, b.x2, b.y2);
      translate(mx, my);
      rotate(a);
      stroke(INK);
      strokeWeight(3.5);
      fill("#4fb35f");
      beginShape();
      vertex(-len / 2 - 10, 0);
      bezierVertex(-len / 4, 40, len / 4, 40, len / 2 + 10, 0);
      bezierVertex(len / 4, 6, -len / 4, 6, -len / 2 - 10, 0);
      endShape(CLOSE);
      stroke("#2f7f43");
      strokeWeight(2.5);
      line(-len / 2, 2, len / 2, 2);
      for (let i = -2; i <= 2; i++) line(i * len * 0.15, 3, i * len * 0.15 + 18, 20);
      // the stem
      stroke(INK);
      strokeWeight(6);
      line(len / 2 + 10, 0, len / 2 + 60, 8);
    }
    pop();
  }
}

// ---------------------------------------------------------------
// Pranks: the animal pushes some water out of the tub
// ---------------------------------------------------------------
function updatePrank(g, dt) {
  let p = g.cfg.prank;
  if (!p || g.state !== "aim") return;
  if (g.settle > 0) return; // no prank during the 3-2-1 countdown (that felt unfair)
  g.prankT += dt / 60;
  let hasWater = g.tub.target > 0.1;
  if (!g.prankWarned && g.prankT > p.every - 1 && hasWater) {
    g.prankWarned = true; // 1 second warning: a hop and a word
    g.animal.jump(8);
    g.say(random(p.talk), true);
  }
  if (g.prankT < p.every) return;
  g.prankT = 0;
  g.prankWarned = false;
  if (!hasWater) return;
  let tub = g.tub;
  tub.drops = max(0, tub.drops - floor(tub.capacity * p.amount));
  g.animal.setMood("happy", 1);
  g.shake = 5;
  sfx.pop();
  for (let i = 0; i < 18; i++) {
    let e;
    if (p.kind === "trunk") {
      // a fountain from the trunk, going up
      e = new Bubble(g.animal.hx - g.animal.r * 0.2, g.animal.hy + g.animal.r * 0.3, "splash");
      e.vx = random(-4, 1);
      e.vy = random(-11, -6);
    } else {
      // kicked out over the side of the tub
      let side = random() < 0.5 ? -1 : 1;
      e = new Bubble(tub.x + side * tub.w * 0.45, tub.top, "splash");
      e.vx = side * random(2, 5);
      e.vy = random(-8, -4);
    }
    e.r = random(4, 7);
    g.effects.push(e);
  }
}

// ---------------------------------------------------------------
// Steps: water -> foam (or mask) -> rinse
// g.step: 0 = water, 1 = foam, 2 = rinse, 3 = done
// ---------------------------------------------------------------
function stepNames(g) {
  return ["WATER", g.cfg.foam === "mask" ? "MASK" : "FOAM", "RINSE"];
}

function updateSteps(g) {
  if (!g.cfg.foam || g.state !== "aim" || g.holding || g.drops.length) return;
  let mask = g.cfg.foam === "mask";
  if (g.step === 0 && g.tub.target >= g.cfg.band[0]) {
    g.step = 1;
    g.say(mask ? "Now my face MASK, please!" : "Now the FOAM, please!", true);
    stepPop(g, mask ? "STEP 2: MASK!" : "STEP 2: FOAM!");
  } else if (g.step === 1 && g.foamAmt >= 1) {
    g.step = 2;
    g.say(mask ? "Ahh~ Now rinse it off!" : "So bubbly! Now rinse!", true);
    stepPop(g, "STEP 3: RINSE!");
  }
}

function stepPop(g, str) {
  sfx.pop();
  let p = new Bubble(W / 2, 220, "pop");
  p.str = str;
  p.col = C.mint;
  g.effects.push(p);
}

// a drop touches the head during the foam / rinse steps. Returns true if it was used.
function stepHitsHead(g, d) {
  if (!g.cfg.foam || !g.animal.hitsHead(d.x, d.y)) return false;
  if (d.foam && g.step === 1) {
    d.alive = false;
    g.foamAmt = min(1, g.foamAmt + 1 / FOAM_HITS);
    if (random() < 0.3) g.effects.push(new Bubble(d.x, d.y, "soap"));
    if (random() < 0.05) g.say(g.cfg.foam === "mask" ? "So fresh~" : "Bubbles!");
    return true;
  }
  if (!d.foam && g.step === 2 && g.foamAmt > 0) {
    d.alive = false;
    g.foamAmt = max(0, g.foamAmt - 1 / FOAM_HITS);
    if (random() < 0.3) g.splashAt(d.x, d.y);
    if (g.foamAmt <= 0) {
      g.step = 3;
      g.cheer();
      stepPop(g, "ALL CLEAN!");
    }
    return true;
  }
  return false;
}

// The normal water can only reach the front of the tub (we checked: the head is too far).
// So in the FOAM and RINSE steps the shower head uses a stronger setting that can reach the head.
function chooseHeadPressure(g) {
  let best = g.pressure;
  let bestHits = 0;
  for (let p = 0.3; p <= 1.0; p += 0.01) {
    let hits = 0;
    for (let deg = 15; deg <= 70; deg += 0.5) if (simulateArc(g, deg, p).result === "head") hits++;
    if (hits > bestHits) {
      bestHits = hits;
      best = p;
    }
  }
  return best;
}

// foam drops that miss the head just pop
function foamMisses(g, d) {
  if (!d.foam) return false;
  let tub = g.tub;
  let hit = d.y > FLOOR || hitsObstacle(g, d.x, d.y) || tub.hitsWall(d.x, d.y) || (d.vy > 0 && d.py <= tub.top && d.y > tub.top && tub.isOverOpening(d.x));
  if (hit) {
    d.alive = false;
    if (random() < 0.3) g.effects.push(new Bubble(d.x, min(d.y, FLOOR), "soap"));
  }
  return true; // foam never fills the tub
}

function drawFoam(g) {
  if (!g.cfg.foam || g.foamAmt <= 0) return;
  let a = g.animal;
  let mask = g.cfg.foam === "mask";
  let n = ceil(g.foamAmt * 16);
  push();
  stroke(INK);
  strokeWeight(2);
  randomSeed(7); // the foam stays in the same place every frame
  for (let i = 0; i < n; i++) {
    let ang = random(PI * 1.05, TWO_PI * 1.0) + (i % 3 === 0 ? random(-0.6, 0.6) : 0);
    let rr = a.r * random(0.55, 0.95);
    let x = a.hx + cos(ang) * rr;
    let y = a.hy + sin(ang) * rr * 0.9;
    fill(mask ? "#a9dc8a" : "#ffffff");
    circle(x, y, random(16, 30) * (0.7 + g.foamAmt * 0.4));
  }
  randomSeed(millis());
  // a full mask = cucumber slices on the eyes
  if (mask && g.foamAmt > 0.8) {
    fill("#d8f0b8");
    stroke("#5c9a3c");
    strokeWeight(3);
    for (let s of [-1, 1]) circle(a.hx + s * a.r * 0.32, a.hy - a.r * 0.05, a.r * 0.36);
  }
  pop();
}

// 1 WATER  2 FOAM  3 RINSE (at the top of the screen)
function drawSteps(g) {
  if (!g.cfg.foam) return;
  let names = stepNames(g);
  push();
  textFont(HEAD);
  textSize(18);
  textAlign(CENTER, CENTER);
  for (let i = 0; i < 3; i++) {
    let x = W / 2 - 150 + i * 150;
    let y = 112;
    let now = g.step === i;
    let done = g.step > i;
    stroke(INK);
    strokeWeight(3);
    fill(now ? C.yellow : done ? C.mint : C.cream);
    rect(x - 62, y - 18, 124, 36, 18);
    noStroke();
    fill(INK);
    text((done ? "OK " : i + 1 + " ") + names[i], x, y + 1);
    if (i < 2) {
      fill(INK);
      triangle(x + 68, y - 6, x + 68, y + 6, x + 80, y);
    }
  }
  // how to get to the next step (so nobody has to guess)
  let how = [
    "fill the tub to the LOWER pink line, then let go",
    "spray the " + names[1].toLowerCase() + " on the head until the bar is full, then let go",
    "spray water on the head until the " + names[1].toLowerCase() + " is gone",
    "",
  ][g.step];
  if (how && g.state === "aim") {
    textFont(BODY);
    textSize(15);
    let tw = textWidth("next: " + how) + 28;
    noStroke();
    fill(251, 241, 220, 230);
    rect(W / 2 - tw / 2, 134, tw, 24, 12);
    fill(INK);
    text("next: " + how, W / 2, 146);
  }
  // a small bar: how much foam / mask is on the head
  if ((g.step === 1 || g.step === 2) && g.state === "aim") {
    let bx = W / 2 - 80, by = 164;
    stroke(INK);
    strokeWeight(2.5);
    fill(C.cream);
    rect(bx, by, 160, 14, 7);
    noStroke();
    fill(g.cfg.foam === "mask" ? "#a9dc8a" : "#ffffff");
    rect(bx + 3, by + 3, 154 * g.foamAmt, 8, 4);
  }
  pop();
}

// out of water: a little tear (pouty) or a sweat drop (wry)
function drawReaction(g) {
  let r = g.outReaction;
  if (!r || r === "angry") return;
  let a = g.animal;
  push();
  stroke(INK);
  strokeWeight(2);
  fill("#9fd6ff");
  if (r === "pouty") {
    // a tear that slides down, again and again
    let t = (frameCount % 70) / 70;
    let x = a.hx - a.r * 0.32;
    let y = a.hy + a.r * 0.05 + t * a.r * 0.5;
    drawingContext.globalAlpha = 1 - t * 0.6;
    beginShape();
    vertex(x, y - 9);
    bezierVertex(x + 6, y - 2, x + 6, y + 6, x, y + 6);
    bezierVertex(x - 6, y + 6, x - 6, y - 2, x, y - 9);
    endShape(CLOSE);
  } else {
    // a big sweat drop next to the head (like in cartoons)
    let x = a.hx + a.r * 0.85;
    let y = a.hy - a.r * 0.55 + sin(frameCount * 0.1) * 2;
    beginShape();
    vertex(x, y - 16);
    bezierVertex(x + 10, y - 2, x + 10, y + 10, x, y + 10);
    bezierVertex(x - 10, y + 10, x - 10, y - 2, x, y - 16);
    endShape(CLOSE);
  }
  pop();
}
