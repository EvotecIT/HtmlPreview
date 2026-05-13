export function injectBaseHref(html, baseHref) {
  if (!baseHref) {
    throw new Error("A base href is required before rendering the preview.");
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(String(html || ""), "text/html");
  const documentElement = parsed.documentElement || parsed.createElement("html");

  if (!parsed.documentElement) {
    parsed.appendChild(documentElement);
  }

  let head = parsed.head;
  if (!head) {
    head = parsed.createElement("head");
    documentElement.insertBefore(head, documentElement.firstChild);
  }

  if (!parsed.body) {
    documentElement.appendChild(parsed.createElement("body"));
  }

  parsed.querySelectorAll("base").forEach((element) => element.remove());

  const base = parsed.createElement("base");
  base.setAttribute("href", baseHref);
  head.insertBefore(base, head.firstChild);

  return `<!doctype html>\n${documentElement.outerHTML}`;
}

export function extractHtmlMetadata(html) {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(String(html || ""), "text/html");
  const title = (parsed.querySelector("title")?.textContent || "").trim();
  const description = (
    parsed.querySelector('meta[name="description" i]')?.getAttribute("content") ||
    parsed.querySelector('meta[property="og:description" i]')?.getAttribute("content") ||
    ""
  ).trim();

  return { title, description };
}
