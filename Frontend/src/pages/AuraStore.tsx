import { useState } from 'react'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../hooks/useAuth'

/* ------------------------------------------------------------------ */
/* Aura Store                                                          */
/* Purchase aura points, view cosmetic items, premium thresholds       */
/* Bauhaus geometric cards with warm botanical accents                  */
/* ------------------------------------------------------------------ */

const auraTiers = [
  { threshold: 0,    label: 'Seedling',    color: '#8B6E4E', icon: '○', description: 'Full editor, forking, contributing, basic chat, limited AI.' },
  { threshold: 100,  label: 'Sprout',      color: '#A3B18A', icon: '◐', description: 'AI-generated flashcards from nootbook content.' },
  { threshold: 250,  label: 'Sapling',     color: '#5C7A6B', icon: '◑', description: 'AI-generated practice exams based on class nootes.' },
  { threshold: 500,  label: 'Grove',       color: '#264635', icon: '●', description: 'Advanced AI study tools and priority merge consideration.' },
  { threshold: 1000, label: 'Ancient Oak', color: '#1a2f26', icon: '✦', description: 'Trusted Contributor — moderation privileges, cross-school access.' },
]

const auraPacks = [
  { amount: 50, price: '$2.99', popular: false, savings: null },
  { amount: 150, price: '$7.99', popular: true, savings: '11% off' },
  { amount: 350, price: '$16.99', popular: false, savings: '15% off' },
  { amount: 750, price: '$29.99', popular: false, savings: '25% off' },
]

const cosmetics = [
  {
    category: 'Profile Badges',
    items: [
      { name: 'Golden Quill', cost: 50, preview: '🖊', rarity: 'common', description: 'A handwritten badge for dedicated noote-takers.' },
      { name: 'Infinity Brain', cost: 120, preview: '∞', rarity: 'rare', description: 'For those who never stop learning.' },
      { name: 'Merge Master', cost: 200, preview: '⟐', rarity: 'epic', description: 'Earned by those who harmonize knowledge.' },
      { name: 'Prime Theorem', cost: 500, preview: '∑', rarity: 'legendary', description: 'Reserved for the most prolific contributors.' },
    ],
  },
  {
    category: 'Username Colors',
    items: [
      { name: 'Sage Green', cost: 30, preview: null, color: '#A3B18A', rarity: 'common', description: 'A calming green for your username.' },
      { name: 'Amber Gold', cost: 60, preview: null, color: '#D4A843', rarity: 'rare', description: 'Stand out with a warm golden glow.' },
      { name: 'Deep Forest', cost: 100, preview: null, color: '#1a2f26', rarity: 'epic', description: 'The color of ancient wisdom.' },
      { name: 'Rust Red', cost: 150, preview: null, color: '#8B4513', rarity: 'legendary', description: 'Bold and unforgettable.' },
    ],
  },
  {
    category: 'Chat Flair',
    items: [
      { name: 'Leaf Accent', cost: 25, preview: '🌿', rarity: 'common', description: 'A subtle botanical flourish.' },
      { name: 'Star Trail', cost: 80, preview: '✧', rarity: 'rare', description: 'Sparkle in the chat.' },
      { name: 'Geometric Halo', cost: 180, preview: '◇', rarity: 'epic', description: 'Bauhaus-inspired chat decoration.' },
    ],
  },
]

const premiumFeatures = [
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>,
    title: 'AI Practice Exams',
    desc: 'Auto-generated exams from your nootes with proper notation.',
  },
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-9.75 5.25m7.5-3v6.75m-15-6.75v6.75m15 0l-7.5 4.125L4.5 19.5" /></svg>,
    title: 'AI Flashcards',
    desc: 'Spaced repetition decks with full LaTeX rendering.',
  },
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
    title: 'Progress Tracking',
    desc: 'Maps mastered and unmastered concepts with targeted reviews.',
  },
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
    title: 'Priority Merge',
    desc: 'Your contributions are processed first in the merge queue.',
  },
]

function rarityBorderClass(rarity: string): string {
  const map: Record<string, string> = {
    common: 'border-forest/10 hover:border-forest/20',
    rare: 'border-sage/30 hover:border-sage/50',
    epic: 'border-amber/25 hover:border-amber/40',
    legendary: 'border-amber/40 hover:border-amber/60',
  }
  return map[rarity] || map.common
}

function rarityTagClass(rarity: string): string {
  const map: Record<string, string> = {
    common: 'bg-forest/[0.06] text-forest/40',
    rare: 'bg-sage/10 text-sage',
    epic: 'bg-amber/10 text-amber',
    legendary: 'bg-amber/15 text-amber',
  }
  return map[rarity] || map.common
}

export default function AuraStore() {
  const { profile } = useAuth()
  const [activeSection, setActiveSection] = useState<'packs' | 'cosmetics' | 'premium'>('packs')

  const currentAura = profile?.aura ?? 0
  const tiers = auraTiers.map(t => ({ ...t, unlocked: currentAura >= t.threshold }))
  const nextTier = tiers.find(t => !t.unlocked) ?? tiers[tiers.length - 1]

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar variant="light" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-12 stagger">

          {/* Header */}
          <div className="mb-10">
            <span className="font-mono text-[10px] text-sage/50 tracking-[0.3em] uppercase block mb-3">AURA ECONOMY</span>
            <h1 className="font-[family-name:var(--font-display)] text-6xl text-forest leading-[0.9] mb-3">Aura Store</h1>
            <p className="font-[family-name:var(--font-body)] text-[15px] text-forest/45 max-w-lg">
              Earn aura through contributions or purchase packs to unlock features and customizations.
            </p>
          </div>

          {/* Current aura balance card */}
          <div className="bg-parchment border border-forest/10 squircle-2xl p-8 mb-10 shadow-[0_4px_40px_-12px_rgba(38,70,53,0.08)] relative overflow-hidden">
            {/* Decorative circle */}
            <svg className="absolute -right-8 -top-8 w-48 h-48 opacity-[0.04]" viewBox="0 0 200 200" fill="none">
              <circle cx="100" cy="100" r="90" stroke="#264635" strokeWidth="1" />
              <circle cx="100" cy="100" r="60" stroke="#A3B18A" strokeWidth="0.5" />
              <circle cx="100" cy="100" r="30" stroke="#264635" strokeWidth="0.5" />
            </svg>

            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="font-mono text-[10px] text-forest/30 tracking-[0.2em] uppercase block mb-2">YOUR BALANCE</span>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-[family-name:var(--font-display)] text-7xl text-forest leading-none">{currentAura.toLocaleString()}</span>
                  <span className="font-[family-name:var(--font-display)] text-3xl text-sage/50">✦</span>
                </div>
                <span className="font-mono text-[10px] text-sage/50">aura points</span>
              </div>

              <div className="text-right">
                <span className="font-mono text-[10px] text-forest/30 tracking-[0.2em] uppercase block mb-2">CURRENT TIER</span>
                <span className="font-[family-name:var(--font-display)] text-3xl text-sage block">
                  {tiers.filter(t => t.unlocked).pop()?.label ?? 'Seedling'}
                </span>
                <span className="font-mono text-[10px] text-forest/25 mt-1 block">
                  {nextTier.threshold - currentAura} to {nextTier.label}
                </span>
              </div>
            </div>

            {/* Progress bar to next tier */}
            <div className="mt-6 relative z-10">
              <div className="flex items-center justify-between mb-2">
                {tiers.map((tier, i) => (
                  <div key={tier.threshold} className="flex flex-col items-center">
                    <span
                      className={`text-sm mb-1 ${tier.unlocked ? 'opacity-80' : 'opacity-25'}`}
                      style={{ color: tier.color }}
                    >
                      {tier.icon}
                    </span>
                    <span className={`font-mono text-[8px] tracking-wider ${tier.unlocked ? 'text-forest/50' : 'text-forest/20'}`}>
                      {tier.threshold}
                    </span>
                  </div>
                ))}
              </div>
              <div className="h-2 bg-forest/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sage/60 to-sage rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, (currentAura / tiers[tiers.length - 1].threshold) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex items-center gap-2 mb-8">
            {[
              { key: 'packs' as const, label: 'Aura Packs', icon: '✦' },
              { key: 'cosmetics' as const, label: 'Cosmetics', icon: '◇' },
              { key: 'premium' as const, label: 'Premium', icon: '★' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveSection(tab.key)}
                className={`font-[family-name:var(--font-body)] text-sm px-5 py-2.5 squircle transition-all flex items-center gap-2 ${
                  activeSection === tab.key
                    ? 'bg-forest text-parchment shadow-sm'
                    : 'text-forest/40 hover:text-forest hover:bg-forest/[0.04] border border-forest/10'
                }`}
              >
                <span className="text-xs opacity-60">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Aura Packs */}
          {activeSection === 'packs' && (
            <div className="stagger-fast">
              <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">PURCHASE</span>
              <h2 className="font-[family-name:var(--font-display)] text-3xl text-forest mb-6">Aura Packs</h2>
              <p className="font-[family-name:var(--font-body)] text-sm text-forest/40 mb-8 max-w-md">
                Fast-track your way to feature unlocks. Purchased aura counts toward thresholds — once you reach a tier, it's yours forever.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {auraPacks.map((pack, i) => (
                  <div
                    key={pack.amount}
                    className={`relative bg-parchment border squircle-xl p-6 text-center transition-all hover:shadow-[0_4px_32px_-8px_rgba(38,70,53,0.1)] cursor-pointer group ${
                      pack.popular ? 'border-sage/40 ring-2 ring-sage/10' : 'border-forest/10 hover:border-forest/20'
                    }`}
                  >
                    {pack.popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 font-mono text-[9px] text-parchment bg-sage px-3 py-0.5 squircle-sm">
                        MOST POPULAR
                      </span>
                    )}
                    {pack.savings && (
                      <span className="absolute top-3 right-3 font-mono text-[9px] text-sage bg-sage/10 px-2 py-0.5 squircle-sm">
                        {pack.savings}
                      </span>
                    )}
                    <span className="font-[family-name:var(--font-display)] text-5xl text-forest block mb-1 group-hover:scale-105 transition-transform">
                      {pack.amount}
                    </span>
                    <span className="font-mono text-[10px] text-sage/50 block mb-4">aura ✦</span>
                    <button className={`w-full py-2.5 squircle font-[family-name:var(--font-body)] text-sm transition-all ${
                      pack.popular
                        ? 'bg-forest text-parchment hover:bg-forest-deep shadow-sm'
                        : 'bg-forest/[0.06] text-forest hover:bg-forest/[0.1] border border-forest/10'
                    }`}>
                      {pack.price}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cosmetics */}
          {activeSection === 'cosmetics' && (
            <div className="space-y-12 stagger-fast">
              {cosmetics.map(cat => (
                <div key={cat.category}>
                  <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">{cat.category.toUpperCase()}</span>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-5">{cat.category}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {cat.items.map(item => (
                      <div
                        key={item.name}
                        className={`bg-parchment border squircle-xl p-5 transition-all cursor-pointer group ${rarityBorderClass(item.rarity)}`}
                      >
                        {/* Preview */}
                        <div className="w-14 h-14 mx-auto mb-4 bg-cream border border-forest/[0.06] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          {item.preview ? (
                            <span className="text-2xl">{item.preview}</span>
                          ) : (
                            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: (item as { color: string }).color }} />
                          )}
                        </div>

                        <div className="text-center">
                          <h3 className="font-[family-name:var(--font-display)] text-lg text-forest mb-1">{item.name}</h3>
                          <span className={`inline-block font-mono text-[9px] px-2 py-0.5 squircle-sm mb-2 ${rarityTagClass(item.rarity)}`}>
                            {item.rarity}
                          </span>
                          <p className="font-[family-name:var(--font-body)] text-[11px] text-forest/35 leading-relaxed mb-4">
                            {item.description}
                          </p>
                          <button
                            className={`w-full py-2 squircle-sm font-mono text-[11px] transition-all ${
                              currentAura >= item.cost
                                ? 'bg-forest/[0.06] text-forest hover:bg-forest/[0.1] border border-forest/10'
                                : 'bg-forest/[0.03] text-forest/25 border border-forest/[0.06] cursor-not-allowed'
                            }`}
                            disabled={currentAura < item.cost}
                          >
                            {item.cost} ✦ {currentAura >= item.cost ? '' : '(need more)'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Premium */}
          {activeSection === 'premium' && (
            <div className="stagger-fast">
              <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">SUBSCRIPTION</span>
              <h2 className="font-[family-name:var(--font-display)] text-3xl text-forest mb-2">Premium Plan</h2>
              <p className="font-[family-name:var(--font-body)] text-sm text-forest/40 mb-8 max-w-md">
                Unlock the full Nootes experience. All features, unlimited AI tools, priority everything.
              </p>

              {/* Pricing cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 max-w-2xl">
                <div className="bg-parchment border border-forest/10 squircle-xl p-6 hover:shadow-[0_4px_32px_-8px_rgba(38,70,53,0.1)] transition-all">
                  <span className="font-mono text-[10px] text-forest/30 tracking-[0.2em] uppercase block mb-2">MONTHLY</span>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="font-[family-name:var(--font-display)] text-5xl text-forest">$8</span>
                    <span className="font-[family-name:var(--font-body)] text-sm text-forest/30">/month</span>
                  </div>
                  <p className="font-[family-name:var(--font-body)] text-xs text-forest/35 mb-5">Cancel anytime. Billed monthly.</p>
                  <button className="w-full bg-forest/[0.06] text-forest py-2.5 squircle font-[family-name:var(--font-body)] text-sm hover:bg-forest/[0.1] transition-all border border-forest/10">
                    Subscribe
                  </button>
                </div>

                <div className="bg-parchment border border-sage/30 squircle-xl p-6 ring-2 ring-sage/10 hover:shadow-[0_4px_32px_-8px_rgba(38,70,53,0.1)] transition-all relative">
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 font-mono text-[9px] text-parchment bg-sage px-3 py-0.5 squircle-sm">
                    BEST VALUE
                  </span>
                  <span className="font-mono text-[10px] text-forest/30 tracking-[0.2em] uppercase block mb-2">SEMESTER</span>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="font-[family-name:var(--font-display)] text-5xl text-forest">$49</span>
                    <span className="font-[family-name:var(--font-body)] text-sm text-forest/30">/semester</span>
                  </div>
                  <p className="font-[family-name:var(--font-body)] text-xs text-sage/60 mb-5">Save $15 vs monthly. Covers a full semester.</p>
                  <button className="w-full bg-forest text-parchment py-2.5 squircle font-[family-name:var(--font-body)] text-sm hover:bg-forest-deep transition-all shadow-sm">
                    Subscribe & Save
                  </button>
                </div>
              </div>

              {/* Feature grid */}
              <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">WHAT'S INCLUDED</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {premiumFeatures.map((f, i) => (
                  <div key={i} className="bg-parchment border border-forest/10 squircle-xl p-6 flex items-start gap-4">
                    <div className="w-10 h-10 bg-sage/10 squircle-sm flex items-center justify-center text-sage shrink-0">
                      {f.icon}
                    </div>
                    <div>
                      <h3 className="font-[family-name:var(--font-display)] text-xl text-forest mb-1">{f.title}</h3>
                      <p className="font-[family-name:var(--font-body)] text-xs text-forest/40 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tier breakdown */}
          <div className="mt-16">
            <span className="font-mono text-[9px] text-sage/50 tracking-[0.3em] uppercase block mb-3">THRESHOLDS</span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-forest mb-6">Aura Tiers</h2>
            <p className="font-[family-name:var(--font-body)] text-sm text-forest/40 mb-8 max-w-md">
              Aura points are threshold-based — once you reach a tier, its features are permanently unlocked.
            </p>
            <div className="space-y-3">
              {tiers.map((tier, i) => (
                <div
                  key={tier.threshold}
                  className={`bg-parchment border squircle-xl p-5 flex items-center gap-5 transition-all ${
                    tier.unlocked ? 'border-sage/20' : 'border-forest/[0.06] opacity-60'
                  }`}
                >
                  <div
                    className="w-12 h-12 squircle flex items-center justify-center text-xl shrink-0"
                    style={{
                      backgroundColor: tier.unlocked ? `${tier.color}15` : 'rgba(38,70,53,0.04)',
                      color: tier.unlocked ? tier.color : 'rgba(38,70,53,0.2)',
                    }}
                  >
                    {tier.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-[family-name:var(--font-display)] text-xl text-forest">{tier.label}</h3>
                      <span className="font-mono text-[10px] text-forest/25">{tier.threshold} aura</span>
                      {tier.unlocked && (
                        <span className="font-mono text-[9px] text-sage bg-sage/10 px-2 py-0.5 squircle-sm">unlocked</span>
                      )}
                    </div>
                    <p className="font-[family-name:var(--font-body)] text-xs text-forest/40">{tier.description}</p>
                  </div>
                  {!tier.unlocked && (
                    <span className="font-mono text-[10px] text-forest/20 shrink-0">
                      {tier.threshold - currentAura} more
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Earn aura callout */}
          <div className="mt-12 bg-sage/[0.06] border border-sage/15 squircle-2xl p-8">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 bg-sage/15 squircle flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-2xl text-forest mb-2">Prefer earning?</h3>
                <p className="font-[family-name:var(--font-body)] text-sm text-forest/50 leading-relaxed mb-4">
                  Earn aura organically through contributions, daily check-ins, streaks, and referrals. Every merge earns you points.
                </p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { action: 'Daily check-in', aura: '+5' },
                    { action: 'Contribution merged', aura: '+10–15' },
                    { action: 'Upvote received', aura: '+3' },
                    { action: 'Week streak', aura: '+20' },
                    { action: 'Referral', aura: '+25' },
                  ].map(e => (
                    <div key={e.action} className="bg-parchment border border-forest/[0.06] squircle-sm px-3 py-2 flex items-center gap-2">
                      <span className="font-[family-name:var(--font-body)] text-xs text-forest/50">{e.action}</span>
                      <span className="font-mono text-[10px] text-sage">{e.aura}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
