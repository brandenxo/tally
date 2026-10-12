// github.js — shared GitHub logic, loaded by the background script AND by the
// setup and settings pages, so those pages can talk to GitHub directly
// (no message passing to the background, which is what failed on Firefox).

const api = globalThis.browser ?? globalThis.chrome; // Firefox: browser.*, Chrome: chrome.*

const API = "https://api.github.com";

async function getSettings() {
  return api.storage.local.get(["token", "owner", "repo", "branch", "folder", "byDifficulty", "header"]);
}

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function b64decode(b64) {
  const bin = atob(String(b64).replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
}

async function gh(st, path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      Authorization: `Bearer ${st.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.body ? { "Content-Type": "application/json" } : {})
    }
  });
  return res;
}

function encodePath(p) {
  return p.split("/").map(encodeURIComponent).join("/");
}

async function commit(st, path, content, message) {
  const base = `/repos/${encodeURIComponent(st.owner)}/${encodeURIComponent(st.repo)}/contents/${encodePath(path)}`;
  const ref = st.branch ? `?ref=${encodeURIComponent(st.branch)}` : "";

  let sha;
  const existing = await gh(st, base + ref);
  if (existing.status === 200) {
    const j = await existing.json();
    sha = j.sha;
    try {
      if (j.content && b64decode(j.content) === content) return { skipped: true };
    } catch (_) { /* fall through and overwrite */ }
  } else if (existing.status !== 404) {
    throw new Error(`GitHub ${existing.status}: ${(await existing.text()).slice(0, 200)}`);
  }

  const body = { message, content: b64encode(content) };
  if (sha) body.sha = sha;
  if (st.branch) body.branch = st.branch;

  const res = await gh(st, base, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return { skipped: false };
}

async function testConnection(st) {
  if (!st.token || !st.owner || !st.repo) return { ok: false, error: "Fill in token, owner and repo first." };
  const res = await gh(st, `/repos/${encodeURIComponent(st.owner)}/${encodeURIComponent(st.repo)}`);
  if (res.status === 404) return { ok: false, error: "Repo not found, or the token can't see it." };
  if (res.status === 401) return { ok: false, error: "Token is invalid or expired." };
  if (!res.ok) return { ok: false, error: `GitHub ${res.status}` };
  const j = await res.json();
  if (j.permissions && j.permissions.push === false) return { ok: false, error: "Token can read this repo but can't write to it." };
  return { ok: true, fullName: j.full_name, defaultBranch: j.default_branch, private: j.private };
}

const TEMPLATE_FILES = [
  ["templates/readme-script.txt", "scripts/update_readme.py", "Add README progress script"],
  ["templates/README.md", "README.md", "Add README"],
  ["templates/update-readme.yml", ".github/workflows/update-readme.yml", "Add workflow to keep README current"]
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function commitWithRetry(st, path, content, message) {
  // A just-created repo can take a moment before its first branch is readable.
  let lastErr;
  for (let i = 0; i < 6; i++) {
    try { return await commit(st, path, content, message); }
    catch (e) { lastErr = e; await wait(1000 * (i + 1)); }
  }
  throw lastErr;
}

async function getFileText(st, path) {
  const ref = st.branch ? `?ref=${encodeURIComponent(st.branch)}` : "";
  const res = await gh(st, `/repos/${encodeURIComponent(st.owner)}/${encodeURIComponent(st.repo)}/contents/${encodePath(path)}${ref}`);
  if (res.status !== 200) return null;
  try { return b64decode((await res.json()).content); } catch { return null; }
}

// Adds README / script / workflow. Never throws for a single file: reports what happened instead.
async function addStarterFiles(st) {
  const added = [], skipped = [], warnings = [];
  for (const [src, dest, message] of TEMPLATE_FILES) {
    const text = await (await fetch(api.runtime.getURL(src))).text();

    if (dest === "README.md") {
      const existing = await getFileText(st, dest);
      // Keep a README the user clearly wrote themselves.
      if (existing && !existing.includes("STATS:START") && existing.trim().length > 400) {
        skipped.push("README.md (you already have one, so I left it alone)");
        continue;
      }
    }

    try {
      const r = await commitWithRetry(st, dest, text, message);
      (r.skipped ? skipped : added).push(dest + (r.skipped ? " (already up to date)" : ""));
    } catch (e) {
      if (dest.startsWith(".github/workflows/") && /workflow|403|404/i.test(e.message)) {
        warnings.push("Couldn't add the auto-update workflow. Your token needs the 'Workflows: Read and write' permission. " +
          "Everything else was added, and the README table will still update if you run the script yourself.");
      } else {
        warnings.push(`Couldn't add ${dest}: ${e.message}`);
      }
    }
  }
  return { added, skipped, warnings };
}

// Token path: the user already made the repo and a token; we fill the repo in.
async function setupExisting() {
  const st = await getSettings();
  const test = await testConnection(st);
  if (!test.ok) return test;
  const files = await addStarterFiles({ ...st, branch: "" });
  return { ok: true, fullName: test.fullName, url: `https://github.com/${test.fullName}`, ...files };
}

// OAuth path: create the repo too.
async function setupRepo({ name, isPrivate }) {
  const st = await getSettings();
  if (!st.token || !st.owner) return { ok: false, error: "Not signed in to GitHub." };
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(String(name || ""))) return { ok: false, error: "Invalid repo name." };

  const res = await gh(st, "/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name, private: !!isPrivate, auto_init: true,
      description: "My LeetCode solutions, synced automatically"
    })
  });
  if (res.status === 422) {
    return { ok: false, error: `A repo named "${name}" already exists on your account. Pick a different name.` };
  }
  if (!res.ok) return { ok: false, error: `GitHub ${res.status}: ${(await res.text()).slice(0, 200)}` };
  const repo = await res.json();

  const target = { ...st, owner: repo.owner.login, repo: repo.name, branch: "" };
  const files = await addStarterFiles(target);
  await api.storage.local.set({ owner: repo.owner.login, repo: repo.name });
  return { ok: true, fullName: repo.full_name, url: repo.html_url, ...files };
}

async function getLogin(token) {
  const res = await fetch(API + "/user", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
  });
  if (res.status === 401) throw new Error("That token is invalid or expired.");
  if (!res.ok) throw new Error(`Couldn't look up your GitHub username (${res.status}). Paste the repo's full link instead.`);
  return (await res.json()).login;
}

// Accepts "leetcode", "owner/leetcode", or "https://github.com/owner/leetcode(.git)".
function parseRepoInput(raw) {
  const s = String(raw || "").trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\.git$/i, "").replace(/\/+$/, "");
  const parts = s.split("/").filter(Boolean);
  const valid = (n) => /^[A-Za-z0-9._-]{1,100}$/.test(n) && n !== "." && n !== "..";
  if (parts.length === 1 && valid(parts[0])) return { owner: null, repo: parts[0] };
  if (parts.length >= 2 && /^[A-Za-z0-9-]{1,39}$/.test(parts[0]) && valid(parts[1])) return { owner: parts[0], repo: parts[1] };
  return null;
}
