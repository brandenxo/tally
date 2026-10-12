"""Rebuilds the stats + problem table in README.md from the solution files.

Files are expected to look like 0001-two-sum.py (optionally inside easy/, medium/, hard/
or any other folder). If a file starts with the comment header the sync extension writes
("# 1. Two Sum", "# Difficulty: Easy", ...), that is used for the title and difficulty.

Usage:  python3 scripts/update_readme.py
"""
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
README = ROOT / "README.md"
START, END = "<!-- STATS:START -->", "<!-- STATS:END -->"
FILE_RE = re.compile(r"^(\d+)-([a-z0-9-]+)\.([a-z0-9]+)$")
LANGS = {"py": "Python", "java": "Java", "cpp": "C++", "c": "C", "cs": "C#", "js": "JavaScript",
         "ts": "TypeScript", "go": "Go", "rs": "Rust", "rb": "Ruby", "kt": "Kotlin", "swift": "Swift",
         "scala": "Scala", "php": "PHP", "dart": "Dart", "sql": "SQL", "sh": "Bash"}
DIFFS = ("Easy", "Medium", "Hard")
SKIP_DIRS = {".git", ".github", "scripts", "node_modules"}


def read_header(path):
    """Return (title, difficulty) parsed from the first lines, or (None, None)."""
    title = diff = None
    try:
        with open(path, encoding="utf-8", errors="ignore") as f:
            for _ in range(6):
                line = f.readline()
                m = re.match(r"^\s*(?:#|//|--|%|;)\s*\d+\.\s*(.+?)\s*$", line)
                if m and not title:
                    title = m.group(1)
                m = re.match(r"^\s*(?:#|//|--|%|;)\s*Difficulty:\s*(\w+)", line, re.I)
                if m:
                    diff = m.group(1).capitalize()
    except OSError:
        pass
    return title, diff


def collect():
    problems = defaultdict(lambda: {"title": None, "diff": None, "files": []})
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file() or any(part in SKIP_DIRS or part.startswith(".") for part in path.relative_to(ROOT).parts[:-1]):
            continue
        m = FILE_RE.match(path.name)
        if not m:
            continue
        num, slug, ext = int(m.group(1)), m.group(2), m.group(3)
        p = problems[num]
        p["slug"] = slug
        title, diff = read_header(path)
        p["title"] = p["title"] or title or slug.replace("-", " ").title()
        folder = path.parent.name.capitalize()
        p["diff"] = p["diff"] or diff or (folder if folder in DIFFS else None)
        p["files"].append((LANGS.get(ext, ext.upper()), path.relative_to(ROOT).as_posix()))
    return problems


def render(problems):
    total = len(problems)
    by_diff = Counter(p["diff"] or "Unknown" for p in problems.values())
    by_lang = Counter(lang for p in problems.values() for lang, _ in p["files"])

    out = [f"**{total} solved**" + ("  ·  " + "  ·  ".join(f"{d}: {by_diff[d]}" for d in DIFFS if by_diff[d]) if total else ""), ""]
    if by_lang:
        out += ["**Languages:** " + ", ".join(f"{l} ({n})" for l, n in by_lang.most_common()), ""]
    out += ["| # | Problem | Difficulty | Solution |", "|--:|---------|:----------:|----------|"]
    for num in sorted(problems):
        p = problems[num]
        link = f"[{p['title']}](https://leetcode.com/problems/{p['slug']}/)"
        sols = ", ".join(f"[{lang}]({path})" for lang, path in p["files"])
        out.append(f"| {num} | {link} | {p['diff'] or '—'} | {sols} |")
    return "\n".join(out)


def main():
    text = README.read_text(encoding="utf-8")
    if START not in text or END not in text:
        raise SystemExit(f"README.md is missing the {START} / {END} markers.")
    block = f"{START}\n{render(collect())}\n{END}"
    new = re.sub(re.escape(START) + r".*?" + re.escape(END), lambda _: block, text, flags=re.S)
    if new != text:
        README.write_text(new, encoding="utf-8")
        print("README.md updated.")
    else:
        print("README.md already up to date.")


if __name__ == "__main__":
    main()
