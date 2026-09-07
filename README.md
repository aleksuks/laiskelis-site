# laiskelis.lt

The public website for **„Laiškelis“** — the landing page, the legal pages
(privacy, terms, support, CSAE standards, account deletion), the two pages
the app deep-links to from auth emails (`verified.html`,
`reset-password.html`), the project story, and the classroom feedback board
at `/feedbackas`.

Plain static HTML. No build step, no dependencies, nothing to install.
Deployed by Netlify from the root of `main`.

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

`/feedbackas` is a separate, much smaller product that shares this domain
and the app's Supabase project without touching any of its data. Its schema
lives in the app repo (`supabase/migrations/086_feedbackas.sql`) and the
rules that keep it disconnected are written down there. The Supabase anon
key in `feedbackas/api.js` is public by design — it is the same key that
ships inside the app bundle, and every table it can reach is protected by
row-level security rather than by the key being secret.

## Licence

Content and artwork © Aleksandras Abrutis. The App Store badge is Apple's
own artwork, used unaltered under their marketing guidelines.
