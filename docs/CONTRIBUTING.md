# Contributing to Psyduck Panic

Thank you for your interest in contributing to Psyduck Panic! We welcome contributions from the community.

## 🤝 How to Contribute

### Reporting Bugs

1. **Check existing issues** - Search to see if the bug has been reported
2. **Create a new issue** - Use the bug report template
3. **Provide details**:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser/OS information
   - Screenshots if applicable

### Suggesting Features

1. **Check discussions** - See if it's already been suggested
2. **Open a discussion** - Describe your idea
3. **Get feedback** - Discuss with maintainers before implementing

### Submitting Changes

1. **Fork the repository**
2. **Create a branch** - Use descriptive name: `feature/add-new-enemy` or `fix/collision-bug`
3. **Make changes** - Follow our coding guidelines
4. **Write tests** - Add/update tests for your changes
5. **Run checks**:
   ```bash
   pnpm lint:fix
   pnpm test
   pnpm test:e2e
   pnpm build
   ```
6. **Commit** - Use clear, descriptive commit messages
7. **Push** - Push your branch to your fork
8. **Open PR** - Create a pull request with description

## 📋 Development Setup

See [DEVELOPING.md](../DEVELOPING.md) for detailed setup instructions.

Quick start:
```bash
git clone https://github.com/your-username/psyduck-panic.git
cd psyduck-panic
pnpm install
pnpm dev
```

## 📝 Coding Guidelines

### General Principles

- **Quality over quantity** - Small, focused changes are better
- **Test your code** - All changes should include tests
- **Follow conventions** - Match existing code style
- **Document changes** - Update docs when needed
- **Be respectful** - Follow our Code of Conduct

### TypeScript/JavaScript

- Use TypeScript strict mode
- No `any` types - use proper types
- Prefer `const` over `let`
- Use modern ES6+ features
- Follow existing naming conventions

### React

- Functional components only
- Use React hooks
- Keep components small and focused
- Handle both mouse and touch events

### Testing

- Write tests for new features
- Update tests when changing behavior
- Aim for meaningful test coverage
- Use descriptive test names

### Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting:

```bash
pnpm lint       # Check code
pnpm lint:fix   # Auto-fix issues
pnpm format     # Format code
```

## 🎮 Game Design Guidelines

### Retro Aesthetic

- Maintain pixel-art style
- Use CRT effect appropriately
- Keep color palette consistent
- Preserve retro sound design

### Game Balance

- Test difficulty changes thoroughly
- Consider player progression
- Maintain challenge curve
- Get feedback before major changes

### Performance

- Keep bundle size small
- Optimize Canvas operations
- Test on mobile devices
- Avoid memory leaks

## 🔍 Code Review Process

### What We Look For

1. **Correctness** - Does it work as intended?
2. **Tests** - Are there adequate tests?
3. **Style** - Does it follow our guidelines?
4. **Performance** - Is it efficient?
5. **Documentation** - Are docs updated?

### Timeline

- Initial review within 3-5 days
- Feedback and iteration as needed
- Merge when approved and checks pass

## 🐛 Bug Triage

### Priority Levels

- **Critical** - Game crashes, data loss
- **High** - Major features broken
- **Medium** - Minor features broken
- **Low** - Cosmetic issues, enhancements

### Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed

## 📚 Resources

- [DEVELOPING.md](../DEVELOPING.md) - Development guide
- [AGENTS.md](../AGENTS.md) - AI agent instructions
- [SECURITY.md](../SECURITY.md) - Security policies
- [Code of Conduct](CODE_OF_CONDUCT.md) - Community guidelines

## 🎯 Areas to Contribute

### Good First Issues

- Adding new enemy types/phrases
- Creating new power-ups
- Improving documentation
- Writing tests
- Fixing typos

### Advanced Contributions

- Performance optimizations
- New game modes
- Audio improvements
- Mobile UX enhancements
- Accessibility features

## 💬 Communication

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and ideas
- **Pull Requests** - Code contributions and reviews

## 🙏 Recognition

Contributors are recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Special thanks in README (for major features)

## ⚖️ License

By contributing, you agree that your contributions will be licensed under the ISC License.

---

Thank you for contributing to Psyduck Panic! 🎮✨
