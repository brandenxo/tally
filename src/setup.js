// setup.js — guided first-run setup.
// 1) GitHub "device flow" sign-in (no server, no client secret, no token pasting)
// 2) ask the background script to create the repo and add the starter files.

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let mode = "token";
const JSON_HEADERS = { Accept: "application/json", "Content-Type": "application/json" };

function show(step) {
  for (const id of ["step-token", "step-choose", "step-auth", "step-working", "step-done"]) {
    $(id).classList.toggle("hidden", id !== step);
  }
}

function friendly(msg) {
  if (/receiving end does not exist|could not establish connection/i.test(msg)) {
    return "The extension's background part isn't running.\n" +
      "Fix: open about:debugging (Firefox) or chrome://extensions (Chrome), click Reload on this extension, then reopen the setup page.\n" +
      "If it keeps happening, open the extension's console (Inspect / service worker) and look for the first red error.";
  }
  return msg;
}

function fail(msg) {
  $("error").textContent = friendly(String(msg));
  $("retry").classList.remove("hidden");
  show(mode === "oauth" ? "step-choose" : "step-token");
}

function validRepoName(n) {
  return /^[A-Za-z0-9._-]{1,100}$/.test(n) && n !== "." && n !== "..";
}

async function startDeviceFlow(scope) {
  const res = await fetch("https://github.com/login/device/code", {
    method: "POST", headers: JSON_HEADERS,
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope })
  });
  const j = await res.json();
  if (!res.ok || j.error) throw new Error(j.error_description || j.error || `GitHub ${res.status}`);
  return j; // { device_code, user_code, verification_uri, expires_in, interval }
}

async function pollForToken(flow) {
  let interval = flow.interval || 5;
  const deadline = Date.now() + flow.expires_in * 1000;
  while (Date.now() < deadline) {
    await sleep(interval * 1000);
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST", headers: JSON_HEADERS,
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: flow.device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code"
      })
    });
    const j = await res.json();
    if (j.access_token) return j.access_token;
    if (j.error === "authorization_pending") continue;
    if (j.error === "slow_down") { interval = j.interval || interval + 5; continue; }
    if (j.error === "access_denied") throw new Error("You declined access on GitHub. Click Try again if that was a mistake.");
    throw new Error(j.error_description || j.error || "Sign-in failed.");
  }
  throw new Error("The code expired before it was used. Click Try again.");
}

function showDone(r) {
  const link = $("repo-link");
  link.href = r.url;
  link.textContent = r.fullName;
  const ul = $("summary");
  ul.textContent = "";
  for (const t of (r.added || []).map((x) => "Added " + x).concat((r.skipped || []).map((x) => "Skipped " + x))) {
    const li = document.createElement("li");
    li.textContent = t;
    ul.appendChild(li);
  }
  $("warnings").textContent = (r.warnings || []).join("\n");
  show("step-done");
}

async function runToken() {
  $("error").textContent = "";
  $("retry").classList.add("hidden");
  const token = $("tok-token").value.trim();
  const parsed = parseRepoInput($("tok-repo").value);
  if (!token) return fail("Paste your GitHub token.");
  if (!parsed) return fail("Enter your repo's name (like leetcode) or paste its link.");

  try {
    show("step-working");
    $("working-text").textContent = "Checking your token and filling in your repo…";
    const owner = parsed.owner || await getLogin(token);
    await api.storage.local.set({
      token, owner, repo: parsed.repo, branch: "", folder: "", byDifficulty: true, header: true
    });
    const r = await setupExisting();
    if (!r || !r.ok) throw new Error((r && r.error) || "Setup failed.");
    showDone(r);
  } catch (e) {
    fail(e.message || String(e));
  }
}

async function run() {
  mode = "oauth";
  $("error").textContent = "";
  $("retry").classList.add("hidden");

  const name = $("repo").value.trim();
  if (!validRepoName(name)) return fail("Repo names can only use letters, numbers, dots, dashes and underscores.");
  const isPrivate = document.querySelector('input[name="vis"]:checked').value === "private";
  // workflow scope is needed to add the README auto-update workflow file.
  const scope = (isPrivate ? "repo" : "public_repo") + " workflow";

  try {
    const flow = await startDeviceFlow(scope);
    $("user-code").textContent = flow.user_code;
    $("open-gh").href = flow.verification_uri;
    show("step-auth");
    const token = await pollForToken(flow);

    show("step-working");
    const owner = await getLogin(token);
    await api.storage.local.set({
      token, owner, repo: name, branch: "", folder: "", byDifficulty: true, header: true
    });

    $("working-text").textContent = "Creating your repo and adding the README…";
    const r = await setupRepo({ name, isPrivate });
    if (!r || !r.ok) throw new Error((r && r.error) || "Setup failed.");

    showDone(r);
  } catch (e) {
    fail(e.message || String(e));
  }
}

$("tok-go").addEventListener("click", runToken);
$("retry").addEventListener("click", () => { $("error").textContent = ""; $("retry").classList.add("hidden"); });

// Optional: "Sign in with GitHub" only appears when an OAuth app Client ID is configured.
if (GITHUB_CLIENT_ID && !GITHUB_CLIENT_ID.startsWith("REPLACE_")) {
  $("oauth-link").classList.remove("hidden");
  $("use-oauth").addEventListener("click", (e) => { e.preventDefault(); mode = "oauth"; show("step-choose"); });
  $("go").addEventListener("click", run);
}
