# Claude Code Prompt: Noot Agent — Navigation & Repository Creation

## Goal

Add two agentic capabilities to the Noot AI assistant:

1. **Navigate** — Noot can open any page in the app when the user asks (e.g. "go to my repos", "open the editor for Calc II")
2. **Create Repository** — Noot can create a new nootbook when the user asks (e.g. "create a nootbook called Linear Algebra")

These are **new response modes** (D and E) added to the existing `noot_prompt.txt` system prompt. The frontend Chat/Noot component parses the model output and executes the action.

---

## Architecture

The Noot agent runs as a NIM-backed chat endpoint (`POST /api/noot`). The model receives a system prompt (`gpt_prompts/noot_prompt.txt`) that tells it which output format to use. The frontend parses the response and decides what to do based on markers:

- Plain text → render as markdown
- JSON array → render as graph
- `[WRITE_TO_EDITOR]` → insert blocks into editor
- **NEW: `[NAVIGATE]`** → trigger `react-router` navigation
- **NEW: `[CREATE_REPO]`** → call Supabase to create a repo, then navigate to it

No backend changes are needed — all logic is in the prompt + frontend parsing.

---

## Changes Required

### 1. Update `gpt_prompts/noot_prompt.txt`

Add two new modes after MODE C (WRITE TO EDITOR):

```
═══ MODE D: NAVIGATE ═══
Use this mode when the user asks to GO TO, OPEN, or NAVIGATE to a page.
Trigger phrases: "go to", "open", "take me to", "show me", "navigate to", "switch to"

Output the marker [NAVIGATE] on the first line, followed by a JSON object:
- "route": the route path to navigate to
- "message": a short friendly confirmation (1 sentence)

Available routes:
- "/home" — Home / dashboard
- "/repos" — Browse all public nootbooks
- "/my-repos" — My nootbooks (user's own)
- "/editor/{repoId}" — Open a specific nootbook in the editor (requires repo ID or title match)
- "/chat" — Chat channels
- "/profile" — User profile
- "/explore" — Explore public nootbooks
- "/settings" — User settings
- "/store" — Aura store
- "/Notebooks" - Public Nootbooks
- "/My Nootbooks" - My Nootbooks

If the user says something like "open my Calc II notes" or "go to Linear Algebra", search for a matching nootbook by title. Output the route with a placeholder:
{"route": "/editor/__SEARCH:Linear Algebra__", "message": "Opening your Linear Algebra nootbook!"}

The frontend will resolve __SEARCH:title__ to the actual repo ID.

Example:
[NAVIGATE]
{"route": "/my-repos", "message": "Here are your nootbooks!"}

Example:
[NAVIGATE]
{"route": "/editor/__SEARCH:Organic Chemistry__", "message": "Opening Organic Chemistry!"}


═══ MODE E: CREATE REPOSITORY ═══
Use this mode when the user asks to CREATE, MAKE, or START a new nootbook/repository. The default visibility is private.
Trigger phrases: "create a nootbook", "make a new repo", "start a nootbook", "new nootbook"

Output the marker [CREATE_REPO] on the first line, followed by a JSON object:
- "title": the title for the new nootbook
- "description": a short description (1-2 sentences, generated from context)
- "visibility": "public" or "private" (default "private" unless user says public)
- "tags": an array of relevant tags (1-3 tags, inferred from the title/topic)
- "initial_blocks": optional array of initial block objects to pre-populate the nootbook
  (use the same format as WRITE TO EDITOR mode)
- "message": a short friendly confirmation

Example:
[CREATE_REPO]
{"title": "Linear Algebra", "description": "Notes on vector spaces, matrices, and linear transformations.", "visibility": "private", "tags": ["math", "linear-algebra"], "initial_blocks": [{"type": "h1", "content": "Linear Algebra"}, {"type": "paragraph", "content": "Course notes and problem sets."}], "message": "Created your Linear Algebra nootbook! Opening it now."}
```

Also update the DECISION GUIDE at the bottom:

```
═══ DECISION GUIDE ═══
- "go to repos" / "open my notes" / "show profile" → NAVIGATE
- "create a nootbook called X" / "make a new repo" → CREATE REPOSITORY
- "write notes on X" / "add a section about Y" → WRITE TO EDITOR
- Concept explanation, study topic, how-does-X-work → GRAPH (default)
- Short greeting, trivial factual question → PLAIN TEXT
When in doubt, USE GRAPH MODE.
```

### 2. Frontend: Parse new markers in the Noot response handler

Find the component that calls `/api/noot` and renders the response. It currently handles plain text, graph JSON, and `[WRITE_TO_EDITOR]`. Add parsing for:

#### `[NAVIGATE]` handler:
```typescript
if (content.startsWith('[NAVIGATE]')) {
  const json = content.replace('[NAVIGATE]', '').trim()
  const { route, message } = JSON.parse(json)
  
  // Handle __SEARCH:title__ pattern
  if (route.includes('__SEARCH:')) {
    const searchTitle = route.match(/__SEARCH:(.+?)__/)?.[1]
    if (searchTitle) {
      // Query Supabase for matching repo
      const { data } = await supabase
        .from('repositories')
        .select('id')
        .ilike('title', `%${searchTitle}%`)
        .limit(1)
        .single()
      if (data) {
        navigate(`/editor/${data.id}`)
      } else {
        // Show message: "Couldn't find a nootbook matching that title"
      }
    }
  } else {
    navigate(route)
  }
  
  // Also display the message in the chat
}
```

#### `[CREATE_REPO]` handler:
```typescript
if (content.startsWith('[CREATE_REPO]')) {
  const json = content.replace('[CREATE_REPO]', '').trim()
  const { title, description, visibility, tags, initial_blocks, message } = JSON.parse(json)
  
  // Insert into Supabase
  const { data: repo, error } = await supabase
    .from('repositories')
    .insert({
      title,
      description,
      visibility: visibility || 'private',
      tags: tags || [],
      owner_id: user.id,
    })
    .select('id')
    .single()
  
  if (repo && initial_blocks?.length) {
    // Save initial blocks via the backend API
    await fetch(`/api/repos/${repo.id}/docs/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: initial_blocks, title }),
    })
  }
  
  if (repo) {
    navigate(`/editor/${repo.id}`)
  }
  
  // Display the message in chat
}
```

### 3. Wire up `useNavigate` in the Noot chat component

The component that displays Noot responses needs access to `react-router`'s `useNavigate()`. Import it and pass it to the response handler.

### 4. Copy prompt to Backend directory

The prompt file exists in two locations (for Docker vs local dev). Make sure to copy to both:
- `gpt_prompts/noot_prompt.txt` (repo root)
- `Backend/gpt_prompts/noot_prompt.txt` (Docker)

---

## Key Files to Modify

| File | Change |
|------|--------|
| `gpt_prompts/noot_prompt.txt` | Add modes D (NAVIGATE) and E (CREATE_REPO) |
| `Backend/gpt_prompts/noot_prompt.txt` | Same — keep in sync |
| Frontend Noot chat component (likely in `pages/` or `components/`) | Parse `[NAVIGATE]` and `[CREATE_REPO]` markers, execute actions |

## Notes

- The Supabase `repositories` table schema should be checked before implementing the insert. Look at `MyRepos.tsx` for the existing `CreateRepoModal` pattern — reuse the same insert logic.
- The `__SEARCH:title__` pattern is a simple convention. The frontend resolves it by querying Supabase with `ilike`.
- No backend changes needed — the system prompt controls the model output format entirely.
- Test with: "create a nootbook called Quantum Mechanics", "go to my repos", "open my Linear Algebra notes"
