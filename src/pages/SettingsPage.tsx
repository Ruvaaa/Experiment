import { useState } from 'react'
import { useAuth } from '../lib/hooks/useAuth'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { PageLayout } from '../components/layout/PageLayout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { getInitials } from '../lib/utils'
import { cn } from '../lib/utils'

// ── tab definitions ───────────────────────────────────────────────────────────

type Tab = 'profile' | 'account' | 'danger'

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'account', label: 'Account' },
  { id: 'danger', label: 'Danger Zone' },
]

// ── ProfileSection ────────────────────────────────────────────────────────────

function ProfileSection() {
  const { profile, updateProfile } = useAuth()
  const { addToast } = useToast()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [errors, setErrors] = useState<{ fullName?: string; username?: string }>({})
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const errs: typeof errors = {}
    if (!fullName.trim()) errs.fullName = 'Full name is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)
    try {
      await updateProfile({
        full_name: fullName.trim() || null,
        username: username.trim() || null,
      })
      addToast('Profile updated', 'success')
    } catch {
      addToast('Failed to update profile', 'error')
    } finally {
      setLoading(false)
    }
  }

  const initials = getInitials(profile?.full_name ?? null)

  return (
    <Card className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-neutral-950 mb-1">Profile</h2>
        <p className="text-sm text-neutral-500">Update your display name and username.</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-pink-light flex items-center justify-center text-pink text-lg font-semibold select-none flex-shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-800">{profile?.full_name ?? '—'}</p>
          {profile?.username && (
            <p className="text-xs text-neutral-400">@{profile.username}</p>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Full Name"
          placeholder="Your full name"
          value={fullName}
          onChange={e => { setFullName(e.target.value); setErrors(v => ({ ...v, fullName: undefined })) }}
          error={errors.fullName}
        />
        <Input
          label="Username"
          placeholder="your_username"
          value={username}
          onChange={e => { setUsername(e.target.value); setErrors(v => ({ ...v, username: undefined })) }}
          error={errors.username}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={loading}>Save Changes</Button>
      </div>
    </Card>
  )
}

// ── AccountSection ────────────────────────────────────────────────────────────

function AccountSection() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
  }>({})
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const errs: typeof errors = {}
    if (!currentPassword) errs.currentPassword = 'Current password is required'
    if (!newPassword) errs.newPassword = 'New password is required'
    else if (newPassword.length < 6) errs.newPassword = 'Password must be at least 6 characters'
    if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleChangePassword() {
    if (!validate()) return
    setLoading(true)
    try {
      // Re-authenticate first by signing in with current password
      if (!user?.email) throw new Error('No user email found')
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInError) {
        setErrors({ currentPassword: 'Current password is incorrect' })
        return
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      addToast('Password changed successfully', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      addToast('Failed to change password', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-neutral-950 mb-1">Account</h2>
        <p className="text-sm text-neutral-500">Manage your email and password.</p>
      </div>

      {/* Email (read-only) */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-neutral-700">Email</label>
        <input
          type="email"
          value={user?.email ?? ''}
          readOnly
          className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-500 cursor-not-allowed"
        />
        <p className="text-xs text-neutral-400">Email cannot be changed.</p>
      </div>

      {/* Change password */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-800 mb-3">Change Password</h3>
        <div className="flex flex-col gap-3">
          <Input
            label="Current Password"
            type="password"
            placeholder="••••••••"
            value={currentPassword}
            onChange={e => { setCurrentPassword(e.target.value); setErrors(v => ({ ...v, currentPassword: undefined })) }}
            error={errors.currentPassword}
          />
          <Input
            label="New Password"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={e => { setNewPassword(e.target.value); setErrors(v => ({ ...v, newPassword: undefined })) }}
            error={errors.newPassword}
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={e => { setConfirmPassword(e.target.value); setErrors(v => ({ ...v, confirmPassword: undefined })) }}
            error={errors.confirmPassword}
          />
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={handleChangePassword} loading={loading}>Change Password</Button>
        </div>
      </div>
    </Card>
  )
}

// ── DangerZoneSection ─────────────────────────────────────────────────────────

function DangerZoneSection() {
  const { addToast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDeleteAccount() {
    setLoading(true)
    try {
      // Note: supabase.auth.admin.deleteUser requires admin privileges; this
      // calls the user-facing delete endpoint via RPC or a custom edge function.
      // Using the available client method — falls back to a no-op in project
      // without server-side deletion configured.
      const { error } = await supabase.rpc('delete_user')
      if (error) throw error
      addToast('Account deleted', 'success')
    } catch {
      addToast('Failed to delete account. Please contact support.', 'error')
    } finally {
      setLoading(false)
      setConfirmOpen(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4 border border-red-100">
      <div>
        <h2 className="text-base font-semibold text-red-700 mb-1">Danger Zone</h2>
        <p className="text-sm text-neutral-500">Irreversible and destructive actions.</p>
      </div>

      <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-red-100 bg-red-50">
        <div>
          <p className="text-sm font-medium text-neutral-900">Delete Account</p>
          <p className="text-sm text-neutral-500 mt-0.5">
            This will permanently delete all your data including experiments, runs, notes, models, and datasets. This action cannot be undone.
          </p>
        </div>
        <Button
          variant="danger"
          size="sm"
          className="flex-shrink-0"
          onClick={() => setConfirmOpen(true)}
        >
          Delete Account
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        description="This will permanently delete all your data. This action cannot be undone. Are you sure?"
        confirmLabel="Delete my account"
        loading={loading}
      />
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  return (
    <PageLayout title="Settings" description="Manage your profile and account preferences.">
      {/* Tab bar */}
      <div className="flex gap-1 mb-8 border-b border-neutral-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium rounded-t-lg -mb-px border border-b-0 transition-colors',
              activeTab === tab.id
                ? 'bg-white border-neutral-200 text-neutral-950'
                : 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-800',
              tab.id === 'danger' && activeTab !== tab.id && 'hover:text-red-600',
              tab.id === 'danger' && activeTab === tab.id && 'text-red-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl">
        {activeTab === 'profile' && <ProfileSection />}
        {activeTab === 'account' && <AccountSection />}
        {activeTab === 'danger' && <DangerZoneSection />}
      </div>
    </PageLayout>
  )
}
