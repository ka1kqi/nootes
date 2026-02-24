import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { useTheme, THEMES } from '../contexts/ThemeContext'

/**
 * @module Settings
 * User settings page with five sections: Account, Appearance, Notifications,
 * Privacy, and Danger Zone. Appearance and notification/privacy preferences are
 * persisted in localStorage; account/password changes are written to Supabase.
 */

/* ------------------------------------------------------------------ */
/* Settings Page                                                        */
/* Account, appearance, notifications, privacy, and danger zone        */
/* ------------------------------------------------------------------ */

/** Union of all settings section identifiers, used to drive the active nav state. */
type Section = 'account' | 'appearance' | 'notifications' | 'privacy' | 'danger'

/**
 * Navigation items rendered in the left sidebar.
 * Each entry maps a section ID to a display label and decorative icon character.
 */
const sections: { id: Section; label: string; icon: string }[] = [
  { id: 'account', label: 'Account', icon: '◉' },
  { id: 'appearance', label: 'Appearance', icon: '◈' },
  { id: 'notifications', label: 'Notifications', icon: '◎' },
  { id: 'privacy', label: 'Privacy', icon: '⊕' },
  { id: 'danger', label: 'Danger Zone', icon: '⚠' },
]

/**
 * Accessible ARIA switch toggle.
 * @param checked   - Current on/off state.
 * @param onChange  - Callback invoked with the new boolean value on click.
 */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full border-2 transition-all cursor-pointer ${checked ? 'bg-sage border-sage' : 'bg-transparent border-forest/20'
        }`}
    >
      <span className={`inline-block h-3 w-3 rounded-full transition-transform ${checked ? 'translate-x-4 bg-parchment' : 'translate-x-0.5 bg-forest/25'
        }`} />
    </button>
  )
}

/**
 * Horizontal row layout used inside a SectionCard.
 * Renders a label + optional description on the left and arbitrary children
 * (typically a Toggle) on the right, separated by a thin border.
 *
 * @param label        - Primary setting label text.
 * @param description  - Optional mono-spaced explanatory sub-text.
 * @param children     - Control element(s) placed on the right.
 */
function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-forest/[0.06] last:border-0">
      <div className="flex-1 pr-8">
        <span className="font-[family-name:var(--font-body)] text-sm text-forest/80 font-medium block">{label}</span>
        {description && <span className="font-mono text-[10px] text-forest/30 mt-0.5 block">{description}</span>}
      </div>
      {children}
    </div>
  )
}

/**
 * Rounded card container used to group related settings rows under a heading.
 * @param title    - Section heading displayed in display-font style.
 * @param children - SettingRow elements or any other content.
 */
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-parchment border border-forest/10 squircle-xl p-6 shadow-[0_2px_24px_-8px_rgba(38,70,53,0.06)]">
      <h3 className="font-[family-name:var(--font-display)] text-xl text-forest mb-4">{title}</h3>
      {children}
    </div>
  )
}

/** Conic-gradient circle showing 4 theme colors as quadrants */
function ThemeCircle({ colors, size = 40 }: { colors: [string, string, string, string]; size?: number }) {
  return (
    <div
      className="rounded-full shrink-0 ring-2 ring-forest/0"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(
          ${colors[0]} 0deg 90deg,
          ${colors[1]} 90deg 180deg,
          ${colors[2]} 180deg 270deg,
          ${colors[3]} 270deg 360deg
        )`,
      }}
    />
  )
}

/**
 * Main Settings page component.
 *
 * State is split by concern:
 * - Account fields (full name, handle, school) are synced from the Supabase profile.
 * - Password fields are local and submitted directly to `supabase.auth.updateUser`.
 * - Notification and privacy toggles are persisted in localStorage only.
 * - Appearance (theme, font scale, compact mode, LaTeX preview) lives in ThemeContext.
 */
export default function Settings() {
  const [activeSection, setActiveSection] = useState<Section>('account')
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const { themeId, setThemeId, fontScale, setFontScale, compactMode, setCompactMode, latexPreview, setLatexPreview } = useTheme()

  // Account
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [handle, setHandle] = useState(profile?.display_name ?? '')
  const [school, setSchool] = useState(profile?.organization ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [saveProfileMsg, setSaveProfileMsg] = useState<string | null>(null)

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  // Notifications (persisted in localStorage)
  const [notifyMerges, setNotifyMerges] = useState(() => localStorage.getItem('nootes-notify-merges') !== 'false')
  const [notifyComments, setNotifyComments] = useState(() => localStorage.getItem('nootes-notify-comments') !== 'false')
  const [notifyAura, setNotifyAura] = useState(() => localStorage.getItem('nootes-notify-aura') === 'true')
  const [notifyDigest, setNotifyDigest] = useState(() => localStorage.getItem('nootes-notify-digest') !== 'false')
  const [emailNotifications, setEmailNotifications] = useState(() => localStorage.getItem('nootes-notify-email') === 'true')

  // Privacy (persisted in localStorage)
  const [profilePublic, setProfilePublic] = useState(() => localStorage.getItem('nootes-privacy-public') !== 'false')
  const [activityVisible, setActivityVisible] = useState(() => localStorage.getItem('nootes-privacy-activity') !== 'false')
  const [reposPublicDefault, setReposPublicDefault] = useState(() => localStorage.getItem('nootes-privacy-repos-public') === 'true')
  const [showAura, setShowAura] = useState(() => localStorage.getItem('nootes-privacy-aura') !== 'false')

  // Sync profile fields when profile loads
  useEffect(() => {
    if (profile) {
      // Populate editable fields from the latest loaded profile to avoid stale defaults.
      setFullName(profile.full_name ?? '')
      setHandle(profile.display_name ?? '')
      setSchool(profile.organization ?? '')
    }
  }, [profile])

  // Persist notification prefs — each effect writes a single key to localStorage on change.
  useEffect(() => { localStorage.setItem('nootes-notify-merges', String(notifyMerges)) }, [notifyMerges])
  useEffect(() => { localStorage.setItem('nootes-notify-comments', String(notifyComments)) }, [notifyComments])
  useEffect(() => { localStorage.setItem('nootes-notify-aura', String(notifyAura)) }, [notifyAura])
  useEffect(() => { localStorage.setItem('nootes-notify-digest', String(notifyDigest)) }, [notifyDigest])
  useEffect(() => { localStorage.setItem('nootes-notify-email', String(emailNotifications)) }, [emailNotifications])

  // Persist privacy prefs — each effect writes a single key to localStorage on change.
  useEffect(() => { localStorage.setItem('nootes-privacy-public', String(profilePublic)) }, [profilePublic])
  useEffect(() => { localStorage.setItem('nootes-privacy-activity', String(activityVisible)) }, [activityVisible])
  useEffect(() => { localStorage.setItem('nootes-privacy-repos-public', String(reposPublicDefault)) }, [reposPublicDefault])
  useEffect(() => { localStorage.setItem('nootes-privacy-aura', String(showAura)) }, [showAura])

  async function saveProfile() {
    if (!user) return
    setSavingProfile(true)
    setSaveProfileMsg(null)
    // Patch only the editable profile fields; email is managed by Supabase Auth.
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, display_name: handle, organization: school })
      .eq('id', user.id)
    setSavingProfile(false)
    // Show a transient success or error message that auto-clears after 3 s.
    setSaveProfileMsg(error ? `Error: ${error.message}` : 'Changes saved.')
    setTimeout(() => setSaveProfileMsg(null), 3000)
  }

  async function updatePassword() {
    // Client-side validation before hitting the API
    if (newPassword !== confirmPassword) {
      setPasswordMsg("Passwords don't match.")
      return
    }
    if (newPassword.length < 6) {
      setPasswordMsg('Password must be at least 6 characters.')
      return
    }
    setSavingPassword(true)
    setPasswordMsg(null)
    // Supabase handles the actual credential update; current password is not
    // re-verified client-side because the user is already authenticated.
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) {
      setPasswordMsg(`Error: ${error.message}`)
    } else {
      setPasswordMsg('Password updated successfully.')
      // Clear all password fields on success
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    // Auto-dismiss the password feedback message after 4 s.
    setTimeout(() => setPasswordMsg(null), 4000)
  }

  // Avatar initials
  const initials = (fullName || profile?.display_name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar variant="light" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="mb-8">
            <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-1">CONFIGURATION</span>
            <h1 className="font-[family-name:var(--font-display)] text-4xl text-forest">Settings</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">

            {/* Sidebar nav */}
            <nav className="flex flex-col gap-0.5">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 squircle-sm text-left transition-all cursor-pointer ${activeSection === s.id
                      ? 'bg-forest text-parchment'
                      : s.id === 'danger'
                        ? 'text-rust/60 hover:bg-rust/[0.06] hover:text-rust'
                        : 'text-forest/40 hover:text-forest hover:bg-forest/[0.05]'
                    }`}
                >
                  <span className="text-[11px] opacity-70">{s.icon}</span>
                  <span className="font-[family-name:var(--font-body)] text-xs font-medium">{s.label}</span>
                </button>
              ))}

              {/* Sign out */}
              <div className="mt-3 pt-3 border-t border-forest/[0.08]">
                <button
                  onClick={async () => {
                    // Sign out via Supabase Auth, then redirect to the login page.
                    await signOut()
                    navigate('/login')
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 squircle-sm text-left transition-all cursor-pointer w-full text-rust/50 hover:bg-rust/[0.06] hover:text-rust"
                >
                  <span className="text-[11px] opacity-70">⎋</span>
                  <span className="font-[family-name:var(--font-body)] text-xs font-medium">Sign out</span>
                </button>
              </div>
            </nav>

            {/* Content */}
            <div className="space-y-6">

              {/* ── Account ── */}
              {activeSection === 'account' && (
                <>
                  <SectionCard title="Profile">
                    {/* Avatar */}
                    <div className="flex items-center gap-5 mb-6 pb-6 border-b border-forest/[0.06]">
                      <div className="w-16 h-16 rounded-full bg-forest flex items-center justify-center text-xl font-medium text-parchment border-4 border-cream shadow shrink-0 overflow-hidden">
                        {profile?.avatar_url
                          ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                          : initials}
                      </div>
                      <div>
                        <p className="font-[family-name:var(--font-body)] text-sm text-forest/60 mb-2">Profile picture</p>
                        <button className="font-mono text-[10px] px-3 py-1.5 squircle-sm border border-forest/15 text-forest/50 hover:border-forest/30 hover:text-forest transition-all cursor-pointer">
                          Change avatar
                        </button>
                      </div>
                    </div>

                    {/* Fields */}
                    <div className="space-y-4">
                      <div>
                        <label className="font-mono text-[10px] text-forest/30 tracking-wider uppercase block mb-1.5">Full name</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          className="w-full bg-cream border border-forest/10 squircle-sm px-3 py-2 text-sm text-forest/80 font-[family-name:var(--font-body)] focus:outline-none focus:border-sage/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] text-forest/30 tracking-wider uppercase block mb-1.5">Username / handle</label>
                        <input
                          type="text"
                          value={handle}
                          onChange={e => setHandle(e.target.value)}
                          placeholder="@your-handle"
                          className="w-full bg-cream border border-forest/10 squircle-sm px-3 py-2 text-sm text-forest/80 font-[family-name:var(--font-body)] focus:outline-none focus:border-sage/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] text-forest/30 tracking-wider uppercase block mb-1.5">School / university</label>
                        <input
                          type="text"
                          value={school}
                          onChange={e => setSchool(e.target.value)}
                          placeholder="e.g. NYU, MIT, Stanford…"
                          className="w-full bg-cream border border-forest/10 squircle-sm px-3 py-2 text-sm text-forest/80 font-[family-name:var(--font-body)] focus:outline-none focus:border-sage/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] text-forest/30 tracking-wider uppercase block mb-1.5">Email</label>
                        <input
                          type="text"
                          value={user?.email ?? profile?.email ?? ''}
                          readOnly
                          className="w-full bg-cream/60 border border-forest/[0.06] squircle-sm px-3 py-2 text-sm text-forest/40 font-[family-name:var(--font-body)] focus:outline-none cursor-not-allowed"
                        />
                        <span className="font-mono text-[9px] text-forest/20 mt-1 block">Email cannot be changed here.</span>
                      </div>
                    </div>
                  </SectionCard>

                  {/* Save profile */}
                  <div className="flex items-center justify-end gap-3">
                    {saveProfileMsg && (
                      <span className={`font-mono text-[10px] ${saveProfileMsg.startsWith('Error') ? 'text-rust' : 'text-sage'}`}>
                        {saveProfileMsg}
                      </span>
                    )}
                    <button
                      onClick={saveProfile}
                      disabled={savingProfile}
                      className="font-mono text-[11px] px-5 py-2 squircle-sm bg-sage text-forest hover:bg-sage/80 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {savingProfile ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>

                  {/* Password */}
                  <SectionCard title="Password">
                    <div className="space-y-4">
                      {[
                        { label: 'Current password', value: currentPassword, onChange: setCurrentPassword },
                        { label: 'New password', value: newPassword, onChange: setNewPassword },
                        { label: 'Confirm new password', value: confirmPassword, onChange: setConfirmPassword },
                      ].map(field => (
                        <div key={field.label}>
                          <label className="font-mono text-[10px] text-forest/30 tracking-wider uppercase block mb-1.5">{field.label}</label>
                          <input
                            type="password"
                            value={field.value}
                            onChange={e => field.onChange(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-cream border border-forest/10 squircle-sm px-3 py-2 text-sm text-forest/80 font-[family-name:var(--font-body)] focus:outline-none focus:border-sage/50 transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                    {passwordMsg && (
                      <p className={`font-mono text-[10px] mt-3 ${passwordMsg.startsWith('Error') || passwordMsg.includes("don't") || passwordMsg.includes('least') ? 'text-rust' : 'text-sage'}`}>
                        {passwordMsg}
                      </p>
                    )}
                    <div className="mt-5 flex justify-end">
                      <button
                        onClick={updatePassword}
                        disabled={savingPassword}
                        className="font-mono text-[11px] px-4 py-2 squircle-sm bg-forest text-parchment hover:bg-forest/80 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {savingPassword ? 'Updating…' : 'Update password'}
                      </button>
                    </div>
                  </SectionCard>
                </>
              )}

              {/* ── Appearance ── */}
              {activeSection === 'appearance' && (
                <SectionCard title="Appearance">

                  {/* Color Theme */}
                  <div className="mb-6 pb-6 border-b border-forest/[0.06]">
                    <label className="font-mono text-[10px] text-forest/30 tracking-wider uppercase block mb-4">Color Theme</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {THEMES.map(theme => {
                        // Check active state outside JSX to keep the return clean.
                        const active = themeId === theme.id
                        return (
                          <button
                            key={theme.id}
                            onClick={() => setThemeId(theme.id)}
                            className={`flex items-center gap-3 px-3 py-2.5 squircle-sm border transition-all cursor-pointer text-left ${
                              active
                                ? 'border-forest bg-forest/[0.06] shadow-sm'
                                : 'border-forest/10 hover:border-forest/25 hover:bg-forest/[0.03]'
                            }`}
                          >
                            <ThemeCircle colors={theme.preview} size={34} />
                            <div className="min-w-0">
                              <span className="font-[family-name:var(--font-body)] text-[11px] font-medium text-forest/80 block leading-tight truncate">
                                {theme.name}
                              </span>
                              {active && (
                                <span className="font-mono text-[9px] text-sage block mt-0.5">active</span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Font size */}
                  <div className="mb-5 pb-5 border-b border-forest/[0.06]">
                    <label className="font-mono text-[10px] text-forest/30 tracking-wider uppercase block mb-3">Font size</label>
                    <div className="flex gap-2">
                      {([['sm', 'Small'], ['md', 'Medium'], ['lg', 'Large']] as const).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setFontScale(val)}
                          className={`font-mono text-[10px] px-4 py-2 squircle-sm border transition-all cursor-pointer ${fontScale === val
                              ? 'bg-forest text-parchment border-forest'
                              : 'border-forest/15 text-forest/40 hover:border-forest/30 hover:text-forest'
                            }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <SettingRow label="Compact mode" description="Reduce spacing throughout the app">
                    <Toggle checked={compactMode} onChange={setCompactMode} />
                  </SettingRow>
                  <SettingRow label="LaTeX preview" description="Show rendered math preview while editing">
                    <Toggle checked={latexPreview} onChange={setLatexPreview} />
                  </SettingRow>
                </SectionCard>
              )}

              {/* ── Notifications ── */}
              {activeSection === 'notifications' && (
                <SectionCard title="Notifications">
                  <SettingRow label="Merge activity" description="When someone merges into your noots">
                    <Toggle checked={notifyMerges} onChange={setNotifyMerges} />
                  </SettingRow>
                  <SettingRow label="Comments" description="When someone comments on your noots">
                    <Toggle checked={notifyComments} onChange={setNotifyComments} />
                  </SettingRow>
                  <SettingRow label="Aura milestones" description="Celebrate aura point milestones">
                    <Toggle checked={notifyAura} onChange={setNotifyAura} />
                  </SettingRow>
                  <SettingRow label="Weekly digest" description="Summary of your noot activity">
                    <Toggle checked={notifyDigest} onChange={setNotifyDigest} />
                  </SettingRow>
                  <SettingRow label="Email notifications" description="Send notifications to your registered email">
                    <Toggle checked={emailNotifications} onChange={setEmailNotifications} />
                  </SettingRow>
                  <p className="font-mono text-[9px] text-forest/20 mt-4">Notification preferences are saved locally.</p>
                </SectionCard>
              )}

              {/* ── Privacy ── */}
              {activeSection === 'privacy' && (
                <SectionCard title="Privacy">
                  <SettingRow label="Public profile" description="Anyone can view your profile page">
                    <Toggle checked={profilePublic} onChange={setProfilePublic} />
                  </SettingRow>
                  <SettingRow label="Activity visible" description="Show your contribution graph publicly">
                    <Toggle checked={activityVisible} onChange={setActivityVisible} />
                  </SettingRow>
                  <SettingRow label="Public nootbooks by default" description="New nootbooks are public unless changed">
                    <Toggle checked={reposPublicDefault} onChange={setReposPublicDefault} />
                  </SettingRow>
                  <SettingRow label="Show aura score" description="Display your aura points on your profile">
                    <Toggle checked={showAura} onChange={setShowAura} />
                  </SettingRow>
                  <p className="font-mono text-[9px] text-forest/20 mt-4">Privacy preferences are saved locally.</p>
                </SectionCard>
              )}

              {/* ── Danger Zone ── */}
              {activeSection === 'danger' && (
                <DangerZone onSignOut={signOut} />
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Danger Zone sub-component with confirmation states                  */
/* ------------------------------------------------------------------ */

/**
 * Danger Zone settings card. Provides three destructive actions:
 * - **Export data** — generates a JSON stub (production would call a server endpoint).
 * - **Deactivate account** — invokes `onSignOut` after a two-step confirmation.
 * - **Delete account** — two-step confirmation; permanently removes the account.
 *
 * Each destructive button requires an explicit confirmation click to prevent
 * accidental activation.
 *
 * @param onSignOut - Optional callback from the parent to sign the user out.
 */
function DangerZone({ onSignOut }: { onSignOut?: () => void }) {
  const [exportLoading, setExportLoading] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleExport() {
    setExportLoading(true)
    // Simulate export (would call a real API in production)
    setTimeout(() => {
      // Build a placeholder JSON blob; a real implementation would fetch all
      // user documents, merge requests, and profile data from the backend.
      const data = {
        exported_at: new Date().toISOString(),
        note: 'Full data export would be generated server-side.',
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      // Trigger a browser download using a temporary object URL.
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'nootes-export.json'
      a.click()
      URL.revokeObjectURL(url)
      setExportLoading(false)
    }, 800)
  }

  return (
    <div className="bg-parchment border border-rust/20 squircle-xl p-6 shadow-[0_2px_24px_-8px_rgba(139,69,19,0.08)]">
      <h3 className="font-[family-name:var(--font-display)] text-xl text-rust mb-4">Danger Zone</h3>

      {/* Export */}
      <div className="flex items-center justify-between py-5 border-b border-rust/[0.08]">
        <div className="flex-1 pr-8">
          <span className="font-[family-name:var(--font-body)] text-sm text-forest/80 font-medium block">Export all data</span>
          <span className="font-mono text-[10px] text-forest/30 mt-0.5 block">Download a copy of all your noots, nootbooks, and account data.</span>
        </div>
        <button
          onClick={handleExport}
          disabled={exportLoading}
          className="font-mono text-[10px] px-4 py-2 squircle-sm border border-forest/15 text-forest/50 hover:border-forest/30 hover:text-forest transition-all cursor-pointer shrink-0 disabled:opacity-50"
        >
          {exportLoading ? 'Preparing…' : 'Export'}
        </button>
      </div>

      {/* Deactivate */}
      <div className="flex items-center justify-between py-5 border-b border-rust/[0.08]">
        <div className="flex-1 pr-8">
          <span className="font-[family-name:var(--font-body)] text-sm text-forest/80 font-medium block">Deactivate account</span>
          <span className="font-mono text-[10px] text-forest/30 mt-0.5 block">Temporarily disable your account. You can reactivate anytime.</span>
        </div>
        {confirmDeactivate ? (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setConfirmDeactivate(false)}
              className="font-mono text-[10px] px-3 py-2 squircle-sm border border-forest/15 text-forest/40 hover:text-forest transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => { onSignOut?.(); setConfirmDeactivate(false) }}
              className="font-mono text-[10px] px-3 py-2 squircle-sm border border-amber/50 text-amber/80 hover:border-amber hover:text-amber transition-all cursor-pointer"
            >
              Confirm
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDeactivate(true)}
            className="font-mono text-[10px] px-4 py-2 squircle-sm border border-amber/30 text-amber/70 hover:border-amber/50 hover:text-amber transition-all cursor-pointer shrink-0"
          >
            Deactivate
          </button>
        )}
      </div>

      {/* Delete */}
      <div className="flex items-center justify-between py-5">
        <div className="flex-1 pr-8">
          <span className="font-[family-name:var(--font-body)] text-sm text-forest/80 font-medium block">Delete account</span>
          <span className="font-mono text-[10px] text-forest/30 mt-0.5 block">Permanently delete your account and all associated data. This cannot be undone.</span>
        </div>
        {confirmDelete ? (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setConfirmDelete(false)}
              className="font-mono text-[10px] px-3 py-2 squircle-sm border border-forest/15 text-forest/40 hover:text-forest transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="font-mono text-[10px] px-3 py-2 squircle-sm border border-rust/50 text-rust/80 hover:border-rust hover:text-rust transition-all cursor-pointer"
            >
              Delete forever
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="font-mono text-[10px] px-4 py-2 squircle-sm border border-rust/30 text-rust/70 hover:border-rust/60 hover:text-rust transition-all cursor-pointer shrink-0"
          >
            Delete account
          </button>
        )}
      </div>
    </div>
  )
}
