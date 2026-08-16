/**
 * Bump this on every deploy so users can verify they are not on a cached build.
 * Format: major.minor.patch
 */
export const APP_VERSION = "0.3.0";

/**
 * Matches Windows SerialPort settings (DtronicsSEC).
 */
export const SERIAL_OPTIONS = {
  baudRate: 38400,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  bufferSize: 1024 * 1024,
};

export const productPageUrl = "https://www.dtronics.nl/dt-drum-expansion";

export const COMBINED_FILENAME = "dtronics-combined-samples.bin";