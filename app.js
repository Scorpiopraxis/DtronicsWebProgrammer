import {
  APP_VERSION,
  COMBINED_FILENAME,
  SERIAL_BITS_PER_BYTE,
  SERIAL_OPTIONS,
  SERIAL_PORT_FILTERS,
  USB_MANUFACTURER,
  USB_PRODUCT,
  USB_PRODUCT_ID,
  USB_VENDOR_ID,
  productPageUrl,
} from "./config.js";
import {
  BLOCK_COUNT,
  BLOCK_SIZE,
  IMAGE_SIZE,
  calculateChecksum,
  combineEntries,
  downloadBinary,
  fileToSampleSlot,
} from "./sample-array.js";

const WRITE_CHUNK = 4096;

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
  btnDownload: document.getElementById("btn-download"),
  btnFlashCombined: document.getElementById("btn-flash-combined"),
  fileFlash: document.getElementById("file-flash"),
  labelFlashFile: document.getElementById("label-flash-file"),
  flashProgress: document.getElementById("flash-progress"),
  flashProgressLabel: document.getElementById("flash-progress-label"),
  flashChecksum: document.getElementById("flash-checksum"),
  receivedLog: document.getElementById("received-log"),
  btnClearReceived: document.getElementById("btn-clear-received"),
  aboutCopy: document.getElementById("about-copy"),
};

/** @type {SerialPort | null} */
let port = null;

/** @type {ReadableStreamDefaultReader<Uint8Array> | null} */
let reader = null;

/** @type {AbortController | null} */
let readAbort = null;

let flashing = false;
let receivedEmpty = true;

/** @type {import("./sample-array.js").SampleSlot[]} */
let samples = [];

function supportsWebSerial() {
  return typeof navigator !== "undefined" && !!navigator.serial;
}

function getWebSerialBlockReason() {
  const isFile = location.protocol === "file:";
  const secure = window.isSecureContext === true;
  const hasSerial = supportsWebSerial();

  if (isFile) {
    return {
      title: "This page was opened as a local file.",
      detail:
        "Web Serial does not work via file://. Open the live site: https://scorpiopraxis.github.io/DtronicsWebProgrammer/ (or use a local server such as npx serve .).",
    };
  }

  if (!secure) {
    return {
      title: "This page is not a secure context.",
      detail:
        "Web Serial requires HTTPS (or http://localhost). Open https://scorpiopraxis.github.io/DtronicsWebProgrammer/",
    };
  }

  if (!hasSerial) {
    return {
      title: "Web Serial is not available in this browser.",
      detail:
        "Use desktop Google Chrome or Microsoft Edge. If you already do: check chrome://policy for Serial disabled by organization policy, or try a normal (non-managed) Chrome profile.",
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

function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  return `${(size / 1024).toFixed(size % 1024 === 0 ? 0 : 1)} KB`;
}

function getCombinedImage() {
  return combineEntries(samples.map((s) => s.data));
}

function rebuildChecksum() {
  els.checksumValue.textContent = calculateChecksum(getCombinedImage());
}

function formatRemaining(ms) {
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 1) return "";
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, "0");
  return m > 0 ? ` · ${m}:${s} left` : ` · ${sec}s left`;
}

function wireDurationMs(byteLength) {
  return (byteLength * SERIAL_BITS_PER_BYTE * 1000) / SERIAL_OPTIONS.baudRate;
}

function setProgress(pct, remainingMs) {
  const value = Math.max(0, Math.min(100, Math.round(pct)));
  els.flashProgress.value = value;
  const left = remainingMs != null && value < 100 ? formatRemaining(remainingMs) : "";
  els.flashProgressLabel.textContent = `${value}%${left}`;
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function setFlashUiBusy(busy) {
  flashing = busy;
  const connected = !!port;
  els.btnConnect.disabled = busy || connected || !supportsWebSerial();
  els.btnDisconnect.disabled = busy || !connected;
  els.btnFlashCombined.disabled = busy || !connected;
  els.fileFlash.disabled = busy || !connected;
  if (els.labelFlashFile) {
    els.labelFlashFile.classList.toggle("is-disabled", busy || !connected);
  }
}

function updateFlashButtons() {
  if (flashing) return;
  const connected = !!port;
  els.btnFlashCombined.disabled = !connected;
  els.fileFlash.disabled = !connected;
  if (els.labelFlashFile) {
    els.labelFlashFile.classList.toggle("is-disabled", !connected);
  }
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

function downloadCombined() {
  const image = getCombinedImage();
  downloadBinary(image, COMBINED_FILENAME);
  els.flashChecksum.textContent = calculateChecksum(image);
}

function hexUsbId(value) {
  return `0x${value.toString(16).toUpperCase().padStart(4, "0")}`;
}

function isDtronicsProgrammer(info) {
  return info.usbVendorId === USB_VENDOR_ID && info.usbProductId === USB_PRODUCT_ID;
}

/** Chrome does not expose COM12; keep a fallback if a future getInfo() field appears. */
function comPortName(info) {
  const raw = info.displayName ?? info.name ?? info.path ?? info.portName ?? "";
  const match = String(raw).match(/COM\d+/i);
  return match ? match[0].toUpperCase() : "";
}

function portLabel(serialPort) {
  const info = serialPort.getInfo?.() ?? {};
  if (isDtronicsProgrammer(info)) {
    const com = comPortName(info);
    const name = `${USB_MANUFACTURER} ${USB_PRODUCT}`;
    return com ? `${com} ${name}` : name;
  }
  const bits = [];
  if (info.usbVendorId != null) bits.push(`VID ${hexUsbId(info.usbVendorId)}`);
  if (info.usbProductId != null) bits.push(`PID ${hexUsbId(info.usbProductId)}`);
  return bits.length ? bits.join(" / ") : "Serial port";
}

function renderPort(serialPort) {
  els.deviceName.textContent = portLabel(serialPort);
  els.deviceIds.textContent = "38400 8N1";
  els.deviceMeta.hidden = false;
}

function clearPortUi() {
  els.deviceMeta.hidden = true;
  els.deviceName.textContent = "—";
  els.deviceIds.textContent = "38400 8N1";
}

function appendReceived(text) {
  if (!text) return;
  if (receivedEmpty) {
    els.receivedLog.textContent = "";
    receivedEmpty = false;
  }
  els.receivedLog.textContent += text;
  els.receivedLog.scrollTop = els.receivedLog.scrollHeight;
}

function clearReceived() {
  els.receivedLog.textContent = "No data received yet.";
  receivedEmpty = true;
}

async function stopReading() {
  readAbort?.abort();
  readAbort = null;

  if (reader) {
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
    reader = null;
  }
}

async function startReading(serialPort) {
  await stopReading();
  if (!serialPort.readable) return;

  readAbort = new AbortController();
  const decoder = new TextDecoder();
  reader = serialPort.readable.getReader();

  void (async () => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value?.byteLength) {
          appendReceived(decoder.decode(value, { stream: true }));
        }
      }
      appendReceived(decoder.decode());
    } catch (err) {
      if (readAbort && !readAbort.signal.aborted) {
        console.error(err);
      }
    } finally {
      try {
        reader?.releaseLock();
      } catch {
        /* ignore */
      }
      reader = null;
    }
  })();
}

/**
 * Write raw bytes in chunks (same as Windows: full 512 KB dump @ 38400).
 * Progress follows estimated UART time: writer.write() resolves when the browser
 * accepts bytes, not when they have shifted out at 38400 baud (~2¼ min for 512 KB).
 * @param {Uint8Array} data
 */
async function writeImage(data) {
  if (!port?.writable) {
    throw new Error("Serial port is not writable");
  }
  if (data.byteLength !== IMAGE_SIZE) {
    throw new Error(`Image must be exactly ${IMAGE_SIZE} bytes (got ${data.byteLength})`);
  }

  const writer = port.writable.getWriter();
  const total = data.byteLength;
  const wireMs = wireDurationMs(total);
  const started = performance.now();
  let queued = 0;
  let raf = 0;

  const tickProgress = () => {
    const elapsed = performance.now() - started;
    const onWire = Math.min(queued, (elapsed / wireMs) * total);
    setProgress((onWire / total) * 100, Math.max(0, wireMs - elapsed));
    raf = requestAnimationFrame(tickProgress);
  };

  setProgress(0, wireMs);
  els.flashChecksum.textContent = "—";
  raf = requestAnimationFrame(tickProgress);

  try {
    while (queued < total) {
      const end = Math.min(queued + WRITE_CHUNK, total);
      await writer.ready;
      await writer.write(data.subarray(queued, end));
      queued = end;
    }

    const remaining = wireMs - (performance.now() - started);
    if (remaining > 0) {
      await sleep(remaining);
    }

    cancelAnimationFrame(raf);
    raf = 0;
    setProgress(100);
    els.flashChecksum.textContent = calculateChecksum(data);
  } finally {
    if (raf) cancelAnimationFrame(raf);
    writer.releaseLock();
  }
}

async function flashCombined() {
  if (!port || flashing) return;
  setFlashUiBusy(true);
  setStatus("Writing 512 KB…", "connected");
  try {
    await writeImage(getCombinedImage());
    setStatus("Transfer complete", "connected");
  } catch (err) {
    console.error(err);
    setStatus("Transfer failed", "error");
    showSampleAlert(
      "Flash failed",
      err instanceof Error ? err.message : String(err),
    );
  } finally {
    setFlashUiBusy(false);
    updateFlashButtons();
  }
}

/**
 * @param {File} file
 */
async function flashFile(file) {
  if (!port || flashing) return;

  if (file.size !== IMAGE_SIZE) {
    showSampleAlert(
      "Filesize error",
      `File "${file.name}" is not exact 512 KB.\nSize: ${file.size} bytes`,
    );
    return;
  }

  setFlashUiBusy(true);
  setStatus("Writing 512 KB…", "connected");
  hideSampleAlert();

  try {
    const buffer = await file.arrayBuffer();
    await writeImage(new Uint8Array(buffer));
    setStatus("Transfer complete", "connected");
  } catch (err) {
    console.error(err);
    setStatus("Transfer failed", "error");
    showSampleAlert(
      "Flash failed",
      err instanceof Error ? err.message : String(err),
    );
  } finally {
    setFlashUiBusy(false);
    updateFlashButtons();
  }
}

async function connect() {
  if (!supportsWebSerial()) {
    setStatus("Web Serial unavailable", "error");
    return;
  }

  try {
    const selected = await navigator.serial.requestPort({
      filters: SERIAL_PORT_FILTERS,
    });
    await selected.open(SERIAL_OPTIONS);
    port = selected;
    renderPort(selected);
    await startReading(selected);
    setStatus("Connected", "connected");
    els.btnConnect.disabled = true;
    els.btnDisconnect.disabled = false;
    updateFlashButtons();
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
  await stopReading();

  if (!port) {
    setStatus("Not connected", "idle");
    els.btnConnect.disabled = !supportsWebSerial();
    els.btnDisconnect.disabled = true;
    clearPortUi();
    updateFlashButtons();
    return;
  }

  try {
    await port.close();
  } catch (err) {
    console.error(err);
  } finally {
    port = null;
    clearPortUi();
    setStatus("Not connected", "idle");
    els.btnConnect.disabled = false;
    els.btnDisconnect.disabled = true;
    updateFlashButtons();
  }
}

function showEnvDebug() {
  if (els.appVersion) {
    els.appVersion.textContent = `v${APP_VERSION}`;
  }
  if (els.aboutCopy) {
    const year = new Date().getFullYear();
    els.aboutCopy.textContent = `(c) 2023 – ${year} Engineers@work`;
  }
  if (!els.envDebug) return;

  const parts = [
    `v${APP_VERSION}`,
    `protocol=${location.protocol.replace(":", "")}`,
    `secure=${window.isSecureContext ? "yes" : "no"}`,
    `navigator.serial=${navigator.serial ? "yes" : "no"}`,
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
  els.btnDownload.addEventListener("click", downloadCombined);

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

function initFlash() {
  els.btnFlashCombined.addEventListener("click", () => {
    void flashCombined();
  });

  els.fileFlash.addEventListener("change", () => {
    const file = els.fileFlash.files?.[0];
    els.fileFlash.value = "";
    if (file) {
      void flashFile(file);
    }
  });

  els.btnClearReceived.addEventListener("click", clearReceived);
  updateFlashButtons();
  setProgress(0);
}

function initConnection() {
  if (isEmbeddedFrame()) {
    els.iframeWarning.hidden = false;
    els.btnConnect.disabled = true;
    els.btnDisconnect.disabled = true;
    setStatus("Blocked in iframe", "error");
    updateFlashButtons();
    return;
  }

  const block = getWebSerialBlockReason();
  if (block || !supportsWebSerial()) {
    const reason = block ?? {
      title: "Web Serial is not available in this browser.",
      detail:
        "Please open this page in Google Chrome or Microsoft Edge on a desktop computer.",
    };
    els.unsupportedTitle.textContent = reason.title;
    els.unsupportedDetail.textContent = reason.detail;
    els.unsupported.hidden = false;
    els.btnConnect.disabled = true;
    els.btnDisconnect.disabled = true;
    setStatus("Web Serial unavailable", "error");
    updateFlashButtons();
    return;
  }

  els.btnConnect.addEventListener("click", () => {
    void connect();
  });
  els.btnDisconnect.addEventListener("click", () => {
    void disconnect();
  });

  navigator.serial.addEventListener("disconnect", (event) => {
    const disconnected = /** @type {SerialConnectionEvent} */ (event).port;
    if (port && disconnected === port) {
      void stopReading();
      port = null;
      clearPortUi();
      setStatus("Disconnected", "idle");
      els.btnConnect.disabled = false;
      els.btnDisconnect.disabled = true;
      updateFlashButtons();
    }
  });
}

function init() {
  showEnvDebug();
  initSampleCreator();
  initFlash();
  initConnection();
}

init();

export function getSampleCount() {
  return samples.length;
}

export { BLOCK_SIZE, BLOCK_COUNT, IMAGE_SIZE, getCombinedImage, productPageUrl };
