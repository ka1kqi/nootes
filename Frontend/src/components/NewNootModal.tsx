/**
 * @file NewNootModal.tsx
 * Dialog modal for creating a new nootbook (document).
 * Collects a title and optional tags, calls {@link createDocument},
 * then notifies the parent of the new document ID via `onCreated`.
 */

import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { createDocument } from '../hooks/useMyRepos'

/** Props for the {@link NewNootModal} component. */
interface Props {
  /** Whether the modal is currently visible. */
  open: boolean
  /** Called when the modal should close (cancel or after successful creation). */
  onClose: () => void
  /** Called with the new document's UUID once creation succeeds. */
  onCreated: (docId: string) => void
}

/**
 * Modal dialog for creating a new nootbook.
 * Renders a backdrop + centred card with title/tag inputs and a submit button.
 * Returns `null` when `open` is `false` so the DOM node is fully unmounted.
 */
export function NewNootModal({ open, onClose, onCreated }: Props) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Adds the current `tagInput` value to `tags` (lowercased, de-duped) and clears the input. */
  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }
  /** Removes a specific tag from the `tags` list by value. */
  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag))

  /** Resets all form fields and clears any validation error. */
  const reset = () => { setTitle(''); setTags([]); setTagInput(''); setError(null) }
  /** Resets the form then delegates to the parent's `onClose` callback. */
  const handleClose = () => { reset(); onClose() }

  /**
   * Handles the form submission: creates the document via Supabase,
   * then either surfaces the error inline or closes the modal and
   * calls `onCreated` with the new document's ID.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !user) return
    setSubmitting(true)
    setError(null)
    const { docId, error: err } = await createDocument(user, { title: title.trim(), tags })
    setSubmitting(false)
    if (err) { setError(err) } else { reset(); onClose(); onCreated(docId!) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-forest/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-cream border border-forest/15 squircle-xl shadow-[0_32px_80px_-16px_rgba(38,70,53,0.25)] w-full max-w-md">
        <div className="px-8 pt-8 pb-6 border-b border-forest/[0.08]">
          <span className="font-mono text-[10px] text-sage/50 tracking-[0.3em] uppercase block mb-2">NEW NOOTBOOK</span>
          <h2 className="font-[family-name:var(--font-display)] text-4xl text-forest leading-tight">Create a nootbook</h2>
          <p className="font-[family-name:var(--font-body)] text-[13px] text-forest/40 mt-1">Give your nootbook a title to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {/* Title */}
          <div>
            <label className="font-mono text-[10px] text-forest/40 tracking-[0.2em] uppercase block mb-1.5">
              Title <span className="text-sage">*</span>
            </label>
            <input
              type="text" required autoFocus value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Intro to Algorithms"
              className="w-full bg-parchment border border-forest/10 squircle px-4 py-2.5 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/25 outline-none focus:border-sage/40 focus:ring-2 focus:ring-sage/10 transition-all"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="font-mono text-[10px] text-forest/40 tracking-[0.2em] uppercase block mb-1.5">Tags</label>
            <div className="flex gap-2">
              <input
                type="text" value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="algorithms, graphs..."
                className="flex-1 bg-parchment border border-forest/10 squircle px-4 py-2.5 font-[family-name:var(--font-body)] text-sm text-forest placeholder:text-forest/25 outline-none focus:border-sage/40 focus:ring-2 focus:ring-sage/10 transition-all"
              />
              <button type="button" onClick={addTag} className="px-3 py-2.5 bg-sage/10 border border-sage/20 squircle font-mono text-[10px] text-sage hover:bg-sage/20 transition-colors">Add</button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(tag => (
                  <span key={tag} className="font-mono text-[10px] bg-forest/[0.06] text-forest/50 px-2 py-0.5 squircle-sm flex items-center gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-forest/30 hover:text-forest/60 ml-0.5 leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p className="font-mono text-[11px] text-red-500 bg-red-50 border border-red-200 squircle px-4 py-2">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="font-mono text-[11px] text-forest/40 hover:text-forest/60 px-4 py-2.5 squircle transition-colors">Cancel</button>
            <button type="submit" disabled={submitting || !title.trim()}
              className="bg-forest text-parchment px-6 py-2.5 squircle font-[family-name:var(--font-body)] text-sm hover:bg-forest-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_2px_16px_-4px_rgba(38,70,53,0.3)]">
              {submitting ? (
                <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creating...</>
              ) : (
                <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>Create Nootbook</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
