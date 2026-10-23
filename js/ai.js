/**
 * AI Controller for Stickman Fight Game
 * Controls the computer opponent with configurable difficulty (Easy, Medium, Hard).
 */

class FighterAI {
    constructor(fighter, opponent, difficulty = 'medium') {
        this.fighter = fighter;
        this.opponent = opponent;
        this.difficulty = difficulty; // 'easy', 'medium', 'hard'

        this.decisionCooldown = 0;
        this.currentAction = 'idle';
        this.blockDuration = 0;
        this.preferredDistance = 65;
    }

    setDifficulty(level) {
        this.difficulty = level;
    }

    update() {
        if (!this.fighter || !this.opponent) return;
        if (this.fighter.health <= 0 || this.opponent.health <= 0) return;
        if (this.fighter.isActionLocked()) return;

        // Manage block duration
        if (this.blockDuration > 0) {
            this.blockDuration--;
            if (this.blockDuration <= 0) {
                this.fighter.block(false);
            }
            return;
        }

        if (this.decisionCooldown > 0) {
            this.decisionCooldown--;
            return;
        }

        const dx = this.opponent.x - this.fighter.x;
        const dist = Math.abs(dx);
        const oppFacing = this.opponent.facing;
        const oppAttacking = (
            this.opponent.state === FighterState.PUNCH ||
            this.opponent.state === FighterState.KICK ||
            this.opponent.state === FighterState.JUMP_KICK ||
            this.opponent.state === FighterState.SPECIAL
        );

        // Turn towards opponent
        const targetFacing = dx > 0 ? 1 : -1;
        if (this.fighter.facing !== targetFacing && this.fighter.isGrounded) {
            this.fighter.facing = targetFacing;
        }

        // Difficulty parameter settings
        let blockChance = 0.5;
        let reactionDelay = 12;
        let aggression = 0.6;
        let specialPreference = 0.7;

        if (this.difficulty === 'easy') {
            blockChance = 0.18;
            reactionDelay = 22;
            aggression = 0.35;
            specialPreference = 0.4;
        } else if (this.difficulty === 'hard') {
            blockChance = 0.82;
            reactionDelay = 6;
            aggression = 0.85;
            specialPreference = 0.95;
        }

        // 1. Reactive Defense: Block incoming attacks
        if (oppAttacking && dist < 110) {
            if (Math.random() < blockChance) {
                this.fighter.block(true);
                this.blockDuration = Math.floor(15 + Math.random() * 15);
                this.decisionCooldown = this.blockDuration + reactionDelay;
                return;
            }
        }

        // 2. Punish opponent if opponent is in recovery/lag
        const oppInRecovery = (
            this.opponent.state === FighterState.PUNCH && this.opponent.stateTime > 10 ||
            this.opponent.state === FighterState.KICK && this.opponent.stateTime > 14
        );

        if (oppInRecovery && dist < 85 && Math.random() < aggression) {
            this.executeCloseAttack();
            this.decisionCooldown = reactionDelay;
            return;
        }

        // 3. Special attack if available
        if (this.fighter.superMeter >= 50 && dist < 240 && dist > 70 && Math.random() < specialPreference) {
            this.fighter.special();
            this.decisionCooldown = reactionDelay + 20;
            return;
        }

        // 4. Combat spacing and positioning
        if (dist > this.preferredDistance + 40) {
            // Approach opponent
            this.fighter.move(targetFacing);

            // Chance to jump-kick or leap in
            if (dist > 180 && dist < 280 && Math.random() < (this.difficulty === 'hard' ? 0.35 : 0.15)) {
                this.fighter.jump();
                setTimeout(() => {
                    if (this.fighter && this.fighter.state === FighterState.JUMP) {
                        this.fighter.kick(); // Aerial dive kick!
                    }
                }, 160);
                this.decisionCooldown = 28;
                return;
            }

            this.decisionCooldown = 8;
        } else if (dist < this.preferredDistance - 15) {
            // Too close or cornered: Either attack or step back
            if (Math.random() < aggression) {
                this.executeCloseAttack();
            } else {
                this.fighter.move(-targetFacing); // backstep
            }
            this.decisionCooldown = reactionDelay;
        } else {
            // In optimal strike range!
            this.fighter.stopMoving();
            if (Math.random() < aggression) {
                this.executeCloseAttack();
            } else if (Math.random() < 0.25) {
                // Feint or backstep
                this.fighter.move(-targetFacing);
            }
            this.decisionCooldown = reactionDelay + Math.floor(Math.random() * 8);
        }
    }

    executeCloseAttack() {
        const roll = Math.random();
        if (roll < 0.45) {
            this.fighter.punch();
        } else if (roll < 0.85) {
            this.fighter.kick();
        } else {
            // Jump attack
            this.fighter.jump();
            setTimeout(() => {
                if (this.fighter && !this.fighter.isGrounded) {
                    this.fighter.kick();
                }
            }, 140);
        }
    }
}

window.FighterAI = FighterAI;
