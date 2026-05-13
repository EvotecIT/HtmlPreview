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
  const message = mode === "off" ? "Preview skipped" : "Interactive preview";
  const action = mode === "off" ? "Use embed=live to render this frame." : "Loaded on demand for smoother browsing.";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <style>
      html, body { height: 100%; margin: 0; overflow: hidden; }
      body { background: #161718; color: #f4f0e8; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body::before { background: radial-gradient(circle at 50% 48%, rgba(45,212,191,.13), transparent 0 20%, rgba(45,212,191,.04) 38%, transparent 62%); content: ""; inset: 0; position: fixed; }
      main { align-items: center; display: flex; height: 100%; justify-content: center; padding: 24px; position: relative; text-align: center; transform: translateY(-34px); }
      section { align-items: center; display: flex; flex-direction: column; gap: 7px; max-width: min(34rem, 82vw); }
      .mark { align-items: center; border: 1px solid rgba(45,212,191,.42); border-radius: 999px; color: #5eead4; display: inline-flex; font-size: 12px; font-weight: 900; height: 30px; justify-content: center; letter-spacing: .06em; margin-bottom: 4px; padding: 0 12px; text-transform: uppercase; }
      h1 { color: #f8fafc; font-size: clamp(1rem, 2.4vw, 1.28rem); line-height: 1.15; margin: 0; }
      p { color: #b8c0cc; font-size: clamp(.74rem, 1.45vw, .92rem); line-height: 1.35; margin: 0; max-width: 30rem; }
      code { color: #5eead4; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .92em; overflow-wrap: anywhere; }
    </style>
  </head>
  <body>
    <main>
      <section aria-label="${escapeHtml(message)}">
        <span class="mark">HTML</span>
        <h1>${escapeHtml(message)}</h1>
        <p><code>${escapeHtml(context.fileName)}</code></p>
        <p>${escapeHtml(action)}</p>
      </section>
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
[data-html-preview-frame-wrap] {
  display: block;
  height: 100%;
  min-height: 0;
  min-width: 0;
  position: relative;
  width: 100%;
}
[data-html-preview-frame-wrap] > iframe {
  border: 0;
  display: block;
  height: 100%;
  min-height: 0;
  min-width: 0;
  width: 100%;
}
.html-preview-frame-load {
  align-items: center;
  background: linear-gradient(135deg, #0f766e, #0d9488);
  border: 1px solid rgba(94, 234, 212, .45);
  border-radius: 8px;
  box-shadow: 0 14px 26px rgba(13, 148, 136, .20);
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  font: 850 12px/1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  gap: 8px;
  left: 50%;
  margin: 0;
  padding: 10px 13px;
  position: absolute;
  top: 50%;
  transform: translate(-50%, 58px);
  z-index: 2;
}
.html-preview-frame-load:hover {
  background: linear-gradient(135deg, #0d9488, #14b8a6);
}
.html-preview-frame-load:focus-visible {
  outline: 2px solid #5eead4;
  outline-offset: 3px;
}
@media (max-width: 760px) {
  .html-preview-frame-load {
    max-width: calc(100% - 32px);
    transform: translate(-50%, 54px);
    white-space: normal;
  }
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
