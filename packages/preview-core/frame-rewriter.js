import { parseInputUrl } from "./github-url.js";
import { injectBaseHref } from "./html-processing.js";
import { rewriteInternalHtmlLinks } from "./link-rewriter.js";
import { IFRAME_REFERRER_POLICY, IFRAME_SANDBOX, isAllowedExtension, isUnsafeScheme } from "./security.js";

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
      const nestedSource = await fetchText(fetcher, nestedContext.rawFileUrl);
      const nestedWithBase = injectBaseHref(nestedSource, nestedContext.rawBaseUrl);
      const nestedWithLinks = rewriteInternalHtmlLinks(nestedWithBase, nestedContext, previewBaseUrl);
      const nestedProcessed = await inlineRelativeHtmlFrames(nestedWithLinks, nestedContext, previewBaseUrl, {
        fetcher,
        maxDepth: maxDepth - 1
      });

      frame.removeAttribute("src");
      frame.setAttribute("srcdoc", nestedProcessed);
      frame.setAttribute("sandbox", IFRAME_SANDBOX);
      frame.setAttribute("referrerpolicy", IFRAME_REFERRER_POLICY);
      frame.setAttribute("loading", "lazy");
      frame.setAttribute("data-html-preview-inlined", "true");
    } catch (error) {
      frame.setAttribute("title", `Unable to inline nested HTML frame: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }));

  return `<!doctype html>\n${parsed.documentElement.outerHTML}`;
}
