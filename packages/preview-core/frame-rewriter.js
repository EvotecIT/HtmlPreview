import { parseInputUrl } from "./github-url.js";
import { injectBaseHref } from "./html-processing.js";
import { rewriteInternalHtmlLinks } from "./link-rewriter.js";
import { IFRAME_REFERRER_POLICY, IFRAME_SANDBOX, isAllowedExtension, isUnsafeScheme } from "./security.js";

const VALID_EMBED_MODES = new Set(["lazy", "live", "off"]);

function normalizeEmbedMode(value) {
  return VALID_EMBED_MODES.has(value) ? value : "lazy";
}

function isRelativeHtmlFrame(src) {
  const value = String(src || "").trim();

  if (!value || value.startsWith("#") || value.startsWith("//")) {
    return false;
  }

  if (isUnsafeScheme(value)) {
    return false;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return false;
  }

  let resolved;
  try {
    resolved = new URL(value, "https://example.invalid/");
  } catch {
    return false;
  }

  return isAllowedExtension(resolved.pathname);
}

async function fetchText(fetcher, url) {
  const response = await fetcher(url, {
    cache: "no-cache",
    credentials: "omit",
    redirect: "follow",
    referrerPolicy: "no-referrer"
  });

  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status} ${response.statusText || ""}`.trim());
  }

  return response.text();
}

export async function inlineRelativeHtmlFrames(html, context, previewBaseUrl, options = {}) {
  const fetcher = options.fetcher || fetch;
  const maxDepth = Number.isInteger(options.maxDepth) ? options.maxDepth : 2;
  const embedMode = normalizeEmbedMode(options.embedMode);

  if (maxDepth <= 0) {
    return html;
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(String(html || ""), "text/html");
  const frames = Array.from(parsed.querySelectorAll("iframe[src]"));

  await Promise.all(frames.map(async (frame) => {
    const originalSrc = frame.getAttribute("src");

    if (!isRelativeHtmlFrame(originalSrc)) {
      return;
    }

    try {
      const nestedBlobUrl = new URL(originalSrc, context.githubBlobUrl);
      const nestedContext = parseInputUrl(nestedBlobUrl.href);
      frame.removeAttribute("src");
      frame.setAttribute("sandbox", IFRAME_SANDBOX);
      frame.setAttribute("referrerpolicy", IFRAME_REFERRER_POLICY);
      frame.setAttribute("loading", "lazy");
      frame.setAttribute("data-html-preview-inlined", "true");
      frame.setAttribute("data-html-preview-source", nestedContext.githubBlobUrl);
      frame.setAttribute("title", nestedContext.fileName);

      if (embedMode === "off") {
        frame.setAttribute("srcdoc", createPlaceholderFrame(nestedContext, "off"));
        return;
      }

      const nestedSource = await fetchText(fetcher, nestedContext.rawFileUrl);
      const nestedWithBase = injectBaseHref(nestedSource, nestedContext.rawBaseUrl);
      const nestedWithLinks = rewriteInternalHtmlLinks(nestedWithBase, nestedContext, previewBaseUrl);
      const nestedProcessed = await inlineRelativeHtmlFrames(nestedWithLinks, nestedContext, previewBaseUrl, {
        embedMode,
        fetcher,
        maxDepth: maxDepth - 1
      });

      if (embedMode === "live") {
        frame.setAttribute("srcdoc", nestedProcessed);
        return;
      }

      frame.setAttribute("srcdoc", createPlaceholderFrame(nestedContext, "lazy"));
      frame.setAttribute("data-html-preview-srcdoc", nestedProcessed);
    } catch (error) {
      frame.setAttribute("title", `Unable to inline nested HTML frame: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }));

  if (embedMode === "lazy") {
    injectLazyFrameLoader(parsed);
  }

  return `<!doctype html>\n${parsed.documentElement.outerHTML}`;
}

function createPlaceholderFrame(context, mode) {
  const message = mode === "off" ? "Nested preview skipped" : "Nested preview ready";
  const action = mode === "off" ? "Use embed=live to render this frame." : "Click the catalog card to load this frame.";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <style>
      html, body { height: 100%; margin: 0; overflow: hidden; }
      body { background: radial-gradient(circle at 20% 20%, rgba(94,234,212,.20), transparent 34%), linear-gradient(135deg, #0f172a, #111827 52%, #0f766e); color: #f8fafc; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { align-items: center; display: flex; flex-direction: column; gap: 6px; height: 100%; justify-content: center; padding: 18px; text-align: center; }
      h1 { font-size: clamp(1rem, 4vw, 1.35rem); line-height: 1.15; margin: 0; }
      p { color: #cbd5e1; font-size: clamp(.76rem, 2.2vw, .95rem); line-height: 1.35; margin: 0; max-width: 34rem; }
      code { color: #5eead4; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(message)}</h1>
      <p><code>${escapeHtml(context.fileName)}</code></p>
      <p>${escapeHtml(action)}</p>
    </main>
  </body>
</html>`;
}

function injectLazyFrameLoader(parsed) {
  if (parsed.querySelector("[data-html-preview-lazy-loader]")) {
    return;
  }

  const style = parsed.createElement("style");
  style.setAttribute("data-html-preview-lazy-loader", "true");
  style.textContent = `
iframe[data-html-preview-srcdoc] {
  cursor: pointer;
}
.html-preview-frame-load {
  align-items: center;
  background: linear-gradient(135deg, #0f766e, #0d9488);
  border: 1px solid rgba(94, 234, 212, .45);
  border-radius: 8px;
  box-shadow: 0 16px 32px rgba(13, 148, 136, .22);
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  font: 800 13px/1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  gap: 8px;
  margin: 8px 0 0;
  padding: 10px 12px;
}`;

  const script = parsed.createElement("script");
  script.setAttribute("data-html-preview-lazy-loader", "true");
  script.textContent = `
(() => {
  function loadFrame(frame) {
    const srcdoc = frame && frame.dataset.htmlPreviewSrcdoc;
    if (!srcdoc) return;
    frame.srcdoc = srcdoc;
    delete frame.dataset.htmlPreviewSrcdoc;
    frame.dataset.htmlPreviewLoaded = "true";
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".html-preview-frame-load");
    if (button) {
      const frame = button.closest("[data-html-preview-frame-wrap]")?.querySelector("iframe[data-html-preview-srcdoc]");
      loadFrame(frame);
      button.remove();
      return;
    }

    const frame = event.target.closest("iframe[data-html-preview-srcdoc]");
    loadFrame(frame);
  });

  document.querySelectorAll("iframe[data-html-preview-srcdoc]").forEach((frame) => {
    const wrap = document.createElement("div");
    wrap.dataset.htmlPreviewFrameWrap = "true";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "html-preview-frame-load";
    button.textContent = "Load embedded HTML preview";
    frame.parentNode.insertBefore(wrap, frame);
    wrap.appendChild(frame);
    wrap.appendChild(button);
  });
})();`;

  parsed.head.appendChild(style);
  parsed.body.appendChild(script);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
