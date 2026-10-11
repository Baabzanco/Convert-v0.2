/**
 * Client-Side Browser PDF Processing Engine
 * Powered by pdf-lib. Runs 100% in client memory without server calls.
 */

import { PDFDocument, degrees } from 'pdf-lib';

export interface ImageToPdfItem {
  data: Uint8Array | ArrayBuffer;
  mimeType: 'image/jpeg' | 'image/png';
  name?: string;
}

/**
 * 1. Image-to-PDF: Packages one or more images into a single PDF document
 */
export async function imageToPdf(images: ImageToPdfItem[]): Promise<Uint8Array> {
  if (images.length === 0) {
    throw new Error('At least one image is required to generate a PDF.');
  }

  const pdfDoc = await PDFDocument.create();

  for (const imgItem of images) {
    const buffer = imgItem.data instanceof Uint8Array ? imgItem.data : new Uint8Array(imgItem.data);

    let embeddedImage;
    if (imgItem.mimeType === 'image/jpeg') {
      embeddedImage = await pdfDoc.embedJpg(buffer);
    } else {
      embeddedImage = await pdfDoc.embedPng(buffer);
    }

    const { width, height } = embeddedImage;
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  return await pdfDoc.save();
}

/**
 * 2. PDF Merge: Combines multiple PDF files into a single document preserving order
 */
export async function mergePdfs(pdfBuffers: Array<Uint8Array | ArrayBuffer>): Promise<Uint8Array> {
  if (pdfBuffers.length < 2) {
    throw new Error('Merging requires at least two PDF documents.');
  }

  const mergedPdf = await PDFDocument.create();

  for (let i = 0; i < pdfBuffers.length; i++) {
    const rawBuffer = pdfBuffers[i];
    const buffer = rawBuffer instanceof Uint8Array ? rawBuffer : new Uint8Array(rawBuffer);

    let srcDoc: PDFDocument;
    try {
      srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
    } catch (err: any) {
      throw new Error(`Failed to read PDF document #${i + 1}: ${err.message || 'Corrupted or encrypted'}`);
    }

    const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  return await mergedPdf.save();
}

/**
 * 3. PDF Split: Extracts selected page ranges into separate PDF documents
 */
export async function splitPdf(
  pdfBuffer: Uint8Array | ArrayBuffer,
  ranges: Array<{ start: number; end: number; name?: string }>
): Promise<Array<{ rangeName: string; data: Uint8Array; pageCount: number }>> {
  const buffer = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
  const srcDoc = await PDFDocument.load(buffer);
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has no pages.');
  }

  const results: Array<{ rangeName: string; data: Uint8Array; pageCount: number }> = [];

  for (const range of ranges) {
    // 1-indexed validation
    const startPage = Math.max(1, Math.min(totalPages, range.start));
    const endPage = Math.max(startPage, Math.min(totalPages, range.end));

    // Convert to 0-indexed indices
    const pageIndices: number[] = [];
    for (let p = startPage - 1; p <= endPage - 1; p++) {
      pageIndices.push(p);
    }

    const subDoc = await PDFDocument.create();
    const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
    for (const page of copiedPages) {
      subDoc.addPage(page);
    }

    const subData = await subDoc.save();
    results.push({
      rangeName: range.name || `Pages_${startPage}_to_${endPage}`,
      data: subData,
      pageCount: pageIndices.length,
    });
  }

  return results;
}

/**
 * 4. PDF Rotate: Rotates specified pages (or all pages) by 90, 180, or 270 degrees
 */
export async function rotatePdf(
  pdfBuffer: Uint8Array | ArrayBuffer,
  rotationAngle: 90 | 180 | 270,
  pageNumbers?: number[] // 1-indexed page numbers (optional; rotates all if omitted)
): Promise<Uint8Array> {
  const buffer = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
  const pdfDoc = await PDFDocument.load(buffer);
  const totalPages = pdfDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document contains no pages.');
  }

  const pagesToRotate = pageNumbers && pageNumbers.length > 0
    ? pageNumbers.map((n) => n - 1).filter((idx) => idx >= 0 && idx < totalPages)
    : pdfDoc.getPageIndices();

  for (const pageIdx of pagesToRotate) {
    const page = pdfDoc.getPage(pageIdx);
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees((currentRotation + rotationAngle) % 360));
  }

  return await pdfDoc.save();
}

/**
 * Inspects a PDF buffer and returns metadata (page count, encryption status)
 */
export async function inspectPdf(
  pdfBuffer: Uint8Array | ArrayBuffer
): Promise<{ pageCount: number; isEncrypted: boolean }> {
  const buffer = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
  try {
    const doc = await PDFDocument.load(buffer);
    return {
      pageCount: doc.getPageCount(),
      isEncrypted: false,
    };
  } catch (err: any) {
    if (err.message && err.message.toLowerCase().includes('encrypt')) {
      return { pageCount: 0, isEncrypted: true };
    }
    throw err;
  }
}
