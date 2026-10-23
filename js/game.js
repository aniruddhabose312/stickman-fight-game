/**
 * Stickman Fight Game - Core Game Loop & Match Controller
 */

const GameMode = {
    VS_CPU: 'vs_cpu',
    VS_PLAYER: 'vs_player',
    PRACTICE: 'practice'
};

const MatchPhase = {
    MENU: 'menu',
    ROUND_INTRO: 'round_intro',
    FIGHTING: 'fighting',
    ROUND_OVER: 'round_over',
    MATCH_OVER: 'match_over'
};

class StickmanGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Dimensions
        this.width = 960;
        this.height = 540;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Game Configuration
        this.mode = GameMode.VS_CPU;
        this.difficulty = 'medium';
        this.stage = 'cyber'; // 'cyber', 'sunset', 'cage'
        this.phase = MatchPhase.MENU;

        // Match Stats
        this.round = 1;
        this.maxRounds = 3; // Best of 3
        this.roundTime = 90;
        this.roundTimerTicks = 0;
        this.bannerText = '';
        this.bannerSubText = '';
        this.bannerTimer = 0;

        // Hit-stop / Freeze frame on impact
        this.hitStopFrames = 0;

        // Camera & Screen Shake
        this.cameraShake = 0;
        this.shakeDecay = 0.9;
        this.cameraX = 0;
        this.cameraY = 0;

        // Weather / Ambient Stage Particles
        this.stageParticles = [];
        this.initStageParticles();

        // Fighters
        this.p1 = new StickmanFighter('p1', 'CYAN HERO', '#00e5ff', false);
        this.p2 = new StickmanFighter('p2', 'RED SHADOW', '#ff1744', true);
        this.ai = new FighterAI(this.p2, this.p1, this.difficulty);

        // Keys Tracker
        this.keys = {};
        this.setupInputListeners();

        // Sound & Particle shortcut
        this.audio = window.soundEngine;
        this.particles = window.particleManager;

        // Animation Frame
        this.lastTime = performance.now();
        this.isRunning = true;
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    initStageParticles() {
        this.stageParticles = [];
        const count = this.stage === 'cyber' ? 45 : (this.stage === 'sunset' ? 30 : 20);
        for (let i = 0; i < count; i++) {
            this.stageParticles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                speedX: this.stage === 'cyber' ? 2 : (this.stage === 'sunset' ? -1 - Math.random() * 1.5 : (Math.random() - 0.5) * 0.5),
                speedY: this.stage === 'cyber' ? 8 + Math.random() * 6 : (this.stage === 'sunset' ? 1 + Math.random() * 1.2 : -0.5 - Math.random() * 0.8),
                size: this.stage === 'sunset' ? 4 + Math.random() * 4 : (this.stage === 'cyber' ? 1.5 : 2 + Math.random() * 2),
                color: this.stage === 'cyber' ? 'rgba(0, 229, 255, 0.4)' : (this.stage === 'sunset' ? 'rgba(255, 182, 193, 0.6)' : 'rgba(255, 200, 100, 0.3)'),
                angle: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.05
            });
        }
    }

    setStage(stageName) {
        this.stage = stageName;
        this.initStageParticles();
    }

    startMatch(mode, difficulty = 'medium') {
        this.mode = mode;
        this.difficulty = difficulty;
        this.ai.setDifficulty(difficulty);

        if (this.mode === GameMode.VS_CPU) {
            this.p2.name = `CPU (${difficulty.toUpperCase()})`;
        } else if (this.mode === GameMode.PRACTICE) {
            this.p2.name = 'PRACTICE DUMMY';
        } else {
            this.p2.name = 'PLAYER 2';
        }

        this.round = 1;
        this.p1.roundsWon = 0;
        this.p2.roundsWon = 0;

        // UI elements update
        document.getElementById('p1-name-display').innerText = this.p1.name;
        document.getElementById('p2-name-display').innerText = this.p2.name;
        this.updateRoundsIndicator();

        this.startRound();
        this.hideAllMenus();
    }

    startRound() {
        this.phase = MatchPhase.ROUND_INTRO;
        this.roundTime = this.mode === GameMode.PRACTICE ? 999 : 90;
        this.roundTimerTicks = 0;

        this.p1.resetForRound(260, 1);
        this.p2.resetForRound(700, -1);
        if (this.particles) this.particles.clear();

        this.bannerText = `ROUND ${this.round}`;
        this.bannerSubText = 'READY...';
        this.bannerTimer = 90;

        if (this.audio) this.audio.playGong();
    }

    hideAllMenus() {
        document.getElementById('main-menu-overlay').classList.add('hidden');
        document.getElementById('pause-menu-overlay').classList.add('hidden');
        document.getElementById('game-over-overlay').classList.add('hidden');
        document.getElementById('hud-container').classList.remove('hidden');
    }

    showMainMenu() {
        this.phase = MatchPhase.MENU;
        document.getElementById('main-menu-overlay').classList.remove('hidden');
        document.getElementById('pause-menu-overlay').classList.add('hidden');
        document.getElementById('game-over-overlay').classList.add('hidden');
        document.getElementById('hud-container').classList.add('hidden');
    }

    setupInputListeners() {
        window.addEventListener('keydown', (e) => {
            this.audio.init(); // Initialize audio context on first user keydown

            // Avoid scrolling page with arrow keys or space
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }

            if (!this.keys[e.code]) {
                this.keys[e.code] = true;
                this.handleKeyDownOnce(e.code);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.handleKeyUp(e.code);
        });
    }

    handleKeyDownOnce(code) {
        if (code === 'Escape') {
            this.togglePause();
            return;
        }

        if (this.phase !== MatchPhase.FIGHTING && this.phase !== MatchPhase.ROUND_INTRO) return;

        // PLAYER 1 COMBAT INPUTS
        if (code === 'KeyW') {
            this.p1.jump();
        } else if (code === 'KeyF') {
            this.p1.punch();
        } else if (code === 'KeyG') {
            this.p1.kick();
        } else if (code === 'KeyR') {
            this.p1.special();
        }

        // PLAYER 2 COMBAT INPUTS (When not VS_CPU)
        if (this.mode === GameMode.VS_PLAYER) {
            if (code === 'ArrowUp') {
                this.p2.jump();
            } else if (code === 'KeyJ' || code === 'Numpad1' || code === 'Comma') {
                this.p2.punch();
            } else if (code === 'KeyK' || code === 'Numpad2' || code === 'Period') {
                this.p2.kick();
            } else if (code === 'KeyL' || code === 'Numpad3' || code === 'Slash') {
                this.p2.special();
            }
        }
    }

    handleKeyUp(code) {
        if (code === 'KeyS' || code === 'Space') {
            this.p1.block(false);
        }
        if (this.mode === GameMode.VS_PLAYER && (code === 'ArrowDown' || code === 'Numpad0' || code === 'KeyM')) {
            this.p2.block(false);
        }
    }

    processContinuousInput() {
        if (this.phase !== MatchPhase.FIGHTING) return;

        // PLAYER 1 Movement & Blocking
        const p1Left = this.keys['KeyA'];
        const p1Right = this.keys['KeyD'];
        const p1CrouchBlock = this.keys['KeyS'] || this.keys['Space'];

        if (p1CrouchBlock) {
            this.p1.block(true);
        } else {
            this.p1.block(false);
            if (p1Left && !p1Right) {
                this.p1.move(-1);
            } else if (p1Right && !p1Left) {
                this.p1.move(1);
            } else {
                this.p1.stopMoving();
            }
        }

        // PLAYER 2 Movement & Blocking (Multiplayer)
        if (this.mode === GameMode.VS_PLAYER) {
            const p2Left = this.keys['ArrowLeft'];
            const p2Right = this.keys['ArrowRight'];
            const p2CrouchBlock = this.keys['ArrowDown'] || this.keys['Numpad0'] || this.keys['KeyM'];

            if (p2CrouchBlock) {
                this.p2.block(true);
            } else {
                this.p2.block(false);
                if (p2Left && !p2Right) {
                    this.p2.move(-1);
                } else if (p2Right && !p2Left) {
                    this.p2.move(1);
                } else {
                    this.p2.stopMoving();
                }
            }
        } else if (this.mode === GameMode.VS_CPU) {
            // AI updates CPU player
            this.ai.update();
        } else if (this.mode === GameMode.PRACTICE) {
            // In practice, regenerate dummy health if low
            if (this.p2.health < 40) {
                this.p2.health = 100;
                this.p2.displayHealth = 100;
            }
        }
    }

    checkHitboxCollisions() {
        if (this.phase !== MatchPhase.FIGHTING) return;

        // Check P1 attacking P2
        if (this.p1.hitbox && !this.p1.attackHasHit) {
            if (this.testCollision(this.p1.hitbox, this.p2.hurtbox)) {
                this.p1.attackHasHit = true;
                this.p2.takeHit(this.p1.hitbox, this.p1);
                this.shakeCamera(this.p1.hitbox.isSpecial ? 14 : (this.p1.hitbox.isHeavy ? 9 : 5));
                this.hitStopFrames = this.p1.hitbox.isSpecial ? 5 : 3;
            }
        }

        // Check P2 attacking P1
        if (this.p2.hitbox && !this.p2.attackHasHit) {
            if (this.testCollision(this.p2.hitbox, this.p1.hurtbox)) {
                this.p2.attackHasHit = true;
                this.p1.takeHit(this.p2.hitbox, this.p2);
                this.shakeCamera(this.p2.hitbox.isSpecial ? 14 : (this.p2.hitbox.isHeavy ? 9 : 5));
                this.hitStopFrames = this.p2.hitbox.isSpecial ? 5 : 3;
            }
        }
    }

    testCollision(circle, rect) {
        // Circle vs AABB Collision Check
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

        const distanceX = circle.x - closestX;
        const distanceY = circle.y - closestY;

        return (distanceX * distanceX + distanceY * distanceY) < (circle.radius * circle.radius);
    }

    shakeCamera(intensity) {
        this.cameraShake = Math.max(this.cameraShake, intensity);
    }

    update() {
        // Hit-stop effect (mini pause on contact)
        if (this.hitStopFrames > 0) {
            this.hitStopFrames--;
            return;
        }

        // Camera shake decay
        if (this.cameraShake > 0.2) {
            this.cameraShake *= this.shakeDecay;
            this.cameraX = (Math.random() - 0.5) * this.cameraShake * 2;
            this.cameraY = (Math.random() - 0.5) * this.cameraShake * 2;
        } else {
            this.cameraShake = 0;
            this.cameraX = 0;
            this.cameraY = 0;
        }

        // Ambient particles update
        this.updateStageParticles();

        // Round intro state
        if (this.phase === MatchPhase.ROUND_INTRO) {
            this.bannerTimer--;
            if (this.bannerTimer === 40) {
                this.bannerSubText = 'FIGHT!';
            }
            if (this.bannerTimer <= 0) {
                this.phase = MatchPhase.FIGHTING;
                this.bannerText = '';
                this.bannerSubText = '';
            }
        }

        // Round timer countdown
        if (this.phase === MatchPhase.FIGHTING) {
            this.roundTimerTicks++;
            if (this.roundTimerTicks >= 60) {
                this.roundTimerTicks = 0;
                if (this.mode !== GameMode.PRACTICE) {
                    this.roundTime--;
                    if (this.roundTime <= 0) {
                        this.handleTimeUp();
                    }
                }
            }
        }

        // Process inputs & AI
        this.processContinuousInput();

        // Update fighters
        this.p1.update(this.width);
        this.p2.update(this.width);

        // Auto facing: fighters turn towards each other when idle/walking
        if (this.phase === MatchPhase.FIGHTING) {
            if (this.p1.isGrounded && !this.p1.isActionLocked()) {
                this.p1.facing = this.p1.x < this.p2.x ? 1 : -1;
            }
            if (this.p2.isGrounded && !this.p2.isActionLocked() && this.mode !== GameMode.VS_CPU) {
                this.p2.facing = this.p2.x < this.p1.x ? 1 : -1;
            }
        }

        // Hitbox collision checks
        this.checkHitboxCollisions();

        // Update VFX & Floating numbers
        if (this.particles) {
            this.particles.update();
        }

        // Update HUD Health and Super gauges
        this.updateHUD();

        // Check for round win / KO
        if (this.phase === MatchPhase.FIGHTING) {
            if (this.p1.health <= 0 || this.p2.health <= 0) {
                this.handleKnockout();
            }
        } else if (this.phase === MatchPhase.ROUND_OVER) {
            this.bannerTimer--;
            if (this.bannerTimer <= 0) {
                this.evaluateMatchNextStep();
            }
        }
    }

    handleKnockout() {
        this.phase = MatchPhase.ROUND_OVER;
        this.bannerText = 'K.O.!';
        this.bannerTimer = 110;

        let winner = null;
        if (this.p1.health > 0) {
            winner = this.p1;
            this.p1.roundsWon++;
            this.p1.state = FighterState.VICTORY;
            this.bannerSubText = `${this.p1.name} WINS THE ROUND!`;
        } else if (this.p2.health > 0) {
            winner = this.p2;
            this.p2.roundsWon++;
            this.p2.state = FighterState.VICTORY;
            this.bannerSubText = `${this.p2.name} WINS THE ROUND!`;
        } else {
            this.bannerSubText = 'DOUBLE KNOCKOUT!';
        }

        this.updateRoundsIndicator();
    }

    handleTimeUp() {
        this.phase = MatchPhase.ROUND_OVER;
        this.bannerText = 'TIME UP!';
        this.bannerTimer = 110;

        if (this.p1.health > this.p2.health) {
            this.p1.roundsWon++;
            this.p1.state = FighterState.VICTORY;
            this.bannerSubText = `${this.p1.name} WINS BY HEALTH!`;
        } else if (this.p2.health > this.p1.health) {
            this.p2.roundsWon++;
            this.p2.state = FighterState.VICTORY;
            this.bannerSubText = `${this.p2.name} WINS BY HEALTH!`;
        } else {
            this.bannerSubText = 'DRAW!';
        }

        this.updateRoundsIndicator();
    }

    evaluateMatchNextStep() {
        const roundsToWin = 2; // Best of 3
        if (this.p1.roundsWon >= roundsToWin || this.p2.roundsWon >= roundsToWin || this.mode === GameMode.PRACTICE) {
            // Match is completely over!
            this.phase = MatchPhase.MATCH_OVER;
            const victor = this.p1.roundsWon > this.p2.roundsWon ? this.p1 : this.p2;
            this.showGameOverModal(victor.name);
        } else {
            // Advance to next round
            this.round++;
            this.startRound();
        }
    }

    showGameOverModal(winnerName) {
        const modal = document.getElementById('game-over-overlay');
        document.getElementById('game-over-winner-text').innerText = `${winnerName} IS THE CHAMPION!`;
        modal.classList.remove('hidden');
    }

    updateRoundsIndicator() {
        const p1Rounds = document.getElementById('p1-rounds-indicator');
        const p2Rounds = document.getElementById('p2-rounds-indicator');
        if (p1Rounds && p2Rounds) {
            p1Rounds.innerHTML = '';
            p2Rounds.innerHTML = '';
            for (let i = 0; i < 2; i++) {
                const dot1 = document.createElement('span');
                dot1.className = `round-dot ${i < this.p1.roundsWon ? 'won' : ''}`;
                p1Rounds.appendChild(dot1);

                const dot2 = document.createElement('span');
                dot2.className = `round-dot ${i < this.p2.roundsWon ? 'won' : ''}`;
                p2Rounds.appendChild(dot2);
            }
        }
    }

    updateHUD() {
        // Player 1 Health Bar Reductions
        const p1Pct = Math.max(0, (this.p1.health / this.p1.maxHealth) * 100);
        const p1DrainPct = Math.max(0, (this.p1.displayHealth / this.p1.maxHealth) * 100);
        const p1HpBar = document.getElementById('p1-hp-fill');
        const p1DrainBar = document.getElementById('p1-hp-drain');
        const p1HpText = document.getElementById('p1-hp-text');

        if (p1HpBar) p1HpBar.style.width = `${p1Pct}%`;
        if (p1DrainBar) p1DrainBar.style.width = `${p1DrainPct}%`;
        if (p1HpText) p1HpText.innerText = `${Math.ceil(this.p1.health)} / 100`;

        // Player 1 Super Meter
        const p1SuperPct = (this.p1.superMeter / this.p1.maxSuper) * 100;
        const p1SuperFill = document.getElementById('p1-super-fill');
        if (p1SuperFill) {
            p1SuperFill.style.width = `${p1SuperPct}%`;
            if (p1SuperPct >= 50) {
                p1SuperFill.classList.add('ready');
            } else {
                p1SuperFill.classList.remove('ready');
            }
        }

        // Player 2 Health Bar Reductions
        const p2Pct = Math.max(0, (this.p2.health / this.p2.maxHealth) * 100);
        const p2DrainPct = Math.max(0, (this.p2.displayHealth / this.p2.maxHealth) * 100);
        const p2HpBar = document.getElementById('p2-hp-fill');
        const p2DrainBar = document.getElementById('p2-hp-drain');
        const p2HpText = document.getElementById('p2-hp-text');

        if (p2HpBar) p2HpBar.style.width = `${p2Pct}%`;
        if (p2DrainBar) p2DrainBar.style.width = `${p2DrainPct}%`;
        if (p2HpText) p2HpText.innerText = `${Math.ceil(this.p2.health)} / 100`;

        // Player 2 Super Meter
        const p2SuperPct = (this.p2.superMeter / this.p2.maxSuper) * 100;
        const p2SuperFill = document.getElementById('p2-super-fill');
        if (p2SuperFill) {
            p2SuperFill.style.width = `${p2SuperPct}%`;
            if (p2SuperPct >= 50) {
                p2SuperFill.classList.add('ready');
            } else {
                p2SuperFill.classList.remove('ready');
            }
        }

        // Round Timer
        const timerElem = document.getElementById('match-timer');
        if (timerElem) {
            timerElem.innerText = this.mode === GameMode.PRACTICE ? '∞' : this.roundTime;
            if (this.roundTime <= 10 && this.mode !== GameMode.PRACTICE) {
                timerElem.classList.add('urgent');
            } else {
                timerElem.classList.remove('urgent');
            }
        }
    }

    updateStageParticles() {
        for (const p of this.stageParticles) {
            p.x += p.speedX;
            p.y += p.speedY;
            p.angle += p.spin;

            if (p.y > this.height) {
                p.y = -10;
                p.x = Math.random() * this.width;
            }
            if (p.x < 0) p.x = this.width;
            if (p.x > this.width) p.x = 0;
        }
    }

    drawStage(ctx) {
        if (this.stage === 'cyber') {
            this.drawCyberStage(ctx);
        } else if (this.stage === 'sunset') {
            this.drawSunsetStage(ctx);
        } else {
            this.drawCageStage(ctx);
        }
    }

    drawCyberStage(ctx) {
        // Cyber Rooftop Background
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#04040d');
        grad.addColorStop(0.65, '#0b0f24');
        grad.addColorStop(1, '#020208');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Distant Cyber Moon
        ctx.save();
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 40;
        ctx.beginPath();
        ctx.arc(this.width * 0.78, 110, 48, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.width * 0.78, 110, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // City skyline silhouettes & neon windows
        ctx.save();
        const buildings = [
            { x: 40, w: 90, h: 260 }, { x: 150, w: 120, h: 320 }, { x: 290, w: 80, h: 220 },
            { x: 390, w: 140, h: 360 }, { x: 550, w: 110, h: 280 }, { x: 680, w: 130, h: 340 },
            { x: 830, w: 100, h: 250 }
        ];

        buildings.forEach((b, i) => {
            ctx.fillStyle = '#0a0d1f';
            ctx.fillRect(b.x, this.height - b.h, b.w, b.h);

            // Neon roof antenna lights
            ctx.fillStyle = i % 2 === 0 ? '#ff1744' : '#00e5ff';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 8;
            ctx.fillRect(b.x + b.w / 2 - 1, this.height - b.h - 18, 3, 18);
            ctx.beginPath();
            ctx.arc(b.x + b.w / 2, this.height - b.h - 18, 3, 0, Math.PI * 2);
            ctx.fill();

            // Neon window grids
            ctx.fillStyle = (i % 3 === 0) ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 23, 68, 0.2)';
            for (let wy = this.height - b.h + 25; wy < this.height - 70; wy += 28) {
                for (let wx = b.x + 12; wx < b.x + b.w - 12; wx += 20) {
                    if (Math.sin(wx * 2 + wy) > 0.1) {
                        ctx.fillRect(wx, wy, 8, 12);
                    }
                }
            }
        });
        ctx.restore();

        // Rooftop Platform & Ground
        ctx.save();
        const roofGrad = ctx.createLinearGradient(0, this.height - 60, 0, this.height);
        roofGrad.addColorStop(0, '#151928');
        roofGrad.addColorStop(1, '#0a0b12');
        ctx.fillStyle = roofGrad;
        ctx.fillRect(0, this.height - 60, this.width, 60);

        // Neon edge line
        ctx.strokeStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, this.height - 60);
        ctx.lineTo(this.width, this.height - 60);
        ctx.stroke();

        // Rooftop grid markings
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
        ctx.lineWidth = 1;
        for (let x = 60; x < this.width; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, this.height - 60);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawSunsetStage(ctx) {
        // Sunset Pagoda Dojo Stage
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#240046');
        grad.addColorStop(0.35, '#7b2cbf');
        grad.addColorStop(0.65, '#ff6b6b');
        grad.addColorStop(0.85, '#ffbe0b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Giant Sunset Sun
        ctx.save();
        ctx.fillStyle = '#fff3b0';
        ctx.shadowColor = '#ff6b6b';
        ctx.shadowBlur = 50;
        ctx.beginPath();
        ctx.arc(this.width * 0.5, 230, 90, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Pagoda Silhouettes
        ctx.save();
        ctx.fillStyle = '#10002b';
        // Left Pagoda roof layers
        this.drawPagoda(ctx, 80, this.height - 60, 160);
        this.drawPagoda(ctx, this.width - 240, this.height - 60, 160);
        ctx.restore();

        // Ground Dojo Wood Platform
        ctx.save();
        ctx.fillStyle = '#1b120c';
        ctx.fillRect(0, this.height - 60, this.width, 60);
        ctx.strokeStyle = '#d4a373';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, this.height - 60);
        ctx.lineTo(this.width, this.height - 60);
        ctx.stroke();
        ctx.restore();
    }

    drawPagoda(ctx, x, y, width) {
        ctx.beginPath();
        ctx.moveTo(x - 20, y - 60);
        ctx.quadraticCurveTo(x + width / 2, y - 90, x + width + 20, y - 60);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x, y);
        ctx.fill();
    }

    drawCageStage(ctx) {
        // Underground Cage Arena
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#101015');
        grad.addColorStop(1, '#050508');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Floodlights
        ctx.save();
        const flLights = [180, this.width - 180];
        flLights.forEach(fx => {
            const cone = ctx.createRadialGradient(fx, 40, 10, fx, 300, 240);
            cone.addColorStop(0, 'rgba(255, 240, 180, 0.22)');
            cone.addColorStop(1, 'rgba(255, 240, 180, 0.0)');
            ctx.fillStyle = cone;
            ctx.beginPath();
            ctx.moveTo(fx, 40);
            ctx.lineTo(fx - 150, this.height);
            ctx.lineTo(fx + 150, this.height);
            ctx.fill();
        });

        // Steel Chainlink Fence
        ctx.strokeStyle = 'rgba(120, 130, 150, 0.18)';
        ctx.lineWidth = 1;
        const spacing = 24;
        for (let x = -this.height; x < this.width + this.height; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + this.height, this.height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x, this.height);
            ctx.lineTo(x + this.height, 0);
            ctx.stroke();
        }
        ctx.restore();

        // Gritty steel ground with hazard stripes
        ctx.save();
        ctx.fillStyle = '#1e222b';
        ctx.fillRect(0, this.height - 60, this.width, 60);

        // Yellow-black hazard stripes
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 6;
        for (let x = 0; x < this.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, this.height - 60);
            ctx.lineTo(x + 15, this.height - 45);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawBanner(ctx) {
        if (!this.bannerText) return;
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2 - 30);

        // Banner backdrop banner stripe
        ctx.fillStyle = 'rgba(5, 5, 15, 0.75)';
        ctx.fillRect(-this.width / 2, -65, this.width, 130);

        // Top and bottom neon highlight lines
        ctx.strokeStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-this.width / 2, -65);
        ctx.lineTo(this.width / 2, -65);
        ctx.moveTo(-this.width / 2, 65);
        ctx.lineTo(this.width / 2, 65);
        ctx.stroke();

        // Main Banner Text
        ctx.font = '900 68px "Impact", "Segoe UI Black", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#ff1744';
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 25;
        ctx.fillText(this.bannerText, 0, -8);

        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.fillText(this.bannerText, 0, -8);

        // Subtext
        if (this.bannerSubText) {
            ctx.font = 'bold 22px "Segoe UI", sans-serif';
            ctx.fillStyle = '#00e5ff';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 10;
            ctx.fillText(this.bannerSubText, 0, 36);
        }

        ctx.restore();
    }

    render() {
        this.ctx.save();
        this.ctx.translate(this.cameraX, this.cameraY);

        // 1. Stage Background
        this.drawStage(this.ctx);

        // 2. Ambient Particles (Rain / Cherry Blossom / Sparks)
        for (const p of this.stageParticles) {
            this.ctx.save();
            this.ctx.fillStyle = p.color;
            if (this.stage === 'cyber') {
                this.ctx.fillRect(p.x, p.y, p.size, p.size * 5); // rain streak
            } else {
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.angle);
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.restore();
        }

        // 3. Stickman Fighters
        this.p1.draw(this.ctx);
        this.p2.draw(this.ctx);

        // 4. Combat VFX, Sparks & Floating Health Reduction Numbers
        if (this.particles) {
            this.particles.draw(this.ctx);
        }

        // 5. Round Banners (ROUND 1, FIGHT, K.O.)
        this.drawBanner(this.ctx);

        this.ctx.restore();
    }

    loop(timestamp) {
        if (!this.isRunning) return;
        this.update();
        this.render();
        requestAnimationFrame(this.loop);
    }

    togglePause() {
        const pauseOverlay = document.getElementById('pause-menu-overlay');
        if (pauseOverlay.classList.contains('hidden')) {
            pauseOverlay.classList.remove('hidden');
        } else {
            pauseOverlay.classList.add('hidden');
        }
    }
}

window.StickmanGame = StickmanGame;
