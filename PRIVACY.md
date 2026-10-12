# Tally Privacy Policy

_Last updated: October 2026_

Tally is a browser extension that saves your accepted LeetCode solutions to a GitHub repository you own.
It is open source, and has no server of its own.

## What it handles
- **Your solutions.** When LeetCode reports an accepted submission, Tally reads the code you submitted, the problem's
  name, number, and difficulty, and the runtime and memory result shown by LeetCode.
- **Your GitHub token.** You give Tally a GitHub access token so it can write to your repository.

## Where that data goes
- Solution data is sent **only to GitHub** (`api.github.com`), to the repository you chose, using your token.
- Your token is stored **only in your browser's local extension storage** on your device. It is sent only to
  `api.github.com`. It is never sent anywhere else, and the developer cannot see it.
- GitHub's own privacy policy applies to data once it is in your repository.

## What it does not do
- No servers or backend run by the developer.
- No analytics, telemetry, advertising, or tracking.
- No selling, sharing, or transferring of your data to anyone other than GitHub, as described above.
- It does not read any page except LeetCode problem pages (`leetcode.com/problems/*`), and it does not
  read your browsing history.

## Permissions, and why
- `leetcode.com` problem pages: to notice an accepted submission and read its code and result.
- `api.github.com`: to save files to your repository.
- `storage`: to remember your token and settings on your device.
- `notifications`: to tell you if a sync fails.

## Your control
Remove the extension or clear its settings at any time to delete the stored token. You can also revoke the token at
GitHub → Settings → Developer settings. Deleting the extension does not delete files already saved to your repository.

## Contact
Questions or issues: open an issue at the project's GitHub repository.
