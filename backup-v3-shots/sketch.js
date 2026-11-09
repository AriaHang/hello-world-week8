// Bath Time! — a one button game
// Hello World — Xinyu (Aria) Hang
//
// Nine animals from three places need a bath. Each one wants a different
// amount of water, has its own rule, and comes with a fun fact.
//
// ONE BUTTON (space / click / tap):
//   In menus:  TAP = next     HOLD = choose
//   In a bath, two steps (like golf games):
//     1. the water gun swings slowly. TAP = choose this direction
//     2. HOLD = power goes up, LET GO = shoot!  (a quick tap = choose the direction again)
//
// Files:
//   sketch.js  — settings, the animal list, the game (state machine), input
//   things.js  — Hose, Drop, Tub, Bubble, Sounds
//   animals.js — how every animal looks
//   screens.js — cover, island map, animal list, fact card, backgrounds, UI
//
// State machine:
//   cover -> map -> island -> intro -> aim <-> fly -> result -> island ...

// ---------------------------------------------------------------
// Settings
// ---------------------------------------------------------------
const W = 1280; // the game is designed at this size, then scaled to fit
const H = 720;
const FLOOR = 612;
const GRAVITY = 0.32;
const HOLD_TIME = 0.45; // seconds to "hold" in menus

let S = 1, OX = 0, OY = 0;
let game, sfx;

const HEAD = "'Lilita One', 'Fredoka', 'Arial Rounded MT Bold', sans-serif";
const BODY = "'Fredoka', 'Arial Rounded MT Bold', sans-serif";
const INK = "#4a2f23"; // dark brown outline color

const C = {
  ink: INK,
  cream: "#fbf1dc",
  paper: "#f6e6c4",
  water: [118, 196, 255],
  pink: "#ff8fb1",
  red: "#e8644a",
  orange: "#f2a33a",
  yellow: "#ffd84d",
  mint: "#7fdcb5",
  blue: "#2f49d8",
  green: "#8cc25a",
};

// ---------------------------------------------------------------
// The worlds and their animals
// band = [min, max] water level (0 = empty, 1 = full) that counts as perfect
// shotSize = drops in one splash, capacity = drops to fill the tub
// ---------------------------------------------------------------
const WORLDS = [
  {
    id: "home", name: "Cozy Home", x: 250, y: 470, size: 150, top: "#9fd77d", side: "#6fa85a",
    animals: [
      {
        animal: "duck", name: "Duckling", level: 1,
        fact: "Ducks have a special oil near their tail. They spread it on their feathers, so water rolls right off!",
        rule: "Fill to the lines. Ducks LOVE a splash on the head!",
        tub: { x: 700, w: 210, h: 110 }, shotSize: 30, capacity: 70, band: [0.34, 0.66], shots: 4, swing: 1.0, face: "love", guide: 0.9,
      },
      {
        animal: "puppy", name: "Puppy", level: 1,
        fact: "A wet dog can shake off most of the water on its body in about four seconds. Stand back!",
        rule: "Very muddy! It needs TWO good splashes.",
        tub: { x: 800, w: 230, h: 120 }, shotSize: 30, capacity: 80, band: [0.62, 0.88], shots: 6, swing: 1.15, face: "shake", guide: 0.85,
      },
      {
        animal: "kitten", name: "Kitten", level: 2,
        fact: "Most cats don't like getting wet. They clean themselves with their rough little tongues instead.",
        rule: "She hides and peeks out. Do NOT splash her face when she peeks!",
        tub: { x: 720, w: 170, h: 92 }, shotSize: 12, capacity: 40, band: [0.2, 0.5], shots: 4, swing: 1.25, face: "scared", headShift: 0.2, peek: true, guide: 0.8,
      },
    ],
  },
  {
    id: "savanna", name: "Sunny Savanna", x: 640, y: 290, size: 165, top: "#f2c46b", side: "#c9934a",
    animals: [
      {
        animal: "hippo", name: "Hippo", level: 1,
        fact: "Hippos stay in water most of the day. Their skin makes a red-orange liquid that works like sunscreen!",
        rule: "A big tub for a big friend. She likes splashes on the face!",
        tub: { x: 880, w: 250, h: 135 }, shotSize: 40, capacity: 110, band: [0.5, 0.9], shots: 6, swing: 1.0, face: "love", guide: 0.75, timer: 50,
      },
      {
        animal: "rhino", name: "Rhino", level: 2, mud: true,
        fact: "Rhinos love rolling in mud. The mud keeps their skin cool and protects it from sun and bugs.",
        rule: "A MUD bath! Only a little water. Shoot over the big rock!",
        tub: { x: 780, w: 210, h: 105 }, shotSize: 18, capacity: 70, band: [0.18, 0.42], shots: 4, swing: 1.1, face: "none", guide: 0.7, timer: 45,
        obstacles: [{ x: 480, y: 330, w: 90, h: 282, kind: "rock" }],
      },
      {
        animal: "elephant", name: "Big Ellie", level: 3,
        fact: "An elephant can suck up about 8 liters of water with its trunk and spray it like a shower!",
        rule: "A huge tub, far away, and the WIND blows the water back!",
        tub: { x: 1040, w: 260, h: 150 }, shotSize: 40, capacity: 140, band: [0.74, 0.96], shots: 7, swing: 1.15, face: "none", guide: 0.65, timer: 55, wind: -0.02,
      },
    ],
  },
  {
    id: "jungle", name: "Rainforest", x: 1030, y: 480, size: 155, top: "#5cc46a", side: "#3c8f50",
    animals: [
      {
        animal: "capybara", name: "Capybara", level: 2,
        fact: "The capybara is the biggest rodent in the world. It is so calm that birds often sit on its head!",
        rule: "Don't hit the little bird on his head! Watch out for the branch.",
        tub: { x: 830, w: 220, h: 110 }, shotSize: 26, capacity: 70, band: [0.3, 0.6], shots: 4, swing: 1.1, face: "bird", guide: 0.65, timer: 45,
        obstacles: [{ x: 470, y: 250, w: 230, h: 26, kind: "branch" }],
      },
      {
        animal: "dartfrog", name: "Dart Frog", level: 2,
        fact: "Bright colors mean \"Don't eat me!\" Poison dart frogs live in rainforests, and most are smaller than your thumb.",
        rule: "The tub is floating around. Wait for the right moment!",
        tub: { x: 820, w: 175, h: 96, move: 160, moveSpeed: 0.9 }, shotSize: 24, capacity: 60, band: [0.3, 0.62], shots: 5, swing: 1.1, face: "love", guide: 0.6, timer: 45,
      },
      {
        animal: "tapir", name: "Tapir", level: 3,
        fact: "Tapirs look like pigs, but they are cousins of horses and rhinos. They swim well and can use their nose like a snorkel!",
        rule: "Fill it almost to the top! Mind the stump and the wind.",
        tub: { x: 900, w: 220, h: 120 }, shotSize: 30, capacity: 70, band: [0.8, 0.98], shots: 6, swing: 1.15, face: "none", guide: 0.6, timer: 55, wind: 0.015,
        obstacles: [{ x: 560, y: 440, w: 70, h: 172, kind: "stump" }],
      },
    ],
  },
];

const TOTAL_ANIMALS = WORLDS.reduce((n, w) => n + w.animals.length, 0);

// ---------------------------------------------------------------
// Game: the state machine
// ---------------------------------------------------------------
class Game {
  constructor() {
    this.state = "cover";
    this.stateTime = 0;
    this.worldIndex = 0;
    this.animalIndex = 0;
    this.mapSel = 0; // selected island on the map
    this.listSel = 0; // selected card on the island (3 = back to map)
    this.best = loadProgress(); // best stars for each animal, e.g. best["0-1"] = 3
    this.photos = loadPhotos(); // one photo for every clean animal
    this.flash = 0;
    this.mode = "solo"; // "solo" or "vs" (two players take turns)
    this.coverSel = 0; // 0 = solo, 1 = vs
    this.hose = new Hose();
    this.drops = [];
    this.effects = [];
    this.holding = false;
    this.downTime = 0;
    this.menuFired = false;
    this.ignoreRelease = false;
    this.birdFly = null;
    this.loadLevel(0, 0);
  }

  get world() {
    return WORLDS[this.worldIndex];
  }

  key(w, a) {
    return w + "-" + a;
  }

  get totalStars() {
    return Object.values(this.best).reduce((a, b) => a + b, 0);
  }

  cleanCount(wi) {
    let n = 0;
    WORLDS[wi].animals.forEach((a, i) => { if (this.best[this.key(wi, i)] !== undefined) n++; });
    return n;
  }

  get allClean() {
    return Object.keys(this.best).length === TOTAL_ANIMALS;
  }

  loadLevel(wi, ai) {
    this.worldIndex = wi;
    this.animalIndex = ai;
    let cfg = Object.assign({ world: WORLDS[wi].id }, WORLDS[wi].animals[ai]);
    this.cfg = cfg;
    this.tub = new Tub(cfg);
    this.animal = new Animal(cfg, this.tub);
    this.shotsLeft = cfg.shots;
    this.fired = 0;
    this.landed = 0;
    this.toEmit = 0;
    this.drops = [];
    this.failReason = "";
    this.birdFly = null;
    this.hose.reset(cfg.swing);
    this.wind = cfg.wind || 0;
    this.timeLeft = cfg.timer || 0;
    this.ducksGot = 0;
    this.lastTrail = null;
    this.cleanTimer = 0; // > 0 = the bath is ready, finishing soon
    this.ducks = placeDucks(this, wi, ai); // 3 rubber ducks to collect
  }

  setState(s) {
    if (s === "aim") {
      this.idleCalled = false;
      if (this.animal) this.animal.excited = false;
      this.aimPhase = "angle";
      this.holding = false;
      this.lockPress = false;
    }
    // a soft fade when we move to a different screen
    let screens = ["cover", "map", "island", "intro"];
    if (screens.includes(s) || screens.includes(this.state)) this.fade = 1;
    this.state = s;
    this.stateTime = 0;
  }

  // the back button (or ESC): go one screen back
  back() {
    let s = this.state;
    if (s === "cover") return;
    sfx.pop();
    this.holding = false;
    if (s === "album") this.setState("map");
    else if (s === "map" || this.mode === "vs") {
      this.mode = "solo";
      this.setState("cover"); // in VS mode, back = quit the match
    } else if (s === "island") {
      this.mapSel = this.worldIndex;
      this.setState("map");
    } else {
      // leave the bath (intro, aim, fly or result) and go back to the animal list
      this.listSel = this.animalIndex;
      this.loadLevel(this.worldIndex, this.animalIndex);
      this.setState("island");
    }
  }

  isMenu() {
    return this.state === "cover" || this.state === "map" || this.state === "island";
  }

  // ---------- VS MODE: two players, same animals, take turns ----------
  startVs() {
    // one random animal from each island
    let order = WORLDS.map((w, wi) => [wi, floor(random(w.animals.length))]);
    this.vs = { order, round: 0, player: 0, total: [0, 0], turns: [] };
    this.mode = "vs";
    this.loadLevel(order[0][0], order[0][1]);
    this.setState("intro");
  }

  // points for one turn: 100 for a clean animal + 100 per duck + % of water in the tub (0 if you fail)
  vsPoints() {
    if (!this.win) return 0;
    return 100 + this.stars * 100 + round((this.landed / max(1, this.fired)) * 100);
  }

  vsNextTurn() {
    let v = this.vs;
    let pts = this.vsPoints();
    v.total[v.player] += pts;
    v.turns.push({ round: v.round, player: v.player, win: this.win, stars: this.win ? this.stars : 0, pts });
    if (v.player === 0) {
      v.player = 1; // same animal, now player 2
      let [wi, ai] = v.order[v.round];
      this.loadLevel(wi, ai);
      this.setState("intro");
    } else {
      this.setState("vsRound"); // show who won this round
    }
  }

  vsAfterRound() {
    let v = this.vs;
    v.round++;
    v.player = 0;
    if (v.round >= v.order.length) {
      this.setState("vsEnd");
      sfx.win();
      for (let i = 0; i < 80; i++) this.effects.push(new Bubble(random(W), -20, "confetti"));
    } else {
      let [wi, ai] = v.order[v.round];
      this.loadLevel(wi, ai);
      this.setState("intro");
    }
  }

  // ---------- ONE BUTTON ----------
  press() {
    sfx.start();
    this.downTime = millis();
    this.menuFired = false;
    if (this.state === "aim") {
      if (this.aimPhase === "angle") {
        // step 1: tap to stop the water gun at this direction
        this.aimPhase = "power";
        this.lockPress = true;
        sfx.tick();
      } else {
        // step 2: hold for power
        this.holding = true;
        this.hose.startHold();
        this.animal.excited = true; // your friend gets excited!
      }
    }
  }

  release() {
    let s = this.state;
    if (s === "aim" && this.lockPress) {
      this.lockPress = false; // this was the "stop direction" tap
    } else if (s === "aim" && this.holding) {
      this.holding = false;
      if (millis() - this.downTime < 180) {
        // a very quick tap = I want to choose the direction again
        this.aimPhase = "angle";
        this.animal.excited = false;
        sfx.tick();
      } else this.fire();
    } else if (this.isMenu()) {
      if (!this.menuFired) this.menuNext(); // a short tap = next
    } else if (s === "album" && this.stateTime > 0.4) {
      sfx.pop();
      this.setState("map");
    } else if (s === "vsRound" && this.stateTime > 0.6) {
      sfx.pop();
      this.vsAfterRound();
    } else if (s === "vsEnd" && this.stateTime > 1) {
      sfx.pop();
      this.mode = "solo";
      this.setState("cover");
    } else if (s === "intro" && this.stateTime > 0.4) {
      sfx.pop();
      this.setState("aim");
    } else if (s === "result" && this.stateTime > 0.6) {
      sfx.pop();
      if (this.mode === "vs") {
        this.vsNextTurn(); // in VS mode everyone gets one try
      } else if (this.win) {
        this.listSel = this.cleanCount(this.worldIndex) === 3 ? 3 : min(this.animalIndex + 1, 2);
        this.setState("island");
      } else {
        this.loadLevel(this.worldIndex, this.animalIndex);
        this.setState("aim");
      }
    }
  }

  // tap in a menu: move to the next choice
  menuNext() {
    sfx.tick();
    if (this.state === "cover") this.coverSel = 1 - this.coverSel;
    else if (this.state === "map") this.mapSel = (this.mapSel + 1) % (WORLDS.length + 1); // + the album
    else this.listSel = (this.listSel + 1) % 4;
  }

  // hold in a menu: choose
  menuChoose() {
    sfx.pop();
    if (this.state === "cover") {
      if (this.coverSel === 0) {
        this.mode = "solo";
        this.setState("map");
      } else this.startVs();
    } else if (this.state === "map" && this.mapSel === WORLDS.length) {
      this.setState("album");
    } else if (this.state === "map") {
      this.worldIndex = this.mapSel;
      this.listSel = 0;
      for (let i = 2; i >= 0; i--) {
        if (this.best[this.key(this.mapSel, i)] === undefined) this.listSel = i; // first dirty animal
      }
      this.setState("island");
    } else if (this.listSel === 3) {
      this.mapSel = this.worldIndex;
      this.setState("map");
    } else {
      this.loadLevel(this.worldIndex, this.listSel);
      this.setState("intro");
    }
  }

  // how far the menu "hold" has filled (0..1)
  get holdAmount() {
    if (!buttonDown || !this.isMenu() || this.menuFired) return 0;
    return constrain((millis() - this.downTime) / 1000 / HOLD_TIME, 0, 1);
  }

  fire() {
    let tip = this.hose.tip();
    this.shot = { a: tip.a, v: this.hose.speedFromPower(this.hose.power) };
    this.lastTrail = simulateArc(this, -this.hose.angle, this.hose.power).points;
    this.toEmit = this.cfg.shotSize;
    this.shotsLeft--;
    this.shotDucks = 0; // ducks caught by this splash
    this.shotLanded = 0; // drops that went in the tub with this splash
    this.animal.excited = false;
    sfx.splash();
    this.setState("fly");
  }

  // ---------- UPDATE ----------
  update(dt) {
    this.stateTime += dt / 60;
    this.flash = max(0, this.flash - 0.05 * dt);
    if (this.state === "result" && this.win && this.mode === "solo" && !this.photoTaken && this.stateTime > 0.5) {
      this.wantPhoto = true; // taken at the start of the next draw(), before the screen is cleared
    }
    this.fade = max(0, (this.fade || 0) - 0.07 * dt);

    // menu: holding long enough = choose
    if (this.isMenu() && buttonDown && !this.menuFired && this.holdAmount >= 1) {
      this.menuFired = true;
      this.menuChoose();
    }

    for (let e of this.effects) e.update(dt);
    this.effects = this.effects.filter((e) => e.life > 0 && e.y > -60);

    let playing = this.state === "aim" || this.state === "fly" || this.state === "result";
    if (!playing) return;

    if (this.state !== "fly") this.hose.update(dt, this.state === "aim" ? this.aimPhase : "angle", this.holding);
    this.hose.updateMood(dt);
    this.tub.update(dt);
    this.animal.update(dt);
    for (let d of this.ducks) d.update(dt);

    // the eyes follow the water, or look at you (the water gun)
    if (this.drops.length) this.animal.lookAt(this.drops[0].x, this.drops[0].y);
    else this.animal.lookAt(this.hose.x, this.hose.y);

    // waiting too long? your friend calls you
    if (this.state === "aim" && this.aimPhase === "angle" && this.stateTime > 7 && !this.idleCalled) {
      this.idleCalled = true;
      this.say(random(IDLE_TALK));
      this.animal.jump(6);
    }

    // bath ready: count down, then finish (paused while you aim the power)
    if (this.cleanTimer > 0 && this.state === "aim" && this.aimPhase === "angle") {
      this.cleanTimer -= dt / 60;
      if (this.cleanTimer <= 0) return this.finish(true);
    }

    // the water gets cold (only on the later islands)
    if (this.cfg.timer && (this.state === "aim" || this.state === "fly")) {
      this.timeLeft = max(0, this.timeLeft - dt / 60);
      if (this.timeLeft <= 0 && this.state === "aim" && this.cleanTimer > 0) return this.finish(true);
      if (this.timeLeft <= 0 && this.state === "aim") {
        this.failReason = "Brrr... the water got cold!";
        this.animal.setMood("sad", 99);
        this.say("So cold!");
        return this.finish(false);
      }
    }
    // mud disappears as the water gets close to the perfect zone
    this.animal.dirt = 1 - constrain(this.tub.level / this.cfg.band[0], 0, 1);

    // pour out the drops of this splash over a short time
    if (this.state === "fly" && this.toEmit > 0) {
      let perFrame = max(1, this.cfg.shotSize / 16);
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

    if (this.animal.mood === "happy" && random() < 0.15) {
      this.effects.push(new Bubble(this.animal.hx + random(-60, 60), this.animal.hy - 20, random() < 0.5 ? "heart" : "soap"));
    }
    if (this.birdFly) {
      this.birdFly.x += 4 * dt;
      this.birdFly.y -= 3 * dt;
    }

    if (this.state === "fly" && this.toEmit === 0 && this.drops.length === 0 && this.stateTime > 0.4) {
      this.afterShot();
    }
  }

  checkDrop(d) {
    if (!d.alive) return;
    let tub = this.tub;
    let a = this.animal;
    let face = this.cfg.face;

    // rubber ducks: the water touches them and keeps flying
    for (let duck of this.ducks) {
      if (duck.touches(d.x, d.y)) {
        duck.got = true;
        this.ducksGot++;
        this.shotDucks++;
        sfx.duck();
        for (let i = 0; i < 4; i++) this.effects.push(new Bubble(duck.x, duck.y, "heart"));
        let pop = new Bubble(duck.x, duck.y - 30, "pop");
        pop.str = ["+1 DUCK!", "DOUBLE!", "TRIPLE!!"][this.shotDucks - 1];
        pop.col = ["#ffd84d", "#ff8fb1", "#7fdcb5"][this.shotDucks - 1];
        this.effects.push(pop);
        this.cheer();
      }
    }

    // rocks, branches, stumps
    if (hitsObstacle(this, d.x, d.y)) {
      d.alive = false;
      this.splashAt(d.x, d.y);
      return;
    }

    // the capybara's little bird: it can take 3 drops, then it flies away
    if (a.hitsBird(d.x, d.y)) {
      d.alive = false;
      this.splashAt(d.x, d.y);
      a.birdHits++;
      if (a.birdHits >= 3) {
        a.birdGone = true;
        a.setMood("sad", 99);
        this.birdFly = { x: a.hx, y: a.hy - a.r * 1.05 };
        this.failReason = "You scared the little bird away!";
        sfx.tweet();
      } else {
        this.say(a.birdHits === 1 ? "Tweet?" : "TWEET!!");
      }
      return;
    }

    // the face
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
        if (a.type === "duck") sfx.quack();
        this.say(a.type === "duck" ? "Quack!" : "Hehe~");
        this.effects.push(new Bubble(d.x, d.y, "heart"));
      } else if (face === "bird") {
        this.say("Ahh~"); // capybaras don't mind a splash at all
      } else if (face === "shake") {
        a.setMood("wet", 0.9);
        this.say("Brrr!");
      }
      tub.drops++; // the water still falls into the tub
      this.landed++;
      return;
    }

    // falls into the tub from above
    if (d.vy > 0 && d.py <= tub.top && d.y > tub.top && tub.isOverOpening(d.x)) {
      d.alive = false;
      tub.drops++;
      this.landed++;
      this.shotLanded++;
      if (random() < 0.08) a.jump(3); // a little bounce when the water comes in
      this.splashAt(d.x, tub.top);
      sfx.plop();
      return;
    }

    // hits the side of the tub
    if (tub.hitsWall(d.x, d.y) && !tub.isOverOpening(d.x)) {
      d.alive = false;
      this.splashAt(d.x, d.y);
      return;
    }

    // hits the floor
    if (d.y > FLOOR) {
      d.alive = false;
      this.splashAt(d.x, FLOOR);
      if (random() < 0.25) this.effects.push(new Bubble(d.x, FLOOR, "puddle"));
    }
  }

  // your friend is happy: a hop, a voice, a word
  cheer() {
    let talk = ANIMAL_TALK[this.animal.type];
    if (this.animal.mood !== "scared" && this.animal.mood !== "sad") this.animal.setMood("happy", 1.2);
    this.animal.jump(8);
    this.hose.happy = 1.2;
    sfx.voice(talk.voice);
    this.say(random(talk.cheer), true);
  }

  // the animal says something (one speech bubble at a time)
  say(str, force = false) {
    if (force) this.effects = this.effects.filter((e) => e.kind !== "text");
    if (this.effects.some((e) => e.kind === "text" && e.life > 0.4)) return;
    let b = new Bubble(this.animal.hx + this.animal.r * 1.4, this.animal.hy - this.animal.r * 1.4, "text");
    b.str = str;
    this.effects.push(b);
  }

  splashAt(x, y) {
    for (let i = 0; i < 2; i++) this.effects.push(new Bubble(x, y, "splash"));
  }

  // after each splash: win, lose, or keep going?
  afterShot() {
    let lv = this.tub.target;
    // a total miss: your friend laughs (in a nice way)
    if (!this.failReason && this.shotDucks === 0 && this.shotLanded === 0) {
      this.say(random(MISS_TALK), true);
      this.animal.jump(4);
    }
    let [lo, hi] = this.cfg.band;
    if (this.failReason) return this.finish(false);
    if (lv > hi) {
      this.failReason = lv > 1 ? "Oh no, it overflowed!" : "Too much water!";
      this.animal.setMood("sad", 99);
      this.say("Too much!");
      return this.finish(false);
    }
    if (lv >= lo) {
      // the bath is ready! If ducks and splashes are left, you get 5 seconds
      // to shoot more ducks (with a splash that does NOT land in the tub).
      if (this.ducksGot < 3 && this.shotsLeft > 0) {
        this.cleanTimer = 5;
        this.say("Ahh, nice~");
        this.setState("aim");
        return;
      }
      return this.finish(true);
    }
    if (this.shotsLeft <= 0) {
      this.failReason = "Not enough water... still dirty!";
      this.animal.setMood("sad", 99);
      this.say("Still dirty...");
      return this.finish(false);
    }
    this.setState("aim");
  }

  // 📸 a picture of your clean friend (the last frame, before the card shows up)
  takePhoto() {
    this.wantPhoto = false;
    this.photoTaken = true;
    let gx = constrain(this.tub.x - 210, 0, W - 420);
    let gy = constrain(this.tub.top - 190, 0, H - 315);
    let shot = get(round(OX + gx * S), round(OY + gy * S), round(420 * S), round(315 * S));
    let c = document.createElement("canvas");
    c.width = 320;
    c.height = 240;
    c.getContext("2d").drawImage(shot.canvas, 0, 0, 320, 240);
    let img = createImage(320, 240);
    img.drawingContext.drawImage(c, 0, 0);
    let k = this.key(this.worldIndex, this.animalIndex);
    this.photos[k] = img;
    this.photo = img;
    savePhoto(k, c);
    this.flash = 1;
    sfx.shutter();
  }

  finish(win) {
    this.win = win;
    this.photoTaken = false;
    this.photo = null;
    this.holding = false;
    if (win) {
      // stars = rubber ducks you collected
      this.stars = this.ducksGot;
      let k = this.key(this.worldIndex, this.animalIndex);
      if (this.mode === "solo") {
        this.best[k] = max(this.best[k] === undefined ? 0 : this.best[k], this.stars);
        saveProgress(this.best); // remember it, even after closing the page
      }
      this.animal.setMood("happy", 99);
      this.say(random(WIN_TALK), true);
      sfx.voice(ANIMAL_TALK[this.animal.type].voice);
      this.hose.happy = 3;
      for (let i = 0; i < 60; i++) this.effects.push(new Bubble(W / 2 + random(-200, 200), 260, "confetti"));
      sfx.win();
    } else {
      sfx.fail();
    }
    this.setState("result");
  }

  // ---------- DRAW ----------
  draw() {
    let s = this.state;
    if (s === "cover") drawCover(this);
    else if (s === "map") drawMap(this);
    else if (s === "island") drawIslandList(this);
    else if (s === "vsRound") drawVsRound(this);
    else if (s === "vsEnd") drawVsEnd(this);
    else if (s === "album") drawAlbum(this);
    else {
      drawWorldBackground(this.world.id);
      for (let e of this.effects) if (e.kind === "puddle") e.draw();
      drawObstacles(this);
      drawWind(this);
      if (s === "aim") drawLastTrail(this);
      this.tub.drawBack();
      this.animal.drawBody();
      this.tub.drawWater();
      this.tub.drawFront();
      this.animal.drawHeadOutlined();
      if (this.birdFly) drawLittleBird(this.birdFly.x, this.birdFly.y, 1);
      for (let duck of this.ducks) duck.draw();
      if (s !== "intro") this.hose.draw(this.holding && s === "aim", this, s === "aim" ? this.aimPhase : "");
      for (let d of this.drops) d.draw();
      for (let e of this.effects) if (e.kind !== "puddle") e.draw();
      if (s === "intro") drawIntro(this);
      else {
        drawHud(this);
        if (s === "result") drawResult(this);
      }
    }
    drawGrain(); // paper texture over everything
    if (this.flash > 0) {
      noStroke();
      fill(255, 255, 255, this.flash * 230);
      rect(0, 0, W, H);
    }
    if (this.fade > 0) {
      noStroke();
      fill(251, 241, 220, this.fade * 255);
      rect(0, 0, W, H);
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
  prepareScreens(); // draws the still backgrounds once, so it runs fast
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
  if (game.wantPhoto) game.takePhoto(); // the last frame is still on the screen here
  background("#2a1d17");
  let dt = min(deltaTime / (1000 / 60), 2.5); // 1 = one normal frame
  game.update(dt);
  push();
  translate(OX, OY);
  scale(S);
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(0, 0, W, H); // keep everything inside the game area
  drawingContext.clip();
  game.draw();
  drawingContext.restore();
  pop();
}

// ---------------------------------------------------------------
// Saving progress in the browser (localStorage).
// try/catch: some browsers block it (for example private windows).
// ---------------------------------------------------------------
function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem("bath-time-stars")) || {};
  } catch (e) {
    return {};
  }
}

// photos are saved as small JPG pictures (text "data URLs")
function loadPhotos() {
  let photos = {};
  try {
    let saved = JSON.parse(localStorage.getItem("bath-time-photos")) || {};
    for (let k in saved) photos[k] = loadImage(saved[k]);
  } catch (e) {}
  return photos;
}

function savePhoto(k, canvas) {
  try {
    let saved = JSON.parse(localStorage.getItem("bath-time-photos")) || {};
    saved[k] = canvas.toDataURL("image/jpeg", 0.8);
    localStorage.setItem("bath-time-photos", JSON.stringify(saved));
  } catch (e) {}
}

function saveProgress(best) {
  try {
    localStorage.setItem("bath-time-stars", JSON.stringify(best));
  } catch (e) {}
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
  if (keyCode === ESCAPE || keyCode === BACKSPACE) {
    game.back();
    return false;
  }
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

// clicking the round back button (top left) is not the game button
let backClick = false;

function mousePressed() {
  let gx = (mouseX - OX) / S; // mouse position in game coordinates
  let gy = (mouseY - OY) / S;
  if (game.state !== "cover" && game.state !== "fly" && backButtonHit(gx, gy)) {
    backClick = true;
    game.back();
    return false;
  }
  buttonPress();
  return false;
}

function mouseReleased() {
  if (backClick) {
    backClick = false;
    return false;
  }
  buttonRelease();
  return false;
}
