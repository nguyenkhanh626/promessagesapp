import { useEffect, useRef, useState } from 'react'
import type { CallMode, NetworkQualityLevel, NetworkStats } from '../types/calling'
import { webrtcManager } from '../services/webrtcManager'
import { meshWebrtcManager } from '../services/meshWebrtcManager'

interface UseNetworkQualityOptions {
  isConnected: boolean
  callMode: CallMode
  hasVideo: boolean
}

const DEFAULT_STATS: NetworkStats = {
  quality: 'GOOD',
  rttMs: 0,
  packetLossPercent: 0,
  maxVideoBitrateKbps: null,
}

const BITRATE_LIMITS: Record<NetworkQualityLevel, number> = {
  GOOD: 1_500_000,
  FAIR: 450_000,
  POOR: 150_000,
}

/**
 * Giám sát chất lượng đường truyền WebRTC định kỳ qua pc.getStats()
 * và tự động điều chỉnh maxBitrate Video để ưu tiên âm thanh khi mạng yếu.
 */
export function useNetworkQuality({ isConnected, callMode, hasVideo }: UseNetworkQualityOptions) {
  const [networkStats, setNetworkStats] = useState<NetworkStats>(DEFAULT_STATS)
  const prevTotalsRef = useRef<{ lost: number; received: number }>({ lost: 0, received: 0 })
  const lastAppliedQualityRef = useRef<NetworkQualityLevel>('GOOD')

  useEffect(() => {
    if (!isConnected) {
      prevTotalsRef.current = { lost: 0, received: 0 }
      lastAppliedQualityRef.current = 'GOOD'
      setNetworkStats(DEFAULT_STATS)
      return
    }

    const sampleStats = async () => {
      const connections: RTCPeerConnection[] =
        callMode === 'GROUP'
          ? Array.from(meshWebrtcManager.getPeerConnections().values())
          : webrtcManager.getPeerConnection()
            ? [webrtcManager.getPeerConnection()!]
            : []

      if (connections.length === 0) return

      let maxRttMs = 0
      let totalLost = 0
      let totalReceived = 0

      for (const pc of connections) {
        try {
          const report = await pc.getStats()
          report.forEach((stat) => {
            if (
              stat.type === 'candidate-pair' &&
              stat.state === 'succeeded' &&
              typeof stat.currentRoundTripTime === 'number'
            ) {
              const rtt = Math.round(stat.currentRoundTripTime * 1000)
              if (rtt > maxRttMs) maxRttMs = rtt
            }
            if (stat.type === 'inbound-rtp' && (stat.kind === 'audio' || stat.kind === 'video')) {
              if (typeof stat.packetsLost === 'number' && stat.packetsLost > 0) {
                totalLost += stat.packetsLost
              }
              if (typeof stat.packetsReceived === 'number' && stat.packetsReceived > 0) {
                totalReceived += stat.packetsReceived
              }
            }
          })
        } catch {
          // Bỏ qua nếu PeerConnection vừa đóng
        }
      }

      const deltaLost = Math.max(0, totalLost - prevTotalsRef.current.lost)
      const deltaReceived = Math.max(0, totalReceived - prevTotalsRef.current.received)
      prevTotalsRef.current = { lost: totalLost, received: totalReceived }

      const totalDelta = deltaLost + deltaReceived
      const packetLossPercent =
        totalDelta > 0 ? Math.min(100, Number(((deltaLost / totalDelta) * 100).toFixed(1))) : 0

      let quality: NetworkQualityLevel = 'GOOD'
      if (maxRttMs > 350 || packetLossPercent > 5) {
        quality = 'POOR'
      } else if (maxRttMs > 150 || packetLossPercent > 2) {
        quality = 'FAIR'
      }

      const targetBitrateBps = BITRATE_LIMITS[quality]
      if (hasVideo && quality !== lastAppliedQualityRef.current) {
        lastAppliedQualityRef.current = quality
        if (callMode === 'GROUP') {
          await meshWebrtcManager.applyMaxVideoBitrateForAllPeers(targetBitrateBps)
        } else {
          await webrtcManager.applyMaxVideoBitrate(targetBitrateBps)
        }
      }

      setNetworkStats({
        quality,
        rttMs: maxRttMs,
        packetLossPercent,
        maxVideoBitrateKbps: hasVideo ? Math.round(targetBitrateBps / 1000) : null,
      })
    }

    const timer = setInterval(sampleStats, 2000)
    return () => clearInterval(timer)
  }, [isConnected, callMode, hasVideo])

  return { networkStats }
}
