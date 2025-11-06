# Running Playwright Tests

## Run all tests
```bash
pnpm exec playwright test
```

## Run a specific test file
```bash
pnpm exec playwright test tests-playwright/integration/block-selection.spec.ts
```

## Run a specific test by line number
```bash
pnpm exec playwright test tests-playwright/integration/sidebar-forms.spec.ts:14
```

## Run tests with UI mode (interactive)
```bash
pnpm exec playwright test --ui
```

## Run tests in headed mode (see browser)
```bash
pnpm exec playwright test --headed
```

## View test report
```bash
pnpm exec playwright show-report
```

## Test Architecture

The Playwright tests use:
- **Mock API server** (`tests-playwright/fixtures/mock-api-server.js`) - Serves both mock Plone API and test frontend on port 8888
- **Test frontend** (`tests-playwright/fixtures/test-frontend/`) - Simple HTML/JS frontend that loads the real Hydra bridge
- **Real Hydra bridge** (`packages/hydra-js/hydra.js`) - Production bridge code for iframe-Admin UI communication
- **Admin UI** - Runs on port 3001 (started by test setup)

## Key Test Files

- `tests-playwright/integration/block-selection.spec.ts` - Tests clicking blocks in iframe selects them
- `tests-playwright/integration/sidebar-forms.spec.ts` - Tests sidebar form fields appear correctly
- `tests-playwright/integration/quanta-toolbar.spec.ts` - Tests Quanta toolbar appears on block selection
- `tests-playwright/integration/inline-editing.spec.ts` - Tests inline editing functionality
- `tests-playwright/integration/drag-and-drop.spec.ts` - Tests block reordering via drag and drop ✅

## Troubleshooting

### Segfault Error (Exit code 139)

If you get a parcel segfault when starting tests:

```bash
Error: Process from config.webServer was not able to start. Exit code: 139
```

This is usually caused by lingering playwright processes. Fix with:

```bash
# Kill all playwright test processes
pkill -f "playwright test"

# Kill any processes on test ports
lsof -ti:8888,3001,3002 2>/dev/null | xargs kill -9 2>/dev/null

# Reinstall dependencies if needed
make install
```

### Build Issues

If you encounter build errors after modifying code in `packages/volto-hydra/`:

```bash
# The tests run Volto in development mode with hot module reloading
# So you typically don't need to rebuild
# Just ensure no lingering processes are running
```
