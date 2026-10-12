const api = globalThis.browser ?? globalThis.chrome; // Firefox: browser.*, Chrome: chrome.*

(async () => {
  const s = await api.storage.local.get(["token", "owner", "repo", "lastSync"]);
  const cfg = document.getElementById("config");
  if (s.token && s.owner && s.repo) {
    cfg.textContent = `Syncing to ${s.owner}/${s.repo}`;
    cfg.className = "ok";
  } else {
    cfg.textContent = "Not set up yet";
    cfg.className = "bad";
    document.getElementById("setup").style.display = "block";
  }
  if (s.lastSync) {
    const when = new Date(s.lastSync.at).toLocaleString();
    document.getElementById("last").textContent =
      `${s.lastSync.skipped ? "Unchanged" : "Last synced"}: ${s.lastSync.path} — ${when}`;
  }
  document.getElementById("settings").addEventListener("click", () => {
    api.runtime.openOptionsPage();
    window.close();
  });
  document.getElementById("setup").addEventListener("click", () => {
    api.tabs.create({ url: api.runtime.getURL("setup.html") });
    window.close();
  });
})();
