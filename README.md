# 🥋 Stickman Clash: Arcade Fighting Game

A fast-paced, retro-cyber arcade stickman fighting game built with HTML5 Canvas, Vanilla JavaScript, and the Web Audio API.

![Stickman Clash Banner](https://img.shields.io/badge/Mode-1P_vs_CPU_%7C_Local_2P-cyan?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Tech-HTML5_Canvas_•_Vanilla_JS_•_Web_Audio-ff1744?style=for-the-badge)

---

## ✨ Features

- **Procedural Skeletal Animation**: Physics-based stickman bone IK (head, flowing headband, spine, elbows, fists, knees, feet).
- **Dual-Layer Health Bars**: Dynamic health reduction display featuring immediate drop and lingering amber damage drain bars.
- **Combat Visual FX**:
  - Floating damage numbers (`-10`, `CRIT! -24`, `BLOCKED -4`, `SUPER! -32`).
  - Directional hit sparks, shockwave rings, and ground dust clouds.
  - Screen shake and hit-stop (mini freeze-frame) for authentic punch weight.
  - Multi-hit combo counter (`2 HITS!`, `3 HITS!`).
- **Play Against Computer (AI)**:
  - 3 Difficulty settings: **Easy** (casual), **Medium** (balanced defense & combos), and **Hard** (aggressive, reactive blocking, counter-attacks).
- **Local 2-Player (PvP)**: Two players can fight on the same keyboard.
- **Training / Practice Mode**: Spar against a dummy with infinite health to practice combos.
- **3 Dynamic Stages**:
  - Neon Cyber Rooftop (animated rain, neon city lights, moon).
  - Sunset Pagoda Dojo (cherry blossom petal physics).
  - Underground Cage Arena (floodlights & hazard stripes).
- **Procedural Web Audio Engine**: Zero external audio files required! Synthesizes punches, kicks, blocks, special blasts, and optional retro arcade music in real-time.

---

## 🎮 Controls

### Player 1 (Cyan Hero)
- **Move Left / Right**: `A` / `D`
- **Jump**: `W`
- **Guard / Crouch**: `S` or `Space` (absorbs 75% damage & prevents knockback)
- **Light Punch**: `F`
- **Heavy Kick**: `G`
- **Aerial Dive Kick**: Airborne + `G`
- **Super Dragon Rush**: `R` *(requires 50% Super Meter)*

### Player 2 (Red Shadow / Local PvP)
- **Move Left / Right**: `←` / `→`
- **Jump**: `↑`
- **Guard / Crouch**: `↓` or `Num 0` or `M`
- **Light Punch**: `J` or `Num 1` or `,`
- **Heavy Kick**: `K` or `Num 2` or `.`
- **Aerial Dive Kick**: Airborne + `K`
- **Super Shadow Strike**: `L` or `Num 3` or `/` *(requires 50% Super Meter)*

---

## 🚀 How to Run

1. Clone this repository:
   ```bash
   git clone https://github.com/aniruddhabose312/stickman-fight-game.git
   ```
2. Open `index.html` directly in any modern web browser (Chrome, Edge, Firefox, Brave, Safari).
3. No build tools, Node.js, or external dependencies required!
