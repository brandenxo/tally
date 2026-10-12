# Tally: LeetCode to GitHub Sync

A small browser extension for **Chrome and Firefox** that commits your **accepted** LeetCode
submissions to a GitHub repo. It talks only to `leetcode.com` and `api.github.com`.
No servers, no analytics.

Files land as `[folder/][difficulty/]0001-two-sum.py`, with an optional comment header
(title, link, runtime, memory). Re-submitting identical code doesn't create an empty commit.

## Project layout

```
src/                 shared code for both browsers
platform/chrome/     Chrome manifest (Manifest V3)
platform/firefox/    Firefox manifest (Manifest V2)
build.sh             builds dist/chrome/ and dist/firefox/ (+ zips)
```

Edit files in `src/`, then run `./build.sh`.

## Optional: enable "Sign in with GitHub" (OAuth)

The setup page works with a fine-grained token out of the box. If you also want a no-paste "Sign in with GitHub" option, register an OAuth app. It signs users in with GitHub's *device flow*: no server, no client secret, no token pasting.
You register one OAuth app and put its public Client ID in `src/config.js`.

1. GitHub → Settings → Developer settings → **OAuth Apps** → **New OAuth App**.
2. Name: Tally. Homepage URL: your GitHub repo URL. Callback URL: the same URL (unused by device flow).
3. After creating it, tick **Enable Device Flow** and save.
4. Copy the **Client ID** into `GITHUB_CLIENT_ID` in `src/config.js`, then run `./build.sh`.

Skipping this is fine: the token path below needs no OAuth app, and the "sign in" link simply stays hidden.

## 2. Install

### Chrome (also Edge, Brave, Arc)
1. Unzip `leetcode-github-sync-chrome.zip` somewhere you'll keep it (Chrome loads it from that folder).
2. Go to `chrome://extensions` → turn on **Developer mode** (top right) → **Load unpacked** → pick the folder.

It stays installed across restarts. Don't delete or move the folder.

### Firefox
- **Quick try:** `about:debugging` → This Firefox → **Load Temporary Add-on…** → pick `manifest.json`. Removed on restart.
- **Permanent:** at https://addons.mozilla.org/developers/ → Submit a New Add-on → **On your own** (unlisted, private)
  → upload `leetcode-github-sync-firefox.zip` → download the signed `.xpi` → open it in Firefox.

## 3. Set up

On install, a setup tab opens (or use the toolbar icon → **Run setup**):

1. **Create an empty repo** on GitHub (e.g. `leetcode`) and tick **Add a README**.
2. **Create a fine-grained token** for only that repo: *Only select repositories* → your repo; permissions
   **Contents: Read and write** and **Workflows: Read and write**; expiration ~1 year.
3. Paste the token and your repo's name (e.g. `leetcode`, or the repo's link) into the setup page and click **Set up my repo**.

The extension checks the token can write to the repo, then adds the README, `scripts/update_readme.py`, and the
auto-update workflow, and saves your settings. It leaves a README you wrote yourself alone. If the token lacks the
Workflows permission, everything else is still added and you're told how to fix it.

(If the OAuth app above is configured, the setup page also offers "sign in with GitHub", which creates the repo for you.)

Prefer to do it by hand? Toolbar icon → **Settings**, paste token/owner/repo, **Test connection**, **Save**.
Reload open LeetCode tabs, solve a problem, and a green toast confirms the commit.

## What the optional OAuth sign-in asks GitHub for

| Choice | Scopes requested | Why |
|---|---|---|
| Public repo | `public_repo workflow` | create the repo and commit; `workflow` lets it add the GitHub Action file |
| Private repo | `repo workflow` | same, but GitHub's private-repo scope covers all your repos |

Users can revoke access any time at GitHub → Settings → Applications.
OAuth scopes are coarser than a fine-grained token, which is why the manual token route stays available.

## Publishing checklist (Firefox / Chrome stores)

- **Firefox (AMO):** free account. Listed add-ons need a name, summary, description, category, at least one screenshot, a
  privacy policy URL, and a support link. Declared data: authentication info + website content (both already in the manifest).
- **Chrome Web Store:** one-time $5 fee. Needs a 128×128 icon, ≥1 screenshot (1280×800), a description, a privacy policy URL,
  and a justification for each permission. Fill in the "data usage" disclosures to match the table above.
- **Privacy policy (short is fine):** code and problem info go only to GitHub; the token is stored locally in the browser; there is
  no server, analytics, or sale of data.
- Keep the source public on GitHub and link it from both listings.

## How it works

| File | Role |
|---|---|
| `inject.js` | Runs in the LeetCode page; watches the page's own `/submit/` and `/check/` requests. On `Accepted`, looks up the problem number/difficulty and hands the code to `content.js`. Sends nothing off-site. |
| `content.js` | Relays the result to the background script and shows the toast. (On Firefox it also injects `inject.js`; Chrome does that via `"world": "MAIN"`.) |
| `github.js` | Shared GitHub helpers (commit, test connection, repo setup), used by the background script and the setup/settings pages. |
| `background.js` | Receives accepted submissions and commits them. Commits via GitHub's Contents API; skips identical files. Ignores messages not from leetcode.com. |
| `setup.*` | Guided first-run page: GitHub device-flow sign-in, then asks `background.js` to create the repo. |
| `templates/` | Starter files the setup commits into the new repo (README, README-update script, workflow). |
| `config.js` | Your OAuth app's public Client ID. |
| `options.*` / `popup.*` | Settings page and toolbar popup. |

If LeetCode changes its submit/check URLs, update `SUBMIT_RE` / `CHECK_RE` at the top of `src/inject.js`.

## Troubleshooting

- **No toast after Accepted:** reload the LeetCode tab. In the page console (F12), `window.__lcGithubSyncInstalled` should be `true`.
- **Red toast / GitHub errors:** open the background console — Chrome: `chrome://extensions` → the extension → "service worker";
  Firefox: `about:debugging` → Inspect. A `401` means the token expired or is wrong.
