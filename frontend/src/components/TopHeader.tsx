import { useEffect, useRef, useState } from 'react'
import { ChevronDown, CircleHelp, Search, UserRound, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type PresenceStatus = 'Đang hoạt động' | 'Bận' | 'Không làm phiền' | 'Ngoại tuyến'

const presenceStatuses: PresenceStatus[] = [
  'Đang hoạt động',
  'Bận',
  'Không làm phiền',
  'Ngoại tuyến',
]

const statusClass: Record<PresenceStatus, string> = {
  'Đang hoạt động': 'online',
  Bận: 'busy',
  'Không làm phiền': 'dnd',
  'Ngoại tuyến': 'offline',
}

export function TopHeader() {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [status, setStatus] = useState<PresenceStatus>('Đang hoạt động')
  const searchRef = useRef<HTMLInputElement>(null)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsAccountMenuOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const initial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'

  const handleLogoutClick = async () => {
    setIsAccountMenuOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <header className="top-header">
      <Link className="brand" to="/chat" aria-label="ProMessages - Trang trò chuyện">
        <span className="brand-mark" aria-hidden="true">
          <MessageMark />
        </span>
        <span>ProMessages</span>
      </Link>

      <label className="global-search">
        <Search size={18} strokeWidth={1.8} aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          placeholder="Tìm kiếm (Ctrl + E)"
          aria-label="Tìm kiếm"
        />
        <kbd>Ctrl E</kbd>
      </label>

      <div className="header-actions">
        <button className="icon-button help-button" type="button" aria-label="Trợ giúp">
          <CircleHelp size={20} strokeWidth={1.8} />
        </button>

        <div className="account-menu-container" ref={accountMenuRef}>
          <button
            className={`account-trigger${isAccountMenuOpen ? ' is-open' : ''}`}
            type="button"
            aria-expanded={isAccountMenuOpen}
            aria-haspopup="menu"
            onClick={() => setIsAccountMenuOpen((open) => !open)}
          >
            <span className="avatar overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
              ) : (
                initial
              )}
              <span className={`presence-dot ${statusClass[status]}`} />
            </span>
            <span className="account-name">{user?.displayName || 'Người dùng'}</span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>

          {isAccountMenuOpen && (
            <div className="account-menu" role="menu">
              <div className="account-summary">
                <span className="avatar avatar-large overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
                  ) : (
                    initial
                  )}
                  <span className={`presence-dot ${statusClass[status]}`} />
                </span>
                <div>
                  <strong>{user?.displayName || 'Người dùng'}</strong>
                  <span className="truncate max-w-[180px] block">{user?.email || 'Tài khoản ProMessages'}</span>
                </div>
              </div>

              <button
                className="menu-item"
                type="button"
                role="menuitem"
                onClick={() => {
                  navigate('/profile')
                  setIsAccountMenuOpen(false)
                }}
              >
                <UserRound size={17} aria-hidden="true" />
                Thông tin cá nhân
              </button>

              <div className="status-section">
                <span className="status-heading">Trạng thái</span>
                {presenceStatuses.map((option) => (
                  <button
                    className="status-option"
                    key={option}
                    type="button"
                    role="menuitemradio"
                    aria-checked={status === option}
                    onClick={() => setStatus(option)}
                  >
                    <span className={`presence-dot ${statusClass[option]}`} />
                    {option}
                    {status === option && <span className="status-check">✓</span>}
                  </button>
                ))}
              </div>

              <div className="menu-divider" />
              <button
                className="menu-item text-red-400 hover:text-red-300"
                type="button"
                role="menuitem"
                onClick={handleLogoutClick}
              >
                <LogOut size={17} aria-hidden="true" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function MessageMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 5.25h15v11h-8.1L6 19.5v-3.25H4.5v-11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8 9h8M8 12.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
