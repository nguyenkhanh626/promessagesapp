const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export class WebRtcManager {
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null
  private onIceCandidateCallback: ((candidate: RTCIceCandidate) => void) | null = null

  public init(
    onRemoteStream: (stream: MediaStream) => void,
    onIceCandidate: (candidate: RTCIceCandidate) => void
  ) {
    this.close()

    this.onRemoteStreamCallback = onRemoteStream
    this.onIceCandidateCallback = onIceCandidate

    this.peerConnection = new RTCPeerConnection(RTC_CONFIG)
    this.remoteStream = new MediaStream()

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateCallback) {
        this.onIceCandidateCallback(event.candidate)
      }
    }

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.onRemoteStreamCallback?.(event.streams[0])
      } else if (this.remoteStream) {
        this.remoteStream.addTrack(event.track)
        this.onRemoteStreamCallback?.(this.remoteStream)
      }
    }

    this.peerConnection.onconnectionstatechange = () => {
      console.log('📡 [WebRTC] Connection State:', this.peerConnection?.connectionState)
    }

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('❄️ [WebRTC] ICE Connection State:', this.peerConnection?.iceConnectionState)
    }
  }

  public setLocalStream(stream: MediaStream) {
    this.localStream = stream
    if (this.peerConnection) {
      stream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, stream)
      })
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection chưa được khởi tạo')
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    })

    await this.peerConnection.setLocalDescription(offer)
    return offer
  }

  public async handleOfferAndCreateAnswer(
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection chưa được khởi tạo')
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await this.peerConnection.createAnswer()
    await this.peerConnection.setLocalDescription(answer)
    return answer
  }

  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection chưa được khởi tạo')
    }

    if (this.peerConnection.signalingState !== 'stable') {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }

  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (e) {
      console.warn('Không thể nạp ICE Candidate:', e)
    }
  }

  public close() {
    if (this.peerConnection) {
      this.peerConnection.ontrack = null
      this.peerConnection.onicecandidate = null
      this.peerConnection.close()
      this.peerConnection = null
    }
    this.localStream = null
    this.remoteStream = null
  }
}

export const webrtcManager = new WebRtcManager()
