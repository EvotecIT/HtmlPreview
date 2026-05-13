import {
  assertAllowedInputUrl,
  getHtmlExtension,
  isAllowedExtension,
  isUnsafeScheme
} from "./security.js";

function decodePathSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function encodePathSegment(segment) {
  return encodeURIComponent(segment).replace(/%2F/gi, "/");
}

function encodePath(path) {
  return path.split("/").map(encodePathSegment).join("/");
}

function createPreviewContext(inputUrl, owner, repo, branch, filePath, sourceType) {
  const pathParts = filePath.split("/");
  const fileName = pathParts[pathParts.length - 1];
  const folderPath = pathParts.slice(0, -1).join("/");
  const encodedFilePath = encodePath(filePath);
  const rawRoot = `https://raw.githubusercontent.com/${encodePathSegment(owner)}/${encodePathSegment(repo)}/${encodePathSegment(branch)}`;
  const blobRoot = `https://github.com/${encodePathSegment(owner)}/${encodePathSegment(repo)}/blob/${encodePathSegment(branch)}`;
  const rawBaseUrl = folderPath ? `${rawRoot}/${encodePath(folderPath)}/` : `${rawRoot}/`;

  return {
    inputUrl,
    owner,
    repo,
    branch,
    filePath,
    fileName,
    folderPath,
    githubBlobUrl: `${blobRoot}/${encodedFilePath}`,
    rawFileUrl: `${rawRoot}/${encodedFilePath}`,
    rawBaseUrl,
    extension: getHtmlExtension(filePath),
    sourceType
  };
}

function parseGithubBlobUrl(inputUrl, url) {
  const segments = url.pathname.split("/").filter(Boolean).map(decodePathSegment);
  const blobIndex = segments.indexOf("blob");

  if (segments.length < 5 || blobIndex !== 2) {
    throw new Error("GitHub blob URLs must look like https://github.com/OWNER/REPO/blob/BRANCH/path/file.html.");
  }

  const [owner, repo] = segments;
  const branch = segments[blobIndex + 1];
  const filePath = segments.slice(blobIndex + 2).join("/");

  if (!owner || !repo || !branch || !filePath) {
    throw new Error("GitHub blob URL is missing owner, repository, branch, or file path.");
  }

  if (!isAllowedExtension(filePath)) {
    throw new Error("Only .html and .htm files can be previewed.");
  }

  return createPreviewContext(inputUrl, owner, repo, branch, filePath, "github-blob");
}

function parseGithubRawUrl(inputUrl, url) {
  const segments = url.pathname.split("/").filter(Boolean).map(decodePathSegment);

  if (segments.length < 4) {
    throw new Error("Raw GitHub URLs must look like https://raw.githubusercontent.com/OWNER/REPO/BRANCH/path/file.html.");
  }

  const [owner, repo, branch] = segments;
  const filePath = segments.slice(3).join("/");

  if (!owner || !repo || !branch || !filePath) {
    throw new Error("Raw GitHub URL is missing owner, repository, branch, or file path.");
  }

  if (!isAllowedExtension(filePath)) {
    throw new Error("Only .html and .htm files can be previewed.");
  }

  return createPreviewContext(inputUrl, owner, repo, branch, filePath, "github-raw");
}

export function parseInputUrl(input) {
  const inputUrl = String(input || "").trim();

  if (!inputUrl) {
    throw new Error("Enter a public GitHub .html or .htm URL.");
  }

  if (isUnsafeScheme(inputUrl)) {
    throw new Error("This URL scheme is not supported.");
  }

  let url;
  try {
    url = new URL(inputUrl);
  } catch {
    throw new Error("Enter a valid absolute GitHub URL.");
  }

  assertAllowedInputUrl(url);

  if (url.hostname === "github.com") {
    return parseGithubBlobUrl(inputUrl, url);
  }

  if (url.hostname === "raw.githubusercontent.com") {
    return parseGithubRawUrl(inputUrl, url);
  }

  throw new Error("Unsupported GitHub URL format.");
}
