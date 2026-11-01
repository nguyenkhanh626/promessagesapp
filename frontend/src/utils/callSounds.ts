class CallSoundManager {
  private audioCtx: AudioContext | null = null
  private ringtoneInterval: any = null
  private dialtoneInterval: any = null
  private activeNodes: (OscillatorNode | GainNode)[] = []

  private getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      this.audioCtx = new AudioContextClass()
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume()
    }
    return this.audioCtx
  }

  /**
   * Phát chuông cuộc gọi đến (Incoming Ringtone - âm đôi chu kỳ Microsoft Teams)
   */
  public playIncomingRingtone() {
    this.stopAll()
    const ctx = this.getAudioContext()

    const playBeepPair = () => {
      try {
        const now = ctx.currentTime

        // Dao động 1 (Tần số 853 Hz)
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = 'sine'
        osc1.frequency.setValueAtTime(853, now)

        // Dao động 2 (Tần số 960 Hz)
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(960, now)

        gain1.gain.setValueAtTime(0.08, now)
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
        gain2.gain.setValueAtTime(0.08, now)
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2)

        osc1.connect(gain1).connect(ctx.destination)
        osc2.connect(gain2).connect(ctx.destination)

        osc1.start(now)
        osc1.stop(now + 1.2)
        osc2.start(now)
        osc2.stop(now + 1.2)

        this.activeNodes.push(osc1, osc2, gain1, gain2)
      } catch {}
    }

    playBeepPair()
    this.ringtoneInterval = setInterval(playBeepPair, 2500)
  }

  /**
   * Phát âm thanh chờ đối phương nhấc máy (Outgoing Dial Tone)
   */
  public playDialTone() {
    this.stopAll()
    const ctx = this.getAudioContext()

    const playDialPulse = () => {
      try {
        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(440, now)

        gain.gain.setValueAtTime(0.06, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)

        osc.connect(gain).connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 1.2)

        this.activeNodes.push(osc, gain)
      } catch {}
    }

    playDialPulse()
    this.dialtoneInterval = setInterval(playDialPulse, 3000)
  }

  /**
   * Phát âm thanh dập máy / kết thúc cuộc gọi
   */
  public playEndTone() {
    this.stopAll()
    const ctx = this.getAudioContext()

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(480, now)

      // 3 tiếng bíp ngắn
      gain.gain.setValueAtTime(0.08, now)
      gain.gain.setValueAtTime(0.001, now + 0.15)
      gain.gain.setValueAtTime(0.08, now + 0.25)
      gain.gain.setValueAtTime(0.001, now + 0.4)
      gain.gain.setValueAtTime(0.08, now + 0.5)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7)

      osc.connect(gain).connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.75)
    } catch {}
  }

  /**
   * Dừng toàn bộ các âm thanh đang phát
   */
  public stopAll() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval)
      this.ringtoneInterval = null
    }
    if (this.dialtoneInterval) {
      clearInterval(this.dialtoneInterval)
      this.dialtoneInterval = null
    }

    this.activeNodes.forEach((node) => {
      try {
        if ('stop' in node) (node as OscillatorNode).stop()
        node.disconnect()
      } catch {}
    })
    this.activeNodes = []
  }
}

export const callSounds = new CallSoundManager()

