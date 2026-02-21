import { useState } from 'react'
import { Navbar } from '../components/Navbar'

/* ------------------------------------------------------------------ */
/* Settings Page                                                        */
/* Account, appearance, notifications, privacy, and danger zone        */
/* ------------------------------------------------------------------ */

type Section = 'account' | 'appearance' | 'notifications' | 'privacy' | 'danger'

const sections: { id: Section; label: string; icon: string }[] = [
  { id: 'account', label: 'Account', icon: '◉' },
  { id: 'appearance', label: 'Appearance', icon: '◈' },
  { id: 'notifications', label: 'Notifications', icon: '◎' },
  { id: 'privacy', label: 'Privacy', icon: '⊕' },
  { id: 'danger', label: 'Danger Zone', icon: '⚠' },
]

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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-parchment border border-forest/10 squircle-xl p-6 shadow-[0_2px_24px_-8px_rgba(38,70,53,0.06)]">
      <h3 className="font-[family-name:var(--font-display)] text-xl text-forest mb-4">{title}</h3>
      {children}
    </div>
  )
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState<Section>('account')

  // Account
  const [displayName, setDisplayName] = useState('Aisha Malik')
  const [handle, setHandle] = useState('@aisha.m')
  const [email, setEmail] = useState('aisha.malik@nyu.edu')
  const [bio, setBio] = useState("Algorithms nerd. I take nootes so I don't have to think twice.")

  // Appearance
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')
  const [compactMode, setCompactMode] = useState(false)
  const [showLatexPreview, setShowLatexPreview] = useState(true)
  const [fontScale, setFontScale] = useState<'sm' | 'md' | 'lg'>('md')

  // Notifications
  const [notifyMerges, setNotifyMerges] = useState(true)
  const [notifyComments, setNotifyComments] = useState(true)
  const [notifyAura, setNotifyAura] = useState(false)
  const [notifyDigest, setNotifyDigest] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(false)

  // Privacy
  const [profilePublic, setProfilePublic] = useState(true)
  const [activityVisible, setActivityVisible] = useState(true)
  const [reposPublicDefault, setReposPublicDefault] = useState(false)
  const [showAura, setShowAura] = useState(true)

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar
        variant="light"
        breadcrumbs={[{ label: 'NYU' }, { label: 'Settings' }]}
      />

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
            </nav>

            {/* Content */}
            <div className="space-y-6">

              {/* Account */}
              {activeSection === 'account' && (
                <>
                  <SectionCard title="Profile">
                    <div className="flex items-center gap-5 mb-6 pb-6 border-b border-forest/[0.06]">
                      <div className="w-16 h-16 rounded-full bg-forest flex items-center justify-center text-xl font-medium text-parchment border-4 border-cream shadow shrink-0">
                        AM
                      </div>
                      <div>
                        <p className="font-[family-name:var(--font-body)] text-sm text-forest/60 mb-2">Profile picture</p>
                        <button className="font-mono text-[10px] px-3 py-1.5 squircle-sm border border-forest/15 text-forest/50 hover:border-forest/30 hover:text-forest transition-all cursor-pointer">
                          Change avatar
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {[
                        { label: 'Display name', value: displayName, onChange: setDisplayName },
                        { label: 'Handle', value: handle, onChange: setHandle },
                        { label: 'University email', value: email, onChange: setEmail },
                      ].map(field => (
                        <div key={field.label}>
                          <label className="font-mono text-[10px] text-forest/30 tracking-wider uppercase block mb-1.5">{field.label}</label>
                          <input
                            type="text"
                            value={field.value}
                            onChange={e => field.onChange(e.target.value)}
                            className="w-full bg-cream border border-forest/10 squircle-sm px-3 py-2 text-sm text-forest/80 font-[family-name:var(--font-body)] focus:outline-none focus:border-sage/50 transition-colors"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="font-mono text-[10px] text-forest/30 tracking-wider uppercase block mb-1.5">Bio</label>
                        <textarea
                          value={bio}
                          onChange={e => setBio(e.target.value)}
                          rows={3}
                          className="w-full bg-cream border border-forest/10 squircle-sm px-3 py-2 text-sm text-forest/80 font-[family-name:var(--font-body)] focus:outline-none focus:border-sage/50 transition-colors resize-none"
                        />
                      </div>
                    </div>
                  </SectionCard>
                  <SectionCard title="Password">
                    <div className="space-y-4">
                      {['Current password', 'New password', 'Confirm new password'].map(label => (
                        <div key={label}>
                          <label className="font-mono text-[10px] text-forest/30 tracking-wider uppercase block mb-1.5">{label}</label>
                          <input
                            type="password"
                            placeholder="••••••••"
                            className="w-full bg-cream border border-forest/10 squircle-sm px-3 py-2 text-sm text-forest/80 font-[family-name:var(--font-body)] focus:outline-none focus:border-sage/50 transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex justify-end">
                      <button className="font-mono text-[11px] px-4 py-2 squircle-sm bg-forest text-parchment hover:bg-forest/80 transition-all cursor-pointer">
                        Update password
                      </button>
                    </div>
                  </SectionCard>
                  <div className="flex justify-end">
                    <button className="font-mono text-[11px] px-5 py-2 squircle-sm bg-sage text-forest hover:bg-sage/80 transition-all cursor-pointer">
                      Save changes
                    </button>
                  </div>
                </>
              )}

              {/* Appearance */}
              {activeSection === 'appearance' && (
                <SectionCard title="Appearance">
                  <div className="mb-5 pb-5 border-b border-forest/[0.06]">
                    <label className="font-mono text-[10px] text-forest/30 tracking-wider uppercase block mb-3">Theme</label>
                    <div className="flex gap-2">
                      {(['light', 'dark', 'system'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={`font-mono text-[10px] px-4 py-2 squircle-sm border transition-all capitalize cursor-pointer ${theme === t
                              ? 'bg-forest text-parchment border-forest'
                              : 'border-forest/15 text-forest/40 hover:border-forest/30 hover:text-forest'
                            }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
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
                    <Toggle checked={showLatexPreview} onChange={setShowLatexPreview} />
                  </SettingRow>
                </SectionCard>
              )}

              {/* Notifications */}
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
                  <SettingRow label="Email notifications" description="Send notifications to your university email">
                    <Toggle checked={emailNotifications} onChange={setEmailNotifications} />
                  </SettingRow>
                </SectionCard>
              )}

              {/* Privacy */}
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
                </SectionCard>
              )}

              {/* Danger Zone */}
              {activeSection === 'danger' && (
                <div className="bg-parchment border border-rust/20 squircle-xl p-6 shadow-[0_2px_24px_-8px_rgba(139,69,19,0.08)]">
                  <h3 className="font-[family-name:var(--font-display)] text-xl text-rust mb-4">Danger Zone</h3>
                  <div className="space-y-0">
                    {[
                      {
                        label: 'Export all data',
                        description: 'Download a copy of all your noots, nootbooks, and account data.',
                        action: 'Export',
                        style: 'border border-forest/15 text-forest/50 hover:border-forest/30 hover:text-forest',
                      },
                      {
                        label: 'Deactivate account',
                        description: 'Temporarily disable your account. You can reactivate anytime.',
                        action: 'Deactivate',
                        style: 'border border-amber/30 text-amber/70 hover:border-amber/50 hover:text-amber',
                      },
                      {
                        label: 'Delete account',
                        description: 'Permanently delete your account and all associated data. This cannot be undone.',
                        action: 'Delete account',
                        style: 'border border-rust/30 text-rust/70 hover:border-rust/60 hover:text-rust',
                      },
                    ].map((item, i, arr) => (
                      <div key={item.label} className={`flex items-center justify-between py-5 ${i < arr.length - 1 ? 'border-b border-rust/[0.08]' : ''}`}>
                        <div className="flex-1 pr-8">
                          <span className="font-[family-name:var(--font-body)] text-sm text-forest/80 font-medium block">{item.label}</span>
                          <span className="font-mono text-[10px] text-forest/30 mt-0.5 block">{item.description}</span>
                        </div>
                        <button className={`font-mono text-[10px] px-4 py-2 squircle-sm transition-all cursor-pointer shrink-0 ${item.style}`}>
                          {item.action}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
