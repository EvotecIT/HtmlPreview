# Architecture

Stage 1 is a static GitHub Pages app. There is no server, proxy, database, GitHub API call, extension package, or build system.

## Layout

- `site/` contains the deployable app.
- `site/assets/` contains UI orchestration and styling.
- `packages/preview-core/` contains reusable browser-compatible ES modules.
- `site/core/` is generated from `packages/preview-core/` by `tools/prepare-site.ps1`.
- `site/assets/core/index.js` is a generated shim so `site/assets/app.js` can import `./core/index.js` while the real copied modules remain in `site/core/`.
- `samples/` contains small public test reports.

`packages/preview-core/` is the source of truth. Future extension or backend work can reuse that package without moving the Stage 1 site.

## Rendering Flow

1. The UI reads `?url=` or the legacy direct query string.
2. `parseInputUrl` validates and normalizes the GitHub URL.
3. The browser fetches `rawFileUrl` directly from `raw.githubusercontent.com`.
4. `injectBaseHref` removes existing `<base>` tags and inserts one pointing to `rawBaseUrl`.
5. `rewriteInternalHtmlLinks` rewrites relative `.html` and `.htm` links to this previewer.
6. `inlineRelativeHtmlFrames` inlines relative `.html` and `.htm` iframe sources as nested `srcdoc` frames where possible.
7. The processed HTML is assigned to a sandboxed iframe through `srcdoc`.

Relative CSS, JavaScript, and image assets are not rewritten in Stage 1. They rely on the injected base URL.

## Why No Backend

Stage 1 is intentionally cheap to host and simple to reason about. It only supports public GitHub-hosted HTML that the browser can fetch directly.

## Why No Browser Extension

The first stage validates the preview model as a normal web page. Browser extension integration can be added later without changing the core parsing and rewriting modules.

## Future Path

Stage 2 can add GitHub UX helpers. Stage 3 can add a controlled gateway for richer asset handling and private access. Stage 4 can add multi-forge and product integrations. Those stages are documented only and are not implemented now.
