// rush.js — BATH RUSH: the endless mode
//
// Bathtubs ride on a moving belt, one after another.
// HOLD to spray, LET GO to stop. Fill each tub between the pink lines
// before it leaves the screen. Clean animals in a row = COMBO (more points).
// A dirty animal that leaves, too much water, or a splash on a shy face = lose a heart.
// 3 hearts. The belt gets faster and faster. Can you beat your best score?

const RUSH_PRESSURE = 0.75;

class Rush {
  constructor(game) {
    this.g = game;
    this.items = []; // { cfg, tub, animal, done, missed, lastFill }
    this.drops = [];
    this.ducks = [];
    this.score = 0;
    this.hearts = 3;
    this.hurt = 0;
    this.combo = 0;
    this.cleaned = 0;
    this.speed = 0.95;
    this.spawnIn = 0.5;
    this.duckIn = 3;
    this.flowAcc = 0;
    this.time = 0;
    this.best = loadBest();
    this.newBest = false;
    this.over = false;
    this.allAnimals = [];
    WORLDS.forEach((w) => w.animals.forEach((a) => this.allAnimals.push(Object.assign({ world: "home" }, a))));
    game.hose.reset(1.1, 5, 82); // a wider swing: the water can reach near and far
    game.wind = 0;
  }

  // a new tub comes in from the right
  spawn() {
    let base = random(this.allAnimals);
    let cfg = Object.assign({}, base);
    let w = min(base.tub.w, 220);
    let h = min(base.tub.h, 125);
    cfg.tub = { x: W + w, w, h };
    cfg.capacity = 90 + w * 0.35;
    cfg.noMat = true; // no bath mat on the belt
    let [lo, hi] = base.band;
    if (hi - lo < 0.28) hi = min(0.97, lo + 0.28); // a little easier than the island trip
    cfg.band = [lo, hi];
    let tub = new Tub(cfg);
    let animal = new Animal(cfg, tub);
    animal.dirt = 1;
    this.items.push({ cfg, tub, animal, done: false, missed: false, lastFill: -9 });
  }

  update(dt) {
    let g = this.g;
    this.time += dt / 60;
    this.hurt = max(0, this.hurt - dt / 60);
    let playing = g.state === "rush";
    let spraying = playing && g.holding;

    g.hose.update(dt, spraying, RUSH_PRESSURE);
    g.hose.updateMood(dt);

    // the belt gets faster as you clean more animals
    this.speed = min(2.4, 0.95 + this.cleaned * 0.07);

    if (playing) {
      this.spawnIn -= dt / 60;
      if (this.spawnIn <= 0) {
        this.spawn();
        this.spawnIn = 520 / (this.speed * 60); // keep about 520 px between tubs
      }
      this.duckIn -= dt / 60;
      if (this.duckIn <= 0) {
        this.ducks.push(new Duck(random(480, 1100), random(140, 360)));
        this.duckIn = random(4, 7);
      }
    }

    // move the tubs on the belt
    for (let it of this.items) {
      if (playing) it.tub.x -= this.speed * dt;
      it.tub.update(dt);
      it.animal.update(dt);
      it.animal.dirt = it.done ? 0 : 1 - constrain(it.tub.level / it.cfg.band[0], 0, 1);
      let last = this.drops[this.drops.length - 1];
      if (last) it.animal.lookAt(last.x, last.y);
      else it.animal.lookAt(g.hose.x, g.hose.y);
      it.animal.excited = spraying && !it.done;

      // clean? (between the lines, and no new water for a moment)
      let lv = it.tub.target;
      if (playing && !it.done && lv >= it.cfg.band[0] && lv <= it.cfg.band[1] && this.time - it.lastFill > 0.45) this.clean(it);

      // left the screen dirty?
      if (playing && !it.done && !it.missed && it.tub.x < 270) {
        it.missed = true;
        it.animal.setMood("sad", 99);
        this.combo = 0;
        this.say(it, "Still dirty...");
        this.loseHeart();
      }
    }
    this.items = this.items.filter((it) => it.tub.x > -250);

    // ducks drift slowly with the belt
    for (let d of this.ducks) {
      d.update(dt);
      if (playing) d.x -= this.speed * 0.5 * dt;
    }
    this.ducks = this.ducks.filter((d) => d.x > 330 && !(d.got && d.t > 0.7));

    // the water
    if (spraying) {
      this.flowAcc += 1.6 * dt;
      while (this.flowAcc >= 1) {
        this.flowAcc--;
        let tip = g.hose.tip();
        let a = tip.a + radians(random(-1.2, 1.2));
        let v = g.hose.speedFromPower(RUSH_PRESSURE) * random(0.98, 1.02);
        this.drops.push(new Drop(tip.x, tip.y, cos(a) * v, sin(a) * v));
      }
    }
    for (let d of this.drops) {
      d.update(dt);
      this.checkDrop(d);
    }
    this.drops = this.drops.filter((d) => d.alive);

    for (let it of this.items) {
      if (it.animal.mood === "happy" && random() < 0.06) g.effects.push(new Bubble(it.animal.hx + random(-50, 50), it.animal.hy - 20, "heart"));
    }
  }

  checkDrop(d) {
    let g = this.g;
    for (let duck of this.ducks) {
      if (duck.touches(d.x, d.y)) {
        duck.got = true;
        this.score += 50;
        sfx.duck();
        g.shake = 4;
        let p = new Bubble(duck.x, duck.y - 30, "pop");
        p.str = "+50";
        g.effects.push(p);
      }
    }
    for (let it of this.items) {
      let { tub, animal: a, cfg } = it;
      // a clean animal is wrapped in a towel: the water just bounces off
      // in BATH RUSH the shy faces don't cost hearts (it is fast!), they only break your combo
      if (a.hitsBird(d.x, d.y)) {
        d.alive = false;
        a.birdHits++;
        if (a.birdHits < 12) return; // the bird shakes off a few drops
        a.birdGone = true;
        this.combo = 0;
        this.say(it, "Tweet!! Bye!");
        sfx.tweet();
        return;
      }
      if (a.hitsHead(d.x, d.y)) {
        d.alive = false;
        if (cfg.face === "scared" && !it.done) {
          if (a.mood !== "scared") {
            a.setMood("scared", 1.2);
            this.combo = 0;
            this.say(it, "MEOW!!");
            sfx.meow();
          }
        } else if (!it.done) {
          this.fill(it);
          if (a.mood === "idle" && random() < 0.05) this.say(it, random(ANIMAL_TALK[a.type].cheer));
        }
        return;
      }
      if (d.vy > 0 && d.py <= tub.top && d.y > tub.top && tub.isOverOpening(d.x)) {
        d.alive = false;
        if (!it.done) this.fill(it);
        else if (random() < 0.3) g.splashAt(d.x, tub.top);
        return;
      }
      if (tub.hitsWall(d.x, d.y) && !tub.isOverOpening(d.x)) {
        d.alive = false;
        return;
      }
    }
    if (d.y > FLOOR) {
      d.alive = false;
      if (random() < 0.25) g.splashAt(d.x, FLOOR);
    }
  }

  fill(it) {
    it.tub.drops++;
    it.lastFill = this.time;
    sfx.plopLevel(it.tub.target);
    if (it.tub.target > it.cfg.band[1]) {
      this.say(it, "Too much!");
      it.tub.drops = floor(it.tub.capacity * max(0, it.cfg.band[0] - 0.12));
      for (let i = 0; i < 12; i++) this.g.effects.push(new Bubble(it.tub.x + random(-it.tub.w / 2, it.tub.w / 2), it.tub.top, "splash"));
      this.combo = 0;
      this.loseHeart();
    }
  }

  clean(it) {
    let g = this.g;
    it.done = true;
    this.cleaned++;
    this.combo++;
    let pts = 100 * min(this.combo, 5);
    this.score += pts;
    it.animal.setMood("happy", 99);
    it.animal.jump(9);
    g.hose.happy = 1.2;
    g.shake = 7;
    sfx.voice(ANIMAL_TALK[it.animal.type].voice);
    sfx.tone(784, 0.12, "triangle", 0.12);
    sfx.tone(1047, 0.2, "triangle", 0.12, null, 0.1);
    this.say(it, random(WIN_TALK));
    let p = new Bubble(it.tub.x, it.tub.top - 120, "pop");
    p.str = "+" + pts + (this.combo > 1 ? "  COMBO x" + min(this.combo, 5) : "");
    p.col = this.combo > 1 ? "#7fdcb5" : "#ffd84d";
    g.effects.push(p);
    for (let i = 0; i < 40; i++) g.effects.push(new Bubble(it.tub.x + random(-80, 80), it.tub.top - 60, "confetti"));
  }

  loseHeart() {
    if (this.hurt > 0 || this.over) return false;
    this.hearts--;
    this.hurt = 1.2;
    this.g.shake = 12;
    sfx.oops();
    if (this.hearts <= 0) this.gameOver();
    return true;
  }

  gameOver() {
    this.over = true;
    this.g.holding = false;
    sfx.streamStop();
    if (this.score > this.best) {
      this.best = this.score;
      this.newBest = true;
      saveBest(this.score);
      for (let i = 0; i < 80; i++) this.g.effects.push(new Bubble(random(W), -20, "confetti"));
      sfx.win();
    } else sfx.fail();
    this.g.setState("rushOver");
  }

  say(it, str) {
    let g = this.g;
    g.effects = g.effects.filter((e) => !(e.kind === "text" && e.owner === it));
    let b = new Bubble(it.animal.hx + it.animal.r * 1.3, it.animal.hy - it.animal.r * 1.4, "text");
    b.str = str;
    b.owner = it;
    g.effects.push(b);
  }

  // ---------- DRAW ----------
  draw() {
    let g = this.g;
    drawWorldBackground("home");
    drawBelt(this.speed, g.state === "rush");

    // a simple guide (where the water goes right now)
    if (!g.holding && g.state === "rush") {
      push();
      noStroke();
      let tip = g.hose.tip();
      let v = g.hose.speedFromPower(RUSH_PRESSURE);
      let x = tip.x, y = tip.y, vx = cos(tip.a) * v, vy = sin(tip.a) * v;
      for (let i = 0; i < 160 && y < FLOOR; i++) {
        vy += GRAVITY;
        x += vx;
        y += vy;
        if (i % 6 === 4) {
          fill(255, 255, 255, 170 - i);
          circle(x, y, 7 - i * 0.02);
        }
      }
      pop();
    }

    for (let it of this.items) {
      it.tub.drawBack();
      it.animal.drawBody();
      it.tub.drawWater();
      it.tub.drawFront();
      it.animal.drawPaws();
      it.animal.drawHeadOutlined();
      if (it.done) {
        // a sparkly "CLEAN" badge on the tub
        push();
        translate(it.tub.x, it.tub.top + it.tub.h * 0.55);
        rotate(-0.1);
        fill(C.mint);
        stroke(INK);
        strokeWeight(3);
        rect(-48, -16, 96, 32, 16);
        noStroke();
        fill(INK);
        textFont(HEAD);
        textSize(18);
        textAlign(CENTER, CENTER);
        text("CLEAN!", 0, 1);
        pop();
      }
    }
    for (let d of this.ducks) d.draw();
    g.hose.draw(g.holding && g.state === "rush", null);
    for (let d of this.drops) d.draw();
    for (let e of g.effects) e.draw();

    // HUD: hearts, score, best
    push();
    fill(C.cream);
    stroke(INK);
    strokeWeight(3);
    rect(94, 22, 170, 58, 26);
    for (let i = 0; i < 3; i++) {
      fill(i < this.hearts ? C.pink : "#e8dcc4");
      stroke(INK);
      strokeWeight(2.5);
      let pulse = i === this.hearts - 1 && this.hurt > 0 ? 1.3 : 1;
      drawHeart(130 + i * 46, 52, 30 * pulse);
    }
    pop();
    label(W / 2, 52, "SCORE  " + this.score, C.yellow, 30);
    if (this.combo > 1) label(W / 2, 110, "COMBO x" + min(this.combo, 5), C.mint, 20);
    label(W - 130, 52, "BEST  " + this.best, C.cream, 20);
    if (this.time < 1.6 && g.state === "rush") label(W / 2, 260, this.time < 0.9 ? "READY..." : "GO!", C.cream, 48);
    if (g.state === "rush") hintChip("HOLD to spray   ·   fill every tub before it leaves!");
    drawBackButton();

    if (g.state === "rushOver") drawRushOver(this, g);
  }
}

// the moving belt on the floor
function drawBelt(speed, moving) {
  push();
  let y = FLOOR - 6;
  fill("#6d6a7c");
  stroke(INK);
  strokeWeight(3);
  rect(-10, y, W + 20, 30, 8);
  noStroke();
  fill("#8a87a0");
  let off = moving ? (frameCount * speed) % 40 : 0;
  for (let x = -40 + (40 - off); x < W + 40; x += 40) rect(x, y + 6, 20, 6, 3);
  fill("#c9c6d8");
  for (let x = 30; x < W; x += 140) {
    stroke(INK);
    strokeWeight(2.5);
    circle(x, y + 22, 18);
    noStroke();
  }
  pop();
}

function drawRushOver(r, g) {
  push();
  fill(40, 25, 20, 140);
  noStroke();
  rect(0, 0, W, H);
  let k = easeOutBack(min(1, g.stateTime * 2.5));
  translate(W / 2, 300);
  scale(0.8 + 0.2 * k);
  fill(0, 0, 0, 50);
  rect(-300 + 8, -190 + 10, 600, 360, 26);
  fill(C.cream);
  stroke(INK);
  strokeWeight(4);
  rect(-300, -190, 600, 360, 26);
  noStroke();
  fill(INK);
  textFont(HEAD);
  textAlign(CENTER, CENTER);
  textSize(48);
  text(r.newBest ? "NEW BEST SCORE!" : "BATH TIME'S OVER!", 0, -130);
  textSize(90);
  fill(r.newBest ? C.orange : INK);
  text(r.score, 0, -40);
  textFont(BODY);
  textSize(20);
  fill("#8a6a55");
  text(r.cleaned + " animals cleaned   ·   best: " + r.best, 0, 30);
  pop();
  if (g.stateTime > 1.2 && frameCount % 60 < 45) chunkyButton(W / 2, 430, 280, 58, "PLAY AGAIN", C.yellow, true);
}

function loadBest() {
  try {
    return parseInt(localStorage.getItem("bath-time-rush-best")) || 0;
  } catch (e) {
    return 0;
  }
}

function saveBest(score) {
  try {
    localStorage.setItem("bath-time-rush-best", score);
  } catch (e) {}
}
