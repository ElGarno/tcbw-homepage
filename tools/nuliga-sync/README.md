# nuliga-sync

Standalone JS modules for syncing match schedules from liga.nu into Hugo content.
Logic is bundled into n8n Code nodes for production.
See `doc/specs/2026-04-20-nuliga-sync-workflow.md` for the design spec.

## Setup

```bash
cd tools/nuliga-sync
npm install
```

## Test

```bash
npm test
```

## Baseline (fetch live + diff)

```bash
npm run baseline
```

Should report 0 changes after content migration is complete.
Any non-zero diff means parser/normalizer needs adjustment OR
liga.nu has actual changes that need a PR.

## Bundle for n8n

```bash
npm run bundle
```

Outputs `dist/n8n-bundle.js` — paste into the relevant Code node
in `doc/specs/n8n-nuliga-sync.json`.
