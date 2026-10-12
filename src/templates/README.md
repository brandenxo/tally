# LeetCode Solutions

My solutions to [LeetCode](https://leetcode.com) problems, committed automatically each time I get an
**Accepted** verdict. This repo is my running record of practice: data structures, algorithms, and
problem-solving patterns.

## Progress

<!-- STATS:START -->
**0 solved**

| # | Problem | Difficulty | Solution |
|--:|---------|:----------:|----------|
<!-- STATS:END -->

## How this repo is organized

- Files are named `<problem number>-<problem-slug>.<ext>`, so they sort in LeetCode order and the
  slug matches the problem's URL.
- Solutions are grouped into `easy/`, `medium/`, and `hard/` folders.
- Each file starts with a short comment header: the problem title, difficulty, a link, and the
  runtime and memory from the accepted submission.
- Where a problem is solved in more than one language, each version sits side by side.

## How solutions get here

A browser extension watches for an accepted submission and commits the code to this repo through
the GitHub API, so there's no manual copy-and-paste.

## Keeping this README current

The progress table above is generated from the files in the repo by `scripts/update_readme.py`.
A GitHub Action (`.github/workflows/update-readme.yml`) re-runs it after every push and commits the
updated table. To refresh it by hand: `python3 scripts/update_readme.py`.

## Notes

- Solutions are my own attempts at the time of submission. Some aren't optimal, and I'm happy to
  revisit them as I learn more.
- If you're working through the same problems, try them yourself first. Reading solutions teaches far
  less than struggling with the problem.
