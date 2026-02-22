import { Link } from 'react-router-dom'
import logoImg from '../assets/logo.png'

/* ------------------------------------------------------------------ */
/* Terms of Service                                                    */
/* ------------------------------------------------------------------ */

const LAST_UPDATED = 'February 22, 2026'

const sections = [
  {
    number: '01',
    title: 'Acceptance of Terms',
    body: [
      'By accessing or using Nootes ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service.',
      'These Terms apply to all users, including visitors, registered users, and contributors. We reserve the right to update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the updated Terms.',
    ],
  },
  {
    number: '02',
    title: 'Your Account',
    body: [
      'To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.',
      'You agree to provide accurate, current, and complete information during registration and to keep your information up to date. You may not impersonate another person or use a name you are not authorised to use.',
      'We reserve the right to suspend or terminate accounts that violate these Terms or that have been inactive for an extended period.',
    ],
  },
  {
    number: '03',
    title: 'Content & Ownership',
    body: [
      'You retain ownership of any notes, documents, or other content ("User Content") you create or upload to Nootes. By posting User Content, you grant Nootes a non-exclusive, worldwide, royalty-free licence to store, display, and process your content solely for the purpose of operating and improving the Service.',
      'When you contribute to a shared Nootbook, you acknowledge that other contributors may view, comment on, or merge your content in accordance with the collaboration features of the Service.',
      'You represent that you have the rights to share any content you upload, and that your content does not infringe the intellectual property or privacy rights of any third party.',
    ],
  },
  {
    number: '04',
    title: 'Acceptable Use',
    body: [
      'You agree not to use the Service to: upload content that is unlawful, harmful, threatening, abusive, defamatory, or otherwise objectionable; infringe any patent, trademark, trade secret, copyright, or other intellectual property right; transmit unsolicited or unauthorised advertising or spam; attempt to gain unauthorised access to any part of the Service or its related systems.',
      'Academic integrity is core to our mission. You agree not to use Nootes to facilitate academic dishonesty, including submitting AI-generated or collaboratively produced content as solely your own in violation of your institution\'s honour code.',
      'We reserve the right to remove any content and suspend any account that violates these guidelines, at our sole discretion and without prior notice.',
    ],
  },
  {
    number: '05',
    title: 'AI Features',
    body: [
      'Nootes uses AI models to provide features such as note merging, flashcard generation, and content summarisation. AI-generated output is provided "as-is" and may contain errors. You are responsible for reviewing AI output before relying on it for academic or professional purposes.',
      'By using AI features, you grant Nootes permission to process your content through these models. We do not sell your content to third-party AI providers, and processing is performed solely to deliver the requested feature.',
    ],
  },
  {
    number: '06',
    title: 'Intellectual Property',
    body: [
      'The Nootes name, logo, interface, and underlying software are the intellectual property of Nootes and its creators. You may not copy, modify, distribute, or create derivative works from any part of the Service without express written permission.',
      'All rights not expressly granted in these Terms are reserved by Nootes.',
    ],
  },
  {
    number: '07',
    title: 'Disclaimers',
    body: [
      'The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. Nootes does not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components.',
      'We are not responsible for the accuracy, completeness, or usefulness of any User Content posted on the Service. Reliance on any content is at your own risk.',
    ],
  },
  {
    number: '08',
    title: 'Limitation of Liability',
    body: [
      'To the fullest extent permitted by law, Nootes and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service, even if we have been advised of the possibility of such damages.',
      'Our total liability for any claim arising from or related to these Terms or the Service shall not exceed the amount you paid us in the twelve months prior to the claim, or $10 USD if you have not made any payments.',
    ],
  },
  {
    number: '09',
    title: 'Termination',
    body: [
      'You may stop using the Service at any time and delete your account from your profile settings. Upon deletion, your personal data will be removed in accordance with our Privacy Policy.',
      'We may suspend or terminate your access to the Service at any time, with or without cause, and with or without notice. Provisions of these Terms that by their nature should survive termination will survive, including ownership provisions, disclaimers, and limitations of liability.',
    ],
  },
  {
    number: '10',
    title: 'Governing Law',
    body: [
      'These Terms are governed by the laws of the State of New York, United States, without regard to its conflict of law provisions. Any dispute arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in New York County, New York.',
    ],
  },
  {
    number: '11',
    title: 'Contact',
    body: [
      'If you have questions about these Terms, please reach out to us at legal@nootes.app. We aim to respond to all inquiries within five business days.',
    ],
  },
]

export default function TermsOfService() {
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
            Terms of Service
          </h1>
          <p className="font-[family-name:var(--font-body)] text-sm text-forest/45 leading-relaxed">
            Last updated <span className="text-forest/60">{LAST_UPDATED}</span>. These terms govern your use of Nootes. Please read them carefully.
          </p>
        </section>

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
            Nootes · {LAST_UPDATED} · <Link to="/privacy" className="hover:text-forest/40 transition-colors underline">Privacy Policy</Link>
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
