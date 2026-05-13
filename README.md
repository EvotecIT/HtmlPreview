# Evotec HTML Preview

Static GitHub Pages-hostable previewer for public GitHub `.html` and `.htm` files. It fetches a raw GitHub HTML file in the browser, injects a `<base>` URL for relative assets, rewrites relative HTML links back through the previewer, and renders the result in a sandboxed iframe.

This is not a proxy, backend, browser extension, private repository viewer, sanitizer, or multi-forge gateway.

## Stage 1 Scope

- Supports `github.com/OWNER/REPO/blob/BRANCH/path/file.html`
- Supports `raw.githubusercontent.com/OWNER/REPO/BRANCH/path/file.html`
- Converts blob URLs to raw URLs
- Inlines relative nested `.html` and `.htm` iframe previews where possible
- Runs fully as static HTML, CSS, and browser ES modules
- Uses `packages/preview-core` as the source of truth, copied into `site/core` by `tools/prepare-site.ps1`

Future stages are documented in [docs/roadmap.md](docs/roadmap.md) and are not implemented here.

## Usage

```text
https://evotecit.github.io/HtmlPreview/?url=https://github.com/EvotecIT/ChartForgeX/blob/main/Website/static/examples/generated/example.html
```

Legacy direct query form is also accepted:

```text
https://evotecit.github.io/HtmlPreview/?https://github.com/OWNER/REPO/blob/main/file.html
```

Opening the base domain shows the URL entry screen. Opening a URL with `?url=` loads the report in a full-window preview mode with a compact action dock.

## Local Development

```powershell
.\tools\prepare-site.ps1
.\tools\serve-local.ps1
```

Then open `http://localhost:8080/`.

## GitHub Pages Deployment

The `Deploy GitHub Pages` workflow prepares `site/core`, uploads `site/`, and deploys it with the official GitHub Pages actions. Enable GitHub Pages for the repository and use GitHub Actions as the Pages source.

## Security And Limitations

Previewed HTML is assigned only to `iframe.srcdoc` with `sandbox="allow-scripts allow-popups allow-downloads allow-forms"` and `referrerpolicy="no-referrer"`. The parent UI does not inject fetched HTML into its own DOM.

Stage 1 is best for public, trusted, self-contained reports. Single-file HTML with inline CSS/JS is most reliable. Public CDN assets are fine. Relative assets are best-effort through the injected `<base href>`. Private repositories, authentication, CORS proxies, branch names containing slashes, and complex multi-file apps are not supported in Stage 1.

The browser tab title is updated from the fetched report title after load. Per-report social/link preview metadata is not possible in static Stage 1 hosting because unfurlers need metadata in the initial HTML response.

Manual coverage is listed in [docs/manual-tests.md](docs/manual-tests.md).
