import { DetectedFormat } from './validation.js';

export interface ToolDefinition {
  id: string;
  name: string;
  slug: string;
  canonicalRoute: string;
  category: 'image' | 'pdf';
  shortDescription: string;
  fullDescription: string;
  acceptedFormats: DetectedFormat[];
  acceptedExtensions: string[];
  outputFormat: string;
  processingEngine: 'HTML5 Canvas API' | 'pdf-lib Client Engine';
  fileLimits: {
    maxFileSizeMb: number;
    maxBatchCount: number;
    maxDimensions?: string;
  };
  browserCompatibility: string;
  isFullyImplemented: boolean;
}

export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    id: 'image-converter',
    name: 'Image Format Converter',
    slug: 'image-converter',
    canonicalRoute: '/tools/image-converter',
    category: 'image',
    shortDescription: 'Convert between JPG, PNG, and WebP instantly in browser memory.',
    fullDescription: 'High-fidelity in-browser image format conversion. Preserves transparency where supported and processes images with zero server uploads.',
    acceptedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml'],
    acceptedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'],
    outputFormat: 'JPG, PNG, or WebP',
    processingEngine: 'HTML5 Canvas API',
    fileLimits: {
      maxFileSizeMb: 50,
      maxBatchCount: 20,
      maxDimensions: '8000x8000 (64MP)',
    },
    browserCompatibility: 'All modern browsers (Chrome, Edge, Firefox, Safari)',
    isFullyImplemented: true,
  },
  {
    id: 'image-compressor',
    name: 'Image Compressor',
    slug: 'image-compressor',
    canonicalRoute: '/tools/image-compressor',
    category: 'image',
    shortDescription: 'Reduce image file size with adjustable quality and resolution scaling.',
    fullDescription: 'Fine-tune image compression with real-time quality control and optional max-dimension constraints. Runs client-side without degrading privacy.',
    acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    acceptedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    outputFormat: 'Optimized JPG or WebP',
    processingEngine: 'HTML5 Canvas API',
    fileLimits: {
      maxFileSizeMb: 50,
      maxBatchCount: 20,
      maxDimensions: '8000x8000',
    },
    browserCompatibility: 'All modern browsers',
    isFullyImplemented: true,
  },
  {
    id: 'image-resizer',
    name: 'Image Resizer',
    slug: 'image-resizer',
    canonicalRoute: '/tools/image-resizer',
    category: 'image',
    shortDescription: 'Change pixel dimensions while maintaining or modifying aspect ratio.',
    fullDescription: 'Scale images to custom pixel dimensions with high-quality bicubic interpolation and optional aspect ratio locking.',
    acceptedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'],
    acceptedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.bmp'],
    outputFormat: 'PNG, JPG, or WebP',
    processingEngine: 'HTML5 Canvas API',
    fileLimits: {
      maxFileSizeMb: 50,
      maxBatchCount: 20,
      maxDimensions: '8000x8000',
    },
    browserCompatibility: 'All modern browsers',
    isFullyImplemented: true,
  },
  {
    id: 'image-cropper',
    name: 'Image Cropper',
    slug: 'image-cropper',
    canonicalRoute: '/tools/image-cropper',
    category: 'image',
    shortDescription: 'Crop images to precise rectangular bounding boxes.',
    fullDescription: 'Extract target regions from images with precision coordinates and instant visual preview in client memory.',
    acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    acceptedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    outputFormat: 'PNG or JPG',
    processingEngine: 'HTML5 Canvas API',
    fileLimits: {
      maxFileSizeMb: 50,
      maxBatchCount: 1,
      maxDimensions: '8000x8000',
    },
    browserCompatibility: 'All modern browsers',
    isFullyImplemented: true,
  },
  {
    id: 'image-rotator',
    name: 'Image Rotator & Flipper',
    slug: 'image-rotator',
    canonicalRoute: '/tools/image-rotator',
    category: 'image',
    shortDescription: 'Rotate images by 90°, 180°, 270° or flip horizontally/vertically.',
    fullDescription: 'Correct photo orientation or mirror images horizontally and vertically with zero quality loss.',
    acceptedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'],
    acceptedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.bmp'],
    outputFormat: 'PNG, JPG, or WebP',
    processingEngine: 'HTML5 Canvas API',
    fileLimits: {
      maxFileSizeMb: 50,
      maxBatchCount: 20,
      maxDimensions: '8000x8000',
    },
    browserCompatibility: 'All modern browsers',
    isFullyImplemented: true,
  },
  {
    id: 'image-to-pdf',
    name: 'Image to PDF Converter',
    slug: 'image-to-pdf',
    canonicalRoute: '/tools/image-to-pdf',
    category: 'pdf',
    shortDescription: 'Bundle single or multiple images into a clean, searchable PDF document.',
    fullDescription: 'Combine photos, receipts, or document scans into a standardized multi-page PDF document generated locally in browser memory.',
    acceptedFormats: ['image/jpeg', 'image/png'],
    acceptedExtensions: ['.jpg', '.jpeg', '.png'],
    outputFormat: 'PDF Document (.pdf)',
    processingEngine: 'pdf-lib Client Engine',
    fileLimits: {
      maxFileSizeMb: 50,
      maxBatchCount: 20,
    },
    browserCompatibility: 'All modern browsers',
    isFullyImplemented: true,
  },
  {
    id: 'pdf-merge',
    name: 'PDF Merge',
    slug: 'pdf-merge',
    canonicalRoute: '/tools/pdf-merge',
    category: 'pdf',
    shortDescription: 'Combine multiple PDF files into a single consolidated document.',
    fullDescription: 'Merge distinct PDF files while preserving page contents, vector fonts, and layout integrity with zero cloud uploads.',
    acceptedFormats: ['application/pdf'],
    acceptedExtensions: ['.pdf'],
    outputFormat: 'Merged PDF Document (.pdf)',
    processingEngine: 'pdf-lib Client Engine',
    fileLimits: {
      maxFileSizeMb: 50,
      maxBatchCount: 20,
    },
    browserCompatibility: 'All modern browsers',
    isFullyImplemented: true,
  },
  {
    id: 'pdf-split',
    name: 'PDF Split',
    slug: 'pdf-split',
    canonicalRoute: '/tools/pdf-split',
    category: 'pdf',
    shortDescription: 'Extract specific page ranges or split PDFs into smaller documents.',
    fullDescription: 'Select custom start and end page numbers to extract specific chapters or sections into independent PDF files.',
    acceptedFormats: ['application/pdf'],
    acceptedExtensions: ['.pdf'],
    outputFormat: 'Extracted PDF Document (.pdf)',
    processingEngine: 'pdf-lib Client Engine',
    fileLimits: {
      maxFileSizeMb: 50,
      maxBatchCount: 1,
    },
    browserCompatibility: 'All modern browsers',
    isFullyImplemented: true,
  },
  {
    id: 'pdf-rotate',
    name: 'PDF Rotate',
    slug: 'pdf-rotate',
    canonicalRoute: '/tools/pdf-rotate',
    category: 'pdf',
    shortDescription: 'Permanently rotate PDF pages clockwise by 90°, 180°, or 270°.',
    fullDescription: 'Fix upside-down or sideways PDF scans by applying permanent page rotation in the document structure.',
    acceptedFormats: ['application/pdf'],
    acceptedExtensions: ['.pdf'],
    outputFormat: 'Rotated PDF Document (.pdf)',
    processingEngine: 'pdf-lib Client Engine',
    fileLimits: {
      maxFileSizeMb: 50,
      maxBatchCount: 10,
    },
    browserCompatibility: 'All modern browsers',
    isFullyImplemented: true,
  },
];
