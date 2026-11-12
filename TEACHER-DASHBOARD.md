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
- **Art, motion, sound (2026-10-15):** painted with the app repo's ui-art
  engine (`scripts/ui-art/teacher_*.py`, brief `TEACHER-ART.md` there),
  copied into `teacher/art/` by `teacher_export.py`. `teacher/art.css` is the
  painted layer over `style.css` (both pages load it). Motion: magnets drop
  onto the board, an eraser wipes it on class change, full screens roll down
  like a projector screen, a coin flips up on +1, emblems stamp on a drop,
  confetti when the wheel lands or a grade is 8+, milestone stickers slap
  onto the student's phone, mood faces boil. All off under reduced motion.
  `teacher/sound.js`: synthesized Web Audio (no files), per-device on/off
  (Garsas). A note (Pastaba) is silent on purpose: the board may be projected.
- **PINs** are 5 random digits, HMAC'd under a server secret (not bcrypt, so
  system-wide uniqueness is an index). Students can't pick their own: that
  would let them probe which PINs exist.
- **Lygiai (2026-11-11, tray, no migration):** the teacher ticks rules
  (`skill`, newest test first; the newest test day is pre-ticked), then every
  student's level in them is projected as potted plants: seed, sprout, bud,
  bloom from the share right in the student's latest test of that rule
  (`SK_STAGES`), an empty outline if never tried. A droplet marks the one
  rule to repeat first, an arrow a stage gained against their own earlier
  test. Since 241 a plant grows toward its student's own goal, not toward
  10 (`SK_STAGES` are parts of the way there), so two plants in bloom may
  stand for different marks. Reads `teacher_class_progress`. This is the one deliberate exception
  to "no results on the projected board" (the teacher's call): so no numbers,
  grades or ranking on it, alphabetical order, magnets taken off with × are
  left out.
- **Flowers (2026-11-11, 242):** the plants are painted (letters-app
  `scripts/ui-art/teacher_flowers.py`, exported to `teacher/art/`): twelve
  kinds (`SK_KINDS` in `teacher/plants.js`), each in four stages
  (`flower-<kind>-<1..4>.png`), standing in a pot per rule colour
  (`pot-<i>.png`, the order of `SK_COLOURS`; `pot-empty.png` = not tried).
  Two layers on one 100 x 150 frame, the pot over the flower's foot. Every
  student picks their kind under "Mano gėlė" on /mokinys
  (`teacher_student_flower_set`, any time, not guests); stored in
  `teacher_students.flower` and returned by `teacher_stats_of`. Until they
  pick, `skKind()` derives one from their id. Their own rule cards on
  /mokinys use it too. New kinds are appended, never reordered (the index
  is the stored id), and the RPC's bound goes up with them.
- **A student's garden (2026-11-12, no migration):** tap a student's card on
  the Lygiai board (or "Gėlės" under a student in Mokiniai) to see every
  rule the class has done as that student's garden, oldest rule first. Each
  rule is its own flower and pot, the same in every student's garden (rule
  i = kind i of `SK_KINDS`, pot i of `SK_COLOURS`), so a flower stands for a
  rule; never-tried rules are empty pots. Stage words only, no numbers or
  goals, so it can be projected. "Atgal" returns to the board or Mokiniai.
- **Tray regrouped (2026-11-11, no migration):** the tray holds only what is
  used with the class on the big screen, one tap each: Ratas, Ekranas,
  Testas, Žaidimai (a card per game: Žodžių poros, Piešiu ir spėju), Lygiai,
  Atsiliepimai; then the eraser (Visi į vidurį) and **Meniu**, one card with
  three headings: the class (Mokiniai, PIN kodai, Pažymiai, Įsivertinimas,
  Pamokos, Drive), Planas (Rytoj, Visos klasės) and Įrenginys (sound,
  Išeiti). A new tool goes on the tray only if the class watches it;
  anything else is a line in the menu.
- **Own goals, small marks and the +1 (2026-11-11, migration 241 in the school
  folder's `school-db/`):** the learning format from here on.
  - *Goal.* Each student rates their level now and the level they want
    (1–10, `teacher_self_levels`); the wanted level is their goal. They
    answer on /mokinys once ("Mano tikslas", `teacher_student_self_set`) or
    the teacher enters it in Įsivertinimas; after that only the teacher
    changes it (clearing it reopens the question on the phone).
  - *Levels are shown against the goal, never against 10.* `goalNeed(goal)`
    in `api.js` is the share of right answers that mark takes on
    `GRADE_STEPS`. Lygiai, the rule cards and result line on /mokinys, the
    recap's "known" line (`insights.js`) and the parent PDF all use it; no
    goal yet = the old fixed lines. **Marks are never rescaled**, and goals
    never go on the projected board.
  - *The +1* (`teacher_plus`, `teacher_plus_give` / `_take` / `_use`): given
    for a good answer to a complicated question; the student adds it to one
    atsiskaitymas grade (one per grade, 10 at most). It is a row pointing at
    the column, never a change to the stored mark: Pažymiai shows a dashed
    "+1" beside a mark while the student has one to use, "+1 → 8" once
    used (`gbFinal`, the TAMO grade). A mark cleared or made a 10, or a
    deleted column, gives it back. /mokinys shows "Turiu +1" with the count.
  - *Pažymiai* (was Kaupiamieji). Besides the +1, two kinds of marks: an
    atsiskaitymas is a
    column (`teacher_gb_cols`, a full grade for TAMO); a small mark
    (`teacher_small_marks`) is given to one student whenever, for that
    lesson's work, tied to no skill, column or lesson. Every `GB_K` (3) of a
    student's small marks, in the order given, average into a K. "Kam
    trūksta mažų" sorts by the count, fewest first: that student works
    today. The count is the teacher's, not the board's.
  - *Pasiekta* in Visos klasės is `teacher_classes.plan_at`: click a lesson
    in a class's bar; a filled atsiskaitymas moves it forward by itself.
- **Student page, the stats screen (2026-11-11, no migration):** the page a
  student shows at home, read top to bottom: the goal, "Testų pažymiai"
  (every test's real mark in order, the goal as a dashed line, tap a dot for
  the test), then a card per rule with the same plant as Lygiai
  (`teacher/plants.js`, shared by both pages), the verdict in words, the
  latest mark and a bar of right answers with a tick at the goal. A card
  opens to every attempt, the rule itself (or a review test part by part)
  and Pasikartok. "Kaip skaityti?" is the key; "Visi testai" the full list.
  A rule's level is its **latest** test against the goal, as in Lygiai and
  the parent PDF (it was the average mark before). Atsiskaitymas and small
  marks are still not on this page: `teacher_stats_of` doesn't send them.
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
