# SAC Frontend — Director Portal module

React + Vite. This isn't a standalone site — it's a **self-contained
module** meant to be merged into the co-director's homepage/member/
signup work on a separate branch, without touching a single file they
own.

## The integration surface — read this before merging

Everything the co-director needs to do is **three lines** in their own
`App.jsx`:

```jsx
import { AuthProvider } from "./shared/AuthContext";
import DirectorPortalApp from "./portal/DirectorPortalApp";
import DirectorPortalNavLink from "./portal/DirectorPortalNavLink"; // in their navbar

export default function App() {
  return (
    <AuthProvider>                                    {/* wrap once, at the top */}
      <Routes>
        <Route path="/" element={<HomePage />} />       {/* theirs */}
        <Route path="/login" element={<LoginPage />} /> {/* theirs */}
        <Route path="/member" element={<MemberPage />} />{/* theirs */}
        <Route path="/signup" element={<SignupPage />} />{/* theirs */}
        <Route path="/portal/*" element={<DirectorPortalApp />} /> {/* ours */}
      </Routes>
    </AuthProvider>
  );
}
```

That's it. `DirectorPortalApp` owns everything under `/portal/*` —
its own nested routes, its own layout, its own styling — and nothing
outside that prefix. `DirectorPortalNavLink` is a tiny component that
renders nothing at all for a non-director; drop it into their navbar
wherever nav links live instead of us shipping a competing navbar.

## Folder structure and why

```
src/
  shared/          Genuinely cross-cutting infrastructure — both
                    branches need this. AuthContext (session state),
                    RequireAuth (logged-in gate), apiClient (auth
                    endpoints: signup/login/whoami/me).
  portal/          Everything Director Portal-specific. Self-contained:
                    its own API client, its own route guards, its own
                    pages, its own scoped CSS. Nothing here assumes
                    anything about the rest of the app.
_dev_harness/       Throwaway local test scaffolding — a plain
                    placeholder homepage/login so this module can be
                    tested end-to-end before the real ones exist.
                    Delete this whole folder when merging; nothing in
                    src/ depends on it.
```

**Why `shared/` vs `portal/` matters for merging:** if the co-director's
branch and this one both touch `src/shared/AuthContext.jsx`, that's a
real (small, easy) merge to resolve together — it's supposed to be
shared. If their branch and this one both touch anything under
`src/portal/`, that's a bug, because nothing there should overlap with
what they're building. The folder boundary IS the merge-conflict
boundary, by design.

## Styling isolation

`portal.css` scopes every single rule under `.sac-portal` — no
selector touches `html`, `body`, or an unscoped class name, and every
CSS custom property is prefixed `--sac-*` and defined on `.sac-portal`
itself, not `:root`. Practically: importing `DirectorPortalApp`
cannot visually affect anything outside of it, whether or not the
co-director's CSS ever knows this file exists. `_dev_harness/`'s pages
deliberately use zero `sac-*` classes, to prove this in practice, not
just in theory.

## Brand colors — pulled from the actual club logo

Not a generic palette. Sampled from `SAC_Primary_Logo_Dark`:

| Token | Hex | From the logo |
|---|---|---|
| `--sac-orange-500` | `#E8720C` | The "SAC" lettering + scatter-plot dots/lines |
| `--sac-green-700` | `#1B4332` | The "UTD" lettering + bar-chart bars |
| `--sac-void` | `#0A0D0B` | Near-black background (logo is on white; darkened per brief) |

The signature UI element — the `.sac-node-badge` clearance indicator
(see `RoleBadge.jsx`) — is a filled dot connected by a short line,
directly echoing the logo's own connected-dot scatter-plot mark rather
than a generic pill/chip. It's meant to double as "your position on
the chart," tying the access-level concept back to the club's own
visual language instead of a decorative flourish.

## Setup (for local testing via the dev harness)

```bash
npm install
cp .env.example .env.local
npm run dev
```

Visit `http://localhost:5173`. Make sure Django is running at
`http://localhost:8000` and its `CORS_ALLOWED_ORIGINS` includes
`http://localhost:5173`.

## The IAM design

Three nested gates, all inside `portal/DirectorPortalApp.jsx`:

1. **`RequireAuth`** (`shared/RequireAuth.jsx`) — logged in at all,
   else -> `/login` (a real, top-level, shared route).
2. **`RequireDirector`** (`portal/guards.jsx`) — director/exec
   specifically, else -> `/portal/forbidden` (self-contained, doesn't
   need the rest of the app to define anything).
3. **`RequireSection`** (`portal/guards.jsx`) — has this exact section
   in their access list, else -> `/portal/forbidden`.

Every one of these is a UX courtesy, not the actual security boundary
— the matching backend enforcement (`portal.permissions.IsDirectorPortalUser`
plus each sub-app's own permission classes) is what actually stops a
request, independent of anything the frontend renders or hides.

## Testing

```bash
npm test
```

- `shared/tests/apiClient.test.js` — the `asList()` pagination-unwrapping
  helper (the same bug class that already broke `MarketingPage`/
  `RndPage` once during development before being caught and fixed).
- `portal/tests/RoleBadge.test.jsx` — badge rendering per role.
- `portal/tests/guards.test.jsx` — the actual IAM logic: mocks auth
  state to verify a member, an officer, a single-section director, and
  Exec each land exactly where they should.

These mock the auth state rather than hitting a real backend — that
guarantee is what the Django `portal/tests/` suite covers instead.
Between the two, the full path (frontend routing decision + backend
permission enforcement) is tested; neither alone would be enough.
