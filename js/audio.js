/**
 * Web Audio API Synthesizer for Stickman Fight Game
 * Pure procedural audio - no external sound files required!
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.musicEnabled = false;
        this.musicInterval = null;
        this.tempo = 124;
        this.step = 0;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    // Generic noise generator helper
    createNoiseBuffer() {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // Whoosh / Swing sound for missed strikes or attack startup
    playWhoosh(pitch = 1) {
        if (this.muted) return;
        this.init();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150 * pitch, t);
        osc.frequency.exponentialRampToValueAtTime(450 * pitch, t + 0.08);
        osc.frequency.exponentialRampToValueAtTime(80 * pitch, t + 0.18);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, t);
        filter.Q.setValueAtTime(2, t);

        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.2);
    }

    // Light punch hit
    playPunch() {
        if (this.muted) return;
        this.init();
        const t = this.ctx.currentTime;

        // Punch body thump
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

        oscGain.gain.setValueAtTime(0.35, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.13);

        // Crack / Slap noise
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer();
        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = 'bandpass';
        nFilter.frequency.setValueAtTime(1200, t);
        nFilter.Q.setValueAtTime(3, t);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.25, t);
        nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        noise.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(this.ctx.destination);
        noise.start(t);
        noise.stop(t + 0.09);
    }

    // Heavy Kick hit (deep bass impact)
    playKick() {
        if (this.muted) return;
        this.init();
        const t = this.ctx.currentTime;

        // Sub bass drop
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(160, t);
        sub.frequency.exponentialRampToValueAtTime(32, t + 0.22);

        subGain.gain.setValueAtTime(0.5, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        sub.connect(subGain);
        subGain.connect(this.ctx.destination);
        sub.start(t);
        sub.stop(t + 0.23);

        // Heavy impact snap
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);

        oscGain.gain.setValueAtTime(0.3, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.11);
    }

    // Guard / Block hit sound (metallic clang)
    playBlock() {
        if (this.muted) return;
        this.init();
        const t = this.ctx.currentTime;

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(850, t);
        osc1.frequency.exponentialRampToValueAtTime(400, t + 0.15);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1240, t);
        osc2.frequency.exponentialRampToValueAtTime(620, t + 0.15);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.16);
        osc2.stop(t + 0.16);
    }

    // Special move charge-up
    playCharge() {
        if (this.muted) return;
        this.init();
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.exponentialRampToValueAtTime(650, t + 0.35);

        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.28);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.37);
    }

    // Special move explosion / blast
    playSpecialBlast() {
        if (this.muted) return;
        this.init();
        const t = this.ctx.currentTime;

        // Deep explosion boom
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(25, t + 0.45);

        oscGain.gain.setValueAtTime(0.6, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.46);

        // Noise blast
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, t);
        filter.frequency.exponentialRampToValueAtTime(120, t + 0.5);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.4, t);
        nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.ctx.destination);
        noise.start(t);
        noise.stop(t + 0.52);
    }

    // Knockout (K.O.!) slow dramatic rumble + bell
    playKO() {
        if (this.muted) return;
        this.init();
        const t = this.ctx.currentTime;

        // Big sub rumble
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(90, t);
        sub.frequency.exponentialRampToValueAtTime(20, t + 1.2);

        subGain.gain.setValueAtTime(0.7, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

        sub.connect(subGain);
        subGain.connect(this.ctx.destination);
        sub.start(t);
        sub.stop(t + 1.25);

        // Heavy bell chime
        [220, 440, 554, 659].forEach((freq, idx) => {
            const bell = this.ctx.createOscillator();
            const bGain = this.ctx.createGain();
            bell.type = 'sine';
            bell.frequency.setValueAtTime(freq, t);
            bGain.gain.setValueAtTime(0.18 / (idx + 1), t);
            bGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);

            bell.connect(bGain);
            bGain.connect(this.ctx.destination);
            bell.start(t);
            bell.stop(t + 1.65);
        });
    }

    // Round start gong
    playGong() {
        if (this.muted) return;
        this.init();
        const t = this.ctx.currentTime;
        const freqs = [180, 290, 410];
        freqs.forEach(f => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, t);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.95);
        });
    }

    // Jump sound
    playJump() {
        if (this.muted) return;
        this.init();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(280, t + 0.12);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.13);
    }

    // Procedural Arcade Fight Music / Rhythm Beat (Synth-wave beat)
    toggleMusic(forceState) {
        if (forceState !== undefined) {
            this.musicEnabled = forceState;
        } else {
            this.musicEnabled = !this.musicEnabled;
        }

        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }

        if (this.musicEnabled) {
            this.init();
            const stepDurationMs = (60 / this.tempo / 4) * 1000; // 16th notes
            this.musicInterval = setInterval(() => {
                this.playMusicStep();
                this.step = (this.step + 1) % 16;
            }, stepDurationMs);
        }
        return this.musicEnabled;
    }

    playMusicStep() {
        if (this.muted || !this.ctx) return;
        const t = this.ctx.currentTime;
        const s = this.step;

        // Kick on beats 0, 4, 8, 12
        if (s % 4 === 0) {
            const k = this.ctx.createOscillator();
            const kg = this.ctx.createGain();
            k.frequency.setValueAtTime(110, t);
            k.frequency.exponentialRampToValueAtTime(35, t + 0.08);
            kg.gain.setValueAtTime(0.2, t);
            kg.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
            k.connect(kg);
            kg.connect(this.ctx.destination);
            k.start(t);
            k.stop(t + 0.09);
        }

        // Snare on beats 4, 12
        if (s === 4 || s === 12) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.createNoiseBuffer();
            const nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(0.09, t);
            nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            noise.connect(nGain);
            nGain.connect(this.ctx.destination);
            noise.start(t);
            noise.stop(t + 0.11);
        }

        // Hihat on every off-beat
        if (s % 2 === 1) {
            const hOsc = this.ctx.createOscillator();
            const hGain = this.ctx.createGain();
            hOsc.type = 'highpass';
            hOsc.frequency.setValueAtTime(8000, t);
            hGain.gain.setValueAtTime(0.03, t);
            hGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
            hOsc.connect(hGain);
            hGain.connect(this.ctx.destination);
            hOsc.start(t);
            hOsc.stop(t + 0.04);
        }

        // Bassline synth note (D minor scale: D, F, G, A)
        const bassNotes = [73.42, 73.42, 87.31, 73.42, 98.0, 87.31, 73.42, 110.0];
        if (s % 2 === 0) {
            const noteIdx = Math.floor(s / 2);
            const freq = bassNotes[noteIdx];
            const bass = this.ctx.createOscillator();
            const bGain = this.ctx.createGain();
            const bFilt = this.ctx.createBiquadFilter();

            bass.type = 'sawtooth';
            bass.frequency.setValueAtTime(freq, t);

            bFilt.type = 'lowpass';
            bFilt.frequency.setValueAtTime(380, t);
            bFilt.frequency.exponentialRampToValueAtTime(140, t + 0.12);

            bGain.gain.setValueAtTime(0.08, t);
            bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

            bass.connect(bFilt);
            bFilt.connect(bGain);
            bGain.connect(this.ctx.destination);

            bass.start(t);
            bass.stop(t + 0.13);
        }
    }
}

window.soundEngine = new SoundEngine();
