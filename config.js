/**
 * Bump this on every deploy so users can verify they are not on a cached build.
 * Format: major.minor.patch
 */
export const APP_VERSION = "0.3.2";

/**
 * Matches Windows SerialPort settings (DtronicsSEC).
 * bufferSize is kept small so the writable stream applies backpressure instead of
 * swallowing the whole 512 KB image at once (which made the progress bar jump to 100%).
 */
export const SERIAL_OPTIONS = {
  baudRate: 38400,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  bufferSize: 4096,
};

/** 8N1: 1 start bit + 8 data bits + 1 stop bit. */
export const SERIAL_BITS_PER_BYTE = 10;

/**
 * FTDI FT231X / FT-X in the Dtronics programmer.
 * Web Serial cannot read USB string descriptors (iManufacturer / iProduct);
 * we match VID/PID and map them to the EEPROM names.
 */
export const USB_VENDOR_ID = 0x0403;
export const USB_PRODUCT_ID = 0x6015;
export const USB_MANUFACTURER = "Dtronics";
export const USB_PRODUCT = "DrumEx";

export const SERIAL_PORT_FILTERS = [
  { usbVendorId: USB_VENDOR_ID, usbProductId: USB_PRODUCT_ID },
];

export const productPageUrl = "https://www.dtronics.nl/dt-drum-expansion";

export const COMBINED_FILENAME = "dtronics-combined-samples.bin";