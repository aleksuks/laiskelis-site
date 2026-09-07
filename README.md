# laiskelis.lt

The public website for **„Laiškelis“** — the landing page, the legal pages
(privacy, terms, support, CSAE standards, account deletion), the two pages
the app deep-links to from auth emails (`verified.html`,
`reset-password.html`), the project story, and the classroom feedback board
at `/feedbackas`.

Plain static HTML. No build step, no dependencies, nothing to install.
Served by GitHub Pages from the root of `main`.

## Why this is its own repo

The site used to live in the app's private repo, as its `docs/` folder, and
was deployed from there. That is what made it expensive: the app repo takes
around a hundred pushes a month and the site changes in maybe eight of them,
but a host watching that repo rebuilds on every push regardless — and it
rebuilds a React Native tree, because that is what the repo looks like from
the outside. Ninety-odd deploys a month of an unchanged 1.7 MB of HTML is
what burned through a free tier.

Splitting the site out fixes that at the root rather than with build
filters: a deploy happens when the site changes, because nothing else is
in here to change.

The app repo keeps its `docs/` folder for the internal engineering notes
(the store-release checklist, the moderation checklist, the accessibility
audit, the dated decision notes). Those were being served publicly by
accident — linked from nowhere, but fetchable — and now they are not.

## Deploying

Push to `main`. That is the whole procedure.

`.nojekyll` disables Jekyll, since none of this needs processing.
`CNAME` holds the custom domain and must survive any reorganisation —
deleting it un-sets the domain in the repository settings.

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
