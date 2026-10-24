import {
  Bell,
  MessageSquare,
  PanelsTopLeft,
  Phone,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

type ActivityItem = {
  label: string
  path: string
  icon: LucideIcon
}

const activityItems: ActivityItem[] = [
  { label: 'Hoạt động', path: '/activity', icon: Bell },
  { label: 'Trò chuyện', path: '/chat', icon: MessageSquare },
  { label: 'Nhóm', path: '/teams', icon: Users },
  { label: 'Cuộc gọi', path: '/calls', icon: Phone },
  { label: 'Bảng vẽ', path: '/whiteboard', icon: PanelsTopLeft },
  { label: 'Trợ lý AI', path: '/ai-assistant', icon: Sparkles },
]

export function ActivityBar() {
  return (
    <nav className="activity-bar" aria-label="Điều hướng chính">
      <div className="activity-items">
        {activityItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `activity-link${isActive ? ' active' : ''}`}
            title={label}
            aria-label={label}
          >
            <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
      <NavLink
        to="/settings"
        className={({ isActive }) => `activity-link activity-settings${isActive ? ' active' : ''}`}
        title="Cài đặt"
        aria-label="Cài đặt"
      >
        <Settings size={21} strokeWidth={1.8} aria-hidden="true" />
        <span>Cài đặt</span>
      </NavLink>
    </nav>
  )
}
