# Bath Time! — a one button game

Hello World · Xinyu (Aria) Hang

Nine animals from three places need a bath. Every animal wants a **different amount of water**,
has its own rule, and comes with a **fun fact** (some animals you may not know yet!).

## One button

**Space**, **click** or **tap** is the only button.

| Where | Tap | Hold |
| --- | --- | --- |
| Menus (cover, map, animal list) | next choice | choose |
| Anywhere | the round ◀ button (top left) or **ESC** goes back | |
| In a bath | — | **water sprays** from the shower head. **Let go** = it stops |
| Anywhere | **M** = music on / off | |

The shower head swings slowly up and down by itself. Wait until it points at the tub,
**hold** to spray, and **let go** when the water is between the two pink lines.
A faint dotted line shows where the water will go.

Mistakes (too much water, a splash on the kitten's face, hitting the capybara's bird)
cost **one heart**, not the whole bath. You have **3 hearts**.

## Three modes

- **ISLAND TRIP** — 3 islands, 9 animals. Each has its own rule and a fun fact.
- **BATH RUSH** — endless! Tubs ride on a moving belt. Fill each one before it leaves.
  Clean animals in a row = **COMBO** (up to x5). Hit floating ducks for +50.
  The belt gets faster. Your **best score** is saved.
- **VS · 2 PLAYERS** — take turns on the same 3 animals. Points = 100 for clean + 100 per duck + 50 per heart left.

## Rubber ducks = stars (like Cut the Rope)

Every bath has **3 rubber ducks** floating in the air. Sweep the water stream across them to collect them.
**Ducks = stars.** But careful: water that falls in the tub counts, so don't overfill it!

## Juice

Each drop in the tub goes "plip" a little higher as the tub fills. The water sprays with a soft "shhh",
the screen shakes on big moments, confetti pops on a clean bath, and a little tune plays (made with code).

## Photo album

When an animal is clean, the game says **"SAY CHEESE!"** and takes a **photo** (with a flash).
The photo shows up on the result card like an instant photo, and it is saved in the
**PHOTO ALBUM** (choose ALBUM on the island map). Photos are saved in the browser too.

## Your animal friends play with you

- Their **eyes follow** the water (and look at you when you wait).
- When you **charge** the water gun, they get excited and wiggle.
- When you catch a duck they **hop, cheer and talk** ("Woof woof!", "Ribbit!", "Toot toot!"),
  and every animal has its own little **voice**. Catch 2 or 3 ducks with one splash: **DOUBLE! / TRIPLE!!**
- Miss everything and they laugh: "Hehe, missed!". Wait too long and they call: "Over here!"
- A clean animal does a **happy dance**, and the water tank buddy dances too.

## The islands and animals

| Island | Animal | What makes it special |
| --- | --- | --- |
| Cozy Home | Duckling | Easy. Ducks love a splash on the head |
| | Puppy | Very muddy: two good splashes |
| | Kitten | She **hides and peeks out** — a splash on her face when she peeks = -1 heart |
| Sunny Savanna | Hippo | Big tub. She likes face splashes |
| | Rhino | A MUD bath + a **big rock** in the way. |
| | Big Ellie | Huge tub far away + **wind** blows the water back. |
| Rainforest | Capybara | Don't hit the **bird** (-1 heart, it flies away and comes back) + a **branch** in the way |
| | Dart Frog | The tub **floats around** — wait for the moment. |
| | Tapir | Fill it almost to the top + a **stump** + **wind**. |

## Play on a phone (QR code)

When the game is online (GitHub Pages), the cover shows a **QR code**.
Classmates scan it and play on their own phones — tapping the screen is the one button.

## Art direction

- **Cover**: sticker style (thick yellow + blue outlines, halftone dots, swirls)
- **Map**: little floating islands, one for each place
- **Animal list + fact card**: warm, flat, hand-drawn look with dark brown outlines,
  a sunburst badge and chunky buttons
- A light **paper grain** on top of everything

## How to run

Open the folder in VS Code → select `index.html` → **Go Live**.
Or open the GitHub Pages link. It works on a phone too (tap = the button).

## How the code works

The game is a **state machine**:

```
cover → map → island → intro (fun fact) → aim (hold = spray) → result → island …
cover → rush → rushOver → rush …
cover → (VS) intro → aim → result → next player … → vsRound → … → vsEnd
```

Files:

- **`sketch.js`** — settings, the list of islands and animals (`WORLDS`), the `Game` class (state machine, rules, stars) and the one-button input
- **`things.js`** — `Hose` (swing + pump + guide line), `Drop` (gravity), `Tub` (water level, mud), `Bubble` (bubbles, splashes, hearts, speech), `Sounds` (Web Audio, no sound files)
- **`challenges.js`** — the ducks (`Duck`, `placeDucks`), `simulateArc` (one drop without randomness: used for the guide, the last-shot trail and to make sure every duck CAN be reached), obstacles, wind and the cold-water timer
- **`rush.js`** — BATH RUSH: the moving belt, combo, hearts and best score
- **`music.js`** — a little looping tune made with Web Audio (bass + chords + random notes from a pentatonic scale)
- **`animals.js`** — `Animal`: every animal is drawn with simple shapes, with moods (idle, happy, wet, scared, sad) and mud spots that disappear when it is clean
- **`screens.js`** — cover, island map, animal list, fact card, the three backgrounds, HUD and result card

Still backgrounds are drawn once into hidden layers (`createGraphics`) so the game runs fast.
Animal heads get their outline by drawing a one-color copy of the head 16 times in a circle around it.

To add a new animal: add it to `WORLDS` in `sketch.js` (tub size, water per splash,
perfect zone, rule, fact) and draw its head in `animals.js`.

## Files

```
bath-time/
├── index.html
├── sketch.js
├── things.js
├── challenges.js
├── rush.js
├── music.js
├── animals.js
├── screens.js
├── style.css
├── libraries/
│   ├── p5.min.js   (p5.js v1.4.1)
│   └── qrcode.js   (QR code generator by Kazuhiko Arase, MIT license)
└── README.md
```
