"use client";

// Sound effects, synthesised on the phone (no audio files). Off unless the
// player switches them on; the choice is remembered per phone.

const KEY = "cashville_sound";

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
  if (on) playSound("cash", true);
}

export type SoundName = "cash" | "trombone" | "whistle" | "thud" | "pop";

let ctx: AudioContext | null = null;

function tone(
  ac: AudioContext,
  o: { type: OscillatorType; from: number; to?: number; start: number; dur: number; gain?: number; vibrato?: number },
) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  const t0 = ac.currentTime + o.start;
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.from, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
  if (o.vibrato) {
    const lfo = ac.createOscillator();
    const lg = ac.createGain();
    lfo.frequency.value = o.vibrato;
    lg.gain.value = o.from * 0.03;
    lfo.connect(lg).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + o.dur);
  }
  const peak = o.gain ?? 0.18;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.05);
}

export function playSound(name: SoundName, force = false) {
  if (typeof window === "undefined" || (!force && !soundOn())) return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = ctx ?? new AC();
    const ac = ctx;
    void ac.resume();
    switch (name) {
      case "cash": // ka-ching: drawer thunk, then two bright bells
        tone(ac, { type: "square", from: 180, to: 90, start: 0, dur: 0.08, gain: 0.12 });
        tone(ac, { type: "triangle", from: 1568, start: 0.09, dur: 0.35 });
        tone(ac, { type: "triangle", from: 2093, start: 0.2, dur: 0.6 });
        break;
      case "trombone": // wah wah wah waaah
        [311, 293, 277].forEach((f, i) => tone(ac, { type: "sawtooth", from: f, to: f * 0.97, start: i * 0.38, dur: 0.34, gain: 0.1 }));
        tone(ac, { type: "sawtooth", from: 262, to: 196, start: 1.14, dur: 0.9, gain: 0.1, vibrato: 6 });
        break;
      case "whistle": // referee: two sharp blasts
        tone(ac, { type: "sine", from: 2800, start: 0, dur: 0.22, gain: 0.14, vibrato: 38 });
        tone(ac, { type: "sine", from: 2800, start: 0.3, dur: 0.5, gain: 0.14, vibrato: 38 });
        break;
      case "thud": // rubber stamp
        tone(ac, { type: "sine", from: 140, to: 50, start: 0, dur: 0.18, gain: 0.3 });
        break;
      case "pop":
        tone(ac, { type: "sine", from: 500, to: 1200, start: 0, dur: 0.12, gain: 0.15 });
        break;
    }
  } catch {}
}
