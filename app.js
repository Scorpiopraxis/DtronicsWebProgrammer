import { APP_VERSION, usbDeviceFilters } from "./config.js";

const els = {
  unsupported: document.getElementById("unsupported"),
  unsupportedTitle: document.getElementById("unsupported-title"),
  unsupportedDetail: document.getElementById("unsupported-detail"),
  iframeWarning: document.getElementById("iframe-warning"),
  status: document.getElementById("status"),
  btnConnect: document.getElementById("btn-connect"),
  btnDisconnect: document.getElementById("btn-disconnect"),
  deviceMeta: document.getElementById("device-meta"),
  deviceName: document.getElementById("device-name"),
  deviceIds: document.getElementById("device-ids"),
  appVersion: document.getElementById("app-version"),
  envDebug: document.getElementById("env-debug"),
};

/** @type {USBDevice | null} */
let device = null;

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

function hexId(value) {
  return `0x${value.toString(16).toUpperCase().padStart(4, "0")}`;
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

function init() {
  showEnvDebug();

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

init();
