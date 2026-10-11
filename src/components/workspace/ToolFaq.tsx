import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

interface ToolFaqProps {
  toolId: string;
}

const TOOL_SPECIFIC_FAQS: Record<string, FaqItem[]> = {
  'image-converter': [
    {
      question: 'Which output format should I choose: WebP, PNG, or JPG?',
      answer:
        'WebP offers the smallest file size with excellent visual quality and is supported by all modern browsers. Use PNG if you need transparent backgrounds or pixel-perfect lossless text. Choose JPG if maximum compatibility with legacy software or printing is required.',
    },
    {
      question: 'Does format conversion reduce the quality of my images?',
      answer:
        'Converting to PNG is completely lossless. Converting to JPG or WebP is lossy, but with our default 85% quality setting, visual degradation is imperceptible to the human eye while drastically reducing file size.',
    },
    {
      question: 'Are my images or converted files uploaded to any server?',
      answer:
        'Never. Conversion is carried out strictly in your browser memory using HTML5 Canvas rendering. Your images are never transmitted over the internet or saved on remote servers.',
    },
  ],
  'image-compressor': [
    {
      question: 'How much file size reduction can I expect?',
      answer:
        'Typical savings range from 40% to 80% depending on the original compression level. Photos taken directly by smartphones or DSLR cameras contain uncompressed data and see the largest savings.',
    },
    {
      question: 'What quality percentage is recommended for web publishing?',
      answer:
        'A quality setting between 70% and 85% provides the optimal balance between high visual sharpness and minimal file weight.',
    },
    {
      question: 'Does compression strip GPS and camera metadata for privacy?',
      answer:
        'Yes. Because recompression reconstructs the image pixels in a fresh HTML5 canvas buffer, invasive EXIF metadata, camera serial numbers, and GPS location tags are stripped automatically.',
    },
  ],
  'image-resizer': [
    {
      question: 'What does "Lock Aspect Ratio" do?',
      answer:
        'Locking aspect ratio keeps the proportional relationship between the width and height of your image constant, preventing distortion, stretching, or squishing.',
    },
    {
      question: 'What is the maximum image resolution supported?',
      answer:
        'BrowserSuite supports resizing images up to 8000 × 8000 pixels (64 Megapixels). Higher resolutions are safely constrained to protect device memory limits.',
    },
    {
      question: 'Does resizing small images make them blurry?',
      answer:
        'Upscaling an image beyond its natural resolution cannot synthesize new details, but our engine applies high-quality bicubic interpolation smoothing to minimize pixelation.',
    },
  ],
  'image-cropper': [
    {
      question: 'How do the aspect ratio presets work?',
      answer:
        'Presets like 1:1 Square (avatars/Instagram), 16:9 Landscape (YouTube banners/widescreen displays), and 4:3 Standard constrain the crop box to standard proportions automatically.',
    },
    {
      question: 'Is the image cropped destructively on my device?',
      answer:
        'No. Your original file remains untouched on your disk. Cropping creates a brand new cropped image in browser memory that you can download separately.',
    },
    {
      question: 'Can I crop multiple images in a batch?',
      answer:
        'The Image Cropper operates on one image at a time so you can review and position precise crop coordinates before saving.',
    },
  ],
  'image-rotator': [
    {
      question: 'Does rotating by 90 degrees reduce image quality?',
      answer:
        'Orthogonal rotations (90°, 180°, 270°) and horizontal/vertical flips simply reposition pixel coordinates without re-sampling loss.',
    },
    {
      question: 'Can I flip both horizontally and vertically at the same time?',
      answer:
        'Yes! You can toggle both horizontal and vertical flips simultaneously to achieve a 180-degree reflection.',
    },
    {
      question: 'Why does the preview rotate instantly before I click Process?',
      answer:
        'Our preview uses hardware-accelerated CSS transforms for real-time visualization. Clicking "Process Files" applies the permanent pixel transformations in Canvas memory.',
    },
  ],
  'image-to-pdf': [
    {
      question: 'How can I change the order of the pages in the PDF?',
      answer:
        'In the File Queue above, use the Up (↑) and Down (↓) arrow buttons on each photo to reorder your images into the exact desired sequence before creating the PDF.',
    },
    {
      question: 'Which image formats can be converted to PDF?',
      answer:
        'JPEG (.jpg, .jpeg) and PNG (.png) images are directly embedded into PDF streams using the pdf-lib client engine.',
    },
    {
      question: 'What page orientation should I select?',
      answer:
        '"Auto (Fit Image)" creates custom page dimensions matching each photograph. "Portrait" and "Landscape" create standardized document pages.',
    },
  ],
  'pdf-merge': [
    {
      question: 'Are text formatting, vector fonts, and bookmarks retained when merging?',
      answer:
        'Yes. pdf-lib copies internal PDF streams directly at the byte level, preserving vector typography, outlines, and links without lossy rasterization.',
    },
    {
      question: 'Is there a limit on how many PDF files can be merged?',
      answer:
        'You can merge up to 20 PDF documents in a single operation. The merged document is compiled entirely in your browser memory.',
    },
    {
      question: 'Can encrypted or password-protected PDFs be merged?',
      answer:
        'Encrypted PDF documents must be unlocked before merging because client-side security policies prevent unauthorized access to protected streams.',
    },
  ],
  'pdf-split': [
    {
      question: 'How do I extract just one single page from a PDF?',
      answer:
        'Set both the Start Page and End Page to the same page number (e.g. Start: 3, End: 3) to extract that single page into a new PDF.',
    },
    {
      question: 'Will the extracted pages have smaller file size?',
      answer:
        'Yes. The split engine copies only the selected page trees and their associated embedded fonts and images, discarding all unused pages.',
    },
    {
      question: 'Does splitting a PDF damage the original file?',
      answer:
        'No. Your original PDF is only read in client memory. The extracted pages are saved as a separate download.',
    },
  ],
  'pdf-rotate': [
    {
      question: 'Is the page rotation permanent in the downloaded PDF?',
      answer:
        'Yes. The rotation instruction is written permanently into each page object dictionary according to the official PDF standard.',
    },
    {
      question: 'Can I rotate only odd or even pages?',
      answer:
        'Yes! You can choose "Odd Pages Only" or "Even Pages Only" to fix duplex scanning errors where every other page was scanned upside down.',
    },
    {
      question: 'Does rotating PDF pages alter document file size?',
      answer:
        'No. Rotating PDF pages only updates the /Rotate attribute in page metadata, so the file size remains practically identical.',
    },
  ],
};

export function ToolFaq({ toolId }: ToolFaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const faqs = TOOL_SPECIFIC_FAQS[toolId] || [
    {
      question: 'Are my files uploaded or stored on any server?',
      answer:
        'No. All processing occurs 100% locally in your browser memory. No data is ever transmitted to any backend server.',
    },
    {
      question: 'How does client-side file processing work?',
      answer:
        'Modern browsers support high-performance APIs like HTML5 Canvas and WebAssembly that allow direct byte manipulation in RAM without cloud computation.',
    },
  ];

  return (
    <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-sky-500" />
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          Frequently Asked Questions
        </h3>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all shadow-xs"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                aria-expanded={isOpen}
                className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                  {faq.question}
                </span>
                <span className="text-slate-400 dark:text-slate-500 shrink-0">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/60 leading-relaxed bg-slate-50/50 dark:bg-slate-900/30">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
