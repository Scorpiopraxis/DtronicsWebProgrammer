/**
 * Bump this on every deploy so users can verify they are not on a cached build.
 * Format: major.minor.patch
 */
export const APP_VERSION = "0.2.0";

/**
 * USB device filters for navigator.usb.requestDevice.
 * Leave empty to let the user pick any USB device (useful while identifying VID/PID).
 * Once known, set e.g. [{ vendorId: 0x1234, productId: 0x5678 }].
 */
export const usbDeviceFilters = [];

export const productPageUrl = "https://www.dtronics.nl/dt-drum-expansion";
