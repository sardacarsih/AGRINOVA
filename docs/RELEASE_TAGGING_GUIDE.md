# Release Tagging Guide (Backend & Web)

This project separates release pipelines by tag prefix:

- `backend/vX.Y.Z` triggers `Backend Release` for `apps/golang`
- `web/vX.Y.Z` triggers `Web Release` for `apps/web`

## 1) Backend release

```bash
git checkout main
git pull origin main
git tag -a backend/v1.2.3 -m "Backend release v1.2.3"
git push origin backend/v1.2.3
```

Expected result:
- GitHub Actions starts `Backend Release`
- Artifact and GitHub Release are created for backend

## 2) Web release

```bash
git checkout main
git pull origin main
git tag -a web/v1.2.3 -m "Web release v1.2.3"
git push origin web/v1.2.3
```

Expected result:
- GitHub Actions starts `Web Release`
- Artifact and GitHub Release are created for web

## 3) Validation checklist

- Tag exists in repository (`git tag --list 'backend/v*'` or `git tag --list 'web/v*'`)
- Only the matching release workflow runs
- Release page appears in GitHub (`Releases` tab)

## 4) Notes

- Avoid creating backend and web tags in the same command batch when debugging.
- If a release run fails, open the failed step log in Actions and rerun only after fixing root cause.

## 5) Mobile CI strictness rollout

Mobile analyze strictness is configured in `.github/workflows/mobile-ci.yml` via
`MOBILE_ANALYZE_FLAGS`.

- Phase 1: `--no-fatal-infos --no-fatal-warnings`
- Phase 2: `--no-fatal-infos`
- Phase 3 (current): empty flags (full strict)

To tighten gradually, update only `MOBILE_ANALYZE_FLAGS` and monitor failed runs.
