import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, FlaskConical, GitCompare, TrendingUp, Database, Cpu, FileText, Settings, LogOut, Menu, X, ChevronDown } from 'lucide-react'
import { useAuth } from '../../lib/hooks/useAuth'
import { getInitials } from '../../lib/utils'

const navItems = [
  { section: 'Overview', items: [
    { to: '/', label: 'Dashboard', icon: Home, end: true },
    { to: '/experiments', label: 'Experiments', icon: FlaskConical },
    { to: '/compare', label: 'Compare', icon: GitCompare },
    { to: '/analytics', label: 'Analytics', icon: TrendingUp },
  ]},
  { section: 'Workspace', items: [
    { to: '/datasets', label: 'Datasets', icon: Database },
    { to: '/models', label: 'Models', icon: Cpu },
    { to: '/notes', label: 'Notes', icon: FileText },
  ]},
]

function NavItem({ to, label, icon: Icon, end }: { to: string; label: string; icon: React.ElementType; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-pink-light text-pink border-l-2 border-pink -ml-px pl-[calc(0.75rem-1px)]'
            : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-950'
        }`
      }
    >
      <Icon size={16} />
      {label}
    </NavLink>
  )
}

export function Sidebar() {
  const { profile, user, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()

  const displayName = profile?.full_name || user?.email || 'User'
  const initials = getInitials(profile?.full_name || user?.email || null)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const SidebarContent = () => (
    <aside className="flex flex-col h-full bg-white border-r border-neutral-100">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-neutral-100">
        <div className="w-7 h-7 rounded-lg bg-pink flex items-center justify-center">
          <FlaskConical size={14} className="text-white" />
        </div>
        <span className="font-semibold text-neutral-950 tracking-tight">Experiment</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navItems.map(section => (
          <div key={section.section}>
            <p className="px-3 mb-1 text-xs font-semibold text-neutral-400 uppercase tracking-widest">{section.section}</p>
            <div className="space-y-0.5">
              {section.items.map(item => <NavItem key={item.to} {...item} />)}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-neutral-100 space-y-0.5">
        <NavItem to="/settings" label="Settings" icon={Settings} />
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-pink-muted text-pink flex items-center justify-center text-xs font-semibold flex-shrink-0">{initials}</div>
            <span className="flex-1 truncate text-left text-neutral-700">{displayName}</span>
            <ChevronDown size={14} className="text-neutral-400" />
          </button>
          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg border border-neutral-100 shadow-lg overflow-hidden">
              <button onClick={() => { navigate('/settings'); setUserMenuOpen(false) }} className="w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">Profile &amp; Settings</button>
              <button onClick={handleSignOut} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><LogOut size={14} />Sign Out</button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-60 flex-shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </div>
      {/* Mobile */}
      <div className="lg:hidden">
        <button onClick={() => setMobileOpen(true)} className="fixed top-4 left-4 z-40 p-2 bg-white rounded-lg border border-neutral-200 shadow-sm" aria-label="Open menu">
          <Menu size={18} />
        </button>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <div className="relative w-64 flex flex-col">
              <SidebarContent />
              <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-3 p-1.5 rounded-lg hover:bg-neutral-100" aria-label="Close menu"><X size={18} /></button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
