/**
 * Malay-centric contemporary gamelan procedural engine
 * Influences: Pelog/Slendro tuning, colotomic structure, kotekan interlocking
 */

import { useRef, useCallback, useEffect, useState } from 'react';

export type MusicMood =
  | 'peaceful'
  | 'political'
  | 'tense'
  | 'triumphant'
  | 'somber'
  | 'dramatic';

interface MoodConfig {
  bpm: number;
  scale: number[];
  rootFreq: number;
  bassVol: number;
  padVol: number;
  bellVol: number;
  melodyVol: number;
  rhythmVol: number;
  restProb: number;
  noteLenBeats: number;
}

/** Pelog (heptatonic subset, gamelan Malay/Java feel) */
const PELOG = [0, 1, 3, 7, 8, 10, 12];

/** Slendro (5-tone approximation in 12-TET) */
const SLENDRO = [0, 2, 5, 7, 10, 12, 14];

const MAJOR_PENTA = [0, 2, 4, 7, 9, 12];
const MINOR_PENTA = [0, 3, 5, 7, 10, 12];

const MOODS: Record<MusicMood, MoodConfig> = {
  peaceful: {
    bpm: 64,
    scale: SLENDRO,
    rootFreq: 146.83,
    bassVol: 0.12,
    padVol: 0.10,
    bellVol: 0.08,
    melodyVol: 0.10,
    rhythmVol: 0.06,
    restProb: 0.45,
    noteLenBeats: 1.5,
  },
  political: {
    bpm: 84,
    scale: PELOG,
    rootFreq: 164.81,
    bassVol: 0.16,
    padVol: 0.08,
    bellVol: 0.12,
    melodyVol: 0.14,
    rhythmVol: 0.10,
    restProb: 0.28,
    noteLenBeats: 1.0,
  },
  tense: {
    bpm: 110,
    scale: MINOR_PENTA,
    rootFreq: 185.0,
    bassVol: 0.20,
    padVol: 0.06,
    bellVol: 0.08,
    melodyVol: 0.18,
    rhythmVol: 0.16,
    restProb: 0.15,
    noteLenBeats: 0.75,
  },
  triumphant: {
    bpm: 118,
    scale: MAJOR_PENTA,
    rootFreq: 220.0,
    bassVol: 0.24,
    padVol: 0.14,
    bellVol: 0.18,
    melodyVol: 0.22,
    rhythmVol: 0.18,
    restProb: 0.10,
    noteLenBeats: 0.5,
  },
  somber: {
    bpm: 52,
    scale: SLENDRO,
    rootFreq: 130.81,
    bassVol: 0.14,
    padVol: 0.10,
    bellVol: 0.06,
    melodyVol: 0.08,
    rhythmVol: 0.02,
    restProb: 0.60,
    noteLenBeats: 2.0,
  },
  dramatic: {
    bpm: 124,
    scale: PELOG,
    rootFreq: 196.0,
    bassVol: 0.28,
    padVol: 0.06,
    bellVol: 0.10,
    melodyVol: 0.24,
    rhythmVol: 0.22,
    restProb: 0.08,
    noteLenBeats: 0.5,
  },
};

const semi2hz = (base: number, semi: number) =>
  base * Math.pow(2, semi / 12);

/** metallic gamelan tone (inharmonic-rich sine stack) */
function schedMetal(
  ctx: AudioContext,
  dest: AudioNode,
  hz: number,
  t: number,
  dur: number,
  vol: number
) {
  if (vol <= 0) return;

  const g = ctx.createGain();
  const freqs = [1, 2.01, 3.2]; // inharmonic shimmer

  freqs.forEach((m, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz * m;

    const gg = ctx.createGain();
    gg.gain.value = vol * (i === 0 ? 1 : 0.35);

    gg.gain.setValueAtTime(vol, t);
    gg.gain.exponentialRampToValueAtTime(0.001, t + dur);

    o.connect(gg);
    gg.connect(dest);

    o.start(t);
    o.stop(t + dur + 0.05);
  });
}

/** bonang-style interlocking hit */
function schedBonang(
  ctx: AudioContext,
  dest: AudioNode,
  hz: number,
  t: number,
  vol: number
) {
  schedMetal(ctx, dest, hz, t, 0.6, vol);
}

/** gong (low, long decay) */
function schedGong(
  ctx: AudioContext,
  dest: AudioNode,
  hz: number,
  t: number,
  vol: number
) {
  schedMetal(ctx, dest, hz, t, 3.5, vol);
}

/** kotekan (interlocking melody) generator */
function kotekan(scale: number[]) {
  const a: number[] = [];
  const b: number[] = [];
  for (let i = 0; i < 8; i++) {
    const idx = Math.floor(Math.random() * scale.length);
    if (i % 2 === 0) {
      a.push(idx);
      b.push(Math.max(0, idx - 1));
    } else {
      a.push(Math.max(0, idx - 1));
      b.push(idx);
    }
  }
  return { a, b };
}

export function useProcedualMusic() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const moodRef = useRef<MusicMood>('peaceful');
  const nextTimeRef = useRef(0);
  const beatRef = useRef(0);

  const [currentMood, setMoodState] = useState<MusicMood>('peaceful');
  const [isStarted, setIsStarted] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);

  const init = useCallback(() => {
    if (ctxRef.current) return;
    ctxRef.current = new AudioContext();
    masterGainRef.current = ctxRef.current.createGain();
    masterGainRef.current.gain.value = volume;
    masterGainRef.current.connect(ctxRef.current.destination);
  }, [volume]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = isMuted ? 0 : v;
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (masterGainRef.current) {
        masterGainRef.current.gain.value = newMuted ? 0 : volume;
      }
      return newMuted;
    });
  }, [volume]);

  const schedule = useCallback(() => {
    const ctx = ctxRef.current;
    const dest = masterGainRef.current;
    if (!ctx || !dest) return;

    const cfg = MOODS[moodRef.current];
    const beatDur = 60 / cfg.bpm;
    const t = nextTimeRef.current;
    const b = beatRef.current;

    // COLLOTOMIC STRUCTURE (gamelan core)
    if (b % 16 === 0)
      schedGong(ctx, dest, cfg.rootFreq / 2, t, cfg.bellVol);

    if (b % 8 === 0)
      schedBonang(ctx, dest, cfg.rootFreq, t, cfg.bellVol * 0.6);

    if (b % 4 === 0)
      schedMetal(ctx, dest, cfg.rootFreq * 2, t, 1.2, cfg.padVol);

    // bass drone (slower, ceremonial)
    if (b % 2 === 0)
      schedMetal(ctx, dest, cfg.rootFreq / 2, t, 1.8, cfg.bassVol);

    // KOTEKAN MELAYU STYLE MELODY
    const { a, b: kb } = kotekan(cfg.scale);

    const idxA = a[b % a.length];
    const idxB = kb[b % kb.length];

    schedMetal(ctx, dest, semi2hz(cfg.rootFreq * 2, cfg.scale[idxA]), t, 0.5, cfg.melodyVol);
    schedMetal(ctx, dest, semi2hz(cfg.rootFreq * 2, cfg.scale[idxB]), t + beatDur * 0.5, 0.5, cfg.melodyVol * 0.8);

    beatRef.current = (b + 1) % 16;
    nextTimeRef.current = t + beatDur;
  }, []);

  const loop = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    while (nextTimeRef.current < ctx.currentTime + 0.2) schedule();

    rafRef.current = requestAnimationFrame(loop);
  }, [schedule]);

  const start = useCallback(() => {
    init();
    const ctx = ctxRef.current!;
    if (ctx.state === 'suspended') ctx.resume();

    nextTimeRef.current = ctx.currentTime + 0.1;
    beatRef.current = 0;
    setIsStarted(true);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [init, loop]);

  const setMood = useCallback((m: MusicMood) => {
    moodRef.current = m;
    setMoodState(m);
    beatRef.current = 0;
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setIsStarted(false);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ctxRef.current?.close();
    };
  }, []);

  return { start, stop, setMood, currentMood, setVolume, toggleMute, volume, isMuted, isStarted };
}