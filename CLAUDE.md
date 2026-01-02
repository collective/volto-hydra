# Architecture Documentation

Read `docs/slate-transforms-architecture.md` for understanding how Slate transforms work between hydra.js and View.jsx (Enter key, formatting, paste, delete handling).

## Block Access - NEVER use formData.blocks[blockId] directly

Blocks can be nested inside container blocks (columns, accordions, etc.), so they may NOT be at `formData.blocks[blockId]`. A block inside a column might be at `formData.blocks.columns-1.column_items.col-1.blocks.text-1`.

**Always use:**
```javascript
import { getBlockById, updateBlockById } from '../../utils/blockPath';

const block = getBlockById(formData, blockPathMap, blockId);
const newFormData = updateBlockById(formData, blockPathMap, blockId, updatedBlock);
```

**Never use:**
```javascript
// WRONG - will silently return undefined for nested blocks
const block = formData.blocks[blockId];
const block = properties?.blocks?.[blockId];
```

The `blockPathMap` tracks where every block lives in the nested structure. If a block isn't in the map, `getBlockById` returns `undefined` and `updateBlockById` throws - this is intentional to surface bugs immediately rather than silently failing.

# Running Playwright Tests

## Prerequisites

**Build dependencies once before first test run:**
```bash
pnpm build:deps
```

This builds `@plone/registry` and `@plone/components`. Only needed once unless you modify those packages.

## Running Tests

### Integration Tests

Playwright automatically starts the Volto server and waits for compilation before running tests.

```bash
pnpm test:e2e               # Run all integration tests (~48s+)
pnpm test:e2e:headed        # Run with visible browser
pnpm test:e2e:ui            # Run in UI mode
pnpm test:e2e:debug         # Run in debug mode
```

### Run specific tests
```bash
pnpm exec playwright test tests-playwright/integration/block-selection.spec.ts
pnpm exec playwright test tests-playwright/integration/sidebar-forms.spec.ts:14
```

### View test report
```bash
pnpm exec playwright show-report
```

## Test Architecture

The Playwright tests use:
- **Mock API server** (`tests-playwright/fixtures/mock-api-server.js`) - Serves both mock Plone API and test frontend on port 8888
- **Test frontend** (`tests-playwright/fixtures/test-frontend/`) - Simple HTML/JS frontend that loads the real Hydra bridge
- **Real Hydra bridge** (`packages/hydra-js/hydra.js`) - Production bridge code for iframe-Admin UI communication
- **Admin UI** - Runs on port 3001 (auto-started by Playwright via `webServer` config)

### Automatic Server Management

Playwright's `webServer` configuration (`playwright.config.ts`):
- Auto-starts Volto if not running (or reuses existing server)
- Polls `/health` endpoint until webpack compilation completes
- Tests only start after compilation succeeds
- If compilation fails, tests fail with error details

The health endpoint (`core/packages/volto/razzle.config.js`) returns:
- HTTP 503 "Compiling..." - webpack is compiling
- HTTP 500 + error - compilation failed
- HTTP 200 "OK" - ready for testing

## Key Test Files

- `tests-playwright/integration/block-selection.spec.ts` - Tests clicking blocks in iframe selects them
- `tests-playwright/integration/sidebar-forms.spec.ts` - Tests sidebar form fields appear correctly
- `tests-playwright/integration/quanta-toolbar.spec.ts` - Tests Quanta toolbar appears on block selection
- `tests-playwright/integration/inline-editing.spec.ts` - Tests inline editing functionality
- `tests-playwright/integration/drag-and-drop.spec.ts` - Tests block reordering via drag and drop

## Test Helpers

List all AdminUIHelper methods:
```bash
grep -E '^\s+(async\s+)?[a-zA-Z_]+\(' tests-playwright/helpers/AdminUIHelper.ts | grep -v 'if\s*(' | grep -v 'for\s*(' | sed 's/^\s*//' | awk -F'(' '{print $1}' | sed 's/async //' | sort -u
```

## Manual Development Server

To manually start the servers for development/testing:

```bash
# Terminal 1: Start mock API server (port 8888)
pnpm start:mock-api

# Terminal 2: Start Volto Hydra (port 3001 SSR, port 3002 webpack)
pnpm start:test

# Terminal 3 (optional): Start Nuxt frontend for Nuxt tests (port 3003)
pnpm start:nuxt:test
```

Then access: http://localhost:3001/test-page/edit

**Port summary:**

- **8888**: Mock API + test frontend (HTML/JS)
- **3001**: Volto SSR server (navigate here)
- **3002**: Webpack dev server (health check here)
- **3003**: Nuxt frontend (for Nuxt-specific tests)

## Development Workflow

### After Making Changes to Code

**For changes in `packages/volto-hydra/`:**

If you have Volto running manually:
1. Make your code changes
2. Volto auto-reloads via HMR (1-3 seconds)
3. Run tests (Playwright will wait for compilation)

If Volto is not running:
1. Just run tests - Playwright will start Volto and wait for compilation

**For changes to `packages/hydra-js/hydra.js`:**
- No Volto recompilation needed (loaded directly by frontend)
- Just run tests

### Monitoring Compilation

To manually check compilation status when Volto is running:

```bash
# Check health endpoint
curl http://localhost:3001/health

# Returns:
# - "Compiling..." (HTTP 503) - still compiling
# - "Compilation error: ..." (HTTP 500) - compilation failed
# - "OK" (HTTP 200) - ready
```

## Troubleshooting

### Module Not Found Errors

If you see errors like `Module not found: Can't resolve '@plone/components'`:

```bash
pnpm build:deps
```

This builds the workspace dependencies that Volto imports.

### Port Already in Use

If port 3001 is already in use:

```bash
lsof -ti:3001 | xargs kill -9
```

### Tests Running Against Old Code

If tests seem to be running against stale code:
1. Check that HMR completed: `curl http://localhost:3001/health` should return "OK"
2. If manually running Volto, check logs for compilation errors
3. Restart Volto if needed

### General Cleanup

```bash
# Kill any lingering test processes
pkill -f "playwright test"

# Kill processes on test ports
lsof -ti:8888,3001,3002 2>/dev/null | xargs kill -9 2>/dev/null
```

## Notes

- only git commit when I ask you to
- **NEVER** skip a test without explicit permission from the user
- Playwright's `webServer.reuseExistingServer: true` means it will use a manually-started Volto server if available
- The test setup skips `build:deps` to avoid parcel segfault in non-interactive shells
- **NEVER** kill all node processes haphazardly. check if you really need to kill a process as some tests reload
- to check volto is compiling use http://localhost:3002/health
- custom schemas are registered in the renderer.js on init.
- node ids are added dynamically by hydra.js