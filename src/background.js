// background.js — receives accepted submissions from content.js and commits them.
// Shared GitHub helpers live in github.js (loaded first by the manifest on Firefox,
// via importScripts on Chrome).
if (typeof importScripts === "function") importScripts("github.js");

const EXT = {
  python: "py", python3: "py", pythondata: "py", java: "java", cpp: "cpp", c: "c",
  csharp: "cs", javascript: "js", typescript: "ts", php: "php", swift: "swift",
  kotlin: "kt", dart: "dart", golang: "go", ruby: "rb", scala: "scala", rust: "rs",
  racket: "rkt", erlang: "erl", elixir: "ex", mysql: "sql", mssql: "sql",
  oraclesql: "sql", postgresql: "sql", pandas: "py", bash: "sh"
};

const COMMENT = {
  py: "#", rb: "#", sh: "#", ex: "#", sql: "--", erl: "%", rkt: ";"
}; // everything else uses //

function slugify(s) {
  return String(s || "untitled").toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s-]+/g, "-");
}

// The payload comes from a script running inside the LeetCode page, so any other
// script on leetcode.com could forge one. Treat every field as untrusted.
function sanitize(p) {
  const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
  const number = /^\d{1,5}$/.test(str(p.number, 5)) ? p.number : null;
  const difficulty = ["Easy", "Medium", "Hard"].includes(p.difficulty) ? p.difficulty : null;
  const lang = Object.prototype.hasOwnProperty.call(EXT, p.lang) ? p.lang : null;
  const slug = /^[a-z0-9-]{1,120}$/.test(str(p.slug, 120)) ? p.slug : null;
  return {
    number, difficulty, lang, slug,
    title: str(p.title, 200).replace(/[\r\n]/g, " ") || slug || "untitled",
    code: str(p.code, 200000),
    runtime: str(p.runtime, 40).replace(/[\r\n]/g, " ") || null,
    memory: str(p.memory, 40).replace(/[\r\n]/g, " ") || null
  };
}

function buildPath(st, p) {
  const ext = EXT[p.lang] || "txt";
  const num = p.number ? p.number.padStart(4, "0") : "0000";
  const name = `${num}-${p.slug ? slugify(p.slug) : slugify(p.title)}.${ext}`;
  const parts = [];
  if (st.folder) parts.push(st.folder.replace(/^\/+|\/+$/g, ""));
  if (st.byDifficulty && p.difficulty) parts.push(p.difficulty.toLowerCase());
  parts.push(name);
  return parts.join("/");
}

function buildContent(st, p) {
  if (st.header === false) return p.code;
  const ext = EXT[p.lang] || "txt";
  const c = COMMENT[ext] || "//";
  const lines = [
    `${c} ${p.number ? p.number + ". " : ""}${p.title}`,
    p.difficulty ? `${c} Difficulty: ${p.difficulty}` : null,
    `${c} https://leetcode.com/problems/${p.slug}/`,
    p.runtime || p.memory ? `${c} Runtime: ${p.runtime || "n/a"} | Memory: ${p.memory || "n/a"}` : null
  ].filter(Boolean);
  return lines.join("\n") + "\n\n" + p.code.replace(/\s+$/, "") + "\n";
}

async function handleAccepted(raw) {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Bad submission data." };
  const p = sanitize(raw);
  if (!p.slug || !p.lang) return { ok: false, error: "Couldn't identify this problem or language." };
  const st = await getSettings();
  if (!st.token || !st.owner || !st.repo) {
    return { ok: false, error: "Not set up yet — open the extension's settings." };
  }
  if (!p || typeof p.code !== "string" || !p.code.trim()) {
    return { ok: false, error: "No code captured for this submission." };
  }

  const path = buildPath(st, p);
  const message = `${p.number ? p.number + ". " : ""}${p.title}` +
    (p.runtime || p.memory ? ` (${[p.runtime, p.memory].filter(Boolean).join(", ")})` : "");

  try {
    const r = await commit(st, path, buildContent(st, p), message);
    await api.storage.local.set({ lastSync: { path, title: p.title, at: Date.now(), skipped: r.skipped } });
    return { ok: true, path, skipped: r.skipped };
  } catch (e) {
    api.notifications.create({
      type: "basic",
      iconUrl: api.runtime.getURL("icons/icon-48.png"),
      title: "Tally: sync failed",
      message: e.message
    });
    return { ok: false, error: e.message };
  }
}

api.runtime.onInstalled.addListener((d) => {
  if (d.reason === "install") api.tabs.create({ url: api.runtime.getURL("setup.html") });
});

// Respond via sendResponse + `return true`: the one pattern both Chrome and Firefox support.
api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== "ACCEPTED") return false;
  // Only accept submissions relayed from our own content script on leetcode.com.
  if (!sender.tab || !sender.url || !sender.url.startsWith("https://leetcode.com/")) return false;
  handleAccepted(msg.payload).then(sendResponse, (e) => sendResponse({ ok: false, error: e.message }));
  return true;
});
