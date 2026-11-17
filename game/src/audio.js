// Synthesized WebAudio sound effects and a small music loop for Star Salvage.
// No audio files: every sound is built from oscillators and filtered noise.

export function createAudio() {
  const audio = {
    context: null,
    master: null,
    musicTimer: null,
    musicStep: 0,
    muted: false,
  };

  // Browsers only allow audio after a user gesture; call from a key/click handler.
  audio.ensure = function ensure() {
    if (audio.context) {
      if (audio.context.state === 'suspended') audio.context.resume();
      return true;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      audio.context = new Ctor();
      audio.master = audio.context.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.context.destination);
      return true;
    } catch {
      return false;
    }
  };

  function tone(freq, duration, type, volume, slideTo) {
    if (!audio.context || audio.muted) return;
    const now = audio.context.currentTime;
    const osc = audio.context.createOscillator();
    const gain = audio.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function noise(duration, volume, filterFreq) {
    if (!audio.context || audio.muted) return;
    const now = audio.context.currentTime;
    const length = Math.max(1, Math.floor(audio.context.sampleRate * duration));
    const buffer = audio.context.createBuffer(1, length, audio.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = audio.context.createBufferSource();
    source.buffer = buffer;
    const filter = audio.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = audio.context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    source.start(now);
  }

  audio.shoot = function shoot() {
    tone(880, 0.09, 'square', 0.08, 220);
  };

  audio.explosion = function explosion() {
    noise(0.35, 0.3, 900);
    tone(120, 0.3, 'sawtooth', 0.18, 40);
  };

  audio.pickup = function pickup(combo) {
    const base = 520 + Math.min(combo, 12) * 40;
    tone(base, 0.12, 'sine', 0.16);
    tone(base * 1.5, 0.16, 'sine', 0.12);
  };

  audio.hit = function hit() {
    noise(0.2, 0.25, 500);
    tone(200, 0.2, 'sawtooth', 0.16, 60);
  };

  audio.wave = function wave() {
    tone(330, 0.14, 'triangle', 0.14);
    setTimeout(() => tone(440, 0.14, 'triangle', 0.14), 140);
    setTimeout(() => tone(660, 0.2, 'triangle', 0.14), 280);
  };

  audio.gameOver = function gameOver() {
    tone(392, 0.25, 'triangle', 0.16, 370);
    setTimeout(() => tone(311, 0.25, 'triangle', 0.16, 294), 240);
    setTimeout(() => tone(233, 0.5, 'triangle', 0.16, 180), 480);
  };

  // A slow, quiet bass-and-pluck loop: A minor arpeggio, one note per step.
  const BASS_NOTES = [110, 0, 130.81, 0, 98, 0, 146.83, 0, 110, 0, 130.81, 0, 164.81, 146.83, 130.81, 98];
  const PLUCK_NOTES = [440, 523.25, 659.25, 523.25, 440, 523.25, 659.25, 880, 440, 523.25, 659.25, 523.25, 587.33, 659.25, 523.25, 440];

  audio.startMusic = function startMusic() {
    if (!audio.context || audio.musicTimer) return;
    audio.musicTimer = setInterval(() => {
      if (audio.muted) return;
      const step = audio.musicStep % 16;
      const bass = BASS_NOTES[step];
      if (bass) tone(bass, 0.42, 'triangle', 0.09);
      if (step % 2 === 0) tone(PLUCK_NOTES[step], 0.18, 'sine', 0.045);
      audio.musicStep += 1;
    }, 240);
  };

  audio.stopMusic = function stopMusic() {
    if (audio.musicTimer) {
      clearInterval(audio.musicTimer);
      audio.musicTimer = null;
    }
  };

  return audio;
}
