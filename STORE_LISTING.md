# Store listing copy

Paste-ready text for the Firefox (AMO) and Chrome Web Store listings. Name: **Tally: LeetCode to GitHub Sync**.
Chrome shows the description as plain text; AMO accepts the same text (line breaks are kept).

---

## Short description (manifest `description`, max 132 chars, also the Chrome summary)

Automatically sync accepted LeetCode solutions to GitHub, with a self-updating progress README. Open source, no server.

## Firefox "Summary" (max 250 chars)

Automatically commit your accepted LeetCode solutions to a GitHub repo. Sets up your repo with a README that tracks your progress. No server, no tracking, open source.

---

## Full description

Push your LeetCode solutions to GitHub automatically, with no copy-pasting.

Every time you get an "Accepted" on LeetCode, this extension commits your code to your own GitHub repo. It also sets up a README that keeps a running count of what you've solved, so your repo works as a coding portfolio from day one.

HOW IT WORKS
1. You solve a problem on leetcode.com and click Submit.
2. When LeetCode says "Accepted," the extension grabs your code, the problem's name and difficulty, and the runtime and memory result.
3. It commits the file to your GitHub repo, for example medium/0003-longest-substring-without-repeating-characters.py.
4. A small GitHub Action updates the progress table in your README: problems solved, easy/medium/hard counts, languages, and a link to each problem.

A green message appears on the LeetCode page each time a solution is saved.

SET UP IN ABOUT TWO MINUTES
A setup page opens when you install, and walks you through it:
1. Create an empty repo on GitHub (for example "leetcode") and tick "Add a README."
2. Create a fine-grained GitHub token for only that repo, with Contents: Read and write and Workflows: Read and write.
3. Paste the token and your repo's name into the setup page and click "Set up my repo."

The extension then adds your README, the script that updates it, and the auto-update workflow. That's it: solve a problem and submit.

WHAT YOU GET
- Solutions committed automatically, named like 0001-two-sum.py so they sort in LeetCode order
- A header on each file with the problem title, difficulty, link, runtime, and memory
- Files sorted into easy, medium, and hard folders
- A README progress table that updates itself after every push
- No duplicate commits: submitting identical code again changes nothing
- Support for many languages, including Python, Java, C++, JavaScript, TypeScript, Go, Rust, Kotlin, Swift, C#, Ruby, and SQL

PRIVACY AND PERMISSIONS
- Your code goes only to GitHub, to the repo you chose. There is no server, no analytics, and no tracking.
- Your token is stored only in your browser's extension storage and is sent only to api.github.com.
- The extension runs only on leetcode.com problem pages and only talks to leetcode.com and api.github.com.
- Use a token limited to a single repo, so even in the worst case nothing else on your account is reachable.
- The source code is public: [link to your GitHub repo]

GOOD TO KNOW
- It saves only accepted submissions, not "Run Code" results or wrong answers.
- It works on leetcode.com. Reload any LeetCode tabs that were open before you installed it.
- If a token expires, you'll see an error message on the page. Make a new token and paste it into the extension's Settings.

This extension is an independent project and is not affiliated with or endorsed by LeetCode or GitHub.

---

## Search keywords to keep in the listing text
LeetCode GitHub sync, push LeetCode solutions to GitHub, LeetCode portfolio, LeetCode auto commit, LeetCode backup

---

## Firefox (AMO) form: what to enter

| Field | Value |
|---|---|
| Name | Tally: LeetCode to GitHub Sync |
| Add-on URL slug | tally-leetcode |
| Summary | (the Firefox summary above) |
| Description | (the full description above) |
| Categories | Web Development (and one more if offered) |
| Tags | leetcode, github, sync, coding, portfolio |
| Support site | your GitHub repo URL |
| Support email | optional, but add one you're comfortable making public |
| License | MIT License |
| Privacy policy | paste the contents of PRIVACY.md, or its GitHub link |
| Screenshots | the three in `screenshots/` |

## Notes to reviewer (paste into "Notes to Reviewer")

Tally saves a user's accepted LeetCode submissions to the user's own GitHub repository.

- Source is unminified and public: [your GitHub repo URL]. The submitted zip is built from it with `./build.sh` (zip of `src/` plus `platform/firefox/manifest.json`). No build tools or obfuscation.
- Permissions: `https://leetcode.com/*` content script on `/problems/*` to read the submitted code and "Accepted" result; `https://api.github.com/*` to commit files to the user's repo; `storage` to keep the user's token and settings locally; `notifications` to report sync failures. `https://github.com/login/*` is used only by the optional "Sign in with GitHub" device flow, which is disabled unless an OAuth client ID is set in `config.js` (it ships unset).
- Data: the only data leaving the browser is the submitted code and problem metadata, sent to api.github.com with the user's token. Nothing is sent to any server operated by the developer. The token is stored in `storage.local`. Declared data collection: authentication information and website content.
- Why a content script injects `inject.js`: it wraps the page's own `fetch`/`XMLHttpRequest` for LeetCode's `/submit/` and `/check/` endpoints to see the accepted result. It only posts a message to the content script and makes no network requests to other sites.
- To test without a GitHub account setup: install, open the setup page, create a throwaway GitHub repo and a fine-grained token (Contents + Workflows: Read and write) limited to it, enter them, then submit any LeetCode problem. A green "Synced" message confirms the commit. Reviewers can also check Settings → "Test connection".
