---
name: Bug report
about: Report a reproducible bug in the IRL TypeScript SDK
title: "[BUG] "
labels: bug
assignees: ''
---

## Describe the bug

A clear and concise description of what the bug is.

## To reproduce

```typescript
// Minimal reproducer
import { IRLClient } from 'irl-sdk';
const client = new IRLClient({ baseUrl: '…', apiToken: '…' });
const result = await client.authorize({ … });
```

## Expected behavior

## Actual behavior

Include the full error / stack trace if applicable.

## Environment

- SDK version: `npm list irl-sdk`
- Node.js version: `node --version`
- TypeScript version: `tsc --version`
- IRL Engine version: `v?`

## Additional context
