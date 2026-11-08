// Synthesized sound: WebAudio effects plus an ambient track (a filtered wind
// bed and a slow pentatonic lullaby keyed to each stage theme). No audio files.
// The renderer owns when to play; this module owns how things sound.
const noise = n => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
export function createAudio(opts) {
  const kit = { sound: opts.sound !== false, music: opts.music !== false };
  let audio = null, noiseBuffer = null;
  const makeNoise = () => { const b = audio.createBuffer(1, audio.sampleRate, audio.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
  const scales = { bay: [277, 311, 370, 415, 466], peak: [294, 330, 370, 440, 494], polar: [175, 208, 233, 262, 311], snow: [262, 294, 330, 392, 440], ice: [294, 349, 392, 440, 523], dusk: [247, 294, 330, 370, 440], aurora: [220, 262, 294, 330, 392], night: [196, 233, 262, 311, 349] };
  let music = null, nextBeat = 0, beat = 0;
  function startMusic() {
    if (!audio || music) return;
    noiseBuffer ??= makeNoise();
    const master = audio.createGain(); master.gain.value = 0; master.connect(audio.destination);
    const wind = audio.createBufferSource(); wind.buffer = noiseBuffer; wind.loop = true; const lp = audio.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = .6;
    const lfo = audio.createOscillator(); lfo.frequency.value = .07; const depth = audio.createGain(); depth.gain.value = 260; lfo.connect(depth); depth.connect(lp.frequency);
    const windGain = audio.createGain(); windGain.gain.value = .5; wind.connect(lp); lp.connect(windGain); windGain.connect(master); wind.start(); lfo.start();
    music = { master }; nextBeat = audio.currentTime + .2; beat = 0;
  }
  function pluck(f, at, len, gain) { const o = audio.createOscillator(), g = audio.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(gain, at + .06); g.gain.exponentialRampToValueAtTime(.001, at + len); o.connect(g); g.connect(music.master); o.start(at); o.stop(at + len + .05); }
  kit.schedule = function scheduleMusic() {
    if (!audio || !music) return;
    const level = !kit.music || document.hidden ? 0 : opts.playing() ? .55 : .28; music.master.gain.setTargetAtTime(level, audio.currentTime, .9);
    if (level === 0) { nextBeat = Math.max(nextBeat, audio.currentTime); return; }
    const scale = scales[opts.theme()] || scales.snow;
    while (nextBeat < audio.currentTime + .8) {
      const stepIn = beat % 8;
      if (stepIn === 0) pluck(scale[0] / 2, nextBeat, 2.4, .05);
      if (stepIn % 2 === 0 || noise(beat) < .35) pluck(scale[Math.floor(noise(beat * 1.7 + 3) * scale.length)], nextBeat, 1.4, stepIn === 0 ? .022 : .03);
      nextBeat += .62; beat++;
    }
  }
  function hiss(len, from, to, gain, q = 1) {
    if (!kit.sound || !audio) return;
    noiseBuffer ??= makeNoise();
    const src = audio.createBufferSource(), f = audio.createBiquadFilter(), g = audio.createGain(); src.buffer = noiseBuffer; f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(from, audio.currentTime); f.frequency.exponentialRampToValueAtTime(to, audio.currentTime + len);
    g.gain.setValueAtTime(gain, audio.currentTime); g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + len);
    src.connect(f); f.connect(g); g.connect(audio.destination); src.start(); src.stop(audio.currentTime + len + .02);
  }
  function tone(f, len, type = 'sine', gain = .05, delay = 0, slide = 1) { if (!kit.sound || !audio) return; const t0 = audio.currentTime + delay; const o = audio.createOscillator(), g = audio.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * slide, t0 + len); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + .012); g.gain.exponentialRampToValueAtTime(.001, t0 + len); o.connect(g); g.connect(audio.destination); o.start(t0); o.stop(t0 + len + .02); }
  kit.sfx = {
    slash: () => hiss(.16, 1800, 350, .07, .8),
    hit: () => { hiss(.08, 900, 300, .05, 1.5); tone(110, .12, 'sine', .05, 0, .6); },
    kill: () => { hiss(.22, 700, 150, .08, 1.2); tone(80, .25, 'triangle', .07, 0, .5); },
    pickup: () => tone(560, .06, 'sine', .035, 0, 1.35),
    deposit: () => tone(420, .05, 'triangle', .03, 0, 1.2),
    coin: () => { tone(1318, .07, 'sine', .045); tone(1760, .09, 'sine', .04, .06); },
    pay: () => tone(990, .04, 'triangle', .025, 0, 1.1),
    built: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, 'triangle', .05, i * .09)),
    fanfare: () => [523, 659, 784, 1047, 1318].forEach((f, i) => tone(f, .35, 'triangle', .06, i * .12)),
    star: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, .28, 'triangle', .05, i * .09)),
    hurt: () => tone(160, .14, 'square', .03, 0, .7),
  };
  // Browsers only start audio after a user gesture: call this from a click.
  kit.unlock = () => { try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); startMusic(); } catch { } };
  kit.buzz = ms => { if (kit.sound && navigator.vibrate) try { navigator.vibrate(ms); } catch { } };
  return kit;
}
