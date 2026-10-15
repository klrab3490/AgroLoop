import jsQR from "jsqr";

/**
 * Robust multi-strategy QR code decoder for user-uploaded images and camera snaps.
 * Addresses real-world smartphone photo challenges:
 * 1. Native BarcodeDetector (Chrome/Android) when available
 * 2. High-resolution canvas inspection (preventing aggressive downsampling blur)
 * 3. Focused center-crop (removing noisy borders/hands and simulating macro zoom)
 * 4. Dynamic contrast stretching / normalization (handling indoor shadows and screen glare)
 * 5. Multi-scale downsampling (smoothing high-ISO sensor noise)
 * 6. 90-degree canvas rotation (fixing non-standard EXIF orientations)
 * 7. Dual inversion (attemptBoth for dark-on-light and light-on-dark)
 */

export async function decodeQrFromImage(file: File | Blob): Promise<string | null> {
  // 1. Try native BarcodeDetector if available (Chromium/Android)
  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    try {
      const BarcodeDetectorCtor = (window as unknown as {
        BarcodeDetector: new (opts: { formats: string[] }) => {
          detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
        };
      }).BarcodeDetector;
      const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });

      if (typeof createImageBitmap === "function") {
        try {
          const bitmap = await createImageBitmap(file);
          const barcodes = await detector.detect(bitmap);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            return barcodes[0].rawValue;
          }
        } catch {
          // Fall through
        }
      }
    } catch {
      // Fall through to jsQR
    }
  }

  // 2. Load image element via Object URL (avoids massive base64 string allocations)
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    return decodeQrFromImageElement(img);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function decodeQrFromImageElement(img: HTMLImageElement): string | null {
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;
  if (!origW || !origH) return null;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  // Pass 1: High-res full image (capped at max 1800 to prevent OOM while preserving QR module sharpness)
  const maxDim1 = 1800;
  let w1 = origW;
  let h1 = origH;
  if (w1 > maxDim1 || h1 > maxDim1) {
    const scale = Math.min(maxDim1 / w1, maxDim1 / h1);
    w1 = Math.round(w1 * scale);
    h1 = Math.round(h1 * scale);
  }
  canvas.width = w1;
  canvas.height = h1;
  ctx.drawImage(img, 0, 0, w1, h1);
  let imgData = ctx.getImageData(0, 0, w1, h1);
  let decoded = jsQR(imgData.data, w1, h1, { inversionAttempts: "attemptBoth" });
  if (decoded?.data) return decoded.data;

  // Pass 2: Center crop (70% center - simulates focused macro zoom on the QR code)
  const cropW = Math.round(origW * 0.7);
  const cropH = Math.round(origH * 0.7);
  const cropX = Math.round((origW - cropW) / 2);
  const cropY = Math.round((origH - cropH) / 2);

  let cw = cropW;
  let ch = cropH;
  if (cw > 1600 || ch > 1600) {
    const scale = Math.min(1600 / cw, 1600 / ch);
    cw = Math.round(cw * scale);
    ch = Math.round(ch * scale);
  }
  canvas.width = cw;
  canvas.height = ch;
  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cw, ch);
  imgData = ctx.getImageData(0, 0, cw, ch);
  decoded = jsQR(imgData.data, cw, ch, { inversionAttempts: "attemptBoth" });
  if (decoded?.data) return decoded.data;

  // Pass 3: Contrast stretch / normalization on the center-cropped canvas
  const stretchedCenter = stretchContrast(imgData);
  if (stretchedCenter) {
    decoded = jsQR(stretchedCenter, cw, ch, { inversionAttempts: "attemptBoth" });
    if (decoded?.data) return decoded.data;
  }

  // Pass 4: Contrast stretch on the full image
  const fullCanvasData = ctx.getImageData(0, 0, w1, h1);
  const stretchedFull = stretchContrast(fullCanvasData);
  if (stretchedFull) {
    decoded = jsQR(stretchedFull, w1, h1, { inversionAttempts: "attemptBoth" });
    if (decoded?.data) return decoded.data;
  }

  // Pass 5: Downscaled passes (1000px, then 650px) to smooth out camera sensor noise/grain
  const downscaleSizes = [1000, 650];
  for (const maxDim of downscaleSizes) {
    if (origW > maxDim || origH > maxDim) {
      const scale = Math.min(maxDim / origW, maxDim / origH);
      const dw = Math.round(origW * scale);
      const dh = Math.round(origH * scale);
      canvas.width = dw;
      canvas.height = dh;
      ctx.drawImage(img, 0, 0, dw, dh);
      const dImgData = ctx.getImageData(0, 0, dw, dh);
      decoded = jsQR(dImgData.data, dw, dh, { inversionAttempts: "attemptBoth" });
      if (decoded?.data) return decoded.data;

      const stretchedDown = stretchContrast(dImgData);
      if (stretchedDown) {
        decoded = jsQR(stretchedDown, dw, dh, { inversionAttempts: "attemptBoth" });
        if (decoded?.data) return decoded.data;
      }
    }
  }

  // Pass 6: 90-degree rotation (in case EXIF orientation was not respected by camera upload)
  const rotW = h1;
  const rotH = w1;
  canvas.width = rotW;
  canvas.height = rotH;
  ctx.save();
  ctx.translate(rotW / 2, rotH / 2);
  ctx.rotate((90 * Math.PI) / 180);
  ctx.drawImage(img, -w1 / 2, -h1 / 2, w1, h1);
  ctx.restore();
  const rotImgData = ctx.getImageData(0, 0, rotW, rotH);
  decoded = jsQR(rotImgData.data, rotW, rotH, { inversionAttempts: "attemptBoth" });
  if (decoded?.data) return decoded.data;

  return null;
}

export function stretchContrast(imageData: ImageData): Uint8ClampedArray | null {
  const data = imageData.data;
  const len = data.length;
  let minLum = 255;
  let maxLum = 0;

  // Sample luminance to find dynamic range
  const step = len > 500000 ? 16 : 4;
  for (let i = 0; i < len; i += step) {
    const lum = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  const range = maxLum - minLum;
  // If contrast is already good (wide range > 210), stretch won't change much
  if (range <= 20 || range >= 220) return null;

  const result = new Uint8ClampedArray(len);
  const factor = 255 / range;

  for (let i = 0; i < len; i += 4) {
    const lum = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    const stretched = Math.min(255, Math.max(0, Math.round((lum - minLum) * factor)));
    result[i] = stretched;
    result[i + 1] = stretched;
    result[i + 2] = stretched;
    result[i + 3] = data[i + 3]; // Preserve alpha
  }

  return result;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}
