# Automated Workflows Documentation

This document describes the automated workflows for dependency updates and releases in the Psyduck Panic project.

## Overview

The project uses three automated workflows to streamline dependency management and releases:

1. **Dependabot** - Automated dependency updates
2. **Automerge Dependabot PRs** - Automatic merging of safe dependency updates
3. **Automerge Release PRs** - Automatic merging of release-please PRs

## Dependabot Configuration

**Location**: `.github/dependabot.yml`

Dependabot automatically creates pull requests for dependency updates on a weekly schedule (Mondays at 9:00 AM EST).

### Package Ecosystems

#### npm Dependencies
- **Schedule**: Weekly (Mondays, 9:00 AM EST)
- **Max Open PRs**: 10
- **Labels**: `dependencies`, `automerge`
- **Commit Prefix**: `chore(deps)`

**Package Groups**:
- `capacitor` - All @capacitor/* packages
- `react` - React and related packages
- `testing` - All testing libraries (@playwright, @vitest, etc.)
- `build-tools` - Vite, TypeScript, and build tooling
- `dev-tools` - Development tools like Biome

**Safety Rules**:
- Major version updates for React are blocked by default
- All other packages allow patch and minor updates

#### GitHub Actions
- **Schedule**: Weekly (Mondays, 9:00 AM EST)
- **Max Open PRs**: 5
- **Labels**: `dependencies`, `github-actions`, `automerge`
- **Commit Prefix**: `chore(deps)`

All GitHub Actions are grouped together for easier review.

## Automerge Workflow for Dependabot PRs

**Location**: `.github/workflows/automerge-dependabot.yml`

**Trigger**: Runs when a Dependabot PR is opened, synchronized, reopened, or labeled.

### Workflow Steps

1. **Verify Actor**: Only runs for `dependabot[bot]`
2. **Fetch Metadata**: Gets update type (patch, minor, major)
3. **Wait for CI**: Waits for Lint, Type Check, Unit Tests, and Build to pass
4. **Auto-approve**: Approves patch and minor updates
5. **Auto-merge**: Enables auto-merge with squash strategy
6. **Comment on Major**: Adds warning comment for major updates (no auto-merge)

### Automerge Conditions

✅ **Auto-merged**:
- Patch updates (e.g., 1.0.0 → 1.0.1)
- Minor updates (e.g., 1.0.0 → 1.1.0)
- All CI checks pass

⚠️ **Manual review required**:
- Major updates (e.g., 1.0.0 → 2.0.0)
- CI checks fail

### Permissions

```yaml
permissions:
  contents: write        # To merge PRs
  pull-requests: write   # To approve and comment
  checks: read          # To read CI check status
```

## Automerge Workflow for Release PRs

**Location**: `.github/workflows/automerge-release.yml`

**Trigger**: Runs when a PR to `main` is opened, synchronized, reopened, or labeled.

### Workflow Steps

1. **Verify Release PR**: Only runs for `github-actions[bot]` with title starting with "chore: release"
2. **Wait for CI**: Waits for all CI and CD checks to pass
3. **Auto-approve**: Approves the release PR with success message
4. **Auto-merge**: Enables auto-merge with squash strategy
5. **Add Label**: Adds `autorelease: tagged` label

### Automerge Conditions

✅ **Auto-merged**:
- PR created by release-please (github-actions[bot])
- Title starts with "chore: release"
- All CI/CD checks pass (Lint, Type Check, Unit Tests, E2E Tests, Build)

### Permissions

```yaml
permissions:
  contents: write        # To merge PRs
  pull-requests: write   # To approve and label
  checks: read          # To read CI check status
```

## Release Flow

The complete release flow with automerge:

```
1. Developer commits with conventional commits (feat:, fix:, etc.)
   ↓
2. Push to main
   ↓
3. CD workflow runs
   ├─→ Runs CI checks
   └─→ release-please creates release PR
   ↓
4. Automerge workflow triggers
   ├─→ Waits for all CI/CD checks
   ├─→ Auto-approves
   └─→ Auto-merges
   ↓
5. Release PR merged
   ↓
6. release-please creates GitHub Release
   ↓
7. Release workflow builds Android APKs
   ↓
8. APKs uploaded to release
```

## Dependency Update Flow

The complete dependency update flow with automerge:

```
1. Dependabot scans for updates (weekly, Mondays)
   ↓
2. Creates grouped PRs for updates
   ↓
3. CI workflow runs
   ├─→ Lint
   ├─→ Type Check
   ├─→ Unit Tests
   ├─→ E2E Tests
   └─→ Build
   ↓
4. Automerge workflow triggers
   ├─→ Waits for all CI checks
   ├─→ Auto-approves (patch/minor only)
   └─→ Auto-merges if safe
   ↓
5. PR merged or awaits manual review (major updates)
```

## Safety Mechanisms

### Dependabot Automerge
- ✅ Only merges patch and minor updates
- ✅ Requires all CI checks to pass
- ✅ Only runs for `dependabot[bot]` actor
- ✅ Major updates require manual review
- ✅ Adds warning comments for major updates

### Release Automerge
- ✅ Only merges release-please PRs
- ✅ Requires all CI and CD checks to pass
- ✅ Only runs for `github-actions[bot]` actor
- ✅ Validates PR title format

## Disabling Automerge

If you need to disable automerge for a specific PR:

### For Dependabot PRs
```bash
# Remove the automerge label
gh pr edit <PR_NUMBER> --remove-label "automerge"

# Or comment on the PR
@dependabot ignore this major version
@dependabot ignore this minor version
@dependabot ignore this dependency
```

### For Release PRs
```bash
# Close and reopen the PR to prevent automerge
gh pr close <PR_NUMBER>
# Review changes
gh pr reopen <PR_NUMBER>
# Manually merge when ready
```

## Monitoring

### Check Automerge Status

```bash
# View all open PRs with automerge enabled
gh pr list --label "automerge"

# View dependabot PRs
gh pr list --author "app/dependabot"

# View release PRs
gh pr list --search "is:pr is:open author:app/github-actions in:title chore: release"
```

### Check Workflow Runs

```bash
# View automerge-dependabot workflow runs
gh run list --workflow=automerge-dependabot.yml

# View automerge-release workflow runs
gh run list --workflow=automerge-release.yml
```

## Troubleshooting

### Automerge Not Triggering

**Issue**: Workflow doesn't run on PR
- Check if actor is correct (`dependabot[bot]` or `github-actions[bot]`)
- Verify PR has appropriate labels
- Check workflow permissions in Settings > Actions > General

**Issue**: CI checks never complete
- Check CI workflow for errors
- Verify all required checks are defined in workflow
- Check for flaky E2E tests

### Automerge Failing

**Issue**: PR not merging after approval
- Ensure branch protection rules allow automerge
- Check if "Require pull request reviews before merging" is configured
- Verify all required status checks are passing

### Manual Override Needed

```bash
# Disable auto-merge on a PR
gh pr merge --disable-auto <PR_NUMBER>

# Force merge (use with caution)
gh pr merge <PR_NUMBER> --squash --admin
```

## Configuration

### Modify Update Schedule

Edit `.github/dependabot.yml`:

```yaml
schedule:
  interval: "weekly"  # Can be: daily, weekly, monthly
  day: "monday"       # Day of week for weekly
  time: "09:00"       # Time in 24h format
  timezone: "America/New_York"
```

### Modify Automerge Conditions

Edit workflow files to change conditions:

**For Dependabot** (`.github/workflows/automerge-dependabot.yml`):
```yaml
# Change which updates to auto-merge
if: |
  steps.metadata.outputs.update-type == 'version-update:semver-patch' ||
  steps.metadata.outputs.update-type == 'version-update:semver-minor'
```

**For Releases** (`.github/workflows/automerge-release.yml`):
```yaml
# Change which releases to auto-merge
if: |
  github.actor == 'github-actions[bot]' &&
  startsWith(github.event.pull_request.title, 'chore: release')
```

## Security

### Permissions

Both automerge workflows use minimal required permissions:
- `contents: write` - Only for merging PRs
- `pull-requests: write` - Only for approval and labels
- `checks: read` - Only for reading CI status

### Actor Verification

Workflows verify the PR author:
- Dependabot: Must be `dependabot[bot]`
- Release: Must be `github-actions[bot]`

This prevents malicious PRs from being auto-merged.

### Branch Protection

Recommended branch protection rules for `main`:
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
  - Lint
  - Type Check
  - Unit Tests
  - Build
- ✅ Require branches to be up to date before merging
- ✅ Include administrators (optional)

## References

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [GitHub Actions Automerge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)
- [release-please Documentation](https://github.com/googleapis/release-please)
