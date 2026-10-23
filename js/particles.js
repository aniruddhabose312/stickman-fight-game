/**
 * Particle and Combat VFX System for Stickman Fight Game
 * Handles floating health reduction numbers, hit sparks, shockwaves, dust, and special auras.
 */

class FloatingText {
    constructor(x, y, text, type = 'normal') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.type = type; // 'damage', 'crit', 'block', 'combo', 'special'
        this.vy = -3.2 - Math.random() * 1.5;
        this.vx = (Math.random() - 0.5) * 1.8;
        this.opacity = 1.0;
        this.scale = 1.5; // Start popped
        this.targetScale = 1.0;
        this.life = 1.0;
        this.decay = 0.022;

        if (type === 'crit') {
            this.color = '#ff2a55';
            this.glowColor = '#ff0033';
            this.fontSize = 24;
            this.scale = 2.0;
        } else if (type === 'block') {
            this.color = '#00e5ff';
            this.glowColor = '#0091ea';
            this.fontSize = 17;
            this.scale = 1.2;
        } else if (type === 'combo') {
            this.color = '#ffd700';
            this.glowColor = '#ffab00';
            this.fontSize = 20;
            this.scale = 1.6;
        } else if (type === 'special') {
            this.color = '#e040fb';
            this.glowColor = '#d500f9';
            this.fontSize = 26;
            this.scale = 2.2;
        } else {
            // Normal damage
            this.color = '#fff275';
            this.glowColor = '#ff9100';
            this.fontSize = 19;
            this.scale = 1.4;
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.08; // slight gravity deceleration
        this.vx *= 0.96;
        this.life -= this.decay;
        this.opacity = Math.max(0, this.life);
        this.scale += (this.targetScale - this.scale) * 0.15;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.opacity);
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        ctx.font = `900 ${this.fontSize}px 'Impact', 'Segoe UI Black', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Outer glow
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#050510';
        ctx.strokeText(this.text, 0, 0);

        ctx.fillStyle = this.color;
        ctx.fillText(this.text, 0, 0);
        ctx.restore();
    }
}

class SparkParticle {
    constructor(x, y, vx, vy, color = '#ffeb3b', size = 3, life = 25) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.maxLife = life;
        this.life = life;
        this.decay = 1;
        this.drag = 0.94;
        this.gravity = 0.25;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= this.drag;
        this.vy = this.vy * this.drag + this.gravity;
        this.life -= this.decay;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const progress = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = progress;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 6;

        // Draw elongated spark line along movement vector
        const len = Math.sqrt(this.vx * this.vx + this.vy * this.vy) * 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.5, this.size * progress), 0, Math.PI * 2);
        ctx.fill();

        if (len > 2) {
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = Math.max(1, this.size * progress * 0.7);
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.vx * 1.5, this.y - this.vy * 1.5);
            ctx.stroke();
        }
        ctx.restore();
    }
}

class ShockwaveRing {
    constructor(x, y, maxRadius = 50, color = '#ffffff', lineWidth = 4) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.maxRadius = maxRadius;
        this.color = color;
        this.lineWidth = lineWidth;
        this.life = 1.0;
        this.speed = 4.5;
    }

    update() {
        this.radius += this.speed;
        this.life = 1 - (this.radius / this.maxRadius);
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life * 0.85);
        ctx.strokeStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.lineWidth = Math.max(1, this.lineWidth * this.life);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

class DustCloud {
    constructor(x, y, vx = 0, vy = -0.5, size = 8, color = 'rgba(200, 200, 220, 0.5)') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.maxSize = size * 2.2;
        this.color = color;
        this.life = 1.0;
        this.decay = 0.035;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.92;
        this.vy *= 0.92;
        this.size += (this.maxSize - this.size) * 0.1;
        this.life -= this.decay;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life * 0.4);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class ParticleManager {
    constructor() {
        this.particles = [];
        this.floatingTexts = [];
        this.rings = [];
        this.dusts = [];
    }

    clear() {
        this.particles = [];
        this.floatingTexts = [];
        this.rings = [];
        this.dusts = [];
    }

    // Spawn floating damage numbers with health reduction indicator
    addDamageNumber(x, y, amount, isCrit = false, isBlocked = false, isSpecial = false) {
        let text = `-${Math.round(amount)}`;
        let type = 'normal';

        if (isBlocked) {
            text = `BLOCKED -${Math.round(amount)}`;
            type = 'block';
        } else if (isSpecial) {
            text = `SUPER! -${Math.round(amount)}`;
            type = 'special';
        } else if (isCrit) {
            text = `CRIT! -${Math.round(amount)}`;
            type = 'crit';
        }

        // Add slight vertical jitter so multiple numbers don't overlap completely
        const jitterX = (Math.random() - 0.5) * 20;
        const jitterY = (Math.random() - 0.5) * 15;
        this.floatingTexts.push(new FloatingText(x + jitterX, y + jitterY, text, type));
    }

    addComboText(x, y, count) {
        this.floatingTexts.push(new FloatingText(x, y - 25, `${count} HITS!`, 'combo'));
    }

    // Impact burst when an attack connects
    createHitImpact(x, y, intensity = 1, isBlocked = false, isCrit = false, isSpecial = false) {
        const count = isSpecial ? 35 : (isCrit ? 22 : (isBlocked ? 10 : 15));
        const baseColors = isBlocked 
            ? ['#00e5ff', '#80d8ff', '#ffffff'] 
            : (isSpecial ? ['#e040fb', '#ff4081', '#ffffff'] : ['#ffeb3b', '#ff9800', '#ff1744', '#ffffff']);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (2 + Math.random() * 8) * intensity;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 1.5;
            const color = baseColors[Math.floor(Math.random() * baseColors.length)];
            const size = Math.random() * 3 + (isCrit ? 2 : 1.5);
            const life = 18 + Math.random() * 15;
            this.particles.push(new SparkParticle(x, y, vx, vy, color, size, life));
        }

        // Add shockwave ring
        const ringColor = isBlocked ? '#00e5ff' : (isSpecial ? '#e040fb' : (isCrit ? '#ff1744' : '#ffffff'));
        const ringRadius = isSpecial ? 85 : (isCrit ? 60 : (isBlocked ? 35 : 45));
        this.rings.push(new ShockwaveRing(x, y, ringRadius, ringColor, isCrit ? 5 : 3));
    }

    // Dust effects for ground jumps, landings, slides
    createGroundDust(x, y, direction = 0) {
        for (let i = 0; i < 6; i++) {
            const vx = direction * (Math.random() * 3 + 1) + (Math.random() - 0.5) * 2;
            const vy = -Math.random() * 2;
            this.dusts.push(new DustCloud(x + (Math.random() - 0.5) * 10, y, vx, vy, 6 + Math.random() * 5));
        }
    }

    // Special aura gathering effect
    createAura(x, y, color = '#00e5ff') {
        for (let i = 0; i < 4; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 20;
            const startX = x + Math.cos(angle) * dist;
            const startY = y + Math.sin(angle) * dist;
            const vx = (x - startX) * 0.12;
            const vy = (y - startY) * 0.12;
            this.particles.push(new SparkParticle(startX, startY, vx, vy, color, 3, 14));
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            this.floatingTexts[i].update();
            if (this.floatingTexts[i].life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

        for (let i = this.rings.length - 1; i >= 0; i--) {
            this.rings[i].update();
            if (this.rings[i].life <= 0) {
                this.rings.splice(i, 1);
            }
        }

        for (let i = this.dusts.length - 1; i >= 0; i--) {
            this.dusts[i].update();
            if (this.dusts[i].life <= 0) {
                this.dusts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        // Draw dust behind
        for (const dust of this.dusts) {
            dust.draw(ctx);
        }

        // Draw rings
        for (const ring of this.rings) {
            ring.draw(ctx);
        }

        // Draw particles
        for (const p of this.particles) {
            p.draw(ctx);
        }

        // Draw floating text on top
        for (const ft of this.floatingTexts) {
            ft.draw(ctx);
        }
    }
}

window.particleManager = new ParticleManager();
