# Automated Workflows — Cognitive Dissonance v3.0

## Dependabot Configuration

Dependabot automatically creates pull requests for dependency updates. Configuration in `.github/dependabot.yml`.

### Package Groups

**babylonjs**: `@babylonjs/*`
**reactylon**: `reactylon`, `reactylon-native`
**expo**: `expo`, `expo-*`
**react-native**: `react-native`, `react-native-*`
**react**: `react`, `react-dom`, `@types/react`, `@types/react-dom`
**testing**: `jest`, `ts-jest`, `@types/jest`, `fast-check`, `@playwright/test`, `maestro`
**dev-tools**: `@biomejs/biome`, `@types/node`

### Update Schedule

- **Frequency**: Weekly (Monday)
- **Time**: 09:00 UTC
- **Open PR limit**: 10 per ecosystem

### GitHub Actions

- **Frequency**: Weekly (Monday)
- **Time**: 09:00 UTC
- **Target**: `.github/workflows/*.yml`

## Automerge Workflow

Pull requests with the `automerge` label are automatically merged after CI passes.

### Conditions

1. CI workflow must complete successfully (all jobs passing)
2. PR must have `automerge` label
3. No merge conflicts

### Behavior

- Waits for `ci-success` job to complete
- Merges via GitHub API with squash merge strategy
- Deletes branch after merge

### Dependabot PRs

Dependabot PRs are **no longer excluded** from CI in v3.0. All PRs run the full test suite (Jest unit tests, Playwright web E2E, Maestro mobile E2E).

To automerge a Dependabot PR:
1. Review the PR
2. Add `automerge` label
3. CI will run automatically
4. PR will merge after CI passes

## Manual Workflow Triggers

### Triggering CI Manually

```bash
# Push to trigger CI
git push origin feature-branch

# Or create a PR
gh pr create --base main --head feature-branch
```

### Triggering CD Manually

```bash
# Push to main to trigger CD
git push origin main

# Or merge a PR to main
gh pr merge [PR_NUMBER] --squash
```

### Triggering EAS Build Manually

```bash
# iOS preview build
eas build --platform ios --profile preview

# Android preview build
eas build --platform android --profile preview
```

## References

- [GitHub Actions](./GITHUB_ACTIONS.md) — CI/CD pipeline details
- [Deployment](./DEPLOYMENT.md) — Deployment procedures
