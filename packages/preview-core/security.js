export const REQUIRED_PROTOCOL = "https:";

export const ALLOWED_INPUT_HOSTS = Object.freeze([
  "github.com",
  "raw.githubusercontent.com"
]);

export const ALLOWED_EXTENSIONS = Object.freeze([
  ".html",
  ".htm"
]);

export const UNSAFE_SCHEMES = Object.freeze([
  "javascript:",
  "data:",
  "file:",
  "blob:",
  "ftp:"
]);

export const IFRAME_SANDBOX = "allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads allow-forms";
export const IFRAME_REFERRER_POLICY = "no-referrer";

export function isUnsafeScheme(value) {
  const trimmed = String(value || "").trim().toLowerCase();
  return UNSAFE_SCHEMES.some((scheme) => trimmed.startsWith(scheme));
}

export function isAllowedHost(hostname) {
  return ALLOWED_INPUT_HOSTS.includes(String(hostname || "").toLowerCase());
}

export function isAllowedExtension(filePath) {
  const lower = String(filePath || "").toLowerCase();
  return ALLOWED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export function getHtmlExtension(filePath) {
  const lower = String(filePath || "").toLowerCase();
  return ALLOWED_EXTENSIONS.find((extension) => lower.endsWith(extension)) || "";
}

export function assertAllowedInputUrl(url) {
  if (url.protocol !== REQUIRED_PROTOCOL) {
    throw new Error("Only https:// URLs are supported.");
  }

  if (!isAllowedHost(url.hostname)) {
    throw new Error("Only github.com and raw.githubusercontent.com URLs are supported.");
  }
}
