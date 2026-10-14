# Teacher dashboard — build brief

Owner: the founder, who is also the teacher. Lithuanian UI, English code and
comments. Read `README.md` first, then `kvizas/` (the existing quiz, whose old
data may be wiped) and `feedbackas/` for house style. Plain static HTML/JS, no
build step, hosted on GitHub Pages (so **no data in this repo, ever**).
Backend is the shared Supabase project; migrations live in the app repo
(`E:\letters-app\supabase\migrations`, numbered, check all branches first).

## Hard rules
- **Tenant.** Tables prefixed `teacher_*`. No FKs/triggers into the letters
  schema or back, droppable in one statement, invisible to app stats, pushes,
  moderation. Keep the app repo's tenant rules (CLAUDE.md "Tenants").
- **Assume the client is curl.** The anon key is public. RLS on every table;
  no `FOR ALL` policies; column access by REVOKE/GRANT; RPCs `SECURITY
  DEFINER` with pinned `search_path`, `REVOKE ALL FROM PUBLIC, anon`, then
  grant only what is needed.
- **Student data is private** (minors; full names, results, behaviour notes).
  Only the teacher reads all of it. A student reads only their own rows.
  Never expose other students' grades, notes or PINs. Pages are `noindex`.
- **Auth.** No email. Teacher logs in with one passcode; students with full
  name + PIN. Implement as RPCs that verify a hash (pgcrypto `crypt`) and
  return a session token the pages keep in `sessionStorage`/`localStorage`.
  The passcode is **never written to the repo or a migration**; the founder
  sets it in the backend by hand (reset = same). Rate-limit and lock out
  repeated failures (per name, and for the teacher globally). Minimum 8 chars.
- **Student PINs:** random, unique across the whole system so name + PIN
  always resolves to one student; the student may change it (still unique).
  Teacher can regenerate. Store hashed.
- **Load.** Supabase log ingestion is already over quota. Polling: 3 s, only
  while a quiz is live, paused on hidden tabs, none otherwise. No
  per-second polling, no `console.log` noise.
- Never show a raw Supabase error; friendly Lithuanian message.

## Pages
- `/teacher/` — teacher dashboard (passcode gate).
- `/mokinys/` — student page (QR/link). Full name + PIN, then: the quiz of
  the day if one is started, otherwise their stats. No phones otherwise.
- Existing `/feedbackas` keeps its URL (printed QR codes). `/kvizas` is
  superseded or kept working; old quiz data may be wiped. `/birthday` stays
  separate and dormant.

## Teacher dashboard
1. **Pick a class first.** Everything below loads for that class. The class
   list is created by pasting names once, one per line (first name + last
   name initial shown on screen when there are duplicates; full name stored).
2. **Buttons row:**
   - **Drive** — one link per class, opens that class's Google Drive folder
     (the user is logged in to Drive themselves). Editable in the UI.
   - **Wheel** — spins and reveals a random student. A picked name is removed
     from the wheel for that opening only; all names return on the next open.
   - **Display** — big full-screen text box for projecting anything (the
     current task). Text persists per class until changed.
   - **Quiz** — lists the quizzes for that class's grade with a short
     description; start/stop one. A grade-8 quiz already exists, keep it.
   - **Feedback** — link to the `/feedbackas` teacher page.
3. **Student bubbles** (the live area with every student's name):
   - Drag to **Pagyrimas** (praise, one type) or **Pastaba** (two types, by
     icon: *sleeping* = ignoring the work; *disruptive* = may be working, but
     disrupting the class). Middle area = nothing.
   - **+1 point** for active work, repeatable; visible to the students on
     screen during the lesson.
   - **X** on a bubble removes a non-participating student from the current
     session view only (not from the class).
   - Every pagyrimas/pastaba/point is logged with date and accumulates in the
     student's history. Only the teacher sees pagyrimas/pastaba; students see
     points and quiz results.

## Quizzes
- Each quiz has a **skill/category** (topic). Skills are what students'
  stats are grouped by. Quizzes are authored over the year; seed the
  existing grade-8 one.
- **Live board** (public to the class, projected): per student name,
  progress bar, speed, and an emoji the student picks for how it feels.
  **Grades/scores are never on the board.**
- **Private on the student's phone:** milestone pings when their running
  result passes 50%, 70%, 90%.
- Results are stored per student per quiz per question (time + correct), so
  history, skill stats and speed can be derived.

## Student page (`/mokinys/`)
- Login: full name, spelled right, + PIN.
- Quiz started → show it. Nothing started → their **stats**: as much as
  useful — per-skill accuracy over time, speed, quizzes taken, streaks,
  strongest/weakest skill, points collected. Open a skill for detail.

## Data model (sketch, adjust)
`teacher_classes`, `teacher_students` (class, full_name, pin_hash),
`teacher_events` (student, kind: praise/note_sleep/note_disrupt/point, at),
`teacher_quizzes` (grade, skill, title, description, questions jsonb),
`teacher_quiz_runs` (quiz, class, started_at, status),
`teacher_answers` (run, student, question, correct, ms), `teacher_settings`
(class drive link, display text), `teacher_auth` (passcode hash, lockout).
No author/device columns anywhere student-facing.

## Progress
- **Slice 1 (migration 152, `teacher/`):** passcode login, classes by
  pasted names, tray (Drive, Ratas, Ekranas, Atsiliepimai), magnets: tap =
  +1 point, drag to Pagyrimas / Pastaba (Zzz = nedirba, garsiakalbis =
  trukdo), × = not here this visit. Keyboard on a focused magnet: Enter +1,
  P pagyrimas, M nedirba, T trukdo, Delete nėra.
- **Slice 2 (migration 153, `teacher/` + `mokinys/`):** Testas (quizzes
  for the class's grade, start/stop, live board with name, progress,
  seconds per question and mood, never scores; CSV with grades after it
  ends), PIN kodai (issue missing, reset one, print; shown only when made),
  student page: name + PIN, mood, the quiz (kvizas player), private 50/70/90%
  pings, result, stats (points, quizzes, speed, best streak, skills with
  per-quiz bars, strongest/weakest, skill detail), new random PIN.
- **PINs** are 5 random digits, HMAC'd under a server secret (not bcrypt, so
  system-wide uniqueness is an index). Students can't pick their own: that
  would let them probe which PINs exist.
- **Next:** authoring quizzes (today: by migration), removing/renaming
  students, a teacher view of one student's history.

## Mokytojui: slaptažodis
Supabase → SQL Editor:

    SELECT teacher_set_passcode('naujas-slaptažodis');

Mažiausiai 8 simboliai. Tas pats ir slaptažodžiui pakeisti: visi
prisijungę įrenginiai atjungiami. Po 10 neteisingų bandymų prisijungimas
užrakinamas 15 minučių.

## Done means
Migrations pushed and verified via PostgREST (`42501` = exists and locked
down), pages deployed to `main`, a short Lithuanian note for the teacher on
how to reset the passcode and issue PINs. Test with throwaway rows and delete
them; do not leave fake data in production.
