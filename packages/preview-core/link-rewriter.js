import { isAllowedExtension, isUnsafeScheme } from "./security.js";

const OPENABLE_ARTIFACT_EXTENSIONS = new Set([".svg", ".png"]);

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

function getOpenableArtifactExtension(pathname) {
  const lower = String(pathname || "").toLowerCase();
  const match = lower.match(/(\.[a-z0-9]+)$/);
  return match ? match[1] : "";
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

    let blobResolved;
    try {
      blobResolved = new URL(originalHref, context.githubBlobUrl);
    } catch {
      return;
    }

    if (blobResolved.hostname !== "github.com" || !blobResolved.pathname.includes("/blob/")) {
      return;
    }

    if (getPathExtension(blobResolved.pathname) && isAllowedExtension(blobResolved.pathname)) {
      anchor.setAttribute("href", createViewerUrl(blobResolved.href, previewBaseUrl));
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
      return;
    }

    const artifactExtension = getOpenableArtifactExtension(blobResolved.pathname);
    if (!OPENABLE_ARTIFACT_EXTENSIONS.has(artifactExtension)) {
      return;
    }

    let rawResolved;
    try {
      rawResolved = new URL(originalHref, context.rawBaseUrl);
    } catch {
      return;
    }

    anchor.setAttribute("href", rawResolved.href);
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
  });

  return `<!doctype html>\n${parsed.documentElement.outerHTML}`;
}
