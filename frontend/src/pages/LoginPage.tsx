import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, MessageSquare, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu')
      return
    }

    setIsSubmitting(true)
    try {
      await login({ email: email.trim(), password })
      navigate('/chat')
    } catch (err: any) {
      const serverMessage =
        err.response?.data?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.'
      setError(serverMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#181818] px-4 py-8 text-white">
      <div className="w-full max-w-md rounded-2xl bg-[#242424] p-8 shadow-2xl border border-[#383838]">
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5B5FC7] text-white shadow-lg mb-4">
            <MessageSquare size={30} strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Đăng nhập ProMessages</h1>
          <p className="text-sm text-gray-400 mt-1">Nền tảng họp & nhắn tin cộng tác trực tuyến</p>
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                Mật khẩu
              </label>
            </div>
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#5B5FC7] hover:bg-[#4f52b2] disabled:opacity-50 disabled:cursor-not-allowed py-2.5 px-4 text-sm font-semibold text-white transition-all shadow-md active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-400">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-semibold text-[#7f85f5] hover:underline">
            Tạo tài khoản mới
          </Link>
        </div>
      </div>
    </div>
  )
}

