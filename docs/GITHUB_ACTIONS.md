# GitHub Actions Workflow Documentation

This document describes the optimized GitHub Actions workflows and how to use them.

## Overview

All GitHub Actions have been updated to the latest stable versions and pinned to exact SHA commits for security and reproducibility.

## Workflows

### CI Workflow (`.github/workflows/ci.yml`)

**Purpose**: Fast quality checks on pull requests

**Jobs**:
1. **quality-checks**: Parallel matrix of lint, typecheck, and unit tests
2. **e2e-smoke**: Quick smoke tests on 3 core devices (Desktop Chrome, iPhone 12, iPad Pro 11)
3. **build**: Production build verification

**E2E Skip Feature**:

You can skip E2E smoke tests in several ways:

1. **Via Workflow Dispatch**:
   - Go to Actions → CI workflow → Run workflow
   - Check "Skip E2E smoke tests"

2. **Via Repository Variable**:
   - Go to Settings → Secrets and variables → Actions → Variables
   - Create a variable named `DISABLE_E2E_SMOKE` with value `true`
   - This will skip E2E tests in all CI runs

3. **Via Workflow Call** (when called from CD):

   ```yaml
   ci:
     uses: ./.github/workflows/ci.yml
     with:
       skip-e2e: true
   ```

**When to Skip E2E Tests**:

- During documentation-only changes
- When iterating quickly on code that doesn't affect UI
- To get faster feedback on lint/typecheck/unit test issues

**Note**: E2E tests are always skipped when called from CD workflow since the full E2E matrix runs separately.

### CD Workflow (`.github/workflows/cd.yml`)

**Purpose**: Continuous deployment to production on main branch

**Jobs**:
1. **ci**: Calls CI workflow with e2e skipped (runs lint, typecheck, test, build)
2. **e2e-full-matrix**: Comprehensive E2E tests on 17 device profiles
3. **auto-heal-failures**: Jules AI agent auto-heals failures (if configured)
4. **release-please**: Creates release PRs based on conventional commits
5. **build-pages**: Builds for GitHub Pages deployment
6. **deploy-pages**: Deploys to GitHub Pages

**Device Coverage** (17 total):
- Desktop: Chrome, Firefox, Safari
- Phones (Portrait): iPhone 12, iPhone 13, iPhone 14, Pixel 5, Galaxy S21
- Phones (Landscape): Galaxy S21
- Tablets (Portrait): iPad Pro 11, iPad Pro 12.9
- Tablets (Landscape): iPad Pro 11, iPad Pro 12.9
- Foldables: Galaxy Fold (Portrait/Landscape), Surface Duo (Portrait/Landscape)

### Release Workflow (`.github/workflows/release.yml`)

**Purpose**: Build Android APKs when a release is published

**Jobs**:
1. **prepare-android**: Prepares build environment, caches artifacts
2. **build-android-apks**: Builds architecture-specific APKs (arm64-v8a, armeabi-v7a, x86, x86_64)
3. **build-universal-apk**: Builds universal APK

**Trigger**:
- Automatically on release publish
- Manually via workflow_dispatch with release tag

### Automerge Workflow (`.github/workflows/automerge.yml`)

**Purpose**: Unified workflow for auto-merging Dependabot and Release PRs

**Security Model**:
- Uses `pull_request_target` for secure access to secrets
- Validates PR author using GitHub API (not forgeable context values)
- Prevents pwn request attacks by validating bot identity before checkout
- See: [Preventing pwn requests](https://securitylab.github.com/research/github-actions-preventing-pwn-requests/)

**Features**:
- Auto-approves and merges Dependabot patch/minor updates
- Auto-approves and merges Release PRs after CI passes
- Comments on Dependabot major updates (requires manual review)
- Waits for all CI checks to pass before merging

**Replaced Workflows**:
- `automerge-dependabot.yml` (removed)
- `automerge-release.yml` (removed)

## Action Version Updates

All actions updated to latest stable versions:

| Action | Old Version | New Version |
|--------|------------|-------------|
| pnpm/action-setup | v4.0.0 | v4.2.0 |
| actions/cache | v4.1.2 | v5.0.3 |
| actions/setup-java | v4.5.0 | v5.2.0 |
| android-actions/setup-android | v3.2.1 | v3.2.2 |
| actions/upload-pages-artifact | v3.0.1 | v4.0.0 |
| googleapis/release-please-action | v4.1.3 | v4.4.0 |
| softprops/action-gh-release | v2.2.0 | v2.5.0 |
| dependabot/fetch-metadata | v2.2.0 | v2.5.0 |
| lewagon/wait-on-check-action | v1.3.4 | v1.5.0 |
| google-labs-code/jules-action | main | v1.0.0 (SHA pinned) |

## Optimizations Applied

### CI Workflow
- ✅ Added E2E skip flag with multiple control methods
- ✅ Build job runs in parallel with E2E (faster feedback)
- ✅ All steps clearly commented
- ✅ Leverages pnpm caching for faster installs

### CD Workflow
- ✅ Skips redundant E2E smoke tests (runs full matrix instead)
- ✅ Clear job separation and documentation
- ✅ Optimized browser installation (only required browser per device)
- ✅ Pages deployment happens in parallel with E2E

### Release Workflow
- ✅ Comprehensive comments explaining build process
- ✅ Efficient caching of build artifacts
- ✅ Parallel APK builds by architecture

### Automerge Workflow
- ✅ Consolidated two workflows into one
- ✅ Single source of truth for automerge logic
- ✅ Reduced maintenance overhead
- ✅ Clear PR type detection and handling

## Best Practices

1. **Security**: All actions pinned to exact SHA for supply chain security
2. **Caching**: pnpm cache used throughout for faster dependency installation
3. **Parallelization**: Jobs run in parallel where possible
4. **Comments**: All jobs and steps clearly documented
5. **DRY**: No duplication between workflows
6. **Fail-fast disabled**: E2E tests continue even if one device fails
7. **Artifact retention**: Test results retained for 3-7 days depending on importance

## Troubleshooting

### E2E Tests Taking Too Long?
- Use `skip-e2e: true` for quick iterations
- E2E tests only need to pass before merge, not on every push

### Dependabot PR Not Auto-merging?
- Check if update is major version (requires manual review)
- Verify all CI checks have passed
- Check PR has been approved

### Release PR Not Auto-merging?
- Verify all E2E tests have passed
- Check CI quality checks completed successfully
- Ensure PR title starts with "chore: release"

## Future Improvements

Consider these enhancements:
- Add workflow to generate mobile app screenshots
- Implement visual regression testing
- Add performance benchmarking
- Cache Playwright browsers across runs
