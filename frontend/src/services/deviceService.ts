/**
 * Dịch vụ Quản lý & Chuyển đổi Thiết bị Đa phương tiện (Microphone, Camera, Loa/Tai nghe)
 * Hỗ trợ phân loại thiết bị, thay đổi nguồn thu và thiết lập đầu ra âm thanh (setSinkId).
 */

export interface MediaDeviceInfoItem {
  deviceId: string
  label: string
  kind: MediaDeviceKind
  groupId?: string
}

export interface AvailableDevices {
  audioInputs: MediaDeviceInfoItem[]
  videoInputs: MediaDeviceInfoItem[]
  audioOutputs: MediaDeviceInfoItem[]
}

class DeviceService {
  /**
   * Lấy danh sách toàn bộ các thiết bị Microphone, Webcam và Loa khả dụng
   */
  public async getAvailableDevices(): Promise<AvailableDevices> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.warn('⚠️ Trình duyệt không hỗ trợ navigator.mediaDevices.enumerateDevices')
      return { audioInputs: [], videoInputs: [], audioOutputs: [] }
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()

      const audioInputs: MediaDeviceInfoItem[] = []
      const videoInputs: MediaDeviceInfoItem[] = []
      const audioOutputs: MediaDeviceInfoItem[] = []

      let audioInCount = 1
      let videoInCount = 1
      let audioOutCount = 1

      devices.forEach((device) => {
        const item: MediaDeviceInfoItem = {
          deviceId: device.deviceId,
          label: device.label || '',
          kind: device.kind,
          groupId: device.groupId,
        }

        switch (device.kind) {
          case 'audioinput':
            item.label = item.label || `Microphone ${audioInCount++}`
            audioInputs.push(item)
            break
          case 'videoinput':
            item.label = item.label || `Webcam ${videoInCount++}`
            videoInputs.push(item)
            break
          case 'audiooutput':
            item.label = item.label || `Loa/Tai nghe ${audioOutCount++}`
            audioOutputs.push(item)
            break
        }
      })

      return {
        audioInputs,
        videoInputs,
        audioOutputs,
      }
    } catch (err) {
      console.error('❌ Lỗi khi liệt kê thiết bị đa phương tiện:', err)
      return { audioInputs: [], videoInputs: [], audioOutputs: [] }
    }
  }

  /**
   * Kiểm tra máy tính có thiết bị Camera không
   */
  public async hasCamera(): Promise<boolean> {
    const devices = await this.getAvailableDevices()
    return devices.videoInputs.length > 0
  }

  /**
   * Kiểm tra máy tính có thiết bị Microphone không
   */
  public async hasMicrophone(): Promise<boolean> {
    const devices = await this.getAvailableDevices()
    return devices.audioInputs.length > 0
  }

  /**
   * Chuyển đổi Microphone đang thu âm (lấy track mới và thay vào stream hiện hành)
   */
  public async switchMicrophone(
    deviceId: string,
    currentStream: MediaStream | null
  ): Promise<{ stream: MediaStream; newTrack: MediaStreamTrack } | null> {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      const newAudioTrack = newStream.getAudioTracks()[0]
      if (!newAudioTrack) return null

      if (currentStream) {
        // Dừng track audio cũ
        currentStream.getAudioTracks().forEach((track) => {
          track.stop()
          currentStream.removeTrack(track)
        })
        currentStream.addTrack(newAudioTrack)
        return { stream: currentStream, newTrack: newAudioTrack }
      }

      return { stream: newStream, newTrack: newAudioTrack }
    } catch (err) {
      console.error('❌ Lỗi khi chuyển đổi Microphone:', err)
      return null
    }
  }

  /**
   * Chuyển đổi Webcam đang ghi hình (lấy track mới độ nét HD và thay vào stream hiện hành)
   */
  public async switchCamera(
    deviceId: string,
    currentStream: MediaStream | null
  ): Promise<{ stream: MediaStream; newTrack: MediaStreamTrack } | null> {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      })

      const newVideoTrack = newStream.getVideoTracks()[0]
      if (!newVideoTrack) return null

      if (currentStream) {
        // Dừng track video cũ
        currentStream.getVideoTracks().forEach((track) => {
          track.stop()
          currentStream.removeTrack(track)
        })
        currentStream.addTrack(newVideoTrack)
        return { stream: currentStream, newTrack: newVideoTrack }
      }

      return { stream: newStream, newTrack: newVideoTrack }
    } catch (err) {
      console.error('❌ Lỗi khi chuyển đổi Camera:', err)
      return null
    }
  }

  /**
   * Chuyển đổi đầu ra âm thanh Loa/Tai nghe (sử dụng API HTMLMediaElement.setSinkId)
   */
  public async switchSpeaker(element: HTMLMediaElement | null, deviceId: string): Promise<boolean> {
    if (!element) return false

    // Kiểm tra tính tương thích của API setSinkId
    if (typeof (element as any).setSinkId !== 'function') {
      console.warn('⚠️ Trình duyệt hiện tại không hỗ trợ API HTMLMediaElement.setSinkId()')
      return false
    }

    try {
      await (element as any).setSinkId(deviceId)
      console.log(`🔊 [DeviceService] Đã chuyển đổi thiết bị đầu ra âm thanh sang: ${deviceId}`)
      return true
    } catch (err) {
      console.error('❌ Lỗi khi chuyển đổi Loa/Tai nghe qua setSinkId:', err)
      return false
    }
  }

  /**
   * Lắng nghe sự kiện cắm/rút thiết bị phần cứng (cắm tai nghe, webcam USB...)
   */
  public onDeviceChange(callback: () => void): () => void {
    if (!navigator.mediaDevices || !navigator.mediaDevices.addEventListener) {
      return () => {}
    }

    navigator.mediaDevices.addEventListener('devicechange', callback)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', callback)
    }
  }
}

export const deviceService = new DeviceService()

