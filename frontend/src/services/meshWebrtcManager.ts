/**
 * Quản lý nhiều kết nối WebRTC PeerConnection theo mô hình Full Mesh (3-5 người)
 * Mỗi peerId trong phòng họp sẽ có một RTCPeerConnection độc lập.
 */

const RTC_CONFIG: RTCConfiguration = {
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
  private peers: Map<string, RTCPeerConnection> = new Map()
  private remoteStreams: Map<string, MediaStream> = new Map()
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map()
  private localStream: MediaStream | null = null
  private activeScreenTrack: MediaStreamTrack | null = null

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

    const pc = new RTCPeerConnection(RTC_CONFIG)
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
