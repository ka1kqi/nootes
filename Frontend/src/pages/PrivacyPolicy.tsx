import { Link } from 'react-router-dom'
import logoImg from '../assets/logo.png'

/* ------------------------------------------------------------------ */
/* Privacy Policy                                                      */
/* ------------------------------------------------------------------ */

const LAST_UPDATED = 'February 22, 2026'

const sections = [
  {
    number: '01',
    title: 'Information We Collect',
    body: [
      'When you create an account, we collect basic profile information including your name, email address, and, if you sign in with Google, your profile picture. This information is provided directly by you or by the OAuth provider you choose.',
      'As you use the Service, we collect content you create — notes, documents, comments, and any other User Content you upload or generate within Nootes. We also collect usage data such as features accessed, pages visited, and interaction patterns to help us improve the product.',
      'We automatically receive certain technical data when you access the Service, including your IP address, browser type, operating system, referring URLs, and device identifiers. This data is used for security, analytics, and to diagnose issues.',
    ],
  },
  {
    number: '02',
    title: 'How We Use Your Information',
    body: [
      'We use your information to provide and operate the Service — including storing your notes, enabling collaboration with classmates, processing AI-powered merges and study material, and maintaining your account.',
      'We use usage data to understand how people interact with Nootes, identify areas for improvement, and develop new features. We do not sell this data to advertisers.',
      'We may use your email address to send you important notices about your account, security updates, or material changes to our policies. You can opt out of non-essential communications at any time from your account settings.',
      'If you use AI features (such as merge, flashcard generation, or summaries), your content is processed by our AI models solely to deliver the requested output. We do not use your note content to train third-party AI models without your explicit consent.',
    ],
  },
  {
    number: '03',
    title: 'Sharing & Disclosure',
    body: [
      'We do not sell your personal information. We share your information only in the following circumstances:',
      'Service providers: We use third-party services including Supabase (database and authentication) and NVIDIA NIM (AI inference). These providers process your data on our behalf and are bound by confidentiality agreements.',
      'Collaboration: Notes you contribute to shared Nootbooks are visible to other contributors of that Nootbook, as governed by the sharing settings you or the Nootbook owner configure.',
      'Legal requirements: We may disclose your information if required to do so by law, or in response to valid requests by public authorities (e.g., a court order or government agency).',
      'Business transfers: In the event of a merger, acquisition, or sale of all or substantially all of our assets, your information may be transferred as part of that transaction. We will notify you before your information becomes subject to a different privacy policy.',
    ],
  },
  {
    number: '04',
    title: 'Authentication & Third-Party Sign-In',
    body: [
      'Nootes uses Supabase Auth to manage authentication. When you sign in with Google, we receive your name, email address, and profile picture from Google. We do not receive or store your Google password.',
      'Your authentication tokens are stored securely in your browser\'s local storage and are used only to verify your identity when you access the Service. You can revoke Nootes\'s access to your Google account at any time from your Google Account settings.',
    ],
  },
  {
    number: '05',
    title: 'Data Retention',
    body: [
      'We retain your account information and User Content for as long as your account is active. If you delete your account, we will remove your personal profile information within 30 days.',
      'Note content in shared Nootbooks may persist after your account deletion if other contributors have created branches or forks based on your contributions, subject to the applicable content licensing under these terms.',
      'Aggregated, anonymised analytics data may be retained indefinitely as it no longer identifies you personally.',
    ],
  },
  {
    number: '06',
    title: 'Cookies & Local Storage',
    body: [
      'Nootes uses browser local storage to persist your authentication session across visits. We do not use third-party advertising cookies.',
      'We may use first-party cookies for preferences such as theme settings and compact mode. You can clear cookies and local storage through your browser settings, but doing so will sign you out of the Service.',
    ],
  },
  {
    number: '07',
    title: 'Security',
    body: [
      'We take the security of your information seriously. All data is transmitted over HTTPS. Authentication is handled through Supabase, which implements industry-standard security practices including JWT-based session management.',
      'We perform regular security reviews and follow responsible disclosure practices. However, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security.',
      'If you discover a security vulnerability, please report it responsibly to security@nootes.app rather than disclosing it publicly.',
    ],
  },
  {
    number: '08',
    title: "Children's Privacy",
    body: [
      'Nootes is not directed at children under the age of 13, and we do not knowingly collect personal information from children under 13. If we learn that we have collected personal information from a child under 13, we will delete that information promptly.',
      'If you are between 13 and 18, you should review these Terms and this Privacy Policy with a parent or guardian before using the Service.',
    ],
  },
  {
    number: '09',
    title: 'Your Rights',
    body: [
      'Depending on your location, you may have certain rights regarding your personal information, including the right to access, correct, or delete the data we hold about you.',
      'You can update your profile information directly from your account settings. To request deletion of your account and associated data, you can use the account deletion option in settings or email us at privacy@nootes.app.',
      'If you are located in the European Economic Area, you have additional rights under the GDPR. Please contact us to exercise these rights.',
    ],
  },
  {
    number: '10',
    title: 'Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page and, for material changes, notify you via email or a prominent notice within the Service.',
      'We encourage you to review this policy periodically to stay informed about how we protect your information.',
    ],
  },
  {
    number: '11',
    title: 'Contact Us',
    body: [
      'If you have questions, concerns, or requests regarding this Privacy Policy or our handling of your personal information, please contact us at privacy@nootes.app.',
      'We aim to respond to all privacy-related inquiries within five business days.',
    ],
  },
]

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-cream/80 backdrop-blur-sm border-b border-forest/[0.06] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/">
            <img src={logoImg} alt="Nootes logo" style={{ width: 36, height: 36 }} />
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/explore" className="font-[family-name:var(--font-body)] text-sm text-forest/55 hover:text-forest transition-colors px-3 py-1.5">
              Explore
            </Link>
            <Link to="/how-it-works" className="font-[family-name:var(--font-body)] text-sm text-forest/55 hover:text-forest transition-colors px-3 py-1.5">
              How it works
            </Link>
            <div className="h-4 w-px bg-forest/15 mx-1" />
            <div className="flex squircle-sm overflow-hidden border border-forest/15">
              <Link to="/login?mode=signin" className="font-[family-name:var(--font-body)] text-sm text-forest/65 hover:text-forest hover:bg-forest/[0.05] transition-colors px-5 py-1.5 text-center">
                Sign In
              </Link>
              <div className="w-px bg-forest/15" />
              <Link to="/login?mode=signup" className="font-[family-name:var(--font-body)] text-sm bg-forest text-parchment hover:bg-forest-deep transition-colors px-5 py-1.5 text-center">
                Sign Up
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-6 pt-16 pb-10 stagger">
          <span className="font-mono text-[9px] text-sage/50 tracking-[0.4em] uppercase block mb-4">LEGAL</span>
          <h1 className="font-[family-name:var(--font-display)] text-[3.5rem] leading-[0.9] text-forest tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="font-[family-name:var(--font-body)] text-sm text-forest/45 leading-relaxed">
            Last updated <span className="text-forest/60">{LAST_UPDATED}</span>. Your privacy matters to us. This policy explains what we collect, how we use it, and how you can control your data.
          </p>
        </section>

        {/* ── Highlight strip ──────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto px-6 mb-10">
          <div className="bg-sage/[0.06] border border-sage/20 squircle-xl p-5 grid grid-cols-3 gap-4">
            {[
              { icon: '✕', label: 'We never sell your data' },
              { icon: '✕', label: 'No advertising cookies' },
              { icon: '✓', label: 'You control your content' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className={`font-mono text-xs font-bold ${item.icon === '✓' ? 'text-sage' : 'text-forest/25'}`}>{item.icon}</span>
                <span className="font-[family-name:var(--font-body)] text-xs text-forest/55 leading-snug">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Jump links ───────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto px-6 mb-12">
          <div className="bg-parchment border border-forest/10 squircle-xl p-5">
            <span className="font-mono text-[9px] text-forest/30 tracking-[0.3em] uppercase block mb-3">Contents</span>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {sections.map(s => (
                <a
                  key={s.number}
                  href={`#section-${s.number}`}
                  className="flex items-center gap-2 group"
                >
                  <span className="font-mono text-[9px] text-forest/20 group-hover:text-forest/40 transition-colors">{s.number}</span>
                  <span className="font-[family-name:var(--font-body)] text-xs text-forest/45 group-hover:text-forest/70 transition-colors">{s.title}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Sections ─────────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto px-6 pb-24 space-y-8">
          {sections.map(s => (
            <section key={s.number} id={`section-${s.number}`} className="scroll-mt-20">
              <div className="flex items-start gap-4 mb-3">
                <span className="font-[family-name:var(--font-display)] text-4xl text-forest/[0.07] leading-none select-none shrink-0 mt-1">{s.number}</span>
                <h2 className="font-[family-name:var(--font-display)] text-2xl text-forest leading-tight">{s.title}</h2>
              </div>
              <div className="pl-12 space-y-3">
                {s.body.map((para, i) => (
                  <p key={i} className="font-[family-name:var(--font-body)] text-sm text-forest/55 leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
              <div className="pl-12 mt-6 h-px bg-forest/[0.06]" />
            </section>
          ))}

          {/* Footer note */}
          <p className="font-mono text-[10px] text-forest/25 text-center pt-4">
            Nootes · {LAST_UPDATED} · <Link to="/terms" className="hover:text-forest/40 transition-colors underline">Terms of Service</Link>
          </p>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-forest/[0.07]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <img src={logoImg} alt="Nootes logo" style={{ width: 24, height: 24 }} />
            <span className="font-[family-name:var(--font-display)] text-base text-forest/50">nootes</span>
          </div>
          <p className="font-mono text-[9px] text-forest/35 tracking-wider">Built for learners, by learners.</p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="font-mono text-[9px] text-forest/30 hover:text-forest/50 transition-colors tracking-wider">TERMS</Link>
            <Link to="/privacy" className="font-mono text-[9px] text-forest/30 hover:text-forest/50 transition-colors tracking-wider">PRIVACY</Link>
            <Link to="/login" className="font-mono text-[9px] text-forest/30 hover:text-forest/50 transition-colors tracking-wider">SIGN IN</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
