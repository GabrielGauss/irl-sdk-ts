# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.2.x   | Yes       |
| < 0.2   | No        |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email **security@macropulse.live** with:

1. A clear description of the vulnerability
2. Steps to reproduce
3. Affected versions
4. Potential impact

You will receive an acknowledgement within **48 hours**.

## Scope

In scope:
- Ed25519 signature verification logic in the TypeScript client
- Token/API key exposure via logs or error messages
- Insecure default TLS behavior

Out of scope:
- Issues in upstream npm packages (report upstream)
