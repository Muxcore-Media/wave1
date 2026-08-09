## Summary
- GHCR rejects mixed-case image names (`Muxcore-Media` must be `muxcore-media`).
- Set `IMAGE_NAME`/`IMAGE_OWNER` via `${GITHUB_REPOSITORY,,}` before docker push.
