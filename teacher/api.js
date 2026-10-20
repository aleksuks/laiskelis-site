// PostgREST calls for the teacher's dashboard.
//
// A tenant on the Laiškelis Supabase project, not part of the app — see
// supabase/migrations/152_teacher.sql in the app repo. Same shape as
// kvizas/api.js: plain fetch, no supabase-js. The anon key is public by
// design; every teacher_ table has RLS on and no grants, so all it reaches
// is the RPCs, and every teacher RPC wants a session token.

const SUPABASE_URL = "https://zfphluadrxouxfxjejab.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmcGhsdWFkcnhvdXhmeGplamFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MDI4NjgsImV4cCI6MjEwODA3ODg2OH0.rbJCkqGZD9eG52GCm2won-4x9eDbU6xn704VfTk-LKE";

// Named database exceptions. A raw PostgREST error never reaches a screen.
const ERRORS = {
  teacher_denied: "Prisijunk iš naujo.",
  teacher_bad: "Kažkas ne taip su duomenimis. Perkrauk puslapį.",
  teacher_bad_url: "Nuoroda turi prasidėti https://",
  teacher_too_many: "Per daug įrašų.",
  teacher_student_denied: "Prisijunk iš naujo.",
  teacher_quiz_closed: "Testas baigtas.",
  teacher_quiz_live: "Dabar vyksta testas.",
  feedback_empty: "Parašyk bent į vieną laukelį.",
  feedback_closed: "Atsiliepimų rinkimas jau baigtas.",
  feedback_full: "Šį kartą atsakymų jau surinkta pakankamai.",
  feedback_denied: "Prisijunk iš naujo.",
};

// The 10-point scale, by share of correct answers (same as kvizas/). Tuning knob.
const GRADE_STEPS = [0.95, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.15];

function gradeFor(score, total) {
  const share = total ? score / total : 0;
  for (let i = 0; i < GRADE_STEPS.length; i++) {
    if (share >= GRADE_STEPS[i]) return 10 - i;
  }
  return 1;
}

const GENERIC_ERROR = "Nepavyko susisiekti. Patikrink internetą ir bandyk dar kartą.";

function apiError(code) {
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
    throw apiError(null);
  }

  if (!res.ok) {
    let payload = null;
    try {
      payload = await res.json();
    } catch (e) {
      /* non-JSON error body */
    }
    const raw = (payload && payload.message) || "";
    for (const code of Object.keys(ERRORS)) {
      if (raw === code) throw apiError(code);
    }
    throw apiError(null);
  }

  if (res.status === 204) return null;
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
}
