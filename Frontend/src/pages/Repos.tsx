import { Link } from 'react-router-dom'
import { Navbar } from '../components/Navbar'

/* ------------------------------------------------------------------ */
/* Repository Browser                                                  */
/* Browse all classes / repos — cards with stats, search, filters     */
/* ------------------------------------------------------------------ */

const universities = ['All', 'NYU', 'MIT', 'Stanford', 'Berkeley', 'Columbia']

const repos = [
  {
    id: 'nyu-cs-algo',
    name: 'Intro to Algorithms',
    university: 'NYU',
    dept: 'CS',
    code: 'CS-UA 310',
    contributors: 47,
    notes: 23,
    branches: 8,
    lastUpdated: '2h ago',
    description: 'Binary search, graph algorithms, dynamic programming, and complexity analysis.',
    tags: ['exam-relevant', 'midterm', 'final'],
    stars: 234,
    color: '#264635',
  },
  {
    id: 'nyu-math-linalg',
    name: 'Linear Algebra',
    university: 'NYU',
    dept: 'Math',
    code: 'MATH-UA 140',
    contributors: 31,
    notes: 18,
    branches: 5,
    lastUpdated: '5h ago',
    description: 'Vector spaces, eigenvalues, SVD, and matrix decompositions with proofs.',
    tags: ['proofs', 'midterm'],
    stars: 189,
    color: '#A3B18A',
  },
  {
    id: 'mit-cs-ml',
    name: 'Machine Learning',
    university: 'MIT',
    dept: 'CS',
    code: '6.036',
    contributors: 82,
    notes: 41,
    branches: 12,
    lastUpdated: '1d ago',
    description: 'Supervised learning, neural networks, regularization, and optimization.',
    tags: ['deep-learning', 'final'],
    stars: 412,
    color: '#8B6E4E',
  },
  {
    id: 'stanford-phys',
    name: 'Quantum Mechanics',
    university: 'Stanford',
    dept: 'Physics',
    code: 'PHYS 130',
    contributors: 19,
    notes: 14,
    branches: 3,
    lastUpdated: '3d ago',
    description: 'Wave functions, Schrödinger equation, perturbation theory, and spin.',
    tags: ['proofs', 'exam-relevant'],
    stars: 156,
    color: '#5C7A6B',
  },
  {
    id: 'berkeley-math-analysis',
    name: 'Real Analysis',
    university: 'Berkeley',
    dept: 'Math',
    code: 'MATH 104',
    contributors: 24,
    notes: 16,
    branches: 4,
    lastUpdated: '6h ago',
    description: 'Sequences, series, continuity, differentiability, and Riemann integration.',
    tags: ['proofs', 'midterm', 'final'],
    stars: 178,
    color: '#264635',
  },
  {
    id: 'columbia-cs-os',
    name: 'Operating Systems',
    university: 'Columbia',
    dept: 'CS',
    code: 'COMS 4118',
    contributors: 38,
    notes: 22,
    branches: 7,
    lastUpdated: '12h ago',
    description: 'Processes, threads, memory management, file systems, and concurrency.',
    tags: ['systems', 'midterm'],
    stars: 203,
    color: '#A3B18A',
  },
  {
    id: 'nyu-chem-orgo',
    name: 'Organic Chemistry',
    university: 'NYU',
    dept: 'Chem',
    code: 'CHEM-UA 226',
    contributors: 15,
    notes: 12,
    branches: 2,
    lastUpdated: '1d ago',
    description: 'Reaction mechanisms, stereochemistry, spectroscopy, and synthesis.',
    tags: ['reactions', 'exam-relevant'],
    stars: 97,
    color: '#8B6E4E',
  },
  {
    id: 'mit-econ',
    name: 'Microeconomics',
    university: 'MIT',
    dept: 'Econ',
    code: '14.01',
    contributors: 29,
    notes: 17,
    branches: 4,
    lastUpdated: '2d ago',
    description: 'Supply & demand, game theory, market structures, and welfare economics.',
    tags: ['midterm', 'final'],
    stars: 145,
    color: '#5C7A6B',
  },
]

function StarIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  )
}

function BranchIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v12m0 0a3 3 0 103 3H15a3 3 0 100-3H9a3 3 0 01-3-3zm0 0a3 3 0 103-3 3 3 0 00-3 3z" />
    </svg>
  )
}

export default function Repos() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar
        variant="light"
        breadcrumbs={[{ label: 'Repositories' }]}
      />

      <div className="flex-1 overflow-y-auto stagger">
        {/* Header */}
        <div className="max-w-5xl mx-auto px-6 pt-12 pb-8">
          <span className="font-mono text-[10px] text-sage/50 tracking-[0.3em] uppercase block mb-3">BROWSE</span>
          <h1 className="font-[family-name:var(--font-display)] text-6xl text-forest leading-[0.9] mb-4">Repositories</h1>
          <p className="font-[family-name:var(--font-body)] text-[15px] text-forest/50 max-w-lg">
            Explore class notes across universities. Fork, contribute, and build the best study resources together.
          </p>

          {/* Search + filter bar */}
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[280px] relative">
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-forest/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search repositories..."
                className="w-full bg-parchment border border-forest/10 squircle pl-10 pr-4 py-2.5 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/30 outline-none focus:border-sage/40 focus:ring-2 focus:ring-sage/10 transition-all"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {universities.map(u => (
                <button
                  key={u}
                  className={`font-mono text-[11px] px-3 py-2 squircle-sm transition-all ${
                    u === 'All'
                      ? 'bg-forest text-parchment'
                      : 'text-forest/40 hover:text-forest hover:bg-forest/[0.05] border border-forest/10'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Repo grid */}
        <div className="max-w-5xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-fast">
            {repos.map(repo => (
              <Link
                key={repo.id}
                to="/editor"
                className="group bg-parchment border border-forest/10 squircle-xl p-6 hover:shadow-[0_4px_32px_-8px_rgba(38,70,53,0.1)] transition-all hover:border-forest/20"
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: repo.color, opacity: 0.6 }} />
                    <span className="font-mono text-[10px] text-forest/35 tracking-wider">{repo.code}</span>
                    <span className="font-mono text-[9px] text-sage/50 bg-sage/[0.08] px-1.5 py-0.5 squircle-sm">{repo.university}</span>
                  </div>
                  <div className="flex items-center gap-1 text-forest/25">
                    <StarIcon />
                    <span className="font-mono text-[10px]">{repo.stars}</span>
                  </div>
                </div>

                {/* Name + desc */}
                <h3 className="font-[family-name:var(--font-display)] text-2xl text-forest group-hover:text-sage transition-colors mb-1.5">
                  {repo.name}
                </h3>
                <p className="font-[family-name:var(--font-body)] text-xs text-forest/45 leading-relaxed mb-4">
                  {repo.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {repo.tags.map(tag => (
                    <span key={tag} className="font-mono text-[10px] text-forest/35 border border-forest/10 px-2 py-0.5 squircle-sm">{tag}</span>
                  ))}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 pt-3 border-t border-forest/[0.06]">
                  <div className="flex items-center gap-1 text-forest/30">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
                    <span className="font-mono text-[10px]">{repo.contributors}</span>
                  </div>
                  <div className="flex items-center gap-1 text-forest/30">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                    <span className="font-mono text-[10px]">{repo.notes} notes</span>
                  </div>
                  <div className="flex items-center gap-1 text-forest/30">
                    <BranchIcon />
                    <span className="font-mono text-[10px]">{repo.branches}</span>
                  </div>
                  <span className="font-mono text-[10px] text-forest/20 ml-auto">{repo.lastUpdated}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
