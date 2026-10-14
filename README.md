# laiskelis.lt

This repo is the whole of **laiskelis.lt**, and it now has two jobs.

1. **The public site for „Laiškelis“** — the landing page, the legal pages
   (privacy, terms, support, CSAE standards, account deletion), the two pages
   the app deep-links to from auth emails (`verified.html`,
   `reset-password.html`) and the project story. On the surface this is all a
   visitor sees.
2. **The teacher's dashboard** — the founder's everyday classroom workspace
   (the founder is also a teacher): reference docs, in-class tools, quizzes and
   classroom management, living under one teacher-only area of the same
   domain. It grew out of the small classroom tenants that already ship from
   here (the feedback board at `/feedbackas`, the quiz, the party game) and
   is expected to be a bigger, continuous project than any of them.

Plain static HTML. No build step, no dependencies, nothing to install.
Served by GitHub Pages from the root of `main`.

## The teacher's dashboard

**Purpose.** One place to open at the start of a lesson and leave open all
day: the docs I keep reaching for, tools to run in front of the class, quizzes
to launch, and classroom management at the side (add a student to the good
list, spin a wheel to pick someone at random, and so on).

**Not Laiškelis.** The dashboard is a separate product that happens to share
a domain, a repo and a Supabase project. The rules in the app repo's
`CLAUDE.md` ("Tenants") apply to it in full:

- Nothing in it reads or writes the letters schema, and nothing in the letters
  schema knows it exists. Its tables (if any) carry their own prefix, have no
  foreign keys or triggers across the line, and can be dropped in one
  statement.
- It never appears in the app, in the app's stats, pushes, leaderboard or
  moderation, and the app's keyword gate does not run on it.
- No link to it from the public pages; `noindex` on every dashboard page.

**Students are children, and their names are personal data.** None of it goes
in this repo: GitHub Pages is public. It lives in the shared Supabase project
in `teacher_*` tables behind row-level security, readable by the teacher and,
for their own rows, by each student. Students log in at `/mokinys/` with full
name and a personal PIN; no email, no analytics. The build brief is
`TEACHER-DASHBOARD.md`.

**Access.** One teacher passcode, hashed in the backend and never written to
the repo; reset by hand in the backend. The URL-fragment key of
`feedbackas/mokytojui.html` is not used here, because the school PC and the
laptop are not reliable about remembering it.

**Layout.** Everything for the dashboard goes under `/teacher/` and
`/mokinys/` (to be created); the existing `/feedbackas` stays where it is because printed QR
codes point at it. Same rules as the rest of the repo: plain static HTML, no
build step, no dependencies without a reason written down here.

**Where decisions live.** Product decisions go in `decisions.md` in the app
repo, as for everything else on this domain; this README records only what a
person working in this repo needs.

## Why this is its own repo

The site used to live in the app's private repo, as its `docs/` folder, and
was deployed from there. That is what made it expensive, and the host had
nothing to do with it: the app repo takes around a hundred pushes a month
and the site changes in maybe eight of them, but a host watching that repo
rebuilds on every push regardless of what moved — and it rebuilds a React
Native tree, because that is what the repo looks like from the outside.
Ninety-odd deploys a month of an unchanged 1.7 MB of HTML is what burned
through a month of free build minutes.

Splitting the site out fixes that at the root rather than with build
filters: a deploy happens when the site changes, because nothing else is
in here to change. Eight builds a month of a folder with no package.json
in it costs nothing anywhere, which is why moving hosts turned out to be
unnecessary once the repo was split.

The app repo keeps its `docs/` folder for the internal engineering notes
(the store-release checklist, the moderation checklist, the accessibility
audit, the dated decision notes). Those were being served publicly by
accident — linked from nowhere, but fetchable — and now they are not.

## Deploying

Push to `main`. That is the whole procedure.

`netlify.toml` says the publish directory is the repo root and there is no
build command; it lives here rather than in the Netlify dashboard so the
setting is recorded somewhere a person reading this repo can find it.

`CNAME` is a GitHub Pages leftover from before the split. Netlify ignores
it and it is left in place deliberately — it documents which domain this
repo is, and it is what would re-configure Pages automatically if this ever
needed to move again in a hurry.

## The feedback board

`/feedbackas` is the first of the classroom tenants, and now part of the dashboard's family. It is a separate, much smaller product that shares this domain
and the app's Supabase project without touching any of its data. Its schema
lives in the app repo (`supabase/migrations/086_feedbackas.sql`) and the
rules that keep it disconnected are written down there. The Supabase anon
key in `feedbackas/api.js` is public by design — it is the same key that
ships inside the app bundle, and every table it can reach is protected by
row-level security rather than by the key being secret.

## Licence

Content and artwork © Aleksandras Abrutis. The App Store badge is Apple's
own artwork, used unaltered under their marketing guidelines.
