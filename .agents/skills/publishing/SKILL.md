---
name: publishing
description: Step-by-step procedures for running pre-flight checks, release packaging, version bumping, and deploying DigitalMarkaz360 to GitHub, Render, or Railway.
---

# DigitalMarkaz360 Publishing & Deployment Skill

Use this skill when preparing, releasing, or deploying new versions of DigitalMarkaz360.

## Workflow Phases

### Phase 1: Pre-Flight Safety Checks
1. Check repository cleanliness:
   ```bash
   git status
   ```
   Ensure no recovery code files (`*-recovery-codes-*.txt`), `.env` credentials, or database dumps are staged.
2. Run test suites:
   ```bash
   npm test
   ```
3. Run frontend production build:
   ```bash
   npm run build
   ```

### Phase 2: Version Bump & Release Notes
1. Update `version` in:
   - `package.json`
   - `backend/package.json`
   - `frontend/package.json`
2. Append entries to `CHANGELOG.md` detailing new features, fixes, and schema changes.

### Phase 3: Git Packaging & Tagging
1. Stage safe files:
   ```bash
   git add package.json backend/package.json frontend/package.json CHANGELOG.md
   git commit -m "chore(release): vX.Y.Z"
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   ```
2. Push commits and tags to remote:
   ```bash
   git push origin <branch> --tags
   ```

### Phase 4: Cloud Deployment
* **Render**: If connected to GitHub with `render.yaml`, pushing to `main` initiates auto-deployment.
* **Railway**: Use `railway up` or trigger connected GitHub deployment branch.
* Verify `/health` returns `{ status: "ok" }`.
