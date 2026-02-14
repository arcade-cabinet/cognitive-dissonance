# Security Policy

## 🔒 Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## 🚨 Reporting a Vulnerability

We take the security of Psyduck Panic seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do NOT:

- Open a public GitHub issue
- Disclose the vulnerability publicly before it has been addressed
- Exploit the vulnerability beyond what is necessary for verification

### Please Do:

1. **Email us directly** at [security contact - update with actual email]
   - Or use GitHub's private vulnerability reporting feature
2. **Provide details** including:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)
3. **Give us time** to respond and address the issue (typically 90 days)

### What to Expect:

1. **Acknowledgment** - We'll respond within 48 hours
2. **Assessment** - We'll investigate and assess the severity
3. **Fix** - We'll develop and test a patch
4. **Release** - We'll release the fix and credit you (if desired)
5. **Disclosure** - Coordinated public disclosure after fix is deployed

## 🛡️ Security Best Practices

### For Contributors

When contributing to this project, please follow these security guidelines:

#### Code Security

- **No Secrets** - Never commit API keys, tokens, or credentials
- **Validate Input** - Always sanitize and validate user input
- **Dependencies** - Keep dependencies updated and review security advisories
- **XSS Prevention** - Use React's built-in XSS protections, avoid `dangerouslySetInnerHTML`
- **CSP** - Respect Content Security Policy settings

#### Browser Security

This is a client-side browser game with the following security considerations:

1. **Local Storage** - Only store non-sensitive data (scores, settings)
2. **No Authentication** - Game doesn't handle passwords or personal data
3. **No Server** - All logic runs client-side (static hosting)
4. **External Resources** - Minimize third-party dependencies

### For Users

#### Safe Play

- Play from official sources only:
  - ✅ https://arcade-cabinet.github.io/psyduck-panic/
  - ✅ Official Arcade Cabinet mirrors
- Be cautious of unofficial copies that may:
  - Inject malicious code
  - Harvest data
  - Contain malware

#### Privacy

This game:
- ✅ Runs entirely in your browser
- ✅ Stores high scores locally (localStorage)
- ✅ No tracking or analytics
- ✅ No ads or third-party scripts
- ✅ No personal data collection
- ✅ No network requests (except initial load)

## 🔍 Security Features

### Current Protections

1. **Static Site** - No server-side code reduces attack surface
2. **No Backend** - No database or API to compromise
3. **CSP Headers** - Content Security Policy via GitHub Pages
4. **HTTPS** - Always served over secure connection
5. **No Dependencies Runtime** - Minimal external dependencies

### Build-Time Security

- **Dependency Scanning** - Regular `npm audit` checks
- **Type Safety** - TypeScript prevents common vulnerabilities
- **Linting** - Biome catches potential security issues
- **Automated Tests** - CI/CD pipeline validates builds

## 📦 Dependency Security

We regularly monitor and update dependencies to address security vulnerabilities.

### Checking Dependencies

```bash
# Check for known vulnerabilities
pnpm audit

# Update dependencies
pnpm update

# View outdated packages
pnpm outdated
```

### Dependency Policy

- **Regular Updates** - Review and update dependencies monthly
- **Security Patches** - Apply security patches within 7 days
- **Minimal Dependencies** - Only use essential packages
- **Trusted Sources** - Only use well-maintained, popular packages

## 🔐 Secure Development

### CI/CD Security

Our GitHub Actions workflows:
- Use pinned action versions
- Limit permissions to minimum required
- No secrets in public repositories
- Automated security scanning

### Code Review

All changes go through:
1. Automated tests (Vitest + Playwright)
2. Linting and type checking (Biome + TypeScript)
3. Security review for sensitive changes
4. Manual code review for PRs

## 📋 Security Checklist

Before releasing:

- [ ] All dependencies updated to latest secure versions
- [ ] No credentials or secrets in code
- [ ] Input validation on all user inputs
- [ ] XSS protection verified
- [ ] Tests passing (unit + E2E)
- [ ] Security advisories reviewed
- [ ] Build artifacts scanned

## 🤝 Responsible Disclosure

We appreciate security researchers who:
- Report vulnerabilities privately
- Give us reasonable time to fix issues
- Follow coordinated disclosure practices

We commit to:
- Acknowledge reports within 48 hours
- Keep researchers informed of progress
- Credit researchers in security advisories (if desired)
- Not take legal action against good-faith researchers

## 📞 Contact

For security concerns:
- **Private Reports**: Use GitHub Security Advisories
- **General Questions**: Open a public discussion
- **Urgent Issues**: [Add security contact email]

## 🔄 Security Updates

This policy is reviewed and updated quarterly. Last updated: February 2026

## 📚 Additional Resources

- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)

---

Thank you for helping keep Psyduck Panic and its users safe! 🛡️
