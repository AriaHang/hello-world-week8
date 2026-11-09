# Bath Time! — a one button game

Hello World · Week 7 · Xinyu (Aria) Hang

Five little animals need a bath. Every animal wants a **different amount of water**,
and some of them have their own rules.

## How to play (one button)

**Space**, **click** or **tap** — that is the only button.

| | |
| --- | --- |
| **HOLD** | the hose swings up and down by itself (**direction**) and the water tank pumps up and down (**power**) |
| **LET GO** | splash! the water flies in an arc |

Fill the tub until the water is **between the two pink dashed lines**.
Too little = still dirty. Too much = it overflows.
Each animal gives you a few splashes. If you fail, you just try the same animal again.

While you hold, a **dotted guide line** shows where the water will land
(green ring = in the tub, pink ring = on the face, white ring = miss).

The idea comes from a golf one-button game shown in class:
one button controls two things at the same time, so you have to wait for the right
direction **and** the right power before you let go.

## The animals

| # | Animal | Rule |
| --- | --- | --- |
| 1 | Duckling | Easy. Ducks love a splash on the head. One good splash. |
| 2 | Puppy | Very muddy: needs two good splashes. |
| 3 | Kitten | Small tub, small hose. Only a little water, and **don't splash her face!** |
| 4 | Froggy | The tub floats left and right. Wait for the right moment. |
| 5 | Big Ellie | A huge tub far away. Three full splashes. |

**Stars:** the more of your water lands in the tub (not on the floor), the more stars you get (1–3).

## How to run

Open the folder in VS Code → select `index.html` → **Go Live**.
Or open the GitHub Pages link. It also works on a phone (tap = the button).

## How the code works

The game is a **state machine**:

```
title → intro → aim ⇄ fly → result → intro (next animal) … → end → title
```

- In `aim`, pressing starts holding, letting go fires.
- In every other state, pressing just means "continue".

Seven classes in `sketch.js`:

- **`Hose`** — the cute water tank. Swings the nozzle with `sin()` and pumps the power with `cos()` while you hold.
- **`Drop`** — one drop of water. Each frame: `vy += gravity`, then move.
- **`Tub`** — water level, the perfect zone, catches drops that fall in from above.
- **`Animal`** — draws each animal with shapes and moods (idle, happy, wet, scared, sad) and checks if a drop hits its face.
- **`Bubble`** — soap bubbles, splashes, hearts and puddles.
- **`Sounds`** — tiny sounds made with the Web Audio API (no sound files).
- **`Game`** — the state machine, level rules, win / lose and stars.

All levels are in the `LEVELS` list at the top, so it is easy to add a new animal:
change the tub size, the water per splash, the perfect zone and the rule.

## Files

```
bath-time/
├── index.html
├── sketch.js
├── style.css
├── libraries/
│   └── p5.min.js   (p5.js v1.4.1)
└── README.md
```
