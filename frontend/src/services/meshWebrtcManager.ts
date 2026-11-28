/**
 * Quản lý nhiều kết nối WebRTC PeerConnection theo mô hình Full Mesh (3-5 người)
 * Mỗi peerId trong phòng họp sẽ có một RTCPeerConnection độc lập.
 */

const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export interface MeshPeerCallbacks {
  onRemoteStream: (peerId: string, stream: MediaStream) => void
  onIceCandidate: (peerId: string, candidate: RTCIceCandidate) => void
  onIceStateChange?: (peerId: string, state: RTCIceConnectionState) => void
}

export class MeshWebRtcManager {
  private rtcConfig: RTCConfiguration = DEFAULT_RTC_CONFIG
  private peers: Map<string, RTCPeerConnection> = new Map()
  private remoteStreams: Map<string, MediaStream> = new Map()
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map()
  private localStream: MediaStream | null = null
  private activeScreenTrack: MediaStreamTrack | null = null

  public setIceServers(iceServers: RTCIceServer[]) {
    if (Array.isArray(iceServers) && iceServers.length > 0) {
      this.rtcConfig = { iceServers }
    }
  }

  public getPeerConnections(): Map<string, RTCPeerConnection> {
    return this.peers
  }

  public setLocalStream(stream: MediaStream | null) {
    this.localStream = stream
  }

  public initPeer(
    peerId: string,
    localStream: MediaStream | null,
    callbacks: MeshPeerCallbacks
  ): RTCPeerConnection {
    // Nếu đã có kết nối cũ với peerId này thì đóng lại trước
    this.removePeer(peerId)

    if (localStream) {
      this.localStream = localStream
    }

    const pc = new RTCPeerConnection(this.rtcConfig)
    const remoteStream = new MediaStream()
    this.peers.set(peerId, pc)
    this.remoteStreams.set(peerId, remoteStream)

    // Đưa các track local vào PeerConnection (ưu tiên track chia sẻ màn hình nếu đang bật)
    if (this.localStream) {
      let hasVideoAdded = false
      this.localStream.getTracks().forEach((track) => {
        if (track.kind === 'video' && this.activeScreenTrack) {
          pc.addTrack(this.activeScreenTrack, this.localStream!)
          hasVideoAdded = true
        } else {
          pc.addTrack(track, this.localStream!)
          if (track.kind === 'video') hasVideoAdded = true
        }
      })
      if (!hasVideoAdded && this.activeScreenTrack) {
        pc.addTrack(this.activeScreenTrack, this.localStream)
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        callbacks.onIceCandidate(peerId, event.candidate)
      }
    }

    pc.ontrack = (event) => {
      console.log(`🎬 [Mesh WebRTC] Nhận remote track (${event.track.kind}) từ peer '${peerId}'`)
      const targetStream = event.streams && event.streams[0] ? event.streams[0] : remoteStream
      if (!event.streams || !event.streams[0]) {
        remoteStream.addTrack(event.track)
      }
      this.remoteStreams.set(peerId, targetStream)
      callbacks.onRemoteStream(peerId, targetStream)
    }

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState
      console.log(`❄️ [Mesh WebRTC] ICE State với '${peerId}':`, state)
      callbacks.onIceStateChange?.(peerId, state)
    }

    return pc
  }

  public async createOffer(peerId: string): Promise<RTCSessionDescriptionInit | null> {
    const pc = this.peers.get(peerId)
    if (!pc) return null

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    })
    await pc.setLocalDescription(offer)
    return offer
  }

  public async createIceRestartOffer(peerId: string): Promise<RTCSessionDescriptionInit | null> {
    const pc = this.peers.get(peerId)
    if (!pc) return null
    try {
      const offer = await pc.createOffer({ iceRestart: true })
      await pc.setLocalDescription(offer)
      console.log(`🔄 [Mesh WebRTC] Đã tạo ICE Restart Offer tới '${peerId}'`)
      return offer
    } catch (err) {
      console.warn(`⚠️ [Mesh WebRTC] Lỗi tạo ICE Restart Offer cho '${peerId}':`, err)
      return null
    }
  }

  public async applyMaxVideoBitrateForAllPeers(maxBitrateBps: number | null): Promise<void> {
    const tasks: Promise<void>[] = []
    this.peers.forEach((pc, peerId) => {
      const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video')
      if (!videoSender) return

      try {
        const params = videoSender.getParameters()
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}]
        }
        if (maxBitrateBps && maxBitrateBps > 0) {
          params.encodings[0].maxBitrate = maxBitrateBps
        } else {
          delete params.encodings[0].maxBitrate
        }
        tasks.push(
          videoSender.setParameters(params).catch((err) => {
            console.warn(`⚠️ [Mesh WebRTC] Lỗi setParameters cho '${peerId}':`, err)
          })
        )
      } catch (err) {
        console.warn(`⚠️ [Mesh WebRTC] Không thể cập nhật maxBitrate cho '${peerId}':`, err)
      }
    })
    await Promise.all(tasks)
  }

  public async handleOffer(
    peerId: string,
    offerSdp: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit | null> {
    const pc = this.peers.get(peerId)
    if (!pc) return null

    await pc.setRemoteDescription(new RTCSessionDescription(offerSdp))
    await this.flushPendingCandidates(peerId, pc)

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    return answer
  }

  public async handleAnswer(peerId: string, answerSdp: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peers.get(peerId)
    if (!pc) return

    await pc.setRemoteDescription(new RTCSessionDescription(answerSdp))
    await this.flushPendingCandidates(peerId, pc)
  }

  public async addIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peers.get(peerId)
    if (!pc) return

    if (!pc.remoteDescription) {
      const queue = this.pendingCandidates.get(peerId) || []
      queue.push(candidate)
      this.pendingCandidates.set(peerId, queue)
      return
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (err) {
      console.warn(`⚠️ [Mesh WebRTC] Lỗi addIceCandidate cho '${peerId}':`, err)
    }
  }

  private async flushPendingCandidates(peerId: string, pc: RTCPeerConnection) {
    const queue = this.pendingCandidates.get(peerId)
    if (!queue || queue.length === 0) return

    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.warn(`⚠️ [Mesh WebRTC] Lỗi flush candidate cho '${peerId}':`, err)
      }
    }
    this.pendingCandidates.delete(peerId)
  }

  /**
   * Thay thế track Audio/Video đồng loạt trên toàn bộ kết nối Mesh
   */
  public async replaceTrackForAllPeers(
    kind: 'audio' | 'video',
    newTrack: MediaStreamTrack | null,
    isScreenShare = false
  ): Promise<void> {
    if (kind === 'video') {
      this.activeScreenTrack = isScreenShare ? newTrack : null
    }

    const tasks: Promise<void>[] = []
    this.peers.forEach((pc, peerId) => {
      const sender = pc
        .getSenders()
        .find((s) => s.track?.kind === kind || (kind === 'video' && s.track === null))
      if (sender) {
        tasks.push(
          sender.replaceTrack(newTrack).catch((err) => {
            console.warn(`⚠️ Lỗi thay thế ${kind} track cho peer '${peerId}':`, err)
          })
        )
      } else if (newTrack && kind === 'video') {
        try {
          pc.addTrack(newTrack, this.localStream || new MediaStream([newTrack]))
        } catch (err) {
          console.warn(`⚠️ Lỗi thêm video track cho peer '${peerId}':`, err)
        }
      }
    })
    await Promise.all(tasks)
  }

  public hasPeer(peerId: string): boolean {
    return this.peers.has(peerId)
  }

  public removePeer(peerId: string) {
    const pc = this.peers.get(peerId)
    if (pc) {
      try {
        pc.onicecandidate = null
        pc.ontrack = null
        pc.oniceconnectionstatechange = null
        pc.close()
      } catch {}
      this.peers.delete(peerId)
    }
    this.remoteStreams.delete(peerId)
    this.pendingCandidates.delete(peerId)
  }

  public closeAll() {
    Array.from(this.peers.keys()).forEach((peerId) => this.removePeer(peerId))
    this.localStream = null
    this.activeScreenTrack = null
  }
}

export const meshWebrtcManager = new MeshWebRtcManager()
