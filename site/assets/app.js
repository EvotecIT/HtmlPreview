import {
  IFRAME_REFERRER_POLICY,
  IFRAME_SANDBOX,
  injectBaseHref,
  parseInputUrl,
  rewriteInternalHtmlLinks
} from "./core/index.js";

const form = document.querySelector("#preview-form");
const urlInput = document.querySelector("#url-input");
const previewButton = document.querySelector("#preview-button");
const previewButtonLabel = previewButton.querySelector(".button-label");
const copyLinkButton = document.querySelector("#copy-link-button");
const openSourceButton = document.querySelector("#open-source-button");
const openRawButton = document.querySelector("#open-raw-button");
const fullscreenButton = document.querySelector("#fullscreen-button");
const statusPanel = document.querySelector("#status-panel");
const previewFrame = document.querySelector("#preview-frame");
const previewFrameShell = document.querySelector("#preview-frame-shell");

const metadataFields = {
  owner: document.querySelector("#meta-owner"),
  repo: document.querySelector("#meta-repo"),
  branch: document.querySelector("#meta-branch"),
  filePath: document.querySelector("#meta-file-path"),
  rawFileUrl: document.querySelector("#meta-raw-file-url"),
  rawBaseUrl: document.querySelector("#meta-raw-base-url"),
  githubBlobUrl: document.querySelector("#meta-github-blob-url")
};

let currentContext = null;
let currentPreviewUrl = "";

previewFrame.setAttribute("sandbox", IFRAME_SANDBOX);
previewFrame.setAttribute("referrerpolicy", IFRAME_REFERRER_POLICY);

function getPreviewBaseUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

function getCanonicalPreviewUrl(sourceUrl) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("url", sourceUrl);
  return url.href;
}

function readInitialQueryUrl() {
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get("url");

  if (explicit) {
    return explicit;
  }

  const legacy = window.location.search.slice(1);
  if (!legacy) {
    return "";
  }

  try {
    return decodeURIComponent(legacy);
  } catch {
    return legacy;
  }
}

function setStatus(message, mode = "neutral") {
  statusPanel.textContent = message;
  statusPanel.dataset.mode = mode;
}

function setLoading(isLoading) {
  previewButton.disabled = isLoading;
  previewButtonLabel.textContent = isLoading ? "Loading..." : "Preview";
  urlInput.disabled = isLoading;
}

function setActionButtons(enabled) {
  copyLinkButton.disabled = !enabled;
  openSourceButton.disabled = !enabled;
  openRawButton.disabled = !enabled;
  fullscreenButton.disabled = !enabled;
}

function setMetadata(context) {
  Object.entries(metadataFields).forEach(([key, element]) => {
    element.textContent = context ? context[key] : "-";
    element.title = context ? context[key] : "";
  });
}

function resetPreview() {
  currentContext = null;
  currentPreviewUrl = "";
  previewFrame.removeAttribute("srcdoc");
  setMetadata(null);
  setActionButtons(false);
}

async function loadPreview(input) {
  setLoading(true);
  resetPreview();

  try {
    const context = parseInputUrl(input);
    setStatus("Fetching HTML from raw.githubusercontent.com...", "neutral");

    const response = await fetch(context.rawFileUrl, {
      cache: "no-cache",
      credentials: "omit",
      redirect: "follow",
      referrerPolicy: "no-referrer"
    });

    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status} ${response.statusText || ""}`.trim());
    }

    const sourceHtml = await response.text();
    const withBase = injectBaseHref(sourceHtml, context.rawBaseUrl);
    const processedHtml = rewriteInternalHtmlLinks(withBase, context, getPreviewBaseUrl());

    previewFrame.srcdoc = processedHtml;
    currentContext = context;
    currentPreviewUrl = getCanonicalPreviewUrl(context.inputUrl);

    setMetadata(context);
    setActionButtons(true);
    setStatus("Preview loaded.", "success");

    window.history.replaceState({}, "", currentPreviewUrl);
  } catch (error) {
    resetPreview();
    setStatus(error instanceof Error ? error.message : "Unable to load this preview.", "error");
  } finally {
    setLoading(false);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  loadPreview(urlInput.value);
});

copyLinkButton.addEventListener("click", async () => {
  if (!currentPreviewUrl) {
    return;
  }

  try {
    await navigator.clipboard.writeText(currentPreviewUrl);
    setStatus("Preview link copied.", "success");
  } catch {
    setStatus(currentPreviewUrl, "neutral");
  }
});

openSourceButton.addEventListener("click", () => {
  if (currentContext) {
    window.open(currentContext.githubBlobUrl, "_blank", "noopener,noreferrer");
  }
});

openRawButton.addEventListener("click", () => {
  if (currentContext) {
    window.open(currentContext.rawFileUrl, "_blank", "noopener,noreferrer");
  }
});

fullscreenButton.addEventListener("click", async () => {
  if (!previewFrameShell.requestFullscreen) {
    setStatus("Full screen is not available in this browser.", "error");
    return;
  }

  try {
    await previewFrameShell.requestFullscreen();
  } catch {
    setStatus("Full screen request was blocked by the browser.", "error");
  }
});

const initialUrl = readInitialQueryUrl();
if (initialUrl) {
  urlInput.value = initialUrl;
  loadPreview(initialUrl);
} else {
  setActionButtons(false);
  setMetadata(null);
}
