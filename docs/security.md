# Security

Stage 1 accepts only HTTPS URLs from:

- `github.com`
- `raw.githubusercontent.com`

Only `.html` and `.htm` files are supported. Unsafe schemes such as `javascript:`, `data:`, `file:`, `blob:`, and `ftp:` are rejected as input.

## Sandbox

Rendered HTML is placed in an iframe using:

```text
sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads allow-forms"
referrerpolicy="no-referrer"
```

`allow-same-origin` is intentionally not included by default. User-clicked popups are allowed to escape the iframe sandbox so rewritten report links and linked SVG/PNG artifacts open as normal browser tabs instead of inheriting the preview iframe restrictions.

## Parent Isolation

The parent viewer never injects fetched HTML into its own DOM. It does not use `eval`, `document.write`, or `innerHTML` for user-controlled UI values. Metadata, errors, and status messages use text content.

## No Proxy

There is no backend and no CORS proxy. The browser fetches public raw GitHub files directly. If a file or asset cannot be fetched by the browser, Stage 1 does not work around that.

## Limitations

Previewing arbitrary public HTML still carries risk. Scripts may run inside the sandboxed iframe, links may open new pages, and public external assets may load. Use this viewer for public reports you trust or can inspect.
