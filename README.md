# env-drift

Detect environment configuration drift before it breaks your application.

```bash
npx @sudip_18/env-drift
```

```text
env-drift

Reference: .env.example
Scanned: 4 source files

✓ 2 variables documented
✗ 1 variables missing
⚠ 1 variables unused

Missing from reference:
  STRIPE_SECRET_KEY

Unused in source:
  OLD_API_KEY

Drift detected.
```

## Installation

```bash
npm install --save-dev @sudip_18/env-drift
```

## Usage

Run from the project root. After installation, the `env-drift` command uses `.env.example` as the reference file and recursively scans supported source files.

```bash
npx @sudip_18/env-drift
npx @sudip_18/env-drift --env-file .env.development
npx @sudip_18/env-drift --path ./src
npx @sudip_18/env-drift --json
npx @sudip_18/env-drift --ci
```

Exit codes are `0` for no drift, `1` for detected drift, and `2` for invalid input or a tool error.

`--json` produces this stable shape:

```json
{
  "referenceFile": ".env.example",
  "used": ["DATABASE_URL"],
  "missing": [],
  "unused": [],
  "dynamic": false,
  "summary": { "used": 1, "documented": 1, "missing": 0, "unused": 0 }
}
```

## What it detects

- **Missing**: a variable used in source but absent from the reference file.
- **Unused**: a variable documented in the reference file with no static source usage.
- **Dynamic**: an access such as `process.env[key]` whose name cannot be known statically.

Supported static syntax:

```ts
process.env.DATABASE_URL
process.env["DATABASE_URL"]
import.meta.env.API_URL
import.meta.env['API_URL']
```

Supported source extensions are `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, and `.cjs`. The scanner skips common generated and dependency directories including `node_modules`, `.git`, `dist`, `build`, and `coverage`.

## CI

```yaml
name: environment drift
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx env-drift --ci
```

## Security and privacy

env-drift reads files locally, never executes project code, makes no network requests, and never prints environment values. Reports contain variable names only.

## Limitations

Dynamic property access, such as `process.env[key]`, cannot be resolved safely. It is reported but never guessed or marked missing.

## Comparison

| Tool | Purpose |
| --- | --- |
| dotenv | Loads variables |
| Zod | Validates values |
| env-drift | Detects configuration drift |

## Development

Requires Node.js 20 or later.

```bash
npm install
npm test
npm run typecheck
npm run build
```
