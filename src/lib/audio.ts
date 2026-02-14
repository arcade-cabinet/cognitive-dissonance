export class SFX {
  public ctx: AudioContext | null = null;
  public musicInterval: number | null = null;

  init(): void {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private tone(
    frequency: number,
    type: OscillatorType = 'square',
    duration = 0.12,
    volume = 0.12
  ): void {
    if (!this.ctx) return;
    const oscillator = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    oscillator.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    oscillator.start();
    oscillator.stop(this.ctx.currentTime + duration);
  }

  counter(combo: number): void {
    const f = 400 + combo * 40;
    this.tone(f, 'square', 0.08, 0.1);
    setTimeout(() => this.tone(f * 1.25, 'square', 0.08, 0.08), 50);
    setTimeout(() => this.tone(f * 1.5, 'triangle', 0.15, 0.06), 100);
  }

  miss(): void {
    this.tone(120, 'sawtooth', 0.2, 0.08);
  }

  panicHit(): void {
    this.tone(90, 'sawtooth', 0.15, 0.1);
  }

  powerup(): void {
    this.tone(600, 'triangle', 0.1, 0.08);
    setTimeout(() => this.tone(800, 'triangle', 0.1, 0.08), 80);
    setTimeout(() => this.tone(1000, 'triangle', 0.2, 0.06), 160);
  }

  nuke(): void {
    this.tone(200, 'sawtooth', 0.4, 0.13);
    setTimeout(() => this.tone(100, 'sawtooth', 0.6, 0.1), 100);
  }

  bossHit(): void {
    this.tone(300, 'square', 0.06, 0.1);
    this.tone(450, 'square', 0.06, 0.08);
  }

  bossDie(): void {
    [0, 80, 160, 240, 320, 400].forEach((d, i) => {
      setTimeout(() => this.tone(200 + i * 80, 'square', 0.15, 0.1), d);
    });
  }

  waveStart(): void {
    [0, 100, 200, 300].forEach((d, i) => {
      setTimeout(() => this.tone(300 + i * 100, 'square', 0.12, 0.07), d);
    });
  }

  startMusic(wave: number): void {
    this.stopMusic();
    if (!this.ctx) return;
    const bpm = 130 + wave * 14;
    const ms = 60000 / bpm / 2;
    const bass = [110, 110, 130.81, 110, 146.83, 130.81, 110, 98];
    const mel = [440, 0, 550, 0, 440, 660, 550, 0];
    let beat = 0;
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0.06;
    gainNode.connect(this.ctx.destination);
    this.musicInterval = window.setInterval(() => {
      if (!this.ctx) return;
      const i = beat % 8;
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = bass[i];
      gain.gain.setValueAtTime(0.06 + wave * 0.015, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (ms / 1000) * 0.8);
      oscillator.connect(gain);
      gain.connect(gainNode);
      oscillator.start();
      oscillator.stop(this.ctx.currentTime + ms / 1000);
      if (i % 2 === 0) {
        const kick = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kick.type = 'square';
        kick.frequency.value = 42;
        kickGain.gain.setValueAtTime(0.06 + wave * 0.02, this.ctx.currentTime);
        kickGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);
        kick.connect(kickGain);
        kickGain.connect(gainNode);
        kick.start();
        kick.stop(this.ctx.currentTime + 0.07);
      }
      if (wave > 1 && mel[i] > 0) {
        const melody = this.ctx.createOscillator();
        const melodyGain = this.ctx.createGain();
        melody.type = 'square';
        melody.frequency.value = mel[i];
        melodyGain.gain.setValueAtTime(0.015 + wave * 0.004, this.ctx.currentTime);
        melodyGain.gain.exponentialRampToValueAtTime(
          0.001,
          this.ctx.currentTime + (ms / 1000) * 0.4
        );
        melody.connect(melodyGain);
        melodyGain.connect(gainNode);
        melody.start();
        melody.stop(this.ctx.currentTime + (ms / 1000) * 0.5);
      }
      beat++;
    }, ms);
  }

  stopMusic(): void {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}
