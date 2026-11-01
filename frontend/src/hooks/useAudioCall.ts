import { useCall } from '../context/CallContext'

/**
 * Hook tiện ích bọc lại CallContext cho các component gọi thoại
 */
export function useAudioCall() {
  return useCall()
}

