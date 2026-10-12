// PostgREST calls for the birthday game.
//
// A tenant on the Laiškelis Supabase project, not part of the app — see
// supabase/migrations/147_party_game.sql in the app repo. Same shape as
// feedbackas/api.js: plain fetch, the public anon key, named errors.

const SUPABASE_URL = "https://fuskxhhwkanenwmmoytu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2t4aGh3a2FuZW53bW1veXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MDQyMTQsImV4cCI6MjA5ODM4MDIxNH0.zpfGW8G5kx5UVmVA-ypC_vZoFd5KnG1UTAyaDt9c6dw";

const ERRORS = {
  party_name_empty: "Įrašyk vardą.",
  party_none: "Žaidimas dar neprasidėjo.",
  party_started: "Žaidimas jau prasidėjo.",
  party_full: "Vietų nebėra.",
  party_gone: "Žaidimas baigėsi.",
  party_round_over: "Laikas baigėsi.",
  party_bad_step: "Tuščia.",
  party_denied: "Neteisingas raktas.",
  party_too_few: "Reikia bent dviejų žaidėjų.",
  party_photos_short: "Nuotraukų mažiau nei žaidėjų.",
};

const GENERIC_ERROR = "Nėra ryšio. Bandyk dar kartą.";

class RpcError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code || null;
  }
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
    throw new RpcError(GENERIC_ERROR, "network");
  }

  if (!res.ok) {
    let payload = null;
    try {
      payload = await res.json();
    } catch (e) {
      /* fall through */
    }
    const raw = (payload && (payload.message || payload.hint)) || "";
    for (const code of Object.keys(ERRORS)) {
      if (raw.indexOf(code) !== -1) throw new RpcError(ERRORS[code], code);
    }
    throw new RpcError(GENERIC_ERROR, "server");
  }

  if (res.status === 204) return null;
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
}

const MONTHS = [
  "sausis", "vasaris", "kovas", "balandis", "gegužė", "birželis",
  "liepa", "rugpjūtis", "rugsėjis", "spalis", "lapkritis", "gruodis",
];

function formatDate(year, month) {
  if (!year) return "";
  return month ? year + " m. " + MONTHS[month - 1] : year + " m.";
}

// Keeps a phone or the laptop from dimming mid-round. Not available
// everywhere and released by the browser when the tab hides, so it is
// re-requested whenever the page comes back.
function keepAwake() {
  let lock = null;
  async function request() {
    try {
      if ("wakeLock" in navigator && document.visibilityState === "visible") {
        lock = await navigator.wakeLock.request("screen");
      }
    } catch (e) {
      /* not allowed here; harmless */
    }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") request();
  });
  request();
}
