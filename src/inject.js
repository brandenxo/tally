// inject.js — runs inside the LeetCode page itself (not the extension sandbox),
// so it can observe the page's own network calls. It never sends anything
// off-site: it only reads LeetCode's responses and hands an accepted
// submission to content.js via window.postMessage.

(function () {
  "use strict";
  if (window.__lcGithubSyncInstalled) return;
  window.__lcGithubSyncInstalled = true;

  const CHANNEL = "lc-github-sync";
  const SUBMIT_RE = /\/problems\/([^/]+)\/submit\/?(?:\?|$)/;
  const CHECK_RE = /\/submissions\/detail\/(\d+)\/(?:v2\/)?check\/?(?:\?|$)/;

  const pending = new Map(); // submissionId -> { slug, lang, code }
  const done = new Set();

  function absUrl(u) {
    try { return new URL(u, location.origin).href; } catch { return String(u || ""); }
  }

  function readCookie(name) {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }

  async function fetchQuestion(slug) {
    try {
      const res = await originalFetch("https://leetcode.com/graphql/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-csrftoken": readCookie("csrftoken") },
        body: JSON.stringify({
          query:
            "query q($titleSlug: String!) { question(titleSlug: $titleSlug) { questionFrontendId title titleSlug difficulty } }",
          variables: { titleSlug: slug }
        })
      });
      const json = await res.json();
      return (json && json.data && json.data.question) || null;
    } catch (e) {
      return null;
    }
  }

  function onSubmitResponse(url, rawBody, json) {
    if (!json || !json.submission_id) return;
    let body;
    try { body = typeof rawBody === "string" ? JSON.parse(rawBody) : null; } catch { body = null; }
    if (!body || typeof body.typed_code !== "string") return;
    const m = url.match(SUBMIT_RE);
    pending.set(String(json.submission_id), {
      slug: m ? m[1] : null,
      lang: body.lang,
      code: body.typed_code
    });
  }

  async function onCheckResponse(url, json) {
    const m = url.match(CHECK_RE);
    if (!m || !json || json.state !== "SUCCESS") return;
    const id = m[1];
    if (done.has(id) || !pending.has(id)) return;
    done.add(id);
    const info = pending.get(id);
    pending.delete(id);
    if (json.status_msg !== "Accepted") return; // wrong answer, TLE, etc.

    const q = info.slug ? await fetchQuestion(info.slug) : null;
    window.postMessage(
      {
        channel: CHANNEL,
        type: "ACCEPTED",
        payload: {
          submissionId: id,
          slug: (q && q.titleSlug) || info.slug,
          title: (q && q.title) || info.slug,
          number: q ? q.questionFrontendId : null,
          difficulty: q ? q.difficulty : null,
          lang: info.lang,
          code: info.code,
          runtime: json.status_runtime || null,
          memory: json.status_memory || null
        }
      },
      location.origin
    );
  }

  // ---- fetch hook ----
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (resource, init) {
    const url = absUrl(typeof resource === "string" ? resource : resource && resource.url);
    const method = ((init && init.method) || (resource && resource.method) || "GET").toUpperCase();
    const response = await originalFetch(resource, init);
    try {
      if (method === "POST" && SUBMIT_RE.test(url)) {
        response.clone().json().then((j) => onSubmitResponse(url, init && init.body, j)).catch(() => {});
      } else if (CHECK_RE.test(url)) {
        response.clone().json().then((j) => onCheckResponse(url, j)).catch(() => {});
      }
    } catch (_) { /* never break the page */ }
    return response;
  };

  // ---- XHR hook (fallback; some LeetCode builds use XHR) ----
  const XHR = XMLHttpRequest.prototype;
  const origOpen = XHR.open;
  const origSend = XHR.send;
  XHR.open = function (method, url) {
    this.__lcMethod = String(method || "GET").toUpperCase();
    this.__lcUrl = absUrl(url);
    return origOpen.apply(this, arguments);
  };
  XHR.send = function (body) {
    const url = this.__lcUrl || "";
    if ((this.__lcMethod === "POST" && SUBMIT_RE.test(url)) || CHECK_RE.test(url)) {
      this.addEventListener("load", () => {
        let j;
        try { j = JSON.parse(this.responseText); } catch { return; }
        if (SUBMIT_RE.test(url)) onSubmitResponse(url, body, j);
        else onCheckResponse(url, j);
      });
    }
    return origSend.apply(this, arguments);
  };
})();
