import { APP_VERSION, usbDeviceFilters } from "./config.js";
import {
  BLOCK_COUNT,
  BLOCK_SIZE,
  calculateChecksum,
  combineEntries,
  fileToSampleSlot,
} from "./sample-array.js";

const els = {
  unsupported: document.getElementById("unsupported"),
  unsupportedTitle: document.getElementById("unsupported-title"),
  unsupportedDetail: document.getElementById("unsupported-detail"),
  iframeWarning: document.getElementById("iframe-warning"),
  sampleAlert: document.getElementById("sample-alert"),
  sampleAlertTitle: document.getElementById("sample-alert-title"),
  sampleAlertDetail: document.getElementById("sample-alert-detail"),
  status: document.getElementById("status"),
  btnConnect: document.getElementById("btn-connect"),
  btnDisconnect: document.getElementById("btn-disconnect"),
  deviceMeta: document.getElementById("device-meta"),
  deviceName: document.getElementById("device-name"),
  deviceIds: document.getElementById("device-ids"),
  appVersion: document.getElementById("app-version"),
  envDebug: document.getElementById("env-debug"),
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("file-input"),
  sampleList: document.getElementById("sample-list"),
  sampleCount: document.getElementById("sample-count"),
  checksumValue: document.getElementById("checksum-value"),
  btnClearSamples: document.getElementById("btn-clear-samples"),
};

/** @type {USBDevice | null} */
let device = null;

/** @type {import("./sample-array.js").SampleSlot[]} */
let samples = [];

function supportsWebUsb() {
  return typeof navigator !== "undefined" && !!navigator.usb;
}

function getWebUsbBlockReason() {
  const isFile = location.protocol === "file:";
  const secure = window.isSecureContext === true;
  const hasUsb = typeof navigator !== "undefined" && !!navigator.usb;

  if (isFile) {
    return {
      title: "This page was opened as a local file.",
      detail:
        "WebUSB does not work via file://. Open the live site: https://scorpiopraxis.github.io/DtronicsWebProgrammer/ (or use a local server such as npx serve .).",
    };
  }

  if (!secure) {
    return {
      title: "This page is not a secure context.",
      detail:
        "WebUSB requires HTTPS (or http://localhost). Open https://scorpiopraxis.github.io/DtronicsWebProgrammer/",
    };
  }

  if (!hasUsb) {
    return {
      title: "WebUSB is not available in this browser.",
      detail:
        "Use desktop Google Chrome or Microsoft Edge. If you already do: check chrome://policy for WebUSB disabled by organization policy, or try a normal (non-managed) Chrome profile.",
    };
  }

  return null;
}

function isEmbeddedFrame() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function setStatus(text, kind = "idle") {
  els.status.textContent = text;
  els.status.className = `status status-${kind}`;
}

function showSampleAlert(title, detail) {
  els.sampleAlertTitle.textContent = title;
  els.sampleAlertDetail.textContent = detail;
  els.sampleAlert.hidden = false;
}

function hideSampleAlert() {
  els.sampleAlert.hidden = true;
  els.sampleAlertDetail.textContent = "";
}

function hexId(value) {
  return `0x${value.toString(16).toUpperCase().padStart(4, "0")}`;
}

function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  return `${(size / 1024).toFixed(size % 1024 === 0 ? 0 : 1)} KB`;
}

function rebuildChecksum() {
  const image = combineEntries(samples.map((s) => s.data));
  els.checksumValue.textContent = calculateChecksum(image);
}

function renderSampleList() {
  els.sampleList.innerHTML = "";
  els.sampleCount.textContent = `${samples.length} / ${BLOCK_COUNT} samples`;
  els.btnClearSamples.disabled = samples.length === 0;

  samples.forEach((sample, index) => {
    const li = document.createElement("li");
    li.className = "sample-item";

    const main = document.createElement("div");
    main.className = "sample-item-main";

    const slot = document.createElement("span");
    slot.className = "sample-slot";
    slot.textContent = String(index + 1).padStart(2, "0");

    const name = document.createElement("span");
    name.className = "sample-name";
    name.textContent = sample.name;
    name.title = sample.name;

    const meta = document.createElement("span");
    meta.className = "sample-size";
    meta.textContent = formatBytes(sample.size);

    main.append(slot, name, meta);

    const actions = document.createElement("div");
    actions.className = "sample-item-actions";

    const btnUp = document.createElement("button");
    btnUp.type = "button";
    btnUp.className = "btn btn-tiny";
    btnUp.textContent = "↑";
    btnUp.title = "Move up";
    btnUp.disabled = index === 0;
    btnUp.addEventListener("click", () => moveSample(index, index - 1));

    const btnDown = document.createElement("button");
    btnDown.type = "button";
    btnDown.className = "btn btn-tiny";
    btnDown.textContent = "↓";
    btnDown.title = "Move down";
    btnDown.disabled = index === samples.length - 1;
    btnDown.addEventListener("click", () => moveSample(index, index + 1));

    const btnRemove = document.createElement("button");
    btnRemove.type = "button";
    btnRemove.className = "btn btn-tiny btn-danger";
    btnRemove.textContent = "Remove";
    btnRemove.addEventListener("click", () => removeSample(index));

    actions.append(btnUp, btnDown, btnRemove);
    li.append(main, actions);
    els.sampleList.append(li);
  });

  rebuildChecksum();
}

function moveSample(from, to) {
  if (to < 0 || to >= samples.length) return;
  const [item] = samples.splice(from, 1);
  samples.splice(to, 0, item);
  hideSampleAlert();
  renderSampleList();
}

function removeSample(index) {
  samples.splice(index, 1);
  hideSampleAlert();
  renderSampleList();
}

function clearSamples() {
  samples = [];
  hideSampleAlert();
  renderSampleList();
}

/**
 * @param {FileList | File[]} fileList
 */
async function addFiles(fileList) {
  const files = Array.from(fileList);
  if (files.length === 0) return;

  const free = BLOCK_COUNT - samples.length;
  if (free <= 0) {
    showSampleAlert("Too many files", "Maximum 16 sample files allowed.");
    return;
  }

  if (files.length > free) {
    showSampleAlert(
      "Too many files",
      `You selected too many files. Only ${free} more sample(s) can be added (max 16).`,
    );
    return;
  }

  const errors = [];
  for (const file of files) {
    try {
      const slot = await fileToSampleSlot(file);
      samples.push(slot);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (errors.length) {
    showSampleAlert("Some files were skipped", errors.join(" "));
  } else {
    hideSampleAlert();
  }

  renderSampleList();
}

function renderDevice(usbDevice) {
  const name =
    usbDevice.productName?.trim() ||
    usbDevice.manufacturerName?.trim() ||
    "USB device";
  els.deviceName.textContent = name;
  els.deviceIds.textContent = `${hexId(usbDevice.vendorId)} / ${hexId(usbDevice.productId)}`;
  els.deviceMeta.hidden = false;
}

function clearDeviceUi() {
  els.deviceMeta.hidden = true;
  els.deviceName.textContent = "—";
  els.deviceIds.textContent = "—";
}

async function connect() {
  if (!supportsWebUsb()) {
    setStatus("WebUSB unavailable", "error");
    return;
  }

  try {
    const selected = await navigator.usb.requestDevice({
      filters: usbDeviceFilters,
    });

    await selected.open();
    device = selected;
    renderDevice(selected);
    setStatus("Connected", "connected");
    els.btnConnect.disabled = true;
    els.btnDisconnect.disabled = false;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/cancel|denied|abort/i.test(message)) {
      setStatus("Connection cancelled", "idle");
      return;
    }
    console.error(err);
    setStatus("Connection failed", "error");
  }
}

async function disconnect() {
  if (!device) {
    setStatus("Not connected", "idle");
    els.btnConnect.disabled = !supportsWebUsb();
    els.btnDisconnect.disabled = true;
    clearDeviceUi();
    return;
  }

  try {
    if (device.opened) {
      await device.close();
    }
  } catch (err) {
    console.error(err);
  } finally {
    device = null;
    clearDeviceUi();
    setStatus("Not connected", "idle");
    els.btnConnect.disabled = false;
    els.btnDisconnect.disabled = true;
  }
}

function showEnvDebug() {
  if (els.appVersion) {
    els.appVersion.textContent = `v${APP_VERSION}`;
  }
  if (!els.envDebug) return;

  const parts = [
    `v${APP_VERSION}`,
    `protocol=${location.protocol.replace(":", "")}`,
    `secure=${window.isSecureContext ? "yes" : "no"}`,
    `navigator.usb=${navigator.usb ? "yes" : "no"}`,
    `ua=${navigator.userAgentData?.brands?.map((b) => b.brand).join(", ") || navigator.userAgent.slice(0, 80)}`,
  ];
  els.envDebug.textContent = parts.join(" · ");
}

function initSampleCreator() {
  els.fileInput.addEventListener("change", () => {
    if (els.fileInput.files) {
      void addFiles(els.fileInput.files).finally(() => {
        els.fileInput.value = "";
      });
    }
  });

  els.btnClearSamples.addEventListener("click", clearSamples);

  const zone = els.dropzone;

  zone.addEventListener("dragenter", (e) => {
    e.preventDefault();
    zone.classList.add("is-dragover");
  });
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("is-dragover");
  });
  zone.addEventListener("dragleave", (e) => {
    if (!zone.contains(/** @type {Node} */ (e.relatedTarget))) {
      zone.classList.remove("is-dragover");
    }
  });
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("is-dragover");
    if (e.dataTransfer?.files?.length) {
      void addFiles(e.dataTransfer.files);
    }
  });

  zone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      els.fileInput.click();
    }
  });

  renderSampleList();
}

function initConnection() {
  if (isEmbeddedFrame()) {
    els.iframeWarning.hidden = false;
    els.btnConnect.disabled = true;
    els.btnDisconnect.disabled = true;
    setStatus("Blocked in iframe", "error");
    return;
  }

  const block = getWebUsbBlockReason();
  if (block || !supportsWebUsb()) {
    const reason = block ?? {
      title: "WebUSB is not available in this browser.",
      detail:
        "Please open this page in Google Chrome or Microsoft Edge on a desktop computer.",
    };
    els.unsupportedTitle.textContent = reason.title;
    els.unsupportedDetail.textContent = reason.detail;
    els.unsupported.hidden = false;
    els.btnConnect.disabled = true;
    els.btnDisconnect.disabled = true;
    setStatus("WebUSB unavailable", "error");
    return;
  }

  els.btnConnect.addEventListener("click", () => {
    void connect();
  });
  els.btnDisconnect.addEventListener("click", () => {
    void disconnect();
  });

  navigator.usb.addEventListener("disconnect", (event) => {
    if (device && event.device === device) {
      device = null;
      clearDeviceUi();
      setStatus("Disconnected", "idle");
      els.btnConnect.disabled = false;
      els.btnDisconnect.disabled = true;
    }
  });
}

function init() {
  showEnvDebug();
  initSampleCreator();
  initConnection();
}

init();

// Exported for upcoming stories (download / flash).
export function getCombinedImage() {
  return combineEntries(samples.map((s) => s.data));
}

export function getSampleCount() {
  return samples.length;
}

export { BLOCK_SIZE, BLOCK_COUNT };
