import { isAllowedExtension, isUnsafeScheme } from "./security.js";

function isRelativeHtmlCandidate(href) {
  const value = String(href || "").trim();

  if (!value || value.startsWith("#") || value.startsWith("//")) {
    return false;
  }

  if (isUnsafeScheme(value)) {
    return false;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return false;
  }

  return true;
}

function getPathExtension(pathname) {
  const lower = String(pathname || "").toLowerCase();
  return lower.endsWith(".html") || lower.endsWith(".htm");
}

function createViewerUrl(blobUrl, previewBaseUrl) {
  const viewer = new URL(previewBaseUrl);
  viewer.search = "";
  viewer.hash = "";
  viewer.searchParams.set("url", blobUrl);
  return viewer.href;
}

export function rewriteInternalHtmlLinks(html, context, previewBaseUrl) {
  if (!context || !context.githubBlobUrl) {
    throw new Error("A GitHub preview context is required before rewriting links.");
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(String(html || ""), "text/html");

  parsed.querySelectorAll("a[href]").forEach((anchor) => {
    const originalHref = anchor.getAttribute("href");

    if (!isRelativeHtmlCandidate(originalHref)) {
      return;
    }

    let resolved;
    try {
      resolved = new URL(originalHref, context.githubBlobUrl);
    } catch {
      return;
    }

    if (resolved.hostname !== "github.com" || !resolved.pathname.includes("/blob/")) {
      return;
    }

    if (!getPathExtension(resolved.pathname) || !isAllowedExtension(resolved.pathname)) {
      return;
    }

    anchor.setAttribute("href", createViewerUrl(resolved.href, previewBaseUrl));
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
  });

  return `<!doctype html>\n${parsed.documentElement.outerHTML}`;
}
