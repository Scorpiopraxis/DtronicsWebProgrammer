import { usbDeviceFilters } from "./config.js";

const els = {
  unsupported: document.getElementById("unsupported"),
  iframeWarning: document.getElementById("iframe-warning"),
  status: document.getElementById("status"),
  btnConnect: document.getElementById("btn-connect"),
  btnDisconnect: document.getElementById("btn-disconnect"),
  deviceMeta: document.getElementById("device-meta"),
  deviceName: document.getElementById("device-name"),
  deviceIds: document.getElementById("device-ids"),
};

/** @type {USBDevice | null} */
let device = null;

function supportsWebUsb() {
  return typeof navigator !== "undefined" && "usb" in navigator;
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

function init() {
  if (isEmbeddedFrame()) {
    els.iframeWarning.hidden = false;
    els.btnConnect.disabled = true;
    els.btnDisconnect.disabled = true;
    setStatus("Blocked in iframe", "error");
    return;
  }

  if (!supportsWebUsb()) {
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
