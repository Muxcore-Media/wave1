#!/usr/bin/env bash
# Pin a module to core@v0.5.0 and drop sibling replace directives.
# Usage: ./pin-core-v050.sh <module-dir> [--commit]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOD="${1:-}"
DO_COMMIT="${2:-}"
if [[ -z "$MOD" || ! -d "$ROOT/$MOD" ]]; then
  echo "usage: $0 <module-dir> [--commit]" >&2
  exit 2
fi

if ! command -v go >/dev/null 2>&1; then
  if command -v nix-shell >/dev/null 2>&1; then
    exec nix-shell -p go --run "bash $(printf '%q' "$0") $(printf '%q' "$MOD") $(printf '%q' "${DO_COMMIT:-}")"
  fi
  echo "go not found on PATH" >&2
  exit 1
fi

export GOPRIVATE='github.com/Muxcore-Media/*'
export GONOSUMDB='github.com/Muxcore-Media/*'
cd "$ROOT/$MOD"

# Strip core-related replace lines (root + nested modules)
tmp=$(mktemp)
awk '
  /^replace[[:space:]]+github\.com\/Muxcore-Media\/core([[:space:]\/]|$)/ { next }
  { print }
' go.mod > "$tmp"
mv "$tmp" go.mod

# Rewrite stale pseudo/old versions before resolve (v0.4.0 tags often absent).
sed -i -E \
  -e 's#(github.com/Muxcore-Media/core) v[^[:space:]]+#\1 v0.5.0#g' \
  -e 's#(github.com/Muxcore-Media/core/sdk/go/module) v[^[:space:]]+#\1 v0.5.0#g' \
  -e 's#(github.com/Muxcore-Media/core/pkg/contracts) v[^[:space:]]+#\1 v0.5.0#g' \
  -e 's#(github.com/Muxcore-Media/core/sdk/go/client) v[^[:space:]]+#\1 v0.5.0#g' \
  go.mod

# Drop sumfile so stale v0.4.0 hashes cannot force unknown revisions.
rm -f go.sum

go get github.com/Muxcore-Media/core@v0.5.0
go get github.com/Muxcore-Media/core/sdk/go/module@v0.5.0 2>/dev/null || true
go get github.com/Muxcore-Media/core/pkg/contracts@v0.5.0 2>/dev/null || true
go get github.com/Muxcore-Media/core/sdk/go/client@v0.5.0 2>/dev/null || true
go mod tidy

if rg -q 'replace[[:space:]]+github.com/Muxcore-Media/core' go.mod; then
  echo "FAIL: replace still present in $MOD/go.mod" >&2
  rg 'replace[[:space:]]+github.com/Muxcore-Media/core' go.mod >&2
  exit 1
fi
if ! rg -q 'github.com/Muxcore-Media/core v0\.5\.0' go.mod; then
  echo "WARN: core v0.5.0 not found in require block for $MOD" >&2
fi

go build ./...
go test -count=1 -timeout 120s ./...

if [[ "$DO_COMMIT" == "--commit" ]]; then
  git checkout -B "chore/pin-core-v0.5.0"
  git add go.mod go.sum
  if git diff --cached --quiet; then
    echo "nothing to commit for $MOD"
  else
    git commit -m "$(cat <<'EOF'
chore: pin core@v0.5.0 and drop sibling replace

Build against published Muxcore-Media/core v0.5.0 (and nested module tags)
without local replace => ../core*.
EOF
)"
  fi
fi
echo "OK $MOD"
