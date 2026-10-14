// Shared PostgREST calls for the classroom quiz.
//
// This directory is a tenant on the Laiškelis Supabase project, not part
// of the app — see supabase/migrations/151_quiz.sql. Same shape as
// feedbackas/api.js: plain fetch, no supabase-js.
//
// The anon key below is public by design (it ships inside the app bundle
// too). Every quiz_ table has RLS on with no policies; all it can do here
// is what the migration grants.

const SUPABASE_URL = "https://fuskxhhwkanenwmmoytu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2t4aGh3a2FuZW53bW1veXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MDQyMTQsImV4cCI6MjA5ODM4MDIxNH0.zpfGW8G5kx5UVmVA-ypC_vZoFd5KnG1UTAyaDt9c6dw";

// Named database exceptions. A raw PostgREST error never reaches a screen.
const ERRORS = {
  quiz_name_empty: "Įrašyk vardą.",
  quiz_name_taken: "Toks vardas jau yra. Pridėk pavardę.",
  quiz_none: "Testas dar neatidarytas.",
  quiz_full: "Vietų nebėra.",
  quiz_closed: "Testas baigtas.",
  quiz_gone: "Testas baigtas.",
  quiz_denied: "Neteisingas raktas.",
};

const GENERIC_ERROR = "Nepavyko susisiekti. Patikrink internetą ir bandyk dar kartą.";

function quizError(code) {
  const e = new Error(ERRORS[code] || GENERIC_ERROR);
  e.code = code || null;
  return e;
}

async function rpc(name, body) {
  let res;
  try {
    res = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body || {}),
    });
  } catch (e) {
    throw quizError(null);
  }

  if (!res.ok) {
    let payload = null;
    try {
      payload = await res.json();
    } catch (e) {
      /* non-JSON error body */
    }
    const raw = (payload && (payload.message || payload.hint)) || "";
    for (const code of Object.keys(ERRORS)) {
      if (raw.indexOf(code) !== -1) throw quizError(code);
    }
    throw quizError(null);
  }

  if (res.status === 204) return null;
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
}

// The 10-point scale, by share of correct answers. Tuning knob.
const GRADE_STEPS = [0.95, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.15];

function gradeFor(score, total) {
  const share = total ? score / total : 0;
  for (let i = 0; i < GRADE_STEPS.length; i++) {
    if (share >= GRADE_STEPS[i]) return 10 - i;
  }
  return 1;
}
