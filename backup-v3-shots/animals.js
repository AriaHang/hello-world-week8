// animals.js — how every animal looks
//
// Each animal is drawn with simple shapes (circles, ellipses, triangles).
// drawHead(x, y, scale) draws the head. The mood changes the eyes and mouth:
//   "idle" | "happy" | "wet" | "scared" | "sad"
// "dirt" (0..1) draws mud spots that disappear when the bath is ready.

const ANIMAL_LOOK = {
  //           head size   head color   body color
  duck:     { r: 38, col: "#ffd84d", body: "#ffd84d" },
  puppy:    { r: 44, col: "#f3d2a6", body: "#f3d2a6" },
  kitten:   { r: 36, col: "#d6cfe8", body: "#d6cfe8" },
  hippo:    { r: 56, col: "#b9a3d3", body: "#b9a3d3" },
  rhino:    { r: 48, col: "#b5b5c4", body: "#b5b5c4" },
  elephant: { r: 60, col: "#bcc3d6", body: "#bcc3d6" },
  capybara: { r: 46, col: "#c08b5c", body: "#c08b5c" },
  dartfrog: { r: 38, col: "#3d8ef0", body: "#3d8ef0" },
  tapir:    { r: 46, col: "#4b4658", body: "#efeaf3" },
};

class Animal {
  constructor(cfg, tub) {
    this.type = cfg.animal;
    this.tub = tub;
    this.headShift = cfg.headShift || 0;
    this.mood = "idle";
    this.moodTimer = 0;
    this.wobble = 0;
    this.dirt = 1; // 1 = very dirty, 0 = clean
    this.birdGone = false; // only for the capybara's little bird
    this.birdHits = 0;
    this.peek = !!cfg.peek; // the kitten hides under the water and peeks out
    this.peekOff = 0;
    this.jumpY = 0; // little jumps when happy
    this.jumpV = 0;
    this.eyeX = 0; // where the eyes look
    this.eyeY = 0;
    this.excited = false; // true while you charge the water gun
    this.look = ANIMAL_LOOK[this.type];
    this.r = this.look.r;
  }

  get hx() {
    return this.tub.x + this.tub.w * this.headShift;
  }

  get hy() {
    return this.tub.top - this.r * 0.35 + sin(frameCount * 0.05) * 2 + this.peekOff + this.jumpY;
  }

  setMood(m, seconds = 1.2) {
    this.mood = m;
    this.moodTimer = seconds;
  }

  // a happy hop
  jump(power = 7) {
    if (this.jumpY > -1) this.jumpV = -power;
  }

  // the eyes follow something (the water, a duck, the water gun)
  lookAt(x, y) {
    let dx = constrain((x - this.hx) / 250, -1, 1);
    let dy = constrain((y - this.hy) / 250, -1, 1);
    this.eyeX = lerp(this.eyeX, dx * this.r * 0.08, 0.2);
    this.eyeY = lerp(this.eyeY, dy * this.r * 0.06, 0.2);
  }

  update(dt) {
    // jump physics
    this.jumpV += 0.7 * dt;
    this.jumpY = min(0, this.jumpY + this.jumpV * dt);
    if (this.jumpY === 0) this.jumpV = 0;
    // happy dance after a perfect bath
    if (this.mood === "happy" && this.moodTimer > 50 && this.jumpY === 0 && random() < 0.08) this.jump(random(5, 9));
    // excited wiggle while you charge the water gun
    if (this.excited && this.mood === "idle") this.wobble = sin(frameCount * 0.35) * 0.06;
    if (this.moodTimer > 0) {
      this.moodTimer -= dt / 60;
      let stays = this.mood === "sad" || this.mood === "scared";
      if (this.moodTimer <= 0 && !stays) this.mood = "idle";
    }
    if (this.mood === "wet") this.wobble = sin(frameCount * 0.9) * 0.15;
    else if (this.mood === "happy") this.wobble = sin(frameCount * 0.18) * 0.12; // a happy sway
    else if (!this.excited) this.wobble = lerp(this.wobble, 0, 0.2);
    if (this.peek && this.mood !== "scared") {
      // 2.4 seconds hidden, then 1.8 seconds peeking out
      let t = (millis() / 1000) % 4.2;
      let target = t < 2.4 ? this.r * 1.15 : 0;
      this.peekOff = lerp(this.peekOff, target, 0.12);
    }
  }

  get hiding() {
    return this.peek && this.peekOff > this.r * 0.5;
  }

  hitsHead(x, y) {
    if (this.hiding) return false; // she is under the water
    return dist(x, y, this.hx, this.hy) < this.r * 0.95;
  }

  // the capybara's bird sits on top of the head
  hitsBird(x, y) {
    if (this.type !== "capybara" || this.birdGone) return false;
    return dist(x, y, this.hx, this.hy - this.r * 1.05) < 14;
  }

  // body under the water
  drawBody() {
    push();
    stroke(INK);
    strokeWeight(3);
    fill(this.look.body);
    ellipse(this.hx, this.tub.top + this.r * 1.2, this.r * 2.3, this.r * 2.2);
    if (this.type === "tapir") {
      // tapirs are dark in front and white in the middle
      fill(this.look.col);
      ellipse(this.hx - this.r * 0.55, this.tub.top + this.r * 1.2, this.r * 1.1, this.r * 2.1);
    }
    pop();
  }

  // draw the head with a dark outline (like a sticker)
  drawHeadOutlined(px = this.hx, py = this.hy, sc = 1, outlines = [[INK, 3.5]]) {
    let box = this.r * 3.6;
    drawWithOutline(() => this.drawHead(0, 0, 1), px, py, box, sc, outlines);
  }

  drawHead(px = this.hx, py = this.hy, sc = 1) {
    push();
    translate(px, py);
    scale(sc);
    rotate(this.wobble);
    let r = this.r;
    let col = this.look.col;
    let t = this.type;
    noStroke();

    // ---------- behind the head ----------
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
    if (t === "hippo" || t === "capybara") {
      fill(t === "hippo" ? "#a690c4" : "#9c6c44");
      circle(-r * 0.62, -r * 0.82, r * 0.42);
      circle(r * 0.62, -r * 0.82, r * 0.42);
      fill("#f2b8c8");
      if (t === "hippo") {
        circle(-r * 0.62, -r * 0.82, r * 0.2);
        circle(r * 0.62, -r * 0.82, r * 0.2);
      }
    }
    if (t === "rhino") {
      fill(col);
      push();
      translate(-r * 0.72, -r * 0.78);
      rotate(-0.5);
      ellipse(0, 0, r * 0.35, r * 0.6);
      pop();
      push();
      translate(r * 0.72, -r * 0.78);
      rotate(0.5);
      ellipse(0, 0, r * 0.35, r * 0.6);
      pop();
    }
    if (t === "tapir") {
      for (let s of [-1, 1]) {
        fill(col);
        ellipse(s * r * 0.7, -r * 0.8, r * 0.45, r * 0.55);
        fill("#ffffff");
        ellipse(s * r * 0.72, -r * 0.98, r * 0.3, r * 0.18);
      }
    }
    if (t === "dartfrog") {
      fill(col);
      circle(-r * 0.48, -r * 0.72, r * 0.85);
      circle(r * 0.48, -r * 0.72, r * 0.85);
    }

    // ---------- the head ----------
    fill(col);
    if (t === "dartfrog") ellipse(0, 0, r * 2.3, r * 1.75);
    else if (t === "capybara") rect(-r * 0.95, -r * 0.88, r * 1.9, r * 1.8, r * 0.75);
    else if (t === "hippo") ellipse(0, 0, r * 2.1, r * 1.9);
    else circle(0, 0, r * 2);

    // ---------- details ----------
    if (t === "duck") {
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
      fill(INK);
      ellipse(0, r * 0.2, r * 0.32, r * 0.22);
      if (this.mood === "happy") {
        fill("#ff7a9a");
        ellipse(0, r * 0.62, r * 0.26, r * 0.32);
      }
      fill("#c99a6a");
      ellipse(r * 0.42, -r * 0.45, r * 0.45, r * 0.38);
    }
    if (t === "kitten") {
      fill("#ff9fbf");
      triangle(-r * 0.09, r * 0.18, r * 0.09, r * 0.18, 0, r * 0.3);
      stroke(INK);
      strokeWeight(1.5);
      for (let s of [-1, 1]) {
        line(s * r * 0.35, r * 0.3, s * r * 0.95, r * 0.2);
        line(s * r * 0.35, r * 0.38, s * r * 0.95, r * 0.42);
      }
      noStroke();
    }
    if (t === "elephant") {
      noFill();
      stroke(col);
      strokeWeight(r * 0.38);
      let up = this.mood === "happy";
      bezier(0, r * 0.2, 0, r * 0.9, up ? r * 0.7 : r * 0.3, up ? r * 0.5 : r * 1.1, up ? r * 0.8 : r * 0.7, up ? -r * 0.1 : r * 0.9);
      noStroke();
    }
    if (t === "hippo") {
      fill("#cdb9e3");
      ellipse(0, r * 0.42, r * 1.75, r * 1.0);
      fill("#7d6699");
      ellipse(-r * 0.32, r * 0.22, r * 0.18, r * 0.12);
      ellipse(r * 0.32, r * 0.22, r * 0.18, r * 0.12);
    }
    if (t === "rhino") {
      fill("#c9c9d6");
      ellipse(0, r * 0.45, r * 1.25, r * 0.8);
      // horns
      fill("#fff3d6");
      triangle(-r * 0.2, r * 0.18, r * 0.2, r * 0.18, r * 0.06, -r * 0.42);
      triangle(-r * 0.1, -r * 0.18, r * 0.12, -r * 0.18, r * 0.04, -r * 0.42);
      fill("#7f7f92");
      ellipse(-r * 0.22, r * 0.55, r * 0.14, r * 0.1);
      ellipse(r * 0.22, r * 0.55, r * 0.14, r * 0.1);
    }
    if (t === "capybara") {
      fill("#d6a77a");
      rect(-r * 0.6, r * 0.05, r * 1.2, r * 0.75, r * 0.35);
      fill("#4a2f23");
      rect(-r * 0.24, r * 0.12, r * 0.48, r * 0.3, r * 0.14);
    }
    if (t === "tapir") {
      // a short trunk
      fill("#5b5669");
      rect(-r * 0.24, r * 0.05, r * 0.48, r * 0.85, r * 0.24);
      fill("#3a3646");
      ellipse(-r * 0.09, r * 0.82, r * 0.1, r * 0.08);
      ellipse(r * 0.09, r * 0.82, r * 0.1, r * 0.08);
    }
    if (t === "dartfrog") {
      // black spots warn other animals: "I am poisonous!"
      fill("#1e2a4a");
      ellipse(-r * 0.55, r * 0.1, r * 0.3, r * 0.22);
      ellipse(r * 0.65, -r * 0.1, r * 0.22, r * 0.18);
      ellipse(r * 0.2, r * 0.55, r * 0.26, r * 0.18);
      ellipse(-r * 0.15, -r * 0.35, r * 0.16, r * 0.12);
    }

    // ---------- eyes ----------
    let ex = r * 0.38;
    let ey = -r * 0.05;
    if (t === "dartfrog") { ex = r * 0.48; ey = -r * 0.72; }
    if (t === "elephant" || t === "hippo") ey = -r * 0.3;
    if (t === "rhino") { ex = r * 0.45; ey = -r * 0.2; }
    if (t === "capybara" || t === "tapir") ey = -r * 0.3;
    if (t === "tapir") {
      // light circles so the eyes show on the dark face
      fill("#6f6a80");
      circle(-ex, ey, r * 0.42);
      circle(ex, ey, r * 0.42);
    }
    let eyeCol = t === "tapir" ? "#ffffff" : INK;
    let mood = this.mood;
    if (t === "capybara" && mood === "idle") mood = "calm"; // capybaras are very chill
    drawEyes(mood, ex, ey, r, eyeCol, t === "dartfrog" || this.excited, this.eyeX, this.eyeY);

    // ---------- mouth ----------
    stroke(eyeCol);
    strokeWeight(2.5);
    noFill();
    if (t === "dartfrog") {
      if (this.mood === "sad" || this.mood === "scared") arc(0, r * 0.35, r * 0.8, r * 0.3, PI, TWO_PI);
      else arc(0, r * 0.1, r * 1.3, r * 0.5, 0.1, PI - 0.1);
    } else if (t === "kitten" || t === "puppy") {
      if (this.mood === "scared") {
        noStroke();
        fill(INK);
        ellipse(0, r * 0.5, r * 0.22, r * 0.28);
      } else {
        arc(-r * 0.09, r * 0.34, r * 0.18, r * 0.16, 0, PI);
        arc(r * 0.09, r * 0.34, r * 0.18, r * 0.16, 0, PI);
      }
    } else if (t === "hippo") {
      if (this.mood === "happy") {
        noStroke();
        fill("#7d4d6e");
        arc(0, r * 0.6, r * 0.8, r * 0.4, 0, PI);
        fill("#ffffff");
        rect(-r * 0.25, r * 0.6, r * 0.12, r * 0.1);
        rect(r * 0.13, r * 0.6, r * 0.12, r * 0.1);
      } else arc(0, r * 0.6, r * 0.6, r * 0.2, 0.2, PI - 0.2);
    } else if (t === "capybara") {
      arc(0, r * 0.55, r * 0.3, r * 0.14, 0.2, PI - 0.2);
    }
    noStroke();

    // ---------- cheeks ----------
    fill(255, 120, 160, mood === "happy" ? 170 : 110);
    let cy = t === "dartfrog" ? r * 0.05 : r * 0.22;
    let cx = t === "hippo" ? r * 0.78 : r * 0.62;
    ellipse(-cx, cy, r * 0.36, r * 0.2);
    ellipse(cx, cy, r * 0.36, r * 0.2);

    // ---------- mud spots (go away when clean) ----------
    if (this.dirt > 0.02) {
      fill(140, 96, 58, 200 * this.dirt);
      ellipse(-r * 0.42, -r * 0.5, r * 0.32, r * 0.24);
      ellipse(-r * 0.3, -r * 0.64, r * 0.14, r * 0.12);
      ellipse(r * 0.55, r * 0.5, r * 0.24, r * 0.18);
      ellipse(r * 0.12, -r * 0.8, r * 0.18, r * 0.13);
    }

    // ---------- accessories ----------
    if (t === "kitten") drawBow(r * 0.55, -r * 0.82, r, C.pink, "#ff6f9a", 0.4);
    if (t === "puppy") drawBow(-r * 0.15, -r * 0.92, r * 0.9, "#7cc6ff", "#4fa8ef", 0);
    if (t === "elephant") drawFlower(-r * 1.05, -r * 0.55, r * 0.16, "#ffffff");
    if (t === "hippo") drawFlower(r * 0.62, -r * 0.95, r * 0.14, "#ffb3c7");
    if (t === "tapir") drawFlower(-r * 0.55, -r * 1.0, r * 0.13, "#ffd84d");
    if (t === "dartfrog") {
      // a tiny leaf hat
      fill("#5cc46a");
      push();
      translate(0, -r * 0.95);
      rotate(-0.3);
      ellipse(0, 0, r * 0.7, r * 0.3);
      pop();
    }
    if (t === "capybara" && !this.birdGone) drawLittleBird(0, -r * 1.05, 1);

    // sweat drop when scared or sad
    if (this.mood === "scared" || this.mood === "sad") {
      fill(150, 210, 255);
      ellipse(r * 0.85, -r * 0.55, r * 0.22, r * 0.32);
    }
    pop();
  }
}

// eyes for every mood
function drawEyes(mood, ex, ey, r, col = INK, big = false, lx = 0, ly = 0) {
  let blink = frameCount % 180 < 6;
  push();
  if (mood === "happy") {
    noFill();
    stroke(col);
    strokeWeight(3.5);
    arc(-ex, ey + 3, r * 0.3, r * 0.3, PI, TWO_PI);
    arc(ex, ey + 3, r * 0.3, r * 0.3, PI, TWO_PI);
  } else if (mood === "calm") {
    // half-closed, relaxed eyes
    stroke(col);
    strokeWeight(3.5);
    line(-ex - r * 0.12, ey, -ex + r * 0.12, ey);
    line(ex - r * 0.12, ey, ex + r * 0.12, ey);
  } else if (mood === "scared" || mood === "wet") {
    stroke(col);
    strokeWeight(3.5);
    let k = r * 0.13;
    line(-ex - k, ey - k, -ex + k, ey);
    line(-ex - k, ey + k, -ex + k, ey);
    line(ex + k, ey - k, ex - k, ey);
    line(ex + k, ey + k, ex - k, ey);
  } else if (mood === "sad") {
    noStroke();
    fill(col);
    ellipse(-ex, ey + 2, r * 0.2, r * 0.14);
    ellipse(ex, ey + 2, r * 0.2, r * 0.14);
    stroke(col);
    strokeWeight(2.5);
    line(-ex - r * 0.15, ey - r * 0.15, -ex + r * 0.1, ey - r * 0.08);
    line(ex + r * 0.15, ey - r * 0.15, ex - r * 0.1, ey - r * 0.08);
  } else {
    noStroke();
    fill(col);
    let w = big ? r * 0.36 : r * 0.22;
    let h = big ? r * 0.36 : r * 0.3;
    ellipse(-ex + lx, ey + ly, w, blink ? 2 : h);
    ellipse(ex + lx, ey + ly, w, blink ? 2 : h);
    if (!blink) {
      fill(col === INK ? 255 : INK);
      circle(-ex + lx + r * 0.04, ey + ly - r * 0.06, r * 0.08);
      circle(ex + lx + r * 0.04, ey + ly - r * 0.06, r * 0.08);
    }
  }
  pop();
}

function drawBow(x, y, r, col, mid, angle) {
  push();
  translate(x, y);
  rotate(angle);
  noStroke();
  fill(col);
  triangle(0, 0, -r * 0.32, -r * 0.18, -r * 0.32, r * 0.18);
  triangle(0, 0, r * 0.32, -r * 0.18, r * 0.32, r * 0.18);
  fill(mid);
  circle(0, 0, r * 0.16);
  pop();
}

function drawFlower(x, y, s, col) {
  push();
  translate(x, y);
  noStroke();
  fill(col);
  for (let i = 0; i < 5; i++) {
    let a = (i / 5) * TWO_PI;
    circle(cos(a) * s, sin(a) * s, s * 1.4);
  }
  fill("#ffd84d");
  circle(0, 0, s * 1.1);
  pop();
}

// the capybara's tiny friend
function drawLittleBird(x, y, s) {
  push();
  translate(x, y + sin(frameCount * 0.1) * 1.5);
  scale(s);
  noStroke();
  fill("#ffcf4d");
  ellipse(0, 0, 26, 20);
  circle(8, -6, 15);
  fill("#ff9a3c");
  triangle(14, -7, 21, -5, 14, -3);
  fill(INK);
  circle(10, -8, 3);
  fill("#f2b000");
  ellipse(-5, 1, 12, 7);
  pop();
}

// what each animal says (they are your friends, they play with you!)
const ANIMAL_TALK = {
  duck:     { cheer: ["Quack quack!", "Again!", "Hehe~"], voice: "quack" },
  puppy:    { cheer: ["Woof woof!", "Again, again!", "Yay!"], voice: "woof" },
  kitten:   { cheer: ["Meow~", "Nice shot!", "Purr~"], voice: "meow" },
  hippo:    { cheer: ["Splashy!", "Hehe~", "More!"], voice: "hum" },
  rhino:    { cheer: ["Hmph! Nice!", "Good one!", "Muddy!"], voice: "grunt" },
  elephant: { cheer: ["Toot toot!", "Wheee!", "Yay!"], voice: "trumpet" },
  capybara: { cheer: ["Ahh~ nice", "Chill~", "Cool~"], voice: "squeak" },
  dartfrog: { cheer: ["Ribbit!", "Hop hop!", "Yay!"], voice: "ribbit" },
  tapir:    { cheer: ["Wheee!", "Yay!", "More!"], voice: "whistle" },
};
const MISS_TALK = ["Hehe, missed!", "Over here!", "Oops~", "Try again!"];
const WIN_TALK = ["Thank you!", "I'm so clean!", "Best friend!", "Yay, clean!"];
const IDLE_TALK = ["Over here!", "I'm ready!", "Bath time?"];
