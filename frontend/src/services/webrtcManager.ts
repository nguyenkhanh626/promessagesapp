/**
 * Quản lý vòng đời WebRTC PeerConnection cho Cuộc gọi Thoại & Video 1-1
 * Hỗ trợ đàm phán Audio & Video SDP HD, thay thế Video Track trực tiếp (Track Replacement),
 * và bắt trạng thái kết nối đường truyền ICE.
 */

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
  private onIceStateCallback: ((state: RTCIceConnectionState) => void) | null = null

  public init(
    onRemoteStream: (stream: MediaStream) => void,
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onIceStateChange?: (state: RTCIceConnectionState) => void
  ) {
    this.close()

    this.onRemoteStreamCallback = onRemoteStream
    this.onIceCandidateCallback = onIceCandidate
    this.onIceStateCallback = onIceStateChange || null

    this.peerConnection = new RTCPeerConnection(RTC_CONFIG)
    this.remoteStream = new MediaStream()

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateCallback) {
        this.onIceCandidateCallback(event.candidate)
      }
    }

    this.peerConnection.ontrack = (event) => {
      console.log('🎬 [WebRTC] Nhận remote track:', event.track.kind, event.track.id)
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0]
        this.onRemoteStreamCallback?.(event.streams[0])
      } else if (this.remoteStream) {
        // Nếu không có streams gom nhóm, thêm track vào stream đích
        this.remoteStream.addTrack(event.track)
        this.onRemoteStreamCallback?.(this.remoteStream)
      }
    }

    this.peerConnection.onconnectionstatechange = () => {
      console.log('📡 [WebRTC] Connection State:', this.peerConnection?.connectionState)
    }

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState || 'closed'
      console.log('❄️ [WebRTC] ICE Connection State:', state)
      this.onIceStateCallback?.(state)
    }
  }

  /**
   * Đưa toàn bộ các track của localStream (cả Audio và Video nếu có) vào PeerConnection
   */
  public setLocalStream(stream: MediaStream) {
    this.localStream = stream
    if (!this.peerConnection) return

    stream.getTracks().forEach((track) => {
      // Kiểm tra xem track này đã được add trước đó chưa
      const senders = this.peerConnection?.getSenders() || []
      const exists = senders.some((s) => s.track?.id === track.id)
      if (!exists) {
        this.peerConnection?.addTrack(track, stream)
      }
    })
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream
  }

  public getIceConnectionState(): RTCIceConnectionState {
    return this.peerConnection?.iceConnectionState || 'new'
  }

  /**
   * Thay thế Video Track trực tiếp khi người dùng chuyển đổi Camera
   * mà không cần tạo lại phiên đàm phán WebRTC (No Renegotiation)
   */
  public async replaceVideoTrack(newTrack: MediaStreamTrack): Promise<boolean> {
    if (!this.peerConnection) return false

    const senders = this.peerConnection.getSenders()
    const videoSender = senders.find((s) => s.track?.kind === 'video' || s.track === null)

    if (videoSender) {
      await videoSender.replaceTrack(newTrack)
      console.log('🎥 [WebRTC] Đã thay thế Video Track thành công:', newTrack.label)
      return true
    } else if (this.localStream) {
      // Nếu chưa có sender video, thêm mới track
      this.peerConnection.addTrack(newTrack, this.localStream)
      return true
    }
    return false
  }

  /**
   * Thay thế Audio Track trực tiếp khi đổi Microphone
   */
  public async replaceAudioTrack(newTrack: MediaStreamTrack): Promise<boolean> {
    if (!this.peerConnection) return false

    const senders = this.peerConnection.getSenders()
    const audioSender = senders.find((s) => s.track?.kind === 'audio')

    if (audioSender) {
      await audioSender.replaceTrack(newTrack)
      console.log('🎤 [WebRTC] Đã thay thế Audio Track thành công:', newTrack.label)
      return true
    }
    return false
  }

  /**
   * Tạo WebRTC SDP Offer (hỗ trợ cả Audio và Video)
   */
  public async createOffer(isVideo = false): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection chưa được khởi tạo')
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: isVideo,
    })

    // Tùy chỉnh SDP munging để tối ưu codec video (VP8/H264) nếu cần
    await this.peerConnection.setLocalDescription(offer)
    return offer
  }

  /**
   * Tiếp nhận Offer và tạo SDP Answer phản hồi
   */
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

  /**
   * Tiếp nhận Answer hoàn tất quá trình bắt tay WebRTC
   */
  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection chưa được khởi tạo')
    }

    if (this.peerConnection.signalingState !== 'stable') {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }

  /**
   * Nạp ICE Candidate nhận từ đối phương
   */
  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (e) {
      console.warn('Không thể nạp ICE Candidate:', e)
    }
  }

  /**
   * Đóng kết nối WebRTC và dọn dẹp tài nguyên
   */
  public close() {
    if (this.peerConnection) {
      this.peerConnection.ontrack = null
      this.peerConnection.onicecandidate = null
      this.peerConnection.oniceconnectionstatechange = null
      this.peerConnection.onconnectionstatechange = null
      this.peerConnection.close()
      this.peerConnection = null
    }
    this.localStream = null
    this.remoteStream = null
  }
}

export const webrtcManager = new WebRtcManager()
