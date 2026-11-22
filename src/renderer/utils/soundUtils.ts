/**
 * Synthetic Cash Drawer Kick & Cha-Ching Sound Effect
 * Generates an authentic mechanical latch release click followed by a register bell chime.
 * 100% Offline, zero external media files or dependencies needed.
 */
export function playCashDrawerSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // 1. Mechanical latch release click (drawer kick pulse)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(360, now);
    clickOsc.frequency.exponentialRampToValueAtTime(70, now + 0.07);
    clickGain.gain.setValueAtTime(0.45, now);
    clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.07);

    // 2. Clear golden cash register bell chime (Cha-Ching!)
    setTimeout(() => {
      try {
        const bellTime = ctx.currentTime;
        const bellOsc = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(1760, bellTime); // A6 note
        bellOsc.frequency.exponentialRampToValueAtTime(1200, bellTime + 0.4);
        bellGain.gain.setValueAtTime(0.35, bellTime);
        bellGain.gain.exponentialRampToValueAtTime(0.001, bellTime + 0.4);
        bellOsc.connect(bellGain);
        bellGain.connect(ctx.destination);
        bellOsc.start(bellTime);
        bellOsc.stop(bellTime + 0.4);
      } catch {}
    }, 60);

  } catch (err) {
    console.warn('[Audio] playCashDrawerSound error:', err);
  }
}
