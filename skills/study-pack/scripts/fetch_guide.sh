#!/usr/bin/env bash
# Usage: fetch_guide.sh <guide pdf url> <work folder>
# Writes <work folder>/guide.pdf and <work folder>/guide.txt.
set -euo pipefail

url="$1"
work="$2"
mkdir -p "$work"

curl -fsSL --retry 2 -o "$work/guide.pdf" "$url"
if ! head -c 5 "$work/guide.pdf" | grep -q '%PDF'; then
  echo "The URL did not return a PDF: $url" >&2
  exit 1
fi

if command -v pdftotext >/dev/null 2>&1; then
  pdftotext -layout "$work/guide.pdf" "$work/guide.txt"
elif python3 -c 'import pypdf' >/dev/null 2>&1; then
  python3 -I -c '
import sys, pypdf
reader = pypdf.PdfReader(sys.argv[1])
pages = [f"\f[page {n}]\n" + (page.extract_text() or "") for n, page in enumerate(reader.pages, start=1)]
open(sys.argv[2], "w").write("".join(pages))
' "$work/guide.pdf" "$work/guide.txt"
else
  echo "Neither pdftotext nor pypdf is installed. Read $work/guide.pdf with the Read tool and write guide.txt yourself." >&2
  exit 2
fi

count=$(grep -c 'Task Statement' "$work/guide.txt" || true)
if [ "$count" -eq 0 ]; then
  echo "guide.txt has no 'Task Statement' headings; the PDF layout may have changed." >&2
  exit 3
fi
echo "guide.txt: $count task statements, $(wc -l < "$work/guide.txt") lines"
