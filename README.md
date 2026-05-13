# Evotec HTML Preview

Preview public GitHub-hosted HTML reports without turning every report folder into its own GitHub Pages site.

Open the previewer, paste a GitHub `.html` or `.htm` file URL, and share the generated preview link. Direct preview links open report-first, with the report filling the browser window and a small action dock for copying/opening the source.

[Open preview.evotec.xyz](https://preview.evotec.xyz/) · [View source](https://github.com/EvotecIT/HtmlPreview)

## Use It

Paste a GitHub blob URL:

```text
https://github.com/EvotecIT/ChartForgeX/blob/main/Website/static/examples/generated/catalog.html
```

Or share it as a preview link:

```text
https://preview.evotec.xyz/?url=https://github.com/EvotecIT/ChartForgeX/blob/main/Website/static/examples/generated/catalog.html
```

Raw GitHub URLs are also supported:

```text
https://raw.githubusercontent.com/OWNER/REPO/BRANCH/path/report.html
```

For heavy report catalogs, nested HTML iframes default to lazy placeholders. Add `embed=live` to render nested HTML previews immediately, or `embed=off` to skip them.

## What Happens

```mermaid
flowchart LR
    person["Person with a report link"] --> paste["Paste or open preview URL"]
    paste --> preview["preview.evotec.xyz"]
    preview --> check["Validate public GitHub HTML URL"]
    check --> raw["Fetch raw GitHub HTML in the browser"]
    raw --> prepare["Add base URL, rewrite report links, inline nested HTML frames"]
    prepare --> frame["Render report inside sandboxed iframe"]
    frame --> share["Copy preview link or open GitHub source"]
```

The previewer stays static. There is no backend, proxy, authentication, database, or GitHub API call in Stage 1.

## Works Best With

- Single-file HTML reports.
- Inline CSS and JavaScript when you want maximum portability.
- Public CDN assets.
- Relative CSS, JavaScript, images, and nested relative `.html` iframes that can resolve from `raw.githubusercontent.com`.
- Heavy catalogs where nested examples can load on demand.

## Current Limits

- Public GitHub files only.
- No private repositories or authentication.
- No CORS proxy or asset downloader.
- No HTML sanitization engine.
- Branch names containing slashes are not fully supported in Stage 1.
- Per-report social unfurl metadata is not possible without a backend because link preview crawlers need metadata in the first HTML response.

## Develop Locally

```powershell
.\tools\serve-local.ps1
```

That runs `tools/prepare-site.ps1` first, copies `packages/preview-core` into the generated site folders, and serves `site/` at:

```text
http://localhost:8080/
```

## Deploy

GitHub Pages deployment is handled by `.github/workflows/pages.yml`.

The workflow prepares the static site, uploads `site/`, and publishes it through GitHub Pages. The custom domain is carried by `site/CNAME`.

## More Detail

- [Architecture](docs/architecture.md)
- [Security model](docs/security.md)
- [Manual tests](docs/manual-tests.md)
- [Roadmap](docs/roadmap.md)
