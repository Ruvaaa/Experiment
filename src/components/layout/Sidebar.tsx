import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, FlaskConical, GitCompare, TrendingUp, Database, Cpu, FileText, Settings, LogOut, Menu, X, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAuth } from '../../lib/hooks/useAuth'
import { useProjects } from '../../lib/hooks/useProjects'
import { getInitials } from '../../lib/utils'

const navItems = [
  { section: 'Overview', items: [
    { to: '/dashboard', label: 'Dashboard', icon: Home, end: true },
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
        `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm'
            : 'text-[#A3A3A3] hover:bg-[#1B1B1B] hover:text-[#F5F5F5]'
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
  const [collapsed, setCollapsed] = useState(false)
  const projectsQuery = useProjects()
  const projects = projectsQuery.data ?? []
  const navigate = useNavigate()

  const displayName = profile?.full_name || user?.email || 'User'
  const initials = getInitials(profile?.full_name || user?.email || null)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const SidebarContent = () => (
    <aside className="flex flex-col h-full bg-[var(--surface)] border-r border-[var(--border)]">
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#292929] min-h-[72px]">
        <img src="/experiment-logo.svg" alt="" className="w-8 h-8 rounded-lg flex-shrink-0" />
        {!collapsed && <span className="text-lg font-bold tracking-tight text-[var(--text-primary)] [text-shadow:0_1px_12px_rgba(128,128,128,.18)]">Experiment</span>}
        {collapsed
          ? <button onClick={() => setCollapsed(false)} className="ml-auto hidden lg:grid h-8 w-8 place-items-center rounded-md text-[#737373] hover:bg-[#1B1B1B] hover:text-white" aria-label="Expand project selector"><PanelLeftOpen size={16} /></button>
          : <button onClick={() => setCollapsed(true)} className="ml-auto hidden lg:grid h-8 w-8 place-items-center rounded-md text-[#737373] hover:bg-[#1B1B1B] hover:text-white" aria-label="Collapse project selector"><PanelLeftClose size={16} /></button>}
      </div>
      {!collapsed && (
        <div className="px-3 pt-3">
          <label htmlFor="project-selector" className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#737373]">Project</label>
          <select id="project-selector" className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" defaultValue={localStorage.getItem('experiment_active_project') ?? ''} onChange={event => localStorage.setItem('experiment_active_project', event.target.value)}>
            <option value="" disabled>{projects.length ? 'Select project' : 'No projects yet'}</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
      )}
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
            <div className="w-6 h-6 rounded-full bg-neutral-200 text-neutral-950 flex items-center justify-center text-xs font-semibold flex-shrink-0">{initials}</div>
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
      <div className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 w-60 h-screen shadow-[12px_0_40px_rgba(0,0,0,.08)]">
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
