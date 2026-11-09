// screens.js — everything you see that is not the bath itself
//   cover (sticker style), island map, animal list, fact card,
//   world backgrounds, HUD, result card, and small drawing helpers.
//
// Still backgrounds are drawn ONCE into hidden layers (createGraphics)
// in prepareScreens(), then shown with image() every frame. This is much faster.

let BG = {}; // cached backgrounds
let grainPattern = null;
let coverAnimals = [];

// ---------------------------------------------------------------
// Layers: draw with normal p5 functions into a hidden canvas
// ---------------------------------------------------------------
function withLayer(g, fn) {
  let inst = p5.instance;
  let main = inst._renderer;
  inst._renderer = g._renderer;
  try {
    fn();
  } finally {
    inst._renderer = main;
  }
}

function makeLayer(fn) {
  let g = createGraphics(W, H);
  g.pixelDensity(min(2, displayDensity()));
  withLayer(g, () => {
    push();
    fn(g.drawingContext);
    pop();
  });
  return g;
}

// draw something with outlines around it (like a sticker)
// outlines = [[color, width], ...] from the outside in
let outlineLayers = {};
function drawWithOutline(fn, x, y, box, sc, outlines) {
  let size = ceil(box / 40) * 40;
  if (!outlineLayers[size]) {
    let g = createGraphics(size, size);
    g.pixelDensity(2);
    let sil = document.createElement("canvas");
    sil.width = g.elt.width;
    sil.height = g.elt.height;
    outlineLayers[size] = { g, sil, sctx: sil.getContext("2d") };
  }
  let { g, sil, sctx } = outlineLayers[size];
  g.clear();
  withLayer(g, () => {
    push();
    translate(size / 2, size / 2);
    fn();
    pop();
  });

  let ctx = drawingContext;
  let d = size * sc;
  let x0 = x - d / 2;
  let y0 = y - d / 2;
  for (let [col, w] of outlines) {
    // a one-color copy of the drawing (its "silhouette")
    sctx.globalCompositeOperation = "source-over";
    sctx.clearRect(0, 0, sil.width, sil.height);
    sctx.drawImage(g.elt, 0, 0);
    sctx.globalCompositeOperation = "source-in";
    sctx.fillStyle = col;
    sctx.fillRect(0, 0, sil.width, sil.height);
    // stamp it in a circle around the drawing = an outline
    for (let i = 0; i < 16; i++) {
      let a = (i / 16) * TWO_PI;
      ctx.drawImage(sil, x0 + cos(a) * w, y0 + sin(a) * w, d, d);
    }
  }
  ctx.drawImage(g.elt, x0, y0, d, d);
}

// ---------------------------------------------------------------
// Prepare all still backgrounds once
// ---------------------------------------------------------------
function prepareScreens() {
  // paper grain
  let tile = document.createElement("canvas");
  tile.width = tile.height = 180;
  let tctx = tile.getContext("2d");
  let img = tctx.createImageData(180, 180);
  for (let i = 0; i < img.data.length; i += 4) {
    let v = 110 + Math.random() * 145;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainPattern = drawingContext.createPattern(tile, "repeat");

  BG.cover = makeLayer(drawCoverBackground);
  BG.map = makeLayer(drawMapBackground);
  BG.wood = makeLayer(drawWoodBackground);
  BG.home = makeLayer(drawHomeBackground);
  BG.savanna = makeLayer(drawSavannaBackground);
  BG.jungle = makeLayer(drawJungleBackground);
  makeQR();

  // the sticker animals on the cover
  let spots = [
    ["kitten", 120, 110, -0.15, 1.1],
    ["capybara", 1170, 120, 0.15, 1.05],
    ["hippo", 150, 590, -0.1, 1.0],
    ["dartfrog", 400, 625, 0.12, 1.15],
    ["puppy", 650, 615, -0.12, 1.1],
    ["tapir", 900, 600, 0.12, 1.0],
  ];
  let dummyTub = { x: 0, w: 100, top: 0 };
  for (let [type, x, y, tilt, sc] of spots) {
    let a = new Animal({ animal: type }, dummyTub);
    a.dirt = 0;
    a.wobble = tilt;
    coverAnimals.push({ a, x, y, sc, tilt });
  }
}

function drawGrain() {
  let ctx = drawingContext;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = grainPattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---------------------------------------------------------------
// COVER (inspired by sticker / halftone posters)
// ---------------------------------------------------------------
function drawCoverBackground(ctx) {
  let g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#4f9fe8");
  g.addColorStop(0.55, "#a9dcf5");
  g.addColorStop(1, "#fbf1dc");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // halftone dots: bigger at the top, smaller at the bottom
  noStroke();
  for (let y = 4; y < H; y += 9) {
    for (let x = (y / 9) % 2 ? 4 : 8.5; x < W; x += 9) {
      let r = map(y, 0, H, 3.2, 0.6);
      fill(255, 255, 255, 70);
      circle(x, y, r * 2);
    }
  }
  // flat clouds
  fill(255);
  for (let [x, y, s] of [[420, 120, 1], [860, 90, 0.8], [1000, 380, 0.9], [150, 400, 0.8], [640, 470, 1.1], [330, 690, 0.9], [980, 700, 1]]) {
    ellipse(x, y, 140 * s, 46 * s);
    ellipse(x - 35 * s, y - 14 * s, 70 * s, 50 * s);
    ellipse(x + 25 * s, y - 20 * s, 80 * s, 60 * s);
  }
}

function drawCover(g) {
  image(BG.cover, 0, 0, W, H);

  // spinning swirls and dots
  push();
  noFill();
  strokeWeight(7);
  strokeCap(ROUND);
  for (let [x, y, s] of [[440, 300, 1], [900, 330, 0.8], [70, 600, 0.9], [1230, 330, 0.7], [660, 700, 0.8], [1200, 680, 0.9]]) {
    push();
    translate(x, y);
    rotate(frameCount * 0.02 * s);
    stroke(255, 255, 255, 200);
    beginShape();
    for (let a = 0; a < TWO_PI * 2.2; a += 0.2) vertex(cos(a) * a * 3.4 * s, sin(a) * a * 3.4 * s);
    endShape();
    pop();
  }
  noStroke();
  fill(C.yellow);
  for (let [x, y] of [[60, 60], [1230, 90], [700, 520], [330, 330], [1170, 450]]) circle(x, y, 18);
  fill(C.pink);
  for (let [x, y] of [[960, 520], [120, 290], [1250, 600]]) circle(x, y, 22);
  pop();

  // sticker animals
  for (let i = 0; i < coverAnimals.length; i++) {
    let c = coverAnimals[i];
    let bob = sin(frameCount * 0.05 + i * 1.3) * 6;
    c.a.drawHeadOutlined(c.x, c.y + bob, c.sc, [[C.cream, 13], [INK, 5]]);
  }

  // title
  push();
  textFont(HEAD);
  textAlign(CENTER, CENTER);
  textSize(150);
  strokeJoin(ROUND);
  let ty = 245 + sin(frameCount * 0.04) * 5;
  // a soft shadow, then a dark outline, a cream outline and a yellow fill
  noStroke();
  fill(0, 0, 0, 50);
  text("BATH TIME!", W / 2 + 6, ty + 10);
  stroke(INK);
  strokeWeight(34);
  fill(INK);
  text("BATH TIME!", W / 2, ty);
  stroke(C.cream);
  strokeWeight(16);
  text("BATH TIME!", W / 2, ty);
  noStroke();
  fill("#ffcf4d");
  text("BATH TIME!", W / 2, ty);

  textSize(26);
  fill(C.cream);
  stroke(INK);
  strokeWeight(7);
  text("a one-button bath game for 9 animal friends", W / 2, 350);
  pop();

  // two choices: SOLO or VS
  let opts = [["ISLAND TRIP", 340, 250], ["BATH RUSH", 640, 240], ["VS  2 PLAYERS", 940, 270]];
  for (let i = 0; i < 3; i++) {
    let [str, x, w] = opts[i];
    let sel = g.coverSel === i;
    chunkyButton(x, 440, w, 60, str, sel ? C.yellow : C.cream, sel);
    if (sel) {
      drawArrow(x + sin(frameCount * 0.15) * 0, 386 + sin(frameCount * 0.15) * 5);
      if (g.holdAmount > 0) drawHoldRing(x, 510, g.holdAmount);
    }
  }
  let notes = ["9 animals, 3 islands", "endless! beat your best score", "take turns with a friend"];
  push();
  textFont(BODY);
  textSize(17);
  textAlign(CENTER, CENTER);
  fill(INK);
  stroke(C.cream);
  strokeWeight(5);
  text(notes[g.coverSel], opts[g.coverSel][1], 540);
  pop();
  drawQRCard();
  hintChip("TAP = switch      HOLD = start      M = music on/off");
}

// ---------------------------------------------------------------
// MAP (islands)
// ---------------------------------------------------------------
function drawMapBackground(ctx) {
  background("#8fd3ee");
  noFill();
  stroke("#b8e6f6");
  strokeWeight(4);
  strokeCap(ROUND);
  randomSeed(3);
  for (let i = 0; i < 70; i++) {
    let x = random(W);
    let y = random(H);
    arc(x, y, 30, 14, PI + 0.3, TWO_PI - 0.3);
    arc(x + 26, y, 30, 14, PI + 0.3, TWO_PI - 0.3);
  }
  noStroke();
  fill("#fff8ea");
  for (let [x, y, s] of [[60, 680, 1.2], [1230, 50, 1.1], [1240, 690, 1], [40, 40, 0.9]]) {
    ellipse(x, y, 200 * s, 80 * s);
    ellipse(x + 50 * s, y - 25 * s, 110 * s, 80 * s);
  }
}

function islandShape(size, seed, dy = 0) {
  beginShape();
  for (let i = 0; i < 28; i++) {
    let a = (i / 28) * TWO_PI;
    let k = 1 + 0.13 * sin(a * 3 + seed) + 0.07 * sin(a * 5 + seed * 2);
    vertex(cos(a) * size * 1.3 * k, sin(a) * size * 0.72 * k + dy);
  }
  endShape(CLOSE);
}

function drawMap(g) {
  image(BG.map, 0, 0, W, H);
  drawMapLife();

  for (let i = 0; i < WORLDS.length; i++) {
    let w = WORLDS[i];
    let sel = g.mapSel === i;
    let bob = sin(frameCount * 0.04 + i) * 3;
    push();
    translate(w.x, w.y + bob);
    scale(sel ? 1.06 : 1);
    // shallow water ring
    noStroke();
    fill(sel ? "#fff6c2" : "#c6eef9");
    islandShape(w.size + 22, i * 2, 18);
    // cliff + top
    stroke(INK);
    strokeWeight(4);
    strokeJoin(ROUND);
    fill(w.side);
    islandShape(w.size, i * 2, 24);
    fill(w.top);
    islandShape(w.size, i * 2, 0);
    noStroke();
    drawIslandDeco(w.id, w.size);
    // the three animals living here
    for (let k = 0; k < 3; k++) {
      let a = new Animal({ animal: w.animals[k].animal }, { x: 0, w: 100, top: 0 });
      let clean = g.best[g.key(i, k)] !== undefined;
      a.dirt = clean ? 0 : 1;
      a.mood = clean ? "happy" : "idle";
      let px = (k - 1) * w.size * 0.62;
      let py = w.size * 0.22 + (k === 1 ? 18 : 0);
      a.drawHeadOutlined(px, py, 24 / a.r, [[INK, 2.5]]);
      if (clean) {
        fill(C.yellow);
        drawStar(px + 22, py - 22, 9);
      }
    }
    pop();

    // name label
    let ly = w.y + w.size * 0.72 + 44;
    label(w.x, ly, w.name.toUpperCase() + "   " + g.cleanCount(i) + "/3", sel ? C.yellow : C.cream, 24);
    if (sel) {
      drawArrow(w.x, w.y - w.size - 40 + sin(frameCount * 0.15) * 8);
      if (g.holdAmount > 0) drawHoldRing(w.x + w.size * 1.1, w.y - w.size * 0.5, g.holdAmount);
    }
  }

  // header
  label(240, 50, "BATH TIME!", C.cream, 30);
  push();
  fill(C.cream);
  stroke(INK);
  strokeWeight(3);
  rect(W - 200, 26, 170, 50, 25);
  noStroke();
  fill(C.yellow);
  drawStar(W - 170, 51, 15);
  fill(INK);
  textFont(HEAD);
  textSize(24);
  textAlign(LEFT, CENTER);
  text(game.totalStars + " / " + TOTAL_ANIMALS * 3, W - 150, 51);
  pop();

  if (g.allClean) label(W / 2, 118, "EVERYONE IS CLEAN!  YOU ARE A BATH MASTER!", "#ffb3c7", 24);
  // the photo album button
  let albumSel = g.mapSel === WORLDS.length;
  chunkyButton(1140, 122, 170, 50, "ALBUM", albumSel ? C.yellow : C.cream, albumSel);
  if (albumSel) {
    drawArrow(1020 + sin(frameCount * 0.15) * 6, 122, true);
    if (g.holdAmount > 0) drawHoldRing(1140, 182, g.holdAmount);
  }
  hintChip("TAP = next island      HOLD = go!");
  drawBackButton();
}

function drawIslandDeco(id, s) {
  push();
  stroke(INK);
  strokeWeight(3);
  strokeJoin(ROUND);
  if (id === "home") {
    // house
    fill("#fbe3c0");
    rect(-40, -95, 80, 60, 4);
    fill(C.red);
    triangle(-56, -92, 56, -92, 0, -140);
    fill("#a8673f");
    rect(-12, -62, 24, 27, 10, 10, 0, 0);
    fill("#a7dcff");
    rect(18, -82, 14, 14, 3);
    // trees
    for (let [x, y, r] of [[-120, -50, 30], [-95, -75, 24], [110, -45, 28], [135, -20, 22]]) {
      fill("#5fae55");
      circle(x, y, r * 2);
    }
    fill("#c98d5e");
    rect(-112, -25, 8, 18);
    rect(116, -20, 8, 18);
  } else if (id === "savanna") {
    // acacia trees
    for (let [x, y, k] of [[-110, -70, 1], [95, -95, 0.8]]) {
      fill("#8b5a3c");
      quad(x - 4 * k, y + 50 * k, x + 4 * k, y + 50 * k, x + 6 * k, y, x - 2 * k, y);
      fill("#7aa64a");
      ellipse(x, y - 8 * k, 120 * k, 34 * k);
      fill("#8fbf55");
      ellipse(x + 10 * k, y - 22 * k, 80 * k, 26 * k);
    }
    // little water hole
    fill("#7cc6ff");
    ellipse(20, -40, 90, 34);
    // rocks + grass
    fill("#c7b29a");
    ellipse(-30, -90, 40, 26);
    noStroke();
    fill("#c99a3e");
    for (let x = -150; x < 160; x += 38) triangle(x, -10, x + 6, -30, x + 12, -10);
  } else {
    // waterfall rock
    fill("#8d9aa3");
    rect(70, -140, 70, 90, 16);
    fill("#9fe0ff");
    rect(90, -128, 28, 90, 6);
    fill("#7cc6ff");
    ellipse(104, -38, 80, 26);
    // palm trees
    for (let [x, y, k] of [[-110, -40, 1], [-40, -80, 0.85]]) {
      fill("#a8673f");
      rect(x - 5 * k, y - 70 * k, 10 * k, 70 * k, 4);
      fill("#2f9a55");
      for (let a = 0; a < 5; a++) {
        push();
        translate(x, y - 70 * k);
        rotate(-PI / 2 + (a - 2) * 0.6);
        ellipse(34 * k, 0, 70 * k, 20 * k);
        pop();
      }
    }
    // flowers
    noStroke();
    for (let [x, y, c] of [[30, -40, "#ff6f9a"], [-150, -10, "#ffb347"], [150, -10, "#ff6f9a"], [0, -100, "#c58bff"]]) {
      drawFlower(x, y, 7, c);
    }
  }
  pop();
}

// ---------------------------------------------------------------
// ISLAND: the list of animals (like a collection board)
// ---------------------------------------------------------------
function drawWoodBackground(ctx) {
  background("#b0744a");
  stroke("#8e5534");
  strokeWeight(4);
  for (let y = 60; y < H; y += 90) line(0, y, W, y);
  noStroke();
  fill("#9c6440");
  randomSeed(7);
  for (let i = 0; i < 30; i++) ellipse(random(W), random(H), random(30, 70), 10);
}

function drawIslandList(g) {
  image(BG.wood, 0, 0, W, H);
  let wi = g.worldIndex;
  let world = WORLDS[wi];

  // paper board
  push();
  fill("#7a4a2c");
  noStroke();
  rect(84, 84, 1112, 560, 22);
  fill(C.paper);
  stroke(INK);
  strokeWeight(4);
  rect(100, 96, 1080, 530, 16);
  pop();
  label(W / 2, 96, world.name.toUpperCase(), world.top, 36);

  for (let i = 0; i < 3; i++) {
    let cfg = world.animals[i];
    let sel = g.listSel === i;
    let cx = 340 + i * 300;
    let cy = 345 + (sel ? -12 : 0);
    let clean = g.best[g.key(wi, i)] !== undefined;
    let best = g.best[g.key(wi, i)] || 0;
    push();
    // card
    fill(0, 0, 0, 40);
    noStroke();
    rect(cx - 125 + 6, cy - 165 + 8, 250, 330, 22);
    fill("#fffaf0");
    stroke(sel ? C.orange : INK);
    strokeWeight(sel ? 7 : 3);
    rect(cx - 125, cy - 165, 250, 330, 22);
    // sunburst + animal
    noStroke();
    sunburst(cx, cy - 55, 78, clean ? "#ffe9a8" : "#f3e2bf");
    let a = new Animal({ animal: cfg.animal }, { x: 0, w: 100, top: 0 });
    a.dirt = clean ? 0 : 1;
    a.mood = clean ? "happy" : "idle";
    a.drawHeadOutlined(cx, cy - 50, 50 / a.r, [[INK, 3]]);
    // name
    fill(INK);
    noStroke();
    textFont(HEAD);
    textAlign(CENTER, CENTER);
    textSize(30);
    text(cfg.name.toUpperCase(), cx, cy + 55);
    // difficulty
    textFont(BODY);
    textSize(15);
    fill("#8a6a55");
    text(["", "EASY", "MEDIUM", "TRICKY"][cfg.level], cx, cy + 84);
    // status
    if (clean) {
      for (let s = 0; s < 3; s++) {
        fill(s < best ? C.yellow : "#e8dcc4");
        drawStar(cx - 36 + s * 36, cy + 122, 14);
      }
    } else {
      textFont(HEAD);
      textSize(18);
      fill(C.red);
      text("NEEDS A BATH!", cx, cy + 122);
    }
    pop();
    if (sel) {
      drawArrow(cx, cy - 200 + sin(frameCount * 0.15) * 6);
      if (g.holdAmount > 0) drawHoldRing(cx + 110, cy - 150, g.holdAmount);
    }
  }

  // back to map button
  let sel = g.listSel === 3;
  chunkyButton(W / 2, 590, 260, 52, "BACK TO MAP", sel ? C.orange : "#e8dcc4", sel);
  if (sel) {
    drawArrow(W / 2 - 140, 590, true);
    if (g.holdAmount > 0) drawHoldRing(W / 2 + 130, 580, g.holdAmount);
  }
  hintChip("TAP = next      HOLD = choose      ESC = back");
  drawBackButton();
}

// ---------------------------------------------------------------
// INTRO: the fun-fact card before a bath
// ---------------------------------------------------------------
function drawIntro(g) {
  let cfg = g.cfg;
  push();
  fill(40, 25, 20, 150);
  noStroke();
  rect(0, 0, W, H);
  let k = easeOutBack(min(1, g.stateTime * 2.5));
  translate(W / 2, H / 2);
  scale(0.85 + 0.15 * k);
  translate(-W / 2, -H / 2);

  textAlign(CENTER, CENTER);
  textFont(HEAD);
  textSize(22);
  fill(255);
  if (g.mode === "vs") {
    let p = g.vs.player;
    label(W / 2, 30, "ROUND " + (g.vs.round + 1) + "/3  ·  PLAYER " + (p + 1), PLAYER_COLS[p], 22);
  } else text("NEXT BATH", W / 2, 46);
  label(W / 2, 96, cfg.name.toUpperCase(), C.cream, 42);
  let best = g.best[g.key(g.worldIndex, g.animalIndex)];
  if (g.mode !== "vs") tag(W / 2 + 175, 72, best !== undefined ? "AGAIN!" : "NEW!");

  sunburst(W / 2, 245, 112, "#fbe9c4");
  let a = new Animal({ animal: cfg.animal }, { x: 0, w: 100, top: 0 });
  a.dirt = 1;
  a.drawHeadOutlined(W / 2, 252, 64 / a.r, [[INK, 3.5]]);

  // info panel
  fill(C.cream);
  stroke(INK);
  strokeWeight(4);
  rect(W / 2 - 360, 372, 720, 240, 22);
  noStroke();
  fill(C.orange);
  textFont(HEAD);
  textSize(26);
  text("DID YOU KNOW?", W / 2, 404);
  fill(INK);
  textFont(BODY);
  textSize(21);
  textLeading(28);
  text(cfg.fact, W / 2 - 320, 420, 640, 90);
  fill(C.red);
  textStyle(BOLD);
  text(cfg.rule, W / 2, 540);
  textStyle(NORMAL);
  fill("#8a6a55");
  textSize(16);
  let extras = ["HOLD = spray, LET GO = stop", "3 hearts", "3 ducks = 3 stars"];
  if (cfg.timer) extras.push(cfg.timer + "s before the water gets cold");
  text(extras.join("   ·   "), W / 2, 580);
  pop();

  if (frameCount % 60 < 45) chunkyButton(W / 2, 660, 240, 58, "LET'S GO!", C.green, true);
  drawBackButton();
}

// ---------------------------------------------------------------
// HUD + RESULT
// ---------------------------------------------------------------
function drawHud(g) {
  push();
  // name + splashes left
  fill(0, 0, 0, 40);
  noStroke();
  rect(98, 28, 330, 58, 26);
  fill(C.cream);
  stroke(INK);
  strokeWeight(3);
  rect(94, 22, 330, 58, 26);
  noStroke();
  fill(INK);
  textFont(HEAD);
  textAlign(LEFT, CENTER);
  textSize(26);
  text(g.cfg.name.toUpperCase(), 116, 51);
  // hearts left
  for (let i = 0; i < 3; i++) {
    fill(i < g.hearts ? C.pink : "#e8dcc4");
    stroke(INK);
    strokeWeight(2.5);
    let pulse = i === g.hearts - 1 && g.hurt > 0 ? 1.3 : 1;
    drawHeart(318 + i * 34, 52, 26 * pulse);
  }
  // ducks collected
  for (let i = 0; i < 3; i++) {
    push();
    if (i >= g.ducksGot) drawingContext.globalAlpha = 0.3;
    drawRubberDuck(126 + i * 40, 104, 0.8);
    pop();
  }
  // stars
  fill(0, 0, 0, 40);
  noStroke();
  rect(W - 196, 28, 170, 58, 26);
  fill(C.cream);
  stroke(INK);
  strokeWeight(3);
  rect(W - 200, 22, 170, 58, 26);
  noStroke();
  fill(C.yellow);
  drawStar(W - 168, 51, 15);
  fill(INK);
  textSize(24);
  text(g.totalStars + " / " + TOTAL_ANIMALS * 3, W - 146, 51);
  pop();
  if (g.mode === "vs") {
    let p = g.vs.player;
    label(W / 2, 51, "PLAYER " + (p + 1) + "'S TURN", PLAYER_COLS[p], 24);
  }

  drawTimer(g);
  if (g.state === "aim") {
    hintChip(g.holding ? "LET GO to stop the water" : "HOLD to spray water   ·   stop between the pink lines");
  }
  drawBackButton();
}

function drawResult(g) {
  // wait for the photo first (so the card is not in the picture)
  if (g.win && g.mode === "solo" && !g.photoTaken) {
    label(W / 2, 140, "SAY CHEESE!", C.cream, 30);
    return;
  }
  let withPhoto = g.win && g.photo;
  let cw = withPhoto ? 760 : 580;
  push();
  let k = min(1, g.stateTime * 3);
  translate(W / 2, 228);
  scale(0.8 + 0.2 * easeOutBack(k));
  fill(0, 0, 0, 50);
  noStroke();
  rect(-cw / 2 + 8, -150 + 10, cw, 290, 26);
  fill(C.cream);
  stroke(INK);
  strokeWeight(4);
  rect(-cw / 2, -150, cw, 290, 26);
  noStroke();
  textAlign(CENTER, CENTER);
  textFont(HEAD);
  fill(INK);
  let tx = withPhoto ? 130 : 0; // text moves right when there is a photo
  if (withPhoto) drawPolaroid(g.photo, -215, -8, 250, -0.06, g.cfg.name, g.stars);
  if (g.win) {
    textSize(withPhoto ? 40 : 46);
    text(["CLEAN!", "NICE BATH!", "GREAT BATH!", "PERFECT BATH!"][g.stars], tx, -90);
    for (let i = 0; i < 3; i++) {
      fill(i < g.stars ? C.yellow : "#e8dcc4");
      drawStar(tx - 64 + i * 64, -22, 26);
    }
    textFont(BODY);
    textSize(17);
    fill("#8a6a55");
    text("rubber ducks: " + g.stars + " / 3", tx, 30);
    if (withPhoto) text("photo saved in your album!", tx, 56);
    if (g.mode === "vs") {
      fill(C.red);
      textFont(HEAD);
      textSize(22);
      text("+" + g.vsPoints() + " POINTS", 0, 62);
    }
  } else {
    textSize(46);
    text("OH NO...", 0, -90);
    textFont(BODY);
    textSize(24);
    text(g.failReason, 0, -25);
    textSize(17);
    fill("#8a6a55");
    text(g.mode === "vs" ? "+0 points this time..." : "You'll do better next time!", 0, 15);
  }
  pop();
  let btn = g.mode === "vs" ? "NEXT" : g.win ? "COOL!" : "TRY AGAIN";
  if (g.stateTime > 0.6) chunkyButton(W / 2 + (withPhoto ? 130 : 0), 328, 220, 56, btn, g.win ? C.yellow : C.orange, frameCount % 60 < 45);
}

// an instant photo with a white frame, a caption and stars
function drawPolaroid(img, x, y, w, angle, caption, stars) {
  let h = w * 0.75;
  push();
  translate(x, y);
  rotate(angle);
  noStroke();
  fill(0, 0, 0, 45);
  rect(-w / 2 - 12 + 5, -h / 2 - 12 + 7, w + 24, h + 70, 6);
  fill("#ffffff");
  stroke(INK);
  strokeWeight(3);
  rect(-w / 2 - 12, -h / 2 - 12, w + 24, h + 70, 6);
  noStroke();
  if (img) {
    image(img, -w / 2, -h / 2, w, h);
  } else {
    fill("#e8dcc4");
    rect(-w / 2, -h / 2, w, h);
    fill("#bfae92");
    textFont(HEAD);
    textSize(w * 0.3);
    textAlign(CENTER, CENTER);
    text("?", 0, 0);
  }
  noFill();
  stroke(INK);
  strokeWeight(2);
  rect(-w / 2, -h / 2, w, h);
  noStroke();
  fill(INK);
  textFont(HEAD);
  textAlign(LEFT, CENTER);
  textSize(w * 0.09);
  text(caption.toUpperCase(), -w / 2, h / 2 + 30);
  if (stars !== undefined) {
    for (let i = 0; i < 3; i++) {
      fill(i < stars ? C.yellow : "#e8dcc4");
      drawStar(w / 2 - 10 - (2 - i) * w * 0.09, h / 2 + 30, w * 0.04);
    }
  }
  // a piece of tape on top
  fill(255, 236, 160, 200);
  rect(-28, -h / 2 - 24, 56, 22, 3);
  pop();
}

// ---------------------------------------------------------------
// PHOTO ALBUM: one photo for every animal you made clean
// ---------------------------------------------------------------
function drawAlbum(g) {
  image(BG.wood, 0, 0, W, H);
  push();
  fill("#7a4a2c");
  noStroke();
  rect(64, 76, 1152, 600, 22);
  fill(C.paper);
  stroke(INK);
  strokeWeight(4);
  rect(80, 88, 1120, 576, 16);
  pop();
  label(W / 2, 88, "PHOTO ALBUM", C.cream, 34);
  let n = 0;
  for (let wi = 0; wi < WORLDS.length; wi++) {
    let y = 205 + wi * 180;
    push();
    textFont(HEAD);
    textSize(20);
    textAlign(CENTER, CENTER);
    fill(WORLDS[wi].side);
    translate(160, y);
    rotate(-HALF_PI);
    text(WORLDS[wi].name.toUpperCase(), 0, 0);
    pop();
    for (let ai = 0; ai < 3; ai++) {
      let k = g.key(wi, ai);
      let img = g.photos[k];
      if (img) n++;
      let cfg = WORLDS[wi].animals[ai];
      let x = 420 + ai * 270 + (ai % 2 ? 10 : -10);
      let tilt = ((wi * 3 + ai) % 3 - 1) * 0.04;
      drawPolaroid(img, x, y - 20, 132, tilt, img ? cfg.name : "???", img ? g.best[k] : undefined);
    }
  }
  hintChip(n + " / " + TOTAL_ANIMALS + " PHOTOS      PRESS = back to the map");
  drawBackButton();
}

// ---------------------------------------------------------------
// VS MODE screens
// ---------------------------------------------------------------
const PLAYER_COLS = ["#ff8fb1", "#7cc6ff"];

function drawVsRound(g) {
  image(BG.wood, 0, 0, W, H);
  let v = g.vs;
  let [wi, ai] = v.order[v.round];
  let cfg = WORLDS[wi].animals[ai];
  let turns = v.turns.filter((t) => t.round === v.round);
  label(W / 2, 90, "ROUND " + (v.round + 1) + "  ·  " + cfg.name.toUpperCase(), C.cream, 34);

  for (let p = 0; p < 2; p++) {
    let t = turns[p];
    let x = W / 2 + (p === 0 ? -250 : 250);
    let won = turns[0].pts !== turns[1].pts && t.pts === max(turns[0].pts, turns[1].pts);
    push();
    fill(0, 0, 0, 40);
    noStroke();
    rect(x - 190 + 6, 170 + 8, 380, 330, 24);
    fill(C.cream);
    stroke(won ? C.orange : INK);
    strokeWeight(won ? 7 : 4);
    rect(x - 190, 170, 380, 330, 24);
    pop();
    label(x, 170, "PLAYER " + (p + 1), PLAYER_COLS[p], 26);
    push();
    textAlign(CENTER, CENTER);
    for (let s = 0; s < 3; s++) {
      fill(s < t.stars ? C.yellow : "#e8dcc4");
      drawStar(x - 60 + s * 60, 270, 24);
    }
    noStroke();
    fill(INK);
    textFont(HEAD);
    textSize(54);
    text(t.pts, x, 360);
    textFont(BODY);
    textSize(18);
    fill("#8a6a55");
    text(t.win ? "points" : "the bath failed", x, 405);
    if (won) {
      textFont(HEAD);
      textSize(28);
      fill(C.red);
      text("ROUND WINNER!", x, 455);
    }
    pop();
  }
  if (turns[0].pts === turns[1].pts) label(W / 2, 540, "IT'S A TIE!", C.yellow, 26);
  scoreBar(g, 600);
  if (g.stateTime > 0.6 && frameCount % 60 < 45) chunkyButton(W / 2, 660, 220, 54, "NEXT", C.yellow, true);
  drawBackButton();
}

function drawVsEnd(g) {
  image(BG.cover, 0, 0, W, H);
  let [a, b] = g.vs.total;
  let winner = a === b ? -1 : a > b ? 0 : 1;
  push();
  textFont(HEAD);
  textAlign(CENTER, CENTER);
  textSize(96);
  stroke(INK);
  strokeWeight(26);
  strokeJoin(ROUND);
  fill(INK);
  let title = winner < 0 ? "IT'S A TIE!" : "PLAYER " + (winner + 1) + " WINS!";
  text(title, W / 2, 170);
  stroke(C.cream);
  strokeWeight(12);
  text(title, W / 2, 170);
  noStroke();
  fill(winner < 0 ? C.yellow : PLAYER_COLS[winner]);
  text(title, W / 2, 170);
  pop();

  // the winner's crown
  if (winner >= 0) {
    push();
    translate(W / 2 + (winner === 0 ? -220 : 220), 330 + sin(frameCount * 0.08) * 6);
    fill(C.yellow);
    stroke(INK);
    strokeWeight(4);
    strokeJoin(ROUND);
    beginShape();
    vertex(-50, 30);
    vertex(-50, -20);
    vertex(-25, 5);
    vertex(0, -35);
    vertex(25, 5);
    vertex(50, -20);
    vertex(50, 30);
    endShape(CLOSE);
    pop();
  }
  for (let p = 0; p < 2; p++) {
    let x = W / 2 + (p === 0 ? -220 : 220);
    label(x, 410, "PLAYER " + (p + 1), PLAYER_COLS[p], 28);
    push();
    textFont(HEAD);
    textAlign(CENTER, CENTER);
    textSize(64);
    fill(INK);
    stroke(C.cream);
    strokeWeight(10);
    text(g.vs.total[p], x, 490);
    pop();
  }
  for (let e of g.effects) e.draw();
  if (g.stateTime > 1 && frameCount % 60 < 45) chunkyButton(W / 2, 620, 280, 58, "PLAY AGAIN", C.yellow, true);
}

// total score of both players, as a bar
function scoreBar(g, y) {
  let [a, b] = g.vs.total;
  let k = a + b === 0 ? 0.5 : a / (a + b);
  push();
  stroke(INK);
  strokeWeight(3.5);
  fill(PLAYER_COLS[1]);
  rect(W / 2 - 300, y - 16, 600, 32, 16);
  fill(PLAYER_COLS[0]);
  rect(W / 2 - 300, y - 16, 600 * k, 32, 16);
  noStroke();
  fill(INK);
  textFont(HEAD);
  textSize(20);
  textAlign(LEFT, CENTER);
  text("P1  " + a, W / 2 - 285, y);
  textAlign(RIGHT, CENTER);
  text(b + "  P2", W / 2 + 285, y);
  pop();
}

// ---------------------------------------------------------------
// QR CODE: classmates scan it to play on their phones.
// It only works when the game is online (for example on GitHub Pages).
// ---------------------------------------------------------------
let qrLayer = null;
let gameIsOnline = false;

function makeQR(testUrl) {
  gameIsOnline = location.protocol === "https:" || !!testUrl;
  if (!gameIsOnline || typeof qrcode === "undefined") return;
  let qr = qrcode(0, "M");
  qr.addData(testUrl || location.href.split("#")[0]);
  qr.make();
  let n = qr.getModuleCount();
  let cell = 4;
  qrLayer = createGraphics(n * cell, n * cell);
  qrLayer.pixelDensity(1);
  qrLayer.noStroke();
  qrLayer.background(255);
  qrLayer.fill(INK);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) qrLayer.rect(c * cell, r * cell, cell, cell);
    }
  }
}

function drawQRCard() {
  let x = 1090, y = 520, w = 170, h = 190;
  push();
  rotate(0);
  fill(0, 0, 0, 45);
  noStroke();
  rect(x + 5, y + 8, w, h, 18);
  fill(C.cream);
  stroke(INK);
  strokeWeight(3.5);
  rect(x, y, w, h, 18);
  noStroke();
  textAlign(CENTER, CENTER);
  textFont(HEAD);
  fill(INK);
  textSize(19);
  text("SCAN TO PLAY!", x + w / 2, y + 22);
  if (qrLayer) {
    drawingContext.imageSmoothingEnabled = false;
    image(qrLayer, x + 22, y + 40, 126, 126);
    drawingContext.imageSmoothingEnabled = true;
  } else {
    fill("#e8dcc4");
    rect(x + 22, y + 40, 126, 126, 8);
    fill("#8a6a55");
    textFont(BODY);
    textSize(14);
    textLeading(18);
    text("The QR code shows up when the game is online (GitHub Pages).", x + 28, y + 46, 114, 114);
  }
  pop();
}

// ---------------------------------------------------------------
// little moving things, so the worlds feel alive
// ---------------------------------------------------------------
function drawButterfly(x, y, col, s = 1) {
  let flap = abs(sin(frameCount * 0.3)) * 0.8 + 0.2;
  push();
  translate(x, y);
  scale(s);
  stroke(INK);
  strokeWeight(1.5);
  fill(col);
  ellipse(-7 * flap, -4, 14 * flap, 16);
  ellipse(7 * flap, -4, 14 * flap, 16);
  ellipse(-5 * flap, 6, 10 * flap, 10);
  ellipse(5 * flap, 6, 10 * flap, 10);
  fill(INK);
  ellipse(0, 1, 3, 14);
  pop();
}

function drawAmbient(id) {
  let t = frameCount * 0.004;
  if (id === "home") {
    // soap bubbles float up slowly
    push();
    noFill();
    stroke(255, 255, 255, 200);
    strokeWeight(2);
    for (let i = 0; i < 8; i++) {
      let x = (noise(i * 10, t) * 1.4 - 0.2) * W;
      let y = H - ((frameCount * (0.4 + i * 0.05) + i * 97) % (H + 60));
      circle(x, y, 10 + (i % 4) * 7);
    }
    pop();
  } else {
    let cols = id === "jungle" ? ["#ff8fb1", "#ffd84d", "#7cc6ff", "#c58bff"] : ["#ffffff", "#ffd84d", "#ff9f80"];
    for (let i = 0; i < cols.length; i++) {
      let x = noise(i * 7, t) * W;
      let y = 80 + noise(i * 7 + 100, t) * 300;
      drawButterfly(x, y, cols[i], 0.9);
    }
    if (id === "savanna") {
      // birds far away
      push();
      noFill();
      stroke(INK);
      strokeWeight(2);
      for (let i = 0; i < 3; i++) {
        let x = ((frameCount * 0.6 + i * 60) % (W + 200)) - 100;
        let y = 120 + i * 18 + sin(frameCount * 0.05 + i) * 6;
        let f = sin(frameCount * 0.2 + i) * 4;
        arc(x - 7, y, 14, 10 + f, PI, TWO_PI);
        arc(x + 7, y, 14, 10 + f, PI, TWO_PI);
      }
      pop();
    }
  }
}

function drawMapLife() {
  // a little sailboat going around
  let x = ((frameCount * 0.5) % (W + 200)) - 100;
  let y = 640 + sin(frameCount * 0.05) * 4;
  push();
  translate(x, y);
  stroke(INK);
  strokeWeight(3);
  fill("#ffffff");
  triangle(0, -50, 0, -6, 34, -10);
  fill(C.red);
  triangle(-4, -44, -4, -8, -26, -10);
  fill("#c98d5e");
  quad(-34, -4, 40, -4, 28, 14, -24, 14);
  pop();
  // gulls
  push();
  noFill();
  stroke(INK);
  strokeWeight(2.5);
  for (let i = 0; i < 2; i++) {
    let gx = ((frameCount * 0.8 + i * 300) % (W + 200)) - 100;
    let gy = 160 + i * 40 + sin(frameCount * 0.04 + i) * 10;
    let f = sin(frameCount * 0.2 + i) * 4;
    arc(gx - 8, gy, 16, 12 + f, PI, TWO_PI);
    arc(gx + 8, gy, 16, 12 + f, PI, TWO_PI);
  }
  pop();
}

// ---------------------------------------------------------------
// WORLD BACKGROUNDS (for the bath)
// ---------------------------------------------------------------
function drawWorldBackground(id) {
  image(BG[id], 0, 0, W, H);
  drawAmbient(id);
  if (id === "jungle") {
    // the waterfall moves
    push();
    noStroke();
    fill(255, 255, 255, 150);
    for (let i = 0; i < 6; i++) {
      let y = (frameCount * 3 + i * 90) % 520;
      rect(1150 + (i % 3) * 18, y, 6, 40, 3);
    }
    pop();
  }
}

function drawHomeBackground(ctx) {
  // warm tiles
  noStroke();
  fill("#f7ead0");
  rect(0, 0, W, 400);
  for (let y = 0; y < 400; y += 64) {
    for (let x = 0; x < W; x += 64) {
      if ((x / 64 + y / 64) % 2 === 0) {
        fill("#f1dfbd");
        rect(x, y, 64, 64);
      }
    }
  }
  stroke("#fff6e4");
  strokeWeight(4);
  for (let x = 0; x <= W; x += 64) line(x, 0, x, 400);
  for (let y = 0; y <= 400; y += 64) line(0, y, W, y);
  // garland
  stroke(INK);
  strokeWeight(2);
  noFill();
  bezier(-10, 18, 300, 70, 900, 70, W + 10, 18);
  let cols = ["#ff9fbf", "#ffd84d", "#7fdcb5", "#9ad0ff", "#c9b6ff"];
  for (let i = 0; i < 22; i++) {
    let t = (i + 0.5) / 22;
    let x = bezierPoint(-10, 300, 900, W + 10, t);
    let y = bezierPoint(18, 70, 70, 18, t);
    fill(cols[i % cols.length]);
    triangle(x - 18, y, x + 18, y, x, y + 32);
  }
  // green wall with dots
  noStroke();
  fill("#b9d9a8");
  rect(0, 400, W, FLOOR - 400);
  fill("#cfe6c0");
  for (let y = 430; y < FLOOR - 10; y += 40) {
    for (let x = ((y / 40) % 2) * 30 + 15; x < W; x += 60) circle(x, y, 12);
  }
  fill("#9cc58a");
  stroke(INK);
  strokeWeight(3);
  rect(-10, 394, W + 20, 14, 7);
  // towel
  fill("#ffffff");
  rect(250, 248, 130, 10, 5);
  fill("#ffb3c7");
  rect(268, 256, 94, 116, 0, 0, 16, 16);
  noStroke();
  fill("#ff9fbf");
  rect(270, 330, 90, 10);
  fill("#ffffff");
  drawHeart(315, 292, 20);
  // shelf
  stroke(INK);
  strokeWeight(3);
  fill("#ffffff");
  rect(470, 208, 190, 14, 7);
  fill("#ff9f80");
  rect(495, 186, 40, 22, 5);
  fill("#7cc06a");
  ellipse(505, 172, 20, 30);
  ellipse(520, 166, 20, 36);
  fill("#c9b6ff");
  rect(552, 160, 28, 48, 9);
  fill("#ffffff");
  rect(558, 150, 16, 12, 3);
  noStroke();
  drawRubberDuck(625, 194, 0.8);
  // window
  stroke(INK);
  strokeWeight(4);
  fill("#ffffff");
  circle(1120, 150, 150);
  fill("#a7dcff");
  circle(1120, 150, 122);
  noStroke();
  fill("#ffffff");
  ellipse(1095, 160, 50, 22);
  ellipse(1120, 152, 40, 26);
  stroke(INK);
  strokeWeight(4);
  line(1120, 89, 1120, 211);
  line(1059, 150, 1181, 150);
  // wood floor
  fill("#d79a66");
  rect(-10, FLOOR, W + 20, H - FLOOR + 10);
  stroke("#b97d4c");
  strokeWeight(3);
  for (let y = FLOOR + 32; y < H; y += 34) line(0, y, W, y);
}

function drawSavannaBackground(ctx) {
  let g = ctx.createLinearGradient(0, 0, 0, 470);
  g.addColorStop(0, "#8fd0f0");
  g.addColorStop(1, "#ffe3a6");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  noStroke();
  // sun
  fill(255, 236, 160, 120);
  circle(1080, 140, 210);
  fill("#ffd36b");
  stroke(INK);
  strokeWeight(3);
  circle(1080, 140, 120);
  noStroke();
  // clouds
  fill("#fff8ea");
  for (let [x, y] of [[300, 110], [640, 70], [860, 190]]) {
    ellipse(x, y, 160, 44);
    ellipse(x - 30, y - 16, 80, 50);
    ellipse(x + 30, y - 20, 90, 56);
  }
  // hills
  fill("#f0c47a");
  ellipse(250, 470, 700, 170);
  ellipse(1000, 480, 800, 150);
  fill("#e3a95c");
  ellipse(640, 500, 1000, 130);
  // ground
  stroke(INK);
  strokeWeight(3);
  fill("#e8b867");
  rect(-10, 470, W + 20, FLOOR - 470);
  fill("#d29a52");
  rect(-10, FLOOR, W + 20, H - FLOOR + 10);
  // acacia trees
  for (let [x, y, k] of [[420, 470, 1], [130, 470, 0.7], [1180, 470, 0.85]]) {
    fill("#8b5a3c");
    quad(x - 8 * k, y, x + 8 * k, y, x + 14 * k, y - 130 * k, x - 2 * k, y - 130 * k);
    fill("#7aa64a");
    ellipse(x + 6 * k, y - 150 * k, 240 * k, 60 * k);
    fill("#8fbf55");
    ellipse(x + 20 * k, y - 172 * k, 160 * k, 44 * k);
  }
  // grass tufts
  noStroke();
  fill("#c99a3e");
  randomSeed(11);
  for (let i = 0; i < 40; i++) {
    let x = random(W);
    let y = random(490, FLOOR - 6);
    triangle(x, y, x + 5, y - 18, x + 10, y);
    triangle(x + 6, y, x + 13, y - 14, x + 18, y);
  }
  fill("#b8863a");
  for (let i = 0; i < 30; i++) {
    let x = random(W);
    let y = random(FLOOR + 14, H - 8);
    triangle(x, y, x + 5, y - 14, x + 10, y);
  }
}

function drawJungleBackground(ctx) {
  let g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#2e7d5b");
  g.addColorStop(1, "#4fae6e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  noStroke();
  // far leaves
  randomSeed(21);
  let greens = ["#1f5e44", "#2f8a57", "#3fa66b", "#57c27e"];
  for (let i = 0; i < 26; i++) {
    let x = random(W);
    let y = random(80, 520);
    push();
    translate(x, y);
    rotate(random(TWO_PI));
    fill(greens[i % 4]);
    ellipse(0, 0, random(120, 220), random(40, 70));
    pop();
  }
  // waterfall
  stroke(INK);
  strokeWeight(3);
  fill("#8d9aa3");
  rect(1110, -10, 150, 120, 20);
  fill("#9fe0ff");
  rect(1140, 0, 72, 560);
  fill("#7cc6ff");
  ellipse(1176, 560, 200, 40);
  // hanging vines
  noFill();
  stroke("#2a6b45");
  strokeWeight(5);
  for (let x of [90, 360, 600, 880]) {
    bezier(x, -10, x + 20, 80, x - 20, 140, x + 10, 210);
  }
  noStroke();
  fill("#57c27e");
  for (let x of [90, 360, 600, 880]) {
    for (let k = 0; k < 4; k++) ellipse(x + (k % 2 ? 10 : -6), 40 + k * 45, 22, 12);
  }
  // big front leaves
  stroke(INK);
  strokeWeight(3);
  for (let [x, y, a, s, c] of [[40, 420, -0.6, 1.2, "#2f9a55"], [1240, 430, 3.6, 1.1, "#3fa66b"], [300, 470, -1.2, 0.8, "#57c27e"], [1010, 460, 4.2, 0.8, "#2f9a55"]]) {
    push();
    translate(x, y);
    rotate(a);
    fill(c);
    ellipse(80 * s, 0, 200 * s, 70 * s);
    stroke("#1f5e44");
    line(-10, 0, 170 * s, 0);
    pop();
  }
  // flowers
  noStroke();
  randomSeed(5);
  let flowerCols = ["#ff6f9a", "#ffb347", "#ffd84d", "#c58bff", "#ff8a65"];
  for (let i = 0; i < 16; i++) drawFlower(random(W - 160), random(150, 560), random(7, 12), flowerCols[i % 5]);
  // mossy ground
  stroke(INK);
  strokeWeight(3);
  fill("#3c8f50");
  rect(-10, FLOOR, W + 20, H - FLOOR + 10);
  noStroke();
  fill("#4fae6e");
  for (let x = 0; x < W; x += 46) ellipse(x, FLOOR + 4, 60, 16);
  fill("#8d9aa3");
  for (let [x, y] of [[200, 670], [520, 690], [1100, 675]]) ellipse(x, y, 60, 26);
}

// ---------------------------------------------------------------
// Small UI helpers
// ---------------------------------------------------------------

// a rounded label with a dark outline
function label(x, y, str, col, size) {
  push();
  textFont(HEAD);
  textSize(size);
  let w = textWidth(str) + size * 1.4;
  let h = size * 1.7;
  noStroke();
  fill(0, 0, 0, 45);
  rect(x - w / 2 + 4, y - h / 2 + 6, w, h, h / 2);
  fill(col);
  stroke(INK);
  strokeWeight(3.5);
  rect(x - w / 2, y - h / 2, w, h, h / 2);
  noStroke();
  fill(INK);
  textAlign(CENTER, CENTER);
  text(str, x, y + size * 0.04);
  pop();
}

// a chunky button with a dark bottom edge
function chunkyButton(x, y, w, h, str, col, lifted) {
  push();
  let up = lifted ? 0 : 3;
  noStroke();
  fill(0, 0, 0, 45);
  rect(x - w / 2 + 3, y - h / 2 + 10, w, h, h / 2);
  fill(lerpColor(color(col), color(INK), 0.35));
  stroke(INK);
  strokeWeight(3.5);
  rect(x - w / 2, y - h / 2 + 6, w, h, h / 2);
  fill(col);
  rect(x - w / 2, y - h / 2 + up, w, h, h / 2);
  noStroke();
  fill(INK);
  textFont(HEAD);
  textSize(h * 0.48);
  textAlign(CENTER, CENTER);
  text(str, x, y + up + 1);
  pop();
}

// the round back button (top left). Click it or press ESC.
const BACK_BTN = { x: 52, y: 51, r: 28 };
function drawBackButton() {
  push();
  let { x, y, r } = BACK_BTN;
  noStroke();
  fill(0, 0, 0, 45);
  circle(x + 3, y + 7, r * 2);
  fill("#d9c49c");
  stroke(INK);
  strokeWeight(3.5);
  circle(x, y + 4, r * 2);
  fill(C.cream);
  circle(x, y, r * 2);
  fill(INK);
  noStroke();
  triangle(x - 12, y, x + 6, y - 11, x + 6, y + 11);
  rect(x + 2, y - 4, 12, 8, 2);
  pop();
}

function backButtonHit(px, py) {
  return dist(px, py, BACK_BTN.x, BACK_BTN.y) < BACK_BTN.r + 8;
}

// a little tilted red tag
function tag(x, y, str) {
  push();
  translate(x, y);
  rotate(0.18);
  textFont(HEAD);
  textSize(18);
  let w = textWidth(str) + 22;
  fill(C.red);
  stroke(INK);
  strokeWeight(3);
  rect(-w / 2, -16, w, 32, 10);
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  text(str, 0, 1);
  pop();
}

function hintChip(str) {
  push();
  textFont(HEAD);
  textSize(20);
  let w = textWidth(str) + 44;
  fill(INK);
  noStroke();
  rect(W / 2 - w / 2, H - 52, w, 38, 19);
  fill(C.cream);
  textAlign(CENTER, CENTER);
  text(str, W / 2, H - 33);
  pop();
}

function drawArrow(x, y, sideways = false) {
  push();
  translate(x, y);
  if (sideways) rotate(-HALF_PI);
  fill(C.orange);
  stroke(INK);
  strokeWeight(3.5);
  strokeJoin(ROUND);
  beginShape();
  vertex(-18, -26);
  vertex(18, -26);
  vertex(18, -6);
  vertex(30, -6);
  vertex(0, 22);
  vertex(-30, -6);
  vertex(-18, -6);
  endShape(CLOSE);
  pop();
}

// shows how long you have been holding in a menu
function drawHoldRing(x, y, amount) {
  push();
  noFill();
  stroke(255, 255, 255, 200);
  strokeWeight(10);
  circle(x, y, 44);
  stroke(C.orange);
  strokeCap(ROUND);
  arc(x, y, 44, 44, -HALF_PI, -HALF_PI + TWO_PI * amount);
  stroke(INK);
  strokeWeight(2.5);
  circle(x, y, 56);
  circle(x, y, 32);
  pop();
}

function sunburst(x, y, r, col) {
  push();
  translate(x, y);
  rotate(frameCount * 0.004);
  fill(col);
  stroke(INK);
  strokeWeight(3);
  strokeJoin(ROUND);
  beginShape();
  for (let i = 0; i < 36; i++) {
    let a = (i / 36) * TWO_PI;
    let rr = i % 2 === 0 ? r : r * 0.88;
    vertex(cos(a) * rr, sin(a) * rr);
  }
  endShape(CLOSE);
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
  stroke(INK);
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

function drawRubberDuck(x, y, s) {
  push();
  translate(x, y);
  scale(s);
  stroke(INK);
  strokeWeight(2);
  fill(C.yellow);
  ellipse(0, 4, 36, 24);
  circle(-8, -10, 22);
  fill("#ff9a3c");
  ellipse(-21, -9, 12, 7);
  noStroke();
  fill(INK);
  circle(-11, -13, 3.5);
  fill(255, 140, 170, 160);
  ellipse(-4, -6, 7, 4);
  pop();
}

function drawBoat(x, y, s) {
  push();
  translate(x, y);
  scale(s);
  stroke(INK);
  strokeWeight(2);
  fill("#ff9fbf");
  quad(-20, -2, 20, -2, 13, 10, -13, 10);
  fill("#ffffff");
  triangle(-2, -2, -2, -30, 16, -6);
  pop();
}

function easeOutBack(t) {
  let c1 = 1.70158;
  let c3 = c1 + 1;
  return 1 + c3 * pow(t - 1, 3) + c1 * pow(t - 1, 2);
}
