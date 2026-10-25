import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, MessageSquare, User, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const AVATAR_PRESETS = [
  'https://ui-avatars.com/api/?name=User&background=5B5FC7&color=fff&bold=true',
  'https://ui-avatars.com/api/?name=User&background=0078D4&color=fff&bold=true',
  'https://ui-avatars.com/api/?name=User&background=107C41&color=fff&bold=true',
  'https://ui-avatars.com/api/?name=User&background=D83B01&color=fff&bold=true',
  'https://ui-avatars.com/api/?name=User&background=881798&color=fff&bold=true',
]

export const RegisterPage: React.FC = () => {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0])
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!displayName.trim() || !email.trim() || !password) {
      setError('Vui lòng điền đầy đủ tất cả các trường thông tin')
      return
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    setIsSubmitting(true)
    try {
      const avatarUrl = selectedAvatar.replace(
        'name=User',
        `name=${encodeURIComponent(displayName.trim())}`
      )
      await register({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        avatarUrl,
      })
      navigate('/chat')
    } catch (err: any) {
      const serverMessage =
        err.response?.data?.message || 'Đăng ký không thành công. Vui lòng thử lại.'
      setError(serverMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#181818] px-4 py-8 text-white">
      <div className="w-full max-w-md rounded-2xl bg-[#242424] p-8 shadow-2xl border border-[#383838]">
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5B5FC7] text-white shadow-lg mb-4">
            <MessageSquare size={30} strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Tạo tài khoản mới</h1>
          <p className="text-sm text-gray-400 mt-1">Bắt đầu trải nghiệm họp và nhắn tin trên ProMessages</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/30 p-3.5 text-red-400 text-sm animate-fadeIn">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
              Họ và tên hiển thị
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <User size={18} />
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nguyễn Văn A"
                required
                className="w-full rounded-lg bg-[#1a1a1a] border border-[#404040] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-[#5B5FC7] focus:outline-none focus:ring-1 focus:ring-[#5B5FC7] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
              Email công việc hoặc học tập
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <Mail size={18} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten@congty.com"
                required
                className="w-full rounded-lg bg-[#1a1a1a] border border-[#404040] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-[#5B5FC7] focus:outline-none focus:ring-1 focus:ring-[#5B5FC7] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
              Mật khẩu (tối thiểu 6 ký tự)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-lg bg-[#1a1a1a] border border-[#404040] py-2.5 pl-10 pr-11 text-sm text-white placeholder-gray-500 focus:border-[#5B5FC7] focus:outline-none focus:ring-1 focus:ring-[#5B5FC7] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg bg-[#1a1a1a] border border-[#404040] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-[#5B5FC7] focus:outline-none focus:ring-1 focus:ring-[#5B5FC7] transition-colors"
              />
            </div>
          </div>

          {/* Chọn avatar màu sắc phong cách Teams */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
              Chọn màu chủ đạo Avatar
            </label>
            <div className="flex items-center gap-3">
              {AVATAR_PRESETS.map((preset, idx) => {
                const isSelected = selectedAvatar === preset
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatar(preset)}
                    className={`relative h-9 w-9 rounded-full overflow-hidden border-2 transition-all ${
                      isSelected ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={preset} alt={`Avatar option ${idx + 1}`} className="h-full w-full object-cover" />
                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <CheckCircle2 size={16} className="text-white" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 flex items-center justify-center gap-2 rounded-lg bg-[#5B5FC7] hover:bg-[#4f52b2] disabled:opacity-50 disabled:cursor-not-allowed py-2.5 px-4 text-sm font-semibold text-white transition-all shadow-md active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang tạo tài khoản...</span>
              </>
            ) : (
              <span>Đăng ký</span>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-400">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-semibold text-[#7f85f5] hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  )
}

