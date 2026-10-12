const TEXT = ["token", "owner", "repo", "branch", "folder"];
const status = document.getElementById("status");

function say(text, ok) {
  status.textContent = text;
  status.className = ok ? "ok" : "bad";
}

function read() {
  const s = {};
  for (const f of TEXT) s[f] = document.getElementById(f).value.trim();
  s.byDifficulty = document.getElementById("byDifficulty").checked;
  s.header = document.getElementById("header").checked;
  return s;
}

async function load() {
  const s = await api.storage.local.get([...TEXT, "byDifficulty", "header"]);
  for (const f of TEXT) if (s[f]) document.getElementById(f).value = s[f];
  document.getElementById("byDifficulty").checked = !!s.byDifficulty;
  document.getElementById("header").checked = s.header !== false;
}

document.getElementById("save").addEventListener("click", async () => {
  await api.storage.local.set(read());
  say("Saved ✓", true);
});

document.getElementById("test").addEventListener("click", async () => {
  say("Checking…", true);
  const r = await testConnection(read());
  if (r && r.ok) say(`✓ Can write to ${r.fullName} (${r.private ? "private" : "public"}, default branch: ${r.defaultBranch})`, true);
  else say(`✗ ${r ? r.error : "No response"}`, false);
});

load();
