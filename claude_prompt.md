Make the Profile page (`Frontend/src/pages/Profile.tsx`) load the user's data dynamically from Supabase instead of using hardcoded mock data. Keep the exact same visual design and layout — only change where the data comes from.

## What to change

### 1. Profile card (left column)
- Load the current user's profile from the `profiles` table using `useAuth()` from `Frontend/src/contexts/AuthContext.tsx` (it already provides `user` and `profile`)
- Display: `display_name`, `avatar_url`, `email`, `aura`, `tier`, `badges`
- The `profile` object has this shape (see `Frontend/src/lib/supabase.ts`):
  ```ts
  interface Profile {
    id: string
    display_name: string
    avatar_url: string | null
    email: string | null
    aura: number
    tier: 'seedling' | 'sprout' | 'sapling' | 'grove' | 'ancient-oak'
    badges: string[]
    created_at: string
    updated_at: string
  }
  ```
- For "Organization", "Field", and "Year" — these are not in the profiles table yet. Show them as editable text fields that the user can fill in, OR remove them from the profile card for now. Prefer removing them for now to keep it simple.
- Show a loading spinner while `profile` is null.

### 2. Stats grid
- **Aura**: from `profile.aura`
- **Noots**: query `documents` table: `SELECT count(*) FROM documents WHERE user_id = auth.uid()`
- **Merges**: query `merge_requests` table: `SELECT count(*) FROM merge_requests WHERE user_id = auth.uid() AND status = 'merged'`
- **Nootbooks**: query `repository_contributors` table: `SELECT count(*) FROM repository_contributors WHERE user_id = auth.uid()`
- These can all be fetched in a single `useEffect` on mount. Show "—" while loading.

### 3. Top Noots section (currently "Pinned Notes")
- These should be the user's most engaged-with noots, ranked by total engagement (stars + comments).
- For now, since the documents/stars/comments tables aren't fully wired yet, **keep this as placeholder data**. Add a `// TODO: fetch top noots by engagement (stars + comments) once the star/comment system is built` comment.

### 4. Activity Feed section
- This should show the user's most recently updated documents.
- Query: `SELECT * FROM documents WHERE user_id = auth.uid() ORDER BY updated_at DESC LIMIT 10`
- For each document, also join the repository title: `SELECT d.*, r.title as repo_title FROM documents d JOIN repositories r ON d.repo_id = r.id WHERE d.user_id = auth.uid() ORDER BY d.updated_at DESC LIMIT 10`
- If empty, show a friendly empty state like "No activity yet — start writing your first noot!"

### 5. Contribution graph
- Leave as random/mock data for now. Add a `// TODO: populate from real document update timestamps` comment.

## Important
- Use the existing `supabase` client from `Frontend/src/lib/supabase.ts`
- Use the existing `useAuth()` hook from `Frontend/src/hooks/useAuth.ts`
- Keep the same Tailwind classes and overall component structure — this is a data source change, not a redesign
- Handle loading and error states gracefully
- Do NOT change the Navbar, KaTeX, or other imported components
