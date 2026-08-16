/** Matches Windows SampleArray: 16 blocks × 32 KB = 512 KB, empty = 0xFF. */

export const BLOCK_COUNT = 16;
export const BLOCK_SIZE = 32 * 1024;
export const IMAGE_SIZE = BLOCK_COUNT * BLOCK_SIZE;

/**
 * @typedef {{ name: string, size: number, data: Uint8Array }} SampleSlot
 */

/**
 * @returns {Uint8Array}
 */
export function createEmptyBlock() {
  return new Uint8Array(BLOCK_SIZE).fill(0xff);
}

/**
 * Pad or reject sample bytes to a 32 KB block (0xFF fill).
 * @param {Uint8Array} bytes
 * @returns {Uint8Array}
 */
export function padSampleToBlock(bytes) {
  if (bytes.byteLength > BLOCK_SIZE) {
    throw new Error(`File exceeds 32 KB (${bytes.byteLength} bytes)`);
  }
  const block = createEmptyBlock();
  block.set(bytes, 0);
  return block;
}

/**
 * Combine up to 16 sample blocks into a 512 KB image.
 * Missing slots stay 0xFF.
 * @param {Array<Uint8Array | null | undefined>} blocks
 * @returns {Uint8Array}
 */
export function combineEntries(blocks) {
  const image = new Uint8Array(IMAGE_SIZE).fill(0xff);
  const count = Math.min(blocks.length, BLOCK_COUNT);
  for (let i = 0; i < count; i++) {
    const block = blocks[i];
    if (!block) continue;
    if (block.byteLength !== BLOCK_SIZE) {
      throw new Error(`Block ${i} must be exactly ${BLOCK_SIZE} bytes`);
    }
    image.set(block, i * BLOCK_SIZE);
  }
  return image;
}

/**
 * 16-bit wrapping sum → 4 hex digits (same as Windows CalculateChecksum).
 * @param {Uint8Array} image
 * @returns {string}
 */
export function calculateChecksum(image) {
  let checksum = 0;
  for (let i = 0; i < image.length; i++) {
    checksum = (checksum + image[i]) & 0xffff;
  }
  return checksum.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * @param {File} file
 * @returns {Promise<SampleSlot>}
 */
export async function fileToSampleSlot(file) {
  if (file.size > BLOCK_SIZE) {
    throw new Error(`File "${file.name}" skipped. File size exceeds 32 KB`);
  }
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  return {
    name: file.name,
    size: file.size,
    data: padSampleToBlock(bytes),
  };
}
