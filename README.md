# Wave 1 CI tooling

- `ci-siblings.json` — per-module `replace => ../X` sibling inventory
- `ci-checklist.json` — golangci v6 list, missing core checkout, needsCiFix
- `batches.json` — agent batch assignments
- `GOLDEN_CI.yml.template` — reference template
- `gen-ci.js <module>` — regenerate that module's `.github/workflows/ci.yml`

Reference patterns: `call-policy-default`, `cache-local` (sibling checkout).

## Workspace bundle

This repo also carries local workspace meta that lived outside any sibling clone:

| File | Role |
|------|------|
| `REPO-STATUS.md` | Org/MVP wave status (same content as `_mvp` / workspace root) |
| `workspace.dockerignore` | Host MuxCore workspace `.dockerignore` (excludes `_wave1`, dumps, etc.) |

Canonical SPA is [`media-ui-app`](https://github.com/Muxcore-Media/media-ui-app); org `media-ui` remains an archived polluted dump.
