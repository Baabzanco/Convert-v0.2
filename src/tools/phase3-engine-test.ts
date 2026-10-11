import fs from 'fs';
import path from 'path';
import {
  detectMagicBytes,
  validateFile,
  validateBatchLimits,
  DEFAULT_LIMITS,
} from './validation.js';
import { sanitizeSvgString, sanitizeSvgBuffer } from './svg-sanitizer.js';
import { imageToPdf, mergePdfs, splitPdf, rotatePdf, inspectPdf } from './pdf-engine.js';
import { TOOL_REGISTRY } from './registry.js';
import { PDFDocument } from 'pdf-lib';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

export async function runPhase3EngineTestSuite(): Promise<boolean> {
  console.log('\n=============================================================');
  console.log('🧪 Starting Phase 3: Client-Side Image & PDF Processing Tests');
  console.log('=============================================================\n');

  // -----------------------------------------------------------------
  // 1. Valid Input Files & Magic Bytes Signatures
  // -----------------------------------------------------------------
  console.log('1. Testing Magic Bytes Signatures on Valid Inputs...');
  const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  assert(detectMagicBytes(jpegHeader) === 'image/jpeg', 'JPEG magic bytes (FF D8 FF) recognized');

  const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert(detectMagicBytes(pngHeader) === 'image/png', 'PNG magic bytes (89 50 4E 47 0D 0A 1A 0A) recognized');

  const webpHeader = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);
  assert(detectMagicBytes(webpHeader) === 'image/webp', 'WebP magic bytes (RIFF...WEBP) recognized');

  const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
  assert(detectMagicBytes(pdfHeader) === 'application/pdf', 'PDF magic bytes (%PDF-) recognized');

  const gifHeader = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  assert(detectMagicBytes(gifHeader) === 'image/gif', 'GIF magic bytes (GIF89a) recognized');

  const bmpHeader = new Uint8Array([0x42, 0x4d, 0x00, 0x00]);
  assert(detectMagicBytes(bmpHeader) === 'image/bmp', 'BMP magic bytes (BM) recognized');

  const svgHeader = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>');
  assert(detectMagicBytes(svgHeader) === 'image/svg+xml', 'SVG XML tag recognized');

  // -----------------------------------------------------------------
  // 2. Misleading File Extensions & Invalid Signatures
  // -----------------------------------------------------------------
  console.log('\n2. Testing Detection of Misleading File Extensions & Spoofed Signatures...');
  // A fake PNG that contains Windows PE executable bytes (4D 5A)
  const fakePngExecutable = {
    name: 'malicious_photo.png',
    size: 1024,
    arrayBuffer: async () => new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]).buffer,
  };
  const fakePngRes = await validateFile(fakePngExecutable, ['image/png', 'image/jpeg']);
  assert(!fakePngRes.isValid, 'Misleading executable disguised as .png rejected');
  assert(fakePngRes.detectedFormat === 'unknown', 'Non-image signature classified as unknown');

  // A plain text file named document.pdf
  const fakePdf = {
    name: 'document.pdf',
    size: 512,
    arrayBuffer: async () => new TextEncoder().encode('Hello this is just a plain text document.').buffer,
  };
  const fakePdfRes = await validateFile(fakePdf, ['application/pdf']);
  assert(!fakePdfRes.isValid, 'Plain text file with .pdf extension rejected');

  // -----------------------------------------------------------------
  // 3. Corrupted & Empty Files
  // -----------------------------------------------------------------
  console.log('\n3. Testing Empty and Corrupted Files...');
  const emptyFile = {
    name: 'empty.jpg',
    size: 0,
    arrayBuffer: async () => new ArrayBuffer(0),
  };
  const emptyRes = await validateFile(emptyFile, ['image/jpeg']);
  assert(!emptyRes.isValid, 'Empty 0-byte file rejected');
  assert(emptyRes.error?.includes('empty') === true, 'Meaningful error message for empty file');

  // -----------------------------------------------------------------
  // 4. Resource Boundary Limits (Single File & Batch Limits)
  // -----------------------------------------------------------------
  console.log('\n4. Testing Resource Boundary Limits...');
  const oversizeFile = {
    name: 'giant_video.png',
    size: 60 * 1024 * 1024, // 60MB (limit is 50MB)
    arrayBuffer: async () => new ArrayBuffer(100),
  };
  const oversizeRes = await validateFile(oversizeFile, ['image/png']);
  assert(!oversizeRes.isValid, 'File exceeding 50MB limit rejected');
  assert(oversizeRes.error?.includes('maximum limit of 50MB') === true, 'Error reports file size limit');

  // Batch count limit check
  const tooManyFiles = Array.from({ length: 25 }, () => ({ size: 1024 }));
  const batchCountRes = validateBatchLimits(tooManyFiles, DEFAULT_LIMITS);
  assert(!batchCountRes.isValid, 'Batch containing > 20 files rejected');

  // Batch aggregate total size limit check
  const tooHeavyBatch = Array.from({ length: 5 }, () => ({ size: 45 * 1024 * 1024 })); // 225MB total > 200MB
  const batchSizeRes = validateBatchLimits(tooHeavyBatch, DEFAULT_LIMITS);
  assert(!batchSizeRes.isValid, 'Batch total size exceeding 200MB rejected');

  // -----------------------------------------------------------------
  // 5. SVG Sanitization & Neutralization of XSS / External Exfiltration
  // -----------------------------------------------------------------
  console.log('\n5. Testing SVG Sanitization & Security Neutralization...');
  const maliciousSvg = `
    <svg xmlns="http://www.w3.org/2000/svg">
      <script>alert("XSS")</script>
      <circle cx="50" cy="50" r="40" onload="stealTokens()" onerror="malicious()" />
      <image href="https://attacker.com/tracking.png" width="10" height="10" />
      <a href="javascript:alert(1)"><text>Click</text></a>
      <foreignObject width="100" height="100"><body xmlns="http://www.w3.org/1999/xhtml"><iframe></iframe></body></foreignObject>
    </svg>
  `;

  const cleanSvg = sanitizeSvgString(maliciousSvg);
  assert(!cleanSvg.includes('<script>'), 'Script tags stripped from SVG');
  assert(!cleanSvg.includes('onload='), 'onload event handler stripped from SVG');
  assert(!cleanSvg.includes('onerror='), 'onerror event handler stripped from SVG');
  assert(!cleanSvg.includes('https://attacker.com'), 'External tracking image URL stripped from SVG');
  assert(!cleanSvg.includes('javascript:'), 'javascript: URI neutralized in SVG href');
  assert(!cleanSvg.includes('<foreignObject>'), 'foreignObject tag stripped from SVG');
  assert(!cleanSvg.includes('<iframe>'), 'iframe stripped from SVG');

  // -----------------------------------------------------------------
  // 6. PDF Processing Engine: Document Creation, Inspection & Integrity
  // -----------------------------------------------------------------
  console.log('\n6. Testing PDF-Lib Client Processing Engine...');
  // Create fixture PDF document #1 (2 pages)
  const doc1 = await PDFDocument.create();
  doc1.addPage([400, 600]);
  doc1.addPage([400, 600]);
  const pdfBytes1 = await doc1.save();
  assert(pdfBytes1.length > 0, 'PDF document #1 generated');

  const info1 = await inspectPdf(pdfBytes1);
  assert(info1.pageCount === 2, 'Inspected PDF contains exactly 2 pages');
  assert(!info1.isEncrypted, 'Inspected PDF is not encrypted');

  // Create fixture PDF document #2 (3 pages)
  const doc2 = await PDFDocument.create();
  doc2.addPage([500, 700]);
  doc2.addPage([500, 700]);
  doc2.addPage([500, 700]);
  const pdfBytes2 = await doc2.save();

  // -----------------------------------------------------------------
  // 7. PDF Merge: Combine Documents & Verify Page Ordering
  // -----------------------------------------------------------------
  console.log('\n7. Testing PDF Merge (Concatenation & Page Ordering Integrity)...');
  const mergedPdfBytes = await mergePdfs([pdfBytes1, pdfBytes2]);
  const mergedDoc = await PDFDocument.load(mergedPdfBytes);
  assert(mergedDoc.getPageCount() === 5, 'Merged PDF contains sum of pages (2 + 3 = 5 pages)');

  // Verify header magic bytes of merged PDF
  const mergedMagic = detectMagicBytes(new Uint8Array(mergedPdfBytes.slice(0, 8)));
  assert(mergedMagic === 'application/pdf', 'Merged document has valid %PDF- signature');

  // -----------------------------------------------------------------
  // 8. PDF Split: Range Extraction
  // -----------------------------------------------------------------
  console.log('\n8. Testing PDF Split (Page Range Extraction)...');
  const splitResults = await splitPdf(mergedPdfBytes, [
    { start: 2, end: 4, name: 'MiddlePages' },
  ]);
  assert(splitResults.length === 1, 'Split returned 1 extracted range');
  assert(splitResults[0].pageCount === 3, 'Extracted range contains exactly 3 pages (p2, p3, p4)');
  const splitDoc = await PDFDocument.load(splitResults[0].data);
  assert(splitDoc.getPageCount() === 3, 'Loaded split document verified with 3 pages');

  // -----------------------------------------------------------------
  // 9. PDF Rotate: Page Orientation Transformation
  // -----------------------------------------------------------------
  console.log('\n9. Testing PDF Page Rotation...');
  const rotatedBytes = await rotatePdf(pdfBytes1, 90, [1]);
  const rotatedDoc = await PDFDocument.load(rotatedBytes);
  const p1 = rotatedDoc.getPage(0);
  assert(p1.getRotation().angle === 90, 'Page #1 rotation angle set to 90 degrees');
  const p2 = rotatedDoc.getPage(1);
  assert(p2.getRotation().angle === 0, 'Page #2 untouched with rotation angle 0');

  // -----------------------------------------------------------------
  // 10. Image-to-PDF Converter
  // -----------------------------------------------------------------
  console.log('\n10. Testing Image-to-PDF Conversion...');
  // Minimal valid 1x1 PNG fixture (68 bytes)
  const minimalPng = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  const imgPdfBytes = await imageToPdf([
    { data: minimalPng, mimeType: 'image/png', name: 'pixel.png' },
  ]);
  const imgPdfDoc = await PDFDocument.load(imgPdfBytes);
  assert(imgPdfDoc.getPageCount() === 1, 'Image converted to 1-page PDF document');
  const imgPage = imgPdfDoc.getPage(0);
  assert(imgPage.getWidth() === 1 && imgPage.getHeight() === 1, 'PDF page dimensions match natural image size (1x1)');

  // -----------------------------------------------------------------
  // 11. Canonical Routes & Tool Inventory Verification
  // -----------------------------------------------------------------
  console.log('\n11. Verifying Tool Inventory & Canonical Routes...');
  assert(TOOL_REGISTRY.length === 9, 'All 9 planned image and PDF tools registered');

  const requiredSlugs = [
    'image-converter',
    'image-compressor',
    'image-resizer',
    'image-cropper',
    'image-rotator',
    'image-to-pdf',
    'pdf-merge',
    'pdf-split',
    'pdf-rotate',
  ];

  for (const slug of requiredSlugs) {
    const t = TOOL_REGISTRY.find((x) => x.slug === slug);
    assert(Boolean(t && t.isFullyImplemented), `Tool "${slug}" registered with full implementation`);
    assert(t!.canonicalRoute === `/tools/${slug}`, `Tool "${slug}" maintains canonical route /tools/${slug}`);
  }

  // -----------------------------------------------------------------
  // 12. Privacy Guarantees & Zero-Upload Boundary
  // -----------------------------------------------------------------
  console.log('\n12. Verifying Zero Server-Side File Upload & Privacy Protection...');
  const serverCode = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf-8');
  assert(!serverCode.includes('/api/upload'), 'No /api/upload endpoint in server.ts');
  assert(!serverCode.includes('/api/convert'), 'No /api/convert endpoint in server.ts');
  assert(!serverCode.includes('multipart/form-data'), 'No multipart form file upload handling in server.ts');

  // Verify database schema has no user media tables
  const prismaCode = fs.readFileSync(path.resolve(process.cwd(), 'prisma/schema.prisma'), 'utf-8');
  assert(!prismaCode.includes('model Media') && !prismaCode.includes('model Upload'), 'No user media tables in schema.prisma');

  console.log(`\n=============================================================`);
  console.log(`🎉 All ${passedTests}/${totalTests} Phase 3 Engine & Security Tests Passed Successfully!`);
  console.log(`=============================================================\n`);

  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPhase3EngineTestSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Phase 3 Test Suite] Error:', err);
      process.exit(1);
    });
}
