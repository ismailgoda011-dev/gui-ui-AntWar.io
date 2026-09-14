// =======================================================
// audio.js — Centralized AntWar GUI Audio Manager
// =======================================================

let audioCtx = null;
let sfxGainNode = null;
let musicGainNode = null;
let soundEnabled = true;
let musicEnabled = true;
let musicVolume = 0.04;
let sfxVolume = 0.25;
let isBgmStarted = false;

const FREQUENCIES = {
    click: [320, 80, 0.08], pop: [450, 750, 0.11], save: [290, 750, 0.27], reward: [290, 750, 0.27],
    close: [320, 130, 0.10], equip: [520, 880, 0.15], chat: [400, 600, 0.08], alert: [650, 200, 0.18],
    stash: [480, 300, 0.14], toggle: [560, 780, 0.09], dropdown: [340, 490, 0.07]
};

function ensureContext() {
    if (audioCtx) return audioCtx;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;
    audioCtx = new AudioContextCtor();
    sfxGainNode = audioCtx.createGain();
    musicGainNode = audioCtx.createGain();
    sfxGainNode.connect(audioCtx.destination);
    musicGainNode.connect(audioCtx.destination);
    applyVolumes();
    return audioCtx;
}

function applyVolumes() {
    if (!audioCtx) return;
    sfxGainNode.gain.setValueAtTime(soundEnabled ? sfxVolume : 0, audioCtx.currentTime);
    musicGainNode.gain.setValueAtTime(musicEnabled ? musicVolume : 0, audioCtx.currentTime);
}

export function initAudio(settings = {}) {
    const saved = localStorage.getItem('antwar_sound');
    if (saved !== null) soundEnabled = saved === 'true';
    setAudioSettings(settings);
}

export function setAudioSettings(settings = {}) {
    if (typeof settings.sfxEnabled === 'boolean') soundEnabled = settings.sfxEnabled;
    if (typeof settings.musicEnabled === 'boolean') musicEnabled = settings.musicEnabled;
    if (Number.isFinite(settings.sfxVol)) sfxVolume = Math.max(0, Math.min(1, settings.sfxVol / 100));
    if (Number.isFinite(settings.musicVol)) musicVolume = Math.max(0, Math.min(1, settings.musicVol / 100));
    localStorage.setItem('antwar_sound', String(soundEnabled));
    applyVolumes();
}

export function playSound(type = 'click') {
    if (!soundEnabled) return;
    const ctx = ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    if (type === 'fanfare') {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle'; osc.frequency.value = freq;
            osc.connect(gain); gain.connect(sfxGainNode);
            const start = ctx.currentTime + index * 0.1;
            gain.gain.setValueAtTime(0.22, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
            osc.start(start); osc.stop(start + 0.45);
        });
        return;
    }

    const [startFreq, endFreq, duration] = FREQUENCIES[type] || [750, 750, 0.07];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(sfxGainNode);
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(startFreq, now);
    if (startFreq !== endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now); osc.stop(now + duration);
}

export function startAmbientBgm() {
    if (isBgmStarted) return;
    isBgmStarted = true;
    const ctx = ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const notes = [261.63, 293.66, 329.63, 392, 440, 523.25];
    let noteIndex = 0;
    setInterval(() => {
        if (!musicEnabled || musicVolume <= 0) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = notes[noteIndex % notes.length];
        gain.gain.setValueAtTime(0.032, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
        osc.connect(gain); gain.connect(musicGainNode);
        osc.start(); osc.stop(ctx.currentTime + 1.2);
        noteIndex = (noteIndex + 1 + Math.floor(Math.random() * 2)) % notes.length;
    }, 900);
}

export function setSoundEnabled(value) {
    soundEnabled = !!value;
    localStorage.setItem('antwar_sound', String(soundEnabled));
    applyVolumes();
}

export function isSoundEnabled() { return soundEnabled; }
