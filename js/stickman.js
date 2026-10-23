/**
 * Stickman Fighter Entity & Procedural Skeletal Animation Engine
 */

const FighterState = {
    IDLE: 'idle',
    WALK: 'walk',
    JUMP: 'jump',
    FALL: 'fall',
    BLOCK: 'block',
    PUNCH: 'punch',
    KICK: 'kick',
    JUMP_KICK: 'jump_kick',
    SPECIAL: 'special',
    HURT: 'hurt',
    KNOCKDOWN: 'knockdown',
    DEAD: 'dead',
    VICTORY: 'victory'
};

class StickmanFighter {
    constructor(id, name, color, isP2 = false) {
        this.id = id;
        this.name = name;
        this.color = color; // primary bone color
        this.isP2 = isP2;

        // Position & Physics
        this.x = isP2 ? 700 : 260;
        this.y = 480; // ground level
        this.groundY = 480;
        this.vx = 0;
        this.vy = 0;
        this.facing = isP2 ? -1 : 1;
        this.isGrounded = true;

        // Combat Stats & Health
        this.maxHealth = 100;
        this.health = 100;
        this.displayHealth = 100; // Slowly drains to show damage reduction
        this.drainSpeed = 0.8;
        this.damageTrailDelay = 0;
        this.superMeter = 0;
        this.maxSuper = 100;

        // Combo system
        this.comboCount = 0;
        this.comboTimer = 0;
        this.roundsWon = 0;

        // State Machine & Animation
        this.state = FighterState.IDLE;
        this.stateTime = 0;
        this.animFrame = 0;
        this.attackHasHit = false;
        this.hitStun = 0;
        this.knockdownTimer = 0;

        // Visual FX
        this.trailPositions = [];
        this.flashWhite = 0;
        this.scale = 1.0;
        this.glowColor = isP2 ? 'rgba(255, 23, 68, 0.7)' : 'rgba(0, 229, 255, 0.7)';
        this.accentColor = isP2 ? '#ff5252' : '#18ffff';
        this.headbandColor = isP2 ? '#d50000' : '#00b0ff';

        // Hitboxes & Hurtboxes
        this.hurtbox = { x: 0, y: 0, width: 44, height: 95 };
        this.hitbox = null; // { x, y, radius, damage, knockbackX, knockbackY, isHeavy, isSpecial }

        // Input buffering
        this.inputBuffer = [];
    }

    resetForRound(startX, facing) {
        this.x = startX;
        this.y = this.groundY;
        this.vx = 0;
        this.vy = 0;
        this.facing = facing;
        this.isGrounded = true;
        this.health = this.maxHealth;
        this.displayHealth = this.maxHealth;
        this.state = FighterState.IDLE;
        this.stateTime = 0;
        this.animFrame = 0;
        this.hitStun = 0;
        this.knockdownTimer = 0;
        this.attackHasHit = false;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.trailPositions = [];
    }

    update(arenaWidth = 960) {
        this.stateTime++;
        this.animFrame++;

        // Smooth damage drain for fighting-game health bar
        if (this.damageTrailDelay > 0) {
            this.damageTrailDelay--;
        } else if (this.displayHealth > this.health) {
            this.displayHealth = Math.max(this.health, this.displayHealth - this.drainSpeed);
        } else {
            this.displayHealth = this.health;
        }

        // Combo reset timer
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) {
                this.comboCount = 0;
            }
        }

        // Hit stun / Hurt recovery
        if (this.hitStun > 0) {
            this.hitStun--;
            if (this.hitStun <= 0 && this.state === FighterState.HURT) {
                this.state = FighterState.IDLE;
            }
        }

        if (this.flashWhite > 0) {
            this.flashWhite--;
        }

        // Knockdown recovery
        if (this.state === FighterState.KNOCKDOWN) {
            this.knockdownTimer--;
            if (this.knockdownTimer <= 0) {
                if (this.health <= 0) {
                    this.state = FighterState.DEAD;
                } else {
                    this.state = FighterState.IDLE;
                    this.stateTime = 0;
                }
            }
        }

        // Gravity & Physics
        if (!this.isGrounded) {
            this.vy += 0.82; // Gravity
            this.x += this.vx;
            this.y += this.vy;

            if (this.y >= this.groundY) {
                this.y = this.groundY;
                this.vy = 0;
                this.isGrounded = true;

                // Ground landing impact
                if (window.particleManager) {
                    window.particleManager.createGroundDust(this.x, this.y, this.vx > 0 ? 1 : -1);
                }

                if (this.state === FighterState.JUMP || this.state === FighterState.FALL || this.state === FighterState.JUMP_KICK) {
                    this.state = FighterState.IDLE;
                    this.stateTime = 0;
                    this.hitbox = null;
                }
            } else {
                if (this.vy > 0 && this.state === FighterState.JUMP) {
                    this.state = FighterState.FALL;
                }
            }
        } else {
            // Ground friction
            this.vx *= 0.82;
            this.x += this.vx;
        }

        // Arena boundaries
        const minX = 60;
        const maxX = arenaWidth - 60;
        if (this.x < minX) {
            this.x = minX;
            this.vx = 0;
        }
        if (this.x > maxX) {
            this.x = maxX;
            this.vx = 0;
        }

        // Update hurtbox
        this.hurtbox.x = this.x - this.hurtbox.width / 2;
        this.hurtbox.y = this.y - (this.state === FighterState.BLOCK ? 70 : 95);
        this.hurtbox.height = this.state === FighterState.BLOCK ? 70 : 95;

        // Process active attack animations & hitboxes
        this.updateAttackStates();

        // Trail effects for special attack or fast moves
        if (this.state === FighterState.SPECIAL || Math.abs(this.vx) > 7) {
            this.trailPositions.push({ x: this.x, y: this.y, alpha: 0.6, state: this.state, facing: this.facing });
            if (this.trailPositions.length > 5) {
                this.trailPositions.shift();
            }
        } else if (this.trailPositions.length > 0) {
            this.trailPositions.shift();
        }
    }

    updateAttackStates() {
        if (this.state === FighterState.PUNCH) {
            // Punch: 15 frames total. Active frames: 4-9
            if (this.stateTime >= 4 && this.stateTime <= 9 && !this.attackHasHit) {
                this.hitbox = {
                    x: this.x + this.facing * 48,
                    y: this.y - 68,
                    radius: 20,
                    damage: 10,
                    knockbackX: this.facing * 5,
                    knockbackY: -2.5,
                    isHeavy: false,
                    isSpecial: false
                };
            } else if (this.stateTime > 9) {
                this.hitbox = null;
            }
            if (this.stateTime > 15) {
                this.state = FighterState.IDLE;
                this.hitbox = null;
            }
        } else if (this.state === FighterState.KICK) {
            // Kick: 22 frames total. Active frames: 6-13
            if (this.stateTime >= 6 && this.stateTime <= 13 && !this.attackHasHit) {
                this.hitbox = {
                    x: this.x + this.facing * 58,
                    y: this.y - 50,
                    radius: 24,
                    damage: 17,
                    knockbackX: this.facing * 9,
                    knockbackY: -4.5,
                    isHeavy: true,
                    isSpecial: false
                };
            } else if (this.stateTime > 13) {
                this.hitbox = null;
            }
            if (this.stateTime > 22) {
                this.state = FighterState.IDLE;
                this.hitbox = null;
            }
        } else if (this.state === FighterState.JUMP_KICK) {
            // Jump kick is active until landing or 26 frames
            if (this.stateTime >= 4 && !this.attackHasHit) {
                this.hitbox = {
                    x: this.x + this.facing * 44,
                    y: this.y - 35,
                    radius: 26,
                    damage: 20,
                    knockbackX: this.facing * 11,
                    knockbackY: -5,
                    isHeavy: true,
                    isSpecial: false
                };
            }
            if (this.stateTime > 28) {
                this.hitbox = null;
            }
        } else if (this.state === FighterState.SPECIAL) {
            // Special Dash Strike: 35 frames
            if (this.stateTime < 8) {
                // Charging aura
                if (window.particleManager) {
                    window.particleManager.createAura(this.x, this.y - 45, this.accentColor);
                }
            } else if (this.stateTime >= 8 && this.stateTime <= 24) {
                // High-speed lunge
                this.vx = this.facing * 14;
                if (!this.attackHasHit) {
                    this.hitbox = {
                        x: this.x + this.facing * 40,
                        y: this.y - 55,
                        radius: 36,
                        damage: 32,
                        knockbackX: this.facing * 16,
                        knockbackY: -8,
                        isHeavy: true,
                        isSpecial: true
                    };
                }
            } else if (this.stateTime > 24) {
                this.hitbox = null;
                this.vx *= 0.8;
            }
            if (this.stateTime > 35) {
                this.state = FighterState.IDLE;
                this.hitbox = null;
            }
        }
    }

    // Actions & Moves
    move(dir) {
        if (this.isActionLocked()) return;
        this.facing = dir;
        const speed = this.isGrounded ? 5.2 : 4.4;
        this.vx = dir * speed;
        if (this.isGrounded && this.state !== FighterState.WALK) {
            this.state = FighterState.WALK;
            this.stateTime = 0;
        }
    }

    stopMoving() {
        if (this.state === FighterState.WALK) {
            this.state = FighterState.IDLE;
            this.stateTime = 0;
        }
    }

    jump() {
        if (this.isActionLocked() || !this.isGrounded) return;
        this.isGrounded = false;
        this.vy = -16.5;
        this.state = FighterState.JUMP;
        this.stateTime = 0;
        if (window.soundEngine) window.soundEngine.playJump();
        if (window.particleManager) window.particleManager.createGroundDust(this.x, this.y, 0);
    }

    block(isBlocking) {
        if (this.state === FighterState.HURT || this.state === FighterState.KNOCKDOWN || this.state === FighterState.DEAD) return;
        if (isBlocking) {
            if (this.isGrounded && this.state !== FighterState.PUNCH && this.state !== FighterState.KICK && this.state !== FighterState.SPECIAL) {
                this.state = FighterState.BLOCK;
                this.vx = 0;
            }
        } else if (this.state === FighterState.BLOCK) {
            this.state = FighterState.IDLE;
            this.stateTime = 0;
        }
    }

    punch() {
        if (this.isActionLocked()) return;
        this.state = FighterState.PUNCH;
        this.stateTime = 0;
        this.attackHasHit = false;
        if (window.soundEngine) window.soundEngine.playWhoosh(1.2);
    }

    kick() {
        if (this.isActionLocked()) return;
        if (!this.isGrounded) {
            // Airborne Jump Kick!
            this.state = FighterState.JUMP_KICK;
            this.stateTime = 0;
            this.attackHasHit = false;
            this.vx = this.facing * 9;
            this.vy = 4; // Dive down
            if (window.soundEngine) window.soundEngine.playWhoosh(0.9);
        } else {
            this.state = FighterState.KICK;
            this.stateTime = 0;
            this.attackHasHit = false;
            this.vx = this.facing * 3; // small step forward
            if (window.soundEngine) window.soundEngine.playWhoosh(0.85);
        }
    }

    special() {
        if (this.isActionLocked() || this.superMeter < 50) return;
        this.superMeter = Math.max(0, this.superMeter - 50);
        this.state = FighterState.SPECIAL;
        this.stateTime = 0;
        this.attackHasHit = false;
        this.vx = 0;
        if (window.soundEngine) window.soundEngine.playCharge();
    }

    isActionLocked() {
        return (
            this.state === FighterState.PUNCH ||
            this.state === FighterState.KICK ||
            this.state === FighterState.JUMP_KICK ||
            this.state === FighterState.SPECIAL ||
            this.state === FighterState.HURT ||
            this.state === FighterState.KNOCKDOWN ||
            this.state === FighterState.DEAD ||
            this.state === FighterState.VICTORY
        );
    }

    // Take damage from incoming attack
    takeHit(attack, attacker) {
        if (this.state === FighterState.DEAD) return;

        const isBlocking = this.state === FighterState.BLOCK && (this.facing !== attacker.facing);
        let finalDamage = attack.damage;
        let isCrit = false;

        if (isBlocking) {
            // Guard reduces damage by 75%
            finalDamage = Math.max(2, Math.round(attack.damage * 0.22));
            this.vx = attack.knockbackX * 0.25;
            if (window.soundEngine) window.soundEngine.playBlock();
            if (window.particleManager) {
                window.particleManager.addDamageNumber(this.x, this.y - 70, finalDamage, false, true, false);
                window.particleManager.createHitImpact(this.x, this.y - 60, 0.7, true, false, false);
            }
        } else {
            // Normal or Critical hit
            if (Math.random() < 0.22 || attack.isSpecial) {
                isCrit = !attack.isSpecial;
                if (isCrit) finalDamage = Math.round(finalDamage * 1.4);
            }

            this.health = Math.max(0, this.health - finalDamage);
            this.damageTrailDelay = 25; // Hold damage trail before draining
            this.flashWhite = 4;

            // Super meter generation
            this.superMeter = Math.min(this.maxSuper, this.superMeter + 9);
            attacker.superMeter = Math.min(attacker.maxSuper, attacker.superMeter + 14);

            // Audio & visual feedback
            if (attack.isSpecial) {
                if (window.soundEngine) window.soundEngine.playSpecialBlast();
            } else if (attack.isHeavy) {
                if (window.soundEngine) window.soundEngine.playKick();
            } else {
                if (window.soundEngine) window.soundEngine.playPunch();
            }

            if (window.particleManager) {
                window.particleManager.addDamageNumber(this.x, this.y - 70, finalDamage, isCrit, false, attack.isSpecial);
                window.particleManager.createHitImpact(this.x, this.y - 60, attack.isHeavy ? 1.5 : 1.0, false, isCrit, attack.isSpecial);
            }

            // Knockback & Stun
            this.vx = attack.knockbackX;
            this.vy = attack.knockbackY;

            if (this.health <= 0) {
                this.state = FighterState.KNOCKDOWN;
                this.knockdownTimer = 50;
                this.isGrounded = false;
                this.vy = -9;
                this.vx = attack.knockbackX * 1.3;
                if (window.soundEngine) window.soundEngine.playKO();
            } else if (attack.isHeavy || attack.isSpecial || !this.isGrounded) {
                this.state = FighterState.KNOCKDOWN;
                this.knockdownTimer = 35;
                this.isGrounded = false;
                this.hitStun = 35;
            } else {
                this.state = FighterState.HURT;
                this.stateTime = 0;
                this.hitStun = 14;
            }

            // Increment attacker combo
            attacker.comboCount++;
            attacker.comboTimer = 75; // ~1.25s to chain next hit
            if (attacker.comboCount >= 2 && window.particleManager) {
                window.particleManager.addComboText(attacker.x, attacker.y - 80, attacker.comboCount);
            }
        }
    }

    // DRAWING: Procedural Stickman Skeleton & Dynamic Poses
    draw(ctx) {
        // Draw trailing motion blur for special attack or high speed
        for (let i = 0; i < this.trailPositions.length; i++) {
            const tp = this.trailPositions[i];
            ctx.save();
            ctx.globalAlpha = (i + 1) * 0.1;
            ctx.fillStyle = this.accentColor;
            ctx.beginPath();
            ctx.arc(tp.x, tp.y - 50, 24, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Flash white on hit
        if (this.flashWhite > 0) {
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 18;
        } else {
            ctx.strokeStyle = this.color;
            ctx.shadowColor = this.glowColor;
            ctx.shadowBlur = 12;
        }

        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Calculate procedural joint positions based on current state & time
        const joints = this.calculateJoints();

        // 1. Draw Legs (back leg, then front leg)
        this.drawLimb(ctx, joints.pelvis, joints.backKnee, joints.backFoot, '#101018');
        this.drawLimb(ctx, joints.pelvis, joints.frontKnee, joints.frontFoot, this.color);

        // 2. Draw Spine & Torso
        ctx.beginPath();
        ctx.moveTo(joints.pelvis.x, joints.pelvis.y);
        ctx.lineTo(joints.neck.x, joints.neck.y);
        ctx.stroke();

        // 3. Draw Arms (back arm first)
        this.drawLimb(ctx, joints.neck, joints.backElbow, joints.backHand, '#101018');

        // 4. Draw Head with Headband / Eye gleam
        ctx.save();
        ctx.fillStyle = '#0a0a14';
        ctx.beginPath();
        ctx.arc(joints.head.x, joints.head.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Headband & glowing tail
        ctx.fillStyle = this.headbandColor;
        ctx.shadowColor = this.headbandColor;
        ctx.shadowBlur = 8;
        ctx.fillRect(joints.head.x - 14, joints.head.y - 4, 28, 6);

        // Flowing headband ribbon
        const ribbonFlow = Math.sin(this.animFrame * 0.18) * 4;
        ctx.beginPath();
        ctx.moveTo(joints.head.x - this.facing * 12, joints.head.y - 2);
        ctx.quadraticCurveTo(
            joints.head.x - this.facing * 24, joints.head.y - 6 + ribbonFlow,
            joints.head.x - this.facing * 34, joints.head.y + 4 + ribbonFlow
        );
        ctx.lineWidth = 3;
        ctx.strokeStyle = this.headbandColor;
        ctx.stroke();

        // Fierce glowing eye visor
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = this.accentColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(joints.head.x + this.facing * 6, joints.head.y - 1, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 5. Draw Front Arm
        ctx.strokeStyle = this.flashWhite > 0 ? '#ffffff' : this.color;
        this.drawLimb(ctx, joints.neck, joints.frontElbow, joints.frontHand, this.color);

        // 6. Draw Guard Shield if blocking
        if (this.state === FighterState.BLOCK) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
            ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 15;
            ctx.lineWidth = 3;

            const shieldX = this.facing * 28;
            const shieldY = -48;
            ctx.beginPath();
            ctx.arc(shieldX, shieldY, 34, -Math.PI / 2.2, Math.PI / 2.2, this.facing < 0);
            ctx.stroke();

            // Hexagonal barrier pulse
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3 + this.animFrame * 0.05;
                const hx = shieldX + Math.cos(angle) * 26;
                const hy = shieldY + Math.sin(angle) * 26;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // 7. Special attack energy charge/orb
        if (this.state === FighterState.SPECIAL && this.stateTime >= 6 && this.stateTime <= 24) {
            ctx.save();
            ctx.fillStyle = this.accentColor;
            ctx.shadowColor = this.accentColor;
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.arc(joints.frontHand.x, joints.frontHand.y, 22 + Math.sin(this.animFrame * 0.4) * 4, 0, Math.PI * 2);
            ctx.fill();

            // White core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(joints.frontHand.x, joints.frontHand.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }

    drawLimb(ctx, root, joint, tip, strokeColor) {
        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(root.x, root.y);
        ctx.lineTo(joint.x, joint.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();

        // Joint dot
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.arc(joint.x, joint.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    calculateJoints() {
        const f = this.facing;
        const t = this.animFrame;
        const st = this.stateTime;

        let head = { x: 0, y: -80 };
        let neck = { x: 0, y: -64 };
        let pelvis = { x: 0, y: -38 };

        let frontKnee = { x: f * 10, y: -20 };
        let frontFoot = { x: f * 14, y: 0 };
        let backKnee = { x: -f * 10, y: -20 };
        let backFoot = { x: -f * 14, y: 0 };

        let frontElbow = { x: f * 14, y: -52 };
        let frontHand = { x: f * 24, y: -58 };
        let backElbow = { x: -f * 6, y: -52 };
        let backHand = { x: f * 10, y: -54 };

        switch (this.state) {
            case FighterState.IDLE: {
                // Breathing bounce
                const breath = Math.sin(t * 0.08) * 2.5;
                pelvis.y = -38 + breath;
                neck.y = -64 + breath;
                head.y = -80 + breath;

                frontFoot = { x: f * 16, y: 0 };
                frontKnee = { x: f * 12, y: -19 + breath * 0.5 };
                backFoot = { x: -f * 14, y: 0 };
                backKnee = { x: -f * 8, y: -19 + breath * 0.5 };

                // Guard stance hands
                frontElbow = { x: f * 15, y: -50 + breath };
                frontHand = { x: f * 22, y: -58 + breath };
                backElbow = { x: f * 2, y: -50 + breath };
                backHand = { x: f * 12, y: -56 + breath };
                break;
            }

            case FighterState.WALK: {
                // Alternating stride cycle
                const walkPhase = t * 0.22;
                const bob = Math.abs(Math.sin(walkPhase)) * 4;
                pelvis.y = -38 - bob;
                neck.y = -64 - bob;
                head.y = -80 - bob;

                const stepFront = Math.sin(walkPhase) * 22;
                const stepBack = Math.sin(walkPhase + Math.PI) * 22;

                frontFoot = { x: f * stepFront, y: Math.min(0, Math.cos(walkPhase) * 10) };
                frontKnee = { x: f * (stepFront * 0.6), y: -20 };
                backFoot = { x: f * stepBack, y: Math.min(0, Math.cos(walkPhase + Math.PI) * 10) };
                backKnee = { x: f * (stepBack * 0.6), y: -20 };

                // Arms swing in counter balance
                frontElbow = { x: -f * (stepFront * 0.4), y: -50 };
                frontHand = { x: -f * (stepFront * 0.7), y: -44 };
                backElbow = { x: f * (stepFront * 0.4), y: -50 };
                backHand = { x: f * (stepFront * 0.7), y: -44 };
                break;
            }

            case FighterState.JUMP:
            case FighterState.FALL: {
                pelvis.y = -42;
                neck.y = -66;
                head.y = -82;

                // Tucked knees in air
                frontKnee = { x: f * 18, y: -28 };
                frontFoot = { x: f * 14, y: -12 };
                backKnee = { x: -f * 12, y: -30 };
                backFoot = { x: -f * 8, y: -15 };

                frontElbow = { x: f * 12, y: -58 };
                frontHand = { x: f * 22, y: -70 };
                backElbow = { x: -f * 14, y: -56 };
                backHand = { x: -f * 20, y: -65 };
                break;
            }

            case FighterState.BLOCK: {
                // Crouched defensive guard
                pelvis.y = -30;
                neck.y = -52;
                head.y = -68;

                frontKnee = { x: f * 18, y: -15 };
                frontFoot = { x: f * 22, y: 0 };
                backKnee = { x: -f * 14, y: -15 };
                backFoot = { x: -f * 18, y: 0 };

                // Crossed fists in front of face
                frontElbow = { x: f * 16, y: -42 };
                frontHand = { x: f * 20, y: -58 };
                backElbow = { x: f * 12, y: -40 };
                backHand = { x: f * 16, y: -56 };
                break;
            }

            case FighterState.PUNCH: {
                // Jab thrust
                const punchProgress = Math.sin((st / 15) * Math.PI);
                pelvis.x = f * 6 * punchProgress;
                neck.x = f * 10 * punchProgress;
                head.x = f * 12 * punchProgress;

                frontFoot = { x: f * 18, y: 0 };
                frontKnee = { x: f * 14, y: -18 };
                backFoot = { x: -f * 16, y: 0 };
                backKnee = { x: -f * 8, y: -18 };

                // Full arm extension forward
                frontElbow = { x: f * (24 + 16 * punchProgress), y: -64 };
                frontHand = { x: f * (32 + 24 * punchProgress), y: -66 };
                backElbow = { x: -f * 6, y: -54 };
                backHand = { x: f * 8, y: -56 };
                break;
            }

            case FighterState.KICK: {
                // Roundhouse kick
                const kickProgress = Math.sin((st / 22) * Math.PI);
                pelvis.x = -f * 4 * kickProgress;
                pelvis.y = -40;
                neck.x = -f * 8 * kickProgress;
                neck.y = -60;
                head.x = -f * 12 * kickProgress;

                // Support foot planted
                backFoot = { x: -f * 6, y: 0 };
                backKnee = { x: -f * 4, y: -20 };

                // Kicking leg whip
                frontKnee = { x: f * (22 + 18 * kickProgress), y: -42 - 12 * kickProgress };
                frontFoot = { x: f * (34 + 32 * kickProgress), y: -48 - 8 * kickProgress };

                frontElbow = { x: -f * 8, y: -50 };
                frontHand = { x: -f * 14, y: -42 };
                backElbow = { x: f * 12, y: -52 };
                backHand = { x: f * 18, y: -58 };
                break;
            }

            case FighterState.JUMP_KICK: {
                pelvis.y = -35;
                neck.y = -55;
                head.y = -70;

                // Extended dive kick
                frontKnee = { x: f * 26, y: -25 };
                frontFoot = { x: f * 48, y: -28 };
                backKnee = { x: -f * 14, y: -20 };
                backFoot = { x: -f * 18, y: -10 };

                frontElbow = { x: -f * 10, y: -50 };
                frontHand = { x: -f * 16, y: -45 };
                backElbow = { x: f * 14, y: -52 };
                backHand = { x: f * 22, y: -58 };
                break;
            }

            case FighterState.SPECIAL: {
                // Energy rush strike
                const rushProgress = Math.min(1, st / 12);
                pelvis.y = -36;
                pelvis.x = f * 12 * rushProgress;
                neck.y = -58;
                neck.x = f * 18 * rushProgress;
                head.y = -72;
                head.x = f * 22 * rushProgress;

                frontFoot = { x: f * 28, y: 0 };
                frontKnee = { x: f * 20, y: -16 };
                backFoot = { x: -f * 22, y: 0 };
                backKnee = { x: -f * 12, y: -16 };

                // Forward double blast / mega punch thrust
                frontElbow = { x: f * 34, y: -58 };
                frontHand = { x: f * 48, y: -58 };
                backElbow = { x: f * 26, y: -52 };
                backHand = { x: f * 38, y: -54 };
                break;
            }

            case FighterState.HURT: {
                // Snap backward in recoil
                pelvis.x = -f * 8;
                neck.x = -f * 14;
                head.x = -f * 20;

                frontFoot = { x: f * 8, y: 0 };
                frontKnee = { x: f * 6, y: -18 };
                backFoot = { x: -f * 14, y: 0 };
                backKnee = { x: -f * 12, y: -18 };

                frontElbow = { x: -f * 4, y: -46 };
                frontHand = { x: -f * 8, y: -38 };
                backElbow = { x: -f * 12, y: -48 };
                backHand = { x: -f * 16, y: -40 };
                break;
            }

            case FighterState.KNOCKDOWN:
            case FighterState.DEAD: {
                // Fallen flat or tumbling
                pelvis = { x: -f * 15, y: -10 };
                neck = { x: -f * 35, y: -12 };
                head = { x: -f * 52, y: -14 };

                frontKnee = { x: f * 5, y: -8 };
                frontFoot = { x: f * 22, y: 0 };
                backKnee = { x: -f * 2, y: -12 };
                backFoot = { x: f * 15, y: -2 };

                frontElbow = { x: -f * 24, y: -18 };
                frontHand = { x: -f * 32, y: -6 };
                backElbow = { x: -f * 28, y: -14 };
                backHand = { x: -f * 38, y: -4 };
                break;
            }

            case FighterState.VICTORY: {
                // Victory victory fist pump!
                const victoryBounce = Math.sin(t * 0.1) * 3;
                pelvis.y = -40 + victoryBounce;
                neck.y = -66 + victoryBounce;
                head.y = -82 + victoryBounce;

                frontFoot = { x: f * 14, y: 0 };
                frontKnee = { x: f * 10, y: -20 };
                backFoot = { x: -f * 14, y: 0 };
                backKnee = { x: -f * 10, y: -20 };

                // Fist high in the air
                frontElbow = { x: f * 10, y: -78 };
                frontHand = { x: f * 14, y: -98 };
                backElbow = { x: -f * 12, y: -48 };
                backHand = { x: -f * 8, y: -36 };
                break;
            }
        }

        return { head, neck, pelvis, frontKnee, frontFoot, backKnee, backFoot, frontElbow, frontHand, backElbow, backHand };
    }
}

window.FighterState = FighterState;
window.StickmanFighter = StickmanFighter;
