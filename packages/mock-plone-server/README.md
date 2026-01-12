# Volto hydra mock plone server

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start the server

```bash
pnpm start
```

## Mock API Endpoints

The Express mock server implements:

### Essential Endpoints

- `POST /@login` - Returns mock JWT token
- `GET /{path}` - Returns content from fixtures
- `PATCH /{path}` - Updates content in memory
- `GET /@types/{type}` - Returns content type schema

### Optional Endpoints

- `GET /{path}/@breadcrumbs` - Returns breadcrumb trail
- `POST /{path}/@lock` - Returns mock lock response

### Adding Mock Data

Edit `tests-playwright/fixtures/api/content.json`:

```json
{
  "@id": "http://localhost:8888/test-page",
  "@type": "Document",
  "title": "Test Page",
  "blocks": {
    "uuid-1": {
      "@type": "slate",
      "value": [...]
    }
  },
  "blocks_layout": {
    "items": ["uuid-1"]
  }
}
```

The mock server automatically loads this on startup.

## Troubleshooting

### Servers Don't Start

Check ports are available:

```bash
lsof -i :8888  # Mock API
```

Kill existing processes if needed:

```bash
kill -9 <PID>
```

### Mock API 404 Errors

Verify fixture file exists:

```bash
cat tests-playwright/fixtures/api/content.json
```

Check mock server is loading it:

```bash
DEBUG=1 node tests-playwright/fixtures/mock-api-server.js
```

### Volto Can't Connect to Mock API

Check CORS headers in mock server (`mock-api-server.js`):

```javascript
app.use(cors()); // Should be present
```

## Resources

- [Playwright Test Documentation](https://playwright.dev/docs/intro)
- [Volto Documentation](https://6.docs.plone.org/volto/)
- [Volto Hydra README](../README.md)
