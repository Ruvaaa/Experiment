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
import { useTheme } from '../lib/hooks/useTheme'
import { Palette, Check, KeyRound, Copy, Trash2 } from 'lucide-react'
import { useCreateProject, useCreateSDKKey, useProjects, useRevokeSDKKey, useSDKKeys } from '../lib/hooks/useProjects'

// ── tab definitions ───────────────────────────────────────────────────────────

type Tab = 'profile' | 'appearance' | 'developer' | 'account' | 'danger'

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'developer', label: 'Developer' },
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
        <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-950 text-lg font-semibold select-none flex-shrink-0">
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

// ── AppearanceSection ────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  { name: 'Monochrome', value: '#F5F5F5' }, { name: 'Pink', value: '#C64A78' },
  { name: 'Violet', value: '#8B5CF6' }, { name: 'Emerald', value: '#2F9E69' },
  { name: 'Amber', value: '#D97706' },
]

function AppearanceSection() {
  const { theme, setThemeColor, setMode, resetTheme } = useTheme()
  const { addToast } = useToast()
  const selectColor = (color: string, name: string) => { setThemeColor(color); addToast(`${name} accent applied`, 'success') }
  return (
    <Card className="flex flex-col gap-6">
      <div><h2 className="text-base font-semibold text-neutral-950 mb-1">Appearance</h2><p className="text-sm text-neutral-500">Choose a workspace theme and accent.</p></div>
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-neutral-700">Workspace theme</legend>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          {(['light', 'dark'] as const).map(mode => (
            <button key={mode} type="button" onClick={() => setMode(mode)} aria-pressed={theme.mode === mode} className={cn('rounded-xl border p-4 text-left text-sm font-medium capitalize transition-colors', theme.mode === mode ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-neutral-200')}>
              <span className="block mb-3 h-8 rounded-md border border-neutral-200" style={{ background: mode === 'dark' ? '#141414' : '#FFFFFF' }} />{mode}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-neutral-700">Accent</legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COLOR_PRESETS.map(({ name, value }) => (
            <button key={value} type="button" onClick={() => selectColor(value, name)} aria-pressed={theme.primaryColor.toUpperCase() === value} className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition-all', theme.primaryColor.toUpperCase() === value ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-neutral-200 hover:border-neutral-300')}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/20" style={{ backgroundColor: value }}>{theme.primaryColor.toUpperCase() === value ? <Check size={16} className={value === '#F5F5F5' ? 'text-black' : 'text-white'} /> : <Palette size={16} style={{ color: value === '#F5F5F5' ? '#737373' : '#FFFFFF' }} />}</span>
              <span className="text-sm font-medium text-neutral-800">{name}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
        <div className="flex items-center gap-3">
          <input aria-label="Custom accent color" type="color" value={theme.primaryColor} onChange={e => setThemeColor(e.target.value)} className="w-10 h-10 cursor-pointer rounded-lg border border-neutral-200 bg-white p-1" />
          <div><p className="text-sm font-medium text-neutral-800">Custom color</p><p className="text-xs text-neutral-400 uppercase">{theme.primaryColor}</p></div>
        </div>
        <Button variant="secondary" onClick={resetTheme}>Reset</Button>
      </div>
    </Card>
  )
}

// ── DeveloperSection ─────────────────────────────────────────────────────────

function DeveloperSection() {
  const { addToast } = useToast()
  const projectsQuery = useProjects()
  const keysQuery = useSDKKeys()
  const createProject = useCreateProject()
  const createKey = useCreateSDKKey()
  const revokeKey = useRevokeSDKKey()
  const [projectName, setProjectName] = useState('')
  const [keyName, setKeyName] = useState('')
  const [projectId, setProjectId] = useState('')
  const [plaintextKey, setPlaintextKey] = useState<string | null>(null)

  async function handleCreateProject() {
    if (!projectName.trim()) return
    try {
      const project = await createProject.mutateAsync({ name: projectName.trim() })
      setProjectId(project.id)
      setProjectName('')
      addToast('Project created', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create project'
      const schemaCacheError = /schema cache|find the table.*projects|relation.*projects/i.test(message)
      addToast(schemaCacheError ? 'Projects table is missing. Apply Supabase migrations 002 and 005, then reload the PostgREST schema cache.' : message, 'error')
    }
  }

  async function handleCreateKey() {
    if (!projectId || !keyName.trim()) return
    try {
      const key = await createKey.mutateAsync({ projectId, name: keyName.trim() })
      setPlaintextKey(key.plaintext_key)
      setKeyName('')
      addToast('API key created. Copy it now.', 'success')
    } catch (error) { addToast(error instanceof Error ? error.message : 'Failed to create API key', 'error') }
  }

  const projects = projectsQuery.data ?? []
  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-4">
        <div><h2 className="text-base font-semibold text-neutral-950 mb-1">Projects</h2><p className="text-sm text-neutral-500">SDK keys are scoped to one project.</p></div>
        <div className="flex gap-2"><Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Project name" /><Button onClick={handleCreateProject} loading={createProject.isPending}>Create</Button></div>
      </Card>
      <Card className="flex flex-col gap-4">
        <div><h2 className="text-base font-semibold text-neutral-950 mb-1">SDK API keys</h2><p className="text-sm text-neutral-500">Create a key for one project. Store it securely; it will not be shown again.</p></div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white" value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">Select project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <Input value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="Key name" />
          <Button onClick={handleCreateKey} loading={createKey.isPending}><KeyRound size={16} />Create</Button>
        </div>
        {plaintextKey && (() => {
          const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
          const ingestUrl = `${supabaseUrl}/functions/v1/experiment-ingest`
          const envSnippet = `EXPERIMENT_TRACKER_API_KEY=${plaintextKey}\nEXPERIMENT_TRACKER_URL=${ingestUrl}`
          const pythonSnippet = `from dotenv import load_dotenv\nfrom experiment_tracker import ExperimentTracker\n\nload_dotenv()  # Load the .env file in your VS Code project root\ntracker = ExperimentTracker()\nrun = tracker.init("my-project", "training-run")\nrun.log_metrics({"loss": 0.42, "accuracy": 0.91}, step=1, epoch=1)\nrun.flush()\nrun.finish(status="completed")`
          return (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all text-xs text-neutral-900">{plaintextKey}</code>
                <Button size="sm" variant="secondary" onClick={async () => { await navigator.clipboard.writeText(plaintextKey); addToast('Key copied', 'success') }}><Copy size={14} />Copy</Button>
              </div>
              <div className="text-xs leading-5 text-neutral-700">
                <p className="font-semibold text-neutral-900">Use this key in VS Code</p>
                <ol className="mt-1 list-decimal space-y-1 pl-5">
                  <li>Create a <code className="rounded bg-white px-1">.env</code> file in the root of the Python project you open in VS Code.</li>
                  <li>Paste these two values into that file. Do not commit the file to Git.</li>
                  <li>Run <code className="rounded bg-white px-1">%pip uninstall -y experiment-tracker experiment-tracker-sdk</code>, then install the SDK from this repository. An unrelated package named <code className="rounded bg-white px-1">experiment-tracker</code> can otherwise provide a different module.</li>
                  <li>Run <code className="rounded bg-white px-1">%pip install --no-cache-dir --force-reinstall &quot;C:/path/to/MLExperimentModelDashboard/sdk&quot;</code> in the notebook, or use its terminal equivalent. Restart the kernel after installation.</li>
                  <li>Install dotenv with <code className="rounded bg-white px-1">python -m pip install python-dotenv</code>, then load it before creating the tracker.</li>
                </ol>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between"><span className="text-xs font-medium">.env</span><Button size="sm" variant="ghost" onClick={async () => { await navigator.clipboard.writeText(envSnippet); addToast('.env values copied', 'success') }}><Copy size={14} />Copy values</Button></div>
                <pre className="overflow-x-auto rounded-md bg-neutral-950 p-3 text-xs text-neutral-100"><code>{envSnippet}</code></pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium">Python usage</p>
                <pre className="overflow-x-auto rounded-md bg-neutral-950 p-3 text-xs text-neutral-100"><code>{pythonSnippet}</code></pre>
              </div>
              <p className="text-xs text-amber-800">This key is shown once. Store it securely and revoke it if it is exposed.</p>
            </div>
          )
        })()}
        {(keysQuery.data ?? []).map(key => (
          <div key={key.id} className="flex items-center gap-3 border-t border-neutral-100 pt-3 first:border-0 first:pt-0">
            <div className="flex-1"><p className="text-sm font-medium text-neutral-800">{key.name}</p><p className="text-xs text-neutral-400">{key.key_prefix}… · {key.revoked_at ? 'Revoked' : key.last_used_at ? `Last used ${new Date(key.last_used_at).toLocaleDateString()}` : 'Never used'}</p></div>
            {!key.revoked_at && <Button size="sm" variant="ghost" onClick={() => revokeKey.mutate(key.id)}><Trash2 size={14} />Revoke</Button>}
          </div>
        ))}
      </Card>
    </div>
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
        email: user.email.trim().toLowerCase(),
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
        {activeTab === 'appearance' && <AppearanceSection />}
        {activeTab === 'developer' && <DeveloperSection />}
        {activeTab === 'account' && <AccountSection />}
        {activeTab === 'danger' && <DangerZoneSection />}
      </div>
    </PageLayout>
  )
}
