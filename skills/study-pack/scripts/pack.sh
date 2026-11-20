#!/usr/bin/env bash
# Usage: pack.sh <body.md> <questions.json> <out.md>
# Runs the pack check and shuffle with Python 3, or with Node when Python is missing.
# Exits 127 when neither is on the PATH, so the caller can use the fallback of SKILL.md.
set -uo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
has_python() {
  command -v python3 >/dev/null 2>&1 || return 1
  # On macOS, /usr/bin/python3 is a stub that opens an installer dialog until the command-line tools exist.
  if [ "$(uname)" = Darwin ] && [ "$(command -v python3)" = /usr/bin/python3 ] && ! xcode-select -p >/dev/null 2>&1; then
    return 1
  fi
  python3 -I -c 'import sys; sys.exit(sys.version_info < (3, 9))' >/dev/null 2>&1
}
if has_python; then
  exec python3 -I "$here/shuffle_pack.py" "$@"
elif command -v node >/dev/null 2>&1; then
  exec node "$here/shuffle_pack.mjs" "$@"
fi
echo "Neither Python 3.9+ nor Node is on the PATH; use the fallback of SKILL.md step 4." >&2
exit 127
