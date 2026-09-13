#!/usr/bin/env python3
r"""Rewrite math in Markdown into the forms GitHub renders without Markdown escaping:
display $$...$$ -> ```math fences; inline $...$ -> $`...`$ (GitHub's robust inline form);
< and > inside math -> \lt and \gt (GitHub double-escapes them); inline math containing & (e.g. a one-line
matrix, also double-escaped) -> its own display block.
Idempotent; run after editing notes:  python3 tools/fix_math.py"""
import re, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
files = sorted(list((root / "notes").glob("*.md")) + list((root / "exercises").glob("*.md")))
RISKY = re.compile(r"\\[^A-Za-z]")          # \, \; \\ \{ \| ... — Markdown treats these as escapes

def convert(text):
    out, pos = [], 0
    # protect existing code fences
    parts = re.split(r"(```[\s\S]*?```)", text)
    result = []
    for part in parts:
        if part.startswith("```"):
            result.append(part)
            continue
        def display(m):
            body = m.group(1).strip("\n ")
            return "\n```math\n" + body + "\n```\n"
        part = re.sub(r"\$\$([\s\S]+?)\$\$", display, part)
        def lt_gt(body):
            return re.sub(r"\s*<\s*", r" \\lt ", re.sub(r"\s*>\s*", r" \\gt ", body)).strip()
        part = re.sub(r"```math\n([\s\S]*?)\n```", lambda m: "```math\n" + lt_gt(m.group(1)) + "\n```", part)
        def inline(m):
            code = m.group(1) is not None
            body = m.group(1) if code else m.group(2)
            body = lt_gt(body)
            if "&" in body:
                return "\n\n```math\n" + body.strip() + "\n```\n\n"
            # Always use GitHub's backtick form: plain $...$ breaks after "(" and when "_" pairs look like emphasis.
            return "$`" + body.strip() + "`$"
        part = re.sub(r"\$`(.+?)`\$|(?<![\$`\w])\$(?!\$)([^$\n]+?)\$(?![`\w])", inline, part)
        result.append(part)
    text = "".join(result)
    text = re.sub(r"\n{3,}(```math)", r"\n\n\1", text)
    text = re.sub(r"(```math\n[\s\S]*?\n```)\n{3,}", r"\1\n\n", text)
    return text

for f in files:
    old = f.read_text()
    new = convert(old)
    if new != old:
        f.write_text(new)
        print("rewrote", f.relative_to(root))
