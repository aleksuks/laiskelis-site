// Shared PostgREST calls for the classroom feedback board.
//
// This directory is a tenant on the Laiškelis Supabase project, not part
// of the app — see supabase/migrations/086_feedbackas.sql. Nothing here
// imports supabase-js: six RPCs over fetch is smaller than the client
// library, and these pages must work on a school phone with one bar.
//
// The anon key below is public by design. It is the same key that ships
// inside the app bundle, it identifies the project rather than a person,
// and every table it can reach through these calls has RLS on with no
// policies. All it can do here is the six things the migration grants.

const SUPABASE_URL = "https://fuskxhhwkanenwmmoytu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2t4aGh3a2FuZW53bW1veXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MDQyMTQsImV4cCI6MjA5ODM4MDIxNH0.zpfGW8G5kx5UVmVA-ypC_vZoFd5KnG1UTAyaDt9c6dw";

// Named database exceptions, in Lithuanian, for the two screens. Anything
// not in here is a network or server problem and gets the generic line —
// a raw PostgREST error must never reach a fourteen-year-old's screen.
const ERRORS = {
  feedback_empty: "Parašyk bent į vieną laukelį.",
  feedback_closed: "Atsiliepimų rinkimas jau baigtas.",
  feedback_full: "Šį kartą atsakymų jau surinkta pakankamai.",
  feedback_denied: "Neteisingas raktas.",
};

const GENERIC_ERROR = "Nepavyko susisiekti. Patikrink internetą ir bandyk dar kartą.";

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
    // Offline, DNS, captive portal: fetch throws rather than resolving.
    throw new Error(GENERIC_ERROR);
  }

  if (!res.ok) {
    let payload = null;
    try {
      payload = await res.json();
    } catch (e) {
      /* non-JSON error body; fall through to the generic line */
    }
    const raw = (payload && (payload.message || payload.hint)) || "";
    for (const code of Object.keys(ERRORS)) {
      if (raw.indexOf(code) !== -1) throw new Error(ERRORS[code]);
    }
    throw new Error(GENERIC_ERROR);
  }

  if (res.status === 204) return null;
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
}
