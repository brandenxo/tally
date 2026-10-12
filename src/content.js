// content.js — runs in the extension sandbox on leetcode.com/problems/*.
// Injects inject.js into the page and relays accepted submissions to the
// background script. Shows a small toast with the result.

(function () {
  "use strict";
  const api = globalThis.browser ?? globalThis.chrome;
  const CHANNEL = "lc-github-sync";

  // Chrome (MV3) runs inject.js in the page directly via "world": "MAIN" in the
  // manifest. Firefox (MV2) needs it added to the page as a <script> tag.
  if (api.runtime.getManifest().manifest_version === 2) {
    const s = document.createElement("script");
    s.src = api.runtime.getURL("inject.js");
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
  }

  function toast(text, ok) {
    const el = document.createElement("div");
    el.textContent = text;
    Object.assign(el.style, {
      position: "fixed", right: "16px", bottom: "16px", zIndex: 2147483647,
      padding: "10px 14px 10px 12px", borderRadius: "8px", font: "13px/1.4 system-ui, sans-serif",
      color: "#e6edf3", background: "#161b22", border: "1px solid #30363d",
      borderLeft: `4px solid ${ok ? "#3fb950" : "#f85149"}`,
      boxShadow: "0 8px 24px rgba(1,4,9,.6)", maxWidth: "360px"
    });
    (document.body || document.documentElement).appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const d = event.data;
    if (!d || d.channel !== CHANNEL || d.type !== "ACCEPTED" || !d.payload) return;

    try {
      const res = await api.runtime.sendMessage({ type: "ACCEPTED", payload: d.payload });
      if (!res) return;
      if (res.ok) toast(res.skipped ? `Already on GitHub: ${res.path}` : `Synced → ${res.path}`, true);
      else toast(`GitHub sync failed: ${res.error}`, false);
    } catch (e) {
      toast(`GitHub sync failed: ${e.message}`, false);
    }
  });
})();
