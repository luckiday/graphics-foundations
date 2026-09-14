#!/usr/bin/env python3
r"""Rewrite math in Markdown into the forms GitHub renders without Markdown escaping:
display $$...$$ -> ```math fences; inline $...$ -> $`...`$ (GitHub's robust inline form);
< and > inside math -> \lt and \gt (GitHub double-escapes them); inline math containing & (e.g. a one-line
matrix, also double-escaped) -> its own display block.
GitHub also renders math as native MathML, and Chromium implements only MathML Core, which ignores mathvariant
and <menclose> and garbles <mlabeledtr> — all without an error. So \mathbf{x} and \mathsf{T} become the Unicode
math letters (the only bold that survives), \tag{n} becomes a spaced (n), and \operatorname (which GitHub rejects
outright) becomes \mathrm, and a function name gets an explicit \, before its argument. \boxed has no working substitute there; do not use it.
Idempotent; run after editing notes:  python3 tools/fix_math.py"""
import re, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
files = sorted(list((root / "notes").glob("*.md")) + list((root / "exercises").glob("*.md")))
def unicode_math(text, upper, lower, digit=None):
    return "".join(chr(upper + ord(c) - 65) if c.isupper() else chr(lower + ord(c) - 97) if c.islower()
                   else chr(digit + ord(c) - 48) if digit and c.isdigit() else c for c in text)

def mathml_core(body):
    # A bare script (x^\mathsf{T}) needs braces once the command is gone: x^{𝖳}.
    brace = lambda m, s: "{" + s + "}" if m.group(1) else s
    body = re.sub(r"([\^_]\s*)?\\mathbf\{([A-Za-z0-9]+)\}",
                  lambda m: (m.group(1) or "") + brace(m, unicode_math(m.group(2), 0x1D400, 0x1D41A, 0x1D7CE)), body)
    body = re.sub(r"([\^_]\s*)?\\mathsf\{([A-Za-z]+)\}",
                  lambda m: (m.group(1) or "") + brace(m, unicode_math(m.group(2), 0x1D5A0, 0x1D5BA)), body)
    body = re.sub(r"\\operatorname\{", r"\\mathrm{", body)
    body = re.sub(r"\s*\\tag\{([^}]*)\}", r" \\qquad (\1)", body)
    # MathML Core drops the space TeX puts after a function name: \cos\theta would read "cosθ".
    body = re.sub(r"\\(sin|cos|tan|arcsin|arccos|log)\s*(?=[A-Za-z0-9]|\\(?!left|right|big|Big|[,;:! ]))", r"\\\1\\, ", body)
    return body

RISKY = re.compile(r"\\[^A-Za-z]")          # \, \; \\ \{ \| ... — Markdown treats these as escapes

def convert(text):
    out, pos = [], 0
    # protect existing code fences
    parts = re.split(r"(```[\s\S]*?```)", text)
    result = []
    for part in parts:
        if part.startswith("```"):
            result.append(mathml_core(part) if part.startswith("```math\n") else part)
            continue
        def display(m):
            body = m.group(1).strip("\n ")
            return "\n```math\n" + body + "\n```\n"
        part = re.sub(r"\$\$([\s\S]+?)\$\$", display, part)
        def lt_gt(body):
            return re.sub(r"\s*<\s*", r" \\lt ", re.sub(r"\s*>\s*", r" \\gt ", body)).strip()
        part = re.sub(r"```math\n([\s\S]*?)\n```", lambda m: "```math\n" + mathml_core(lt_gt(m.group(1))) + "\n```", part)
        def inline(m):
            code = m.group(1) is not None
            body = m.group(1) if code else m.group(2)
            body = mathml_core(lt_gt(body))
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
