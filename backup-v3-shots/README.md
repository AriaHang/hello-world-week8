# Bath Time! — a one button game

Hello World · Xinyu (Aria) Hang

Nine animals from three places need a bath. Every animal wants a **different amount of water**,
has its own rule, and comes with a **fun fact** (some animals you may not know yet!).

## One button

**Space**, **click** or **tap** is the only button.

| Where | Tap | Hold |
| --- | --- | --- |
| Island map / animal list | next choice | choose |
| Anywhere | the round ◀ button (top left) or **ESC** goes back | |
| Bath, step 1 | the water gun stops = **direction** chosen | |
| Bath, step 2 | (quick tap = choose the direction again) | the **power** goes up. **Let go** = shoot! |

Doing one thing at a time (first direction, then power) is how many golf games work,
and it is much easier than doing both at once.

While you hold, a dotted guide shows where the water will land
(green ring = in the tub, pink ring = on the face, white ring = miss).

Fill the tub until the water is **between the two pink dashed lines**.
Too little = still dirty. Too much = it overflows. If you fail, just try again.

The idea comes from a golf one-button game shown in class.

## Rubber ducks = stars (like Cut the Rope)

Every bath has **3 rubber ducks** floating in the air. When your water touches a duck, you get it.
**Ducks = stars.** Some ducks are on a path that also fills the tub, others need an extra
splash that lands somewhere else. Think before you shoot: water in the tub always counts!
When the bath is ready but ducks are left, you get **5 more seconds** to shoot them.

The guide line shows **most of the path** (90% on the first island, about 60% on the last),
and faint dots show **where your last splash went**, so you can fix your aim.

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
| | Kitten | She **hides and peeks out** — don't splash her face when she peeks (timing!) |
| Sunny Savanna | Hippo | Big tub. ⏱ The water gets cold (timer) |
| | Rhino | A MUD bath + a **big rock** in the way. ⏱ |
| | Big Ellie | Huge tub far away + **wind** blows the water back. ⏱ |
| Rainforest | Capybara | Don't hit the **bird** (3 drops and it flies away) + a **branch** in the way. ⏱ |
| | Dart Frog | The tub **floats around** — wait for the moment. ⏱ |
| | Tapir | Fill it almost to the top + a **stump** + **wind**. ⏱ |

## Modes

- **SOLO** — travel the islands, give all 9 animals a bath and collect all 27 ducks. Your stars are **saved in the browser**, so they are still there next time.
- **VS · 2 PLAYERS** — 3 rounds, one random animal from each island. Player 1 and Player 2 take turns on the same animal (pass the computer, or share the space bar).
  Each player gets **one try**. Points = 100 for a clean animal + 100 per duck + % of water in the tub. Most points wins!

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
cover → map → island → intro (fun fact) → aim ⇄ fly → result → island …
cover → (VS) intro → aim ⇄ fly → result → next player … → vsRound → … → vsEnd
```

Files:

- **`sketch.js`** — settings, the list of islands and animals (`WORLDS`), the `Game` class (state machine, rules, stars) and the one-button input
- **`things.js`** — `Hose` (swing + pump + guide line), `Drop` (gravity), `Tub` (water level, mud), `Bubble` (bubbles, splashes, hearts, speech), `Sounds` (Web Audio, no sound files)
- **`challenges.js`** — the ducks (`Duck`, `placeDucks`), `simulateArc` (one drop without randomness: used for the guide, the last-shot trail and to make sure every duck CAN be reached), obstacles, wind and the cold-water timer
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
├── animals.js
├── screens.js
├── style.css
├── libraries/
│   ├── p5.min.js   (p5.js v1.4.1)
│   └── qrcode.js   (QR code generator by Kazuhiko Arase, MIT license)
└── README.md
```
