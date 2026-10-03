import "server-only";

function arrayBufferOf(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function sanitizePatientImage(file: File): Promise<File | null> {
  if (file.size === 0 || file.size > 5_000_000) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const chunks: Uint8Array[] = [bytes.slice(0, 2)];
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      let markerEnd = offset + 1;
      while (markerEnd < bytes.length && bytes[markerEnd] === 0xff) markerEnd += 1;
      const marker = bytes[markerEnd];
      if (marker === 0xda) { chunks.push(bytes.slice(offset)); offset = bytes.length; break; }
      if (marker === 0xd9) { chunks.push(bytes.slice(offset, markerEnd + 1)); offset = markerEnd + 1; break; }
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        chunks.push(bytes.slice(offset, markerEnd + 1)); offset = markerEnd + 1; continue;
      }
      if (markerEnd + 2 >= bytes.length) return null;
      const length = (bytes[markerEnd + 1] << 8) | bytes[markerEnd + 2];
      const end = markerEnd + 1 + length;
      if (length < 2 || end > bytes.length) return null;
      if (marker !== 0xe1 && marker !== 0xed && marker !== 0xfe) chunks.push(bytes.slice(offset, end));
      offset = end;
    }
    if (!chunks.length || offset < bytes.length) return null;
    return new File(chunks.map(arrayBufferOf), "patient-photo.jpg", { type: "image/jpeg" });
  }

  if (file.type === "image/png" && bytes.length >= 24 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    const chunks: Uint8Array[] = [bytes.slice(0, 8)];
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = (bytes[offset] * 0x1000000) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3];
      const end = offset + 12 + length;
      if (end > bytes.length) return null;
      const type = new TextDecoder().decode(bytes.slice(offset + 4, offset + 8));
      if (!["eXIf", "tEXt", "zTXt", "iTXt"].includes(type)) chunks.push(bytes.slice(offset, end));
      offset = end;
      if (type === "IEND") break;
    }
    if (offset !== bytes.length) return null;
    return new File(chunks.map(arrayBufferOf), "patient-photo.png", { type: "image/png" });
  }

  if (file.type === "image/webp" && bytes.length >= 20 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") {
    const chunks: Uint8Array[] = [];
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const name = new TextDecoder().decode(bytes.slice(offset, offset + 4));
      const length = bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24);
      const end = offset + 8 + length + (length % 2);
      if (end > bytes.length) return null;
      if (!["EXIF", "XMP ", "ICCP"].includes(name)) chunks.push(bytes.slice(offset, end));
      offset = end;
    }
    if (offset !== bytes.length) return null;
    const size = chunks.reduce((total, chunk) => total + chunk.length, 4);
    const header = new Uint8Array(12);
    header.set(new TextEncoder().encode("RIFF"), 0);
    new DataView(header.buffer).setUint32(4, size, true);
    header.set(new TextEncoder().encode("WEBP"), 8);
    return new File([arrayBufferOf(header), ...chunks.map(arrayBufferOf)], "patient-photo.webp", { type: "image/webp" });
  }
  return null;
}
