import React, { useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { ToolDefinition } from '../tools/registry.js';
import { validateFile, ValidationResult, DEFAULT_LIMITS } from '../tools/validation.js';
import { sanitizeSvgBuffer } from '../tools/svg-sanitizer.js';
import {
  convertImage,
  compressImage,
  resizeImage,
  rotateImage,
  cropImage,
  SupportedOutputFormat,
} from '../tools/image-engine.js';
import {
  imageToPdf,
  mergePdfs,
  splitPdf,
  rotatePdf,
  inspectPdf,
  ImageToPdfItem,
} from '../tools/pdf-engine.js';
import { triggerDirectDownload } from '../tools/download.js';

import { ToolHeader } from './workspace/ToolHeader.js';
import { PrivacyNotice } from './workspace/PrivacyNotice.js';
import { FileDropzone } from './workspace/FileDropzone.js';
import { FileQueue, FileQueueEntry } from './workspace/FileQueue.js';
import { ConverterOptions } from './workspace/options/ConverterOptions.js';
import { CompressorOptions } from './workspace/options/CompressorOptions.js';
import { ResizerOptions } from './workspace/options/ResizerOptions.js';
import { CropperOptions, CropRectangle } from './workspace/options/CropperOptions.js';
import { RotatorOptions } from './workspace/options/RotatorOptions.js';
import { ImageToPdfOptions } from './workspace/options/ImageToPdfOptions.js';
import { PdfMergeOptions } from './workspace/options/PdfMergeOptions.js';
import { PdfSplitOptions } from './workspace/options/PdfSplitOptions.js';
import { PdfRotateOptions } from './workspace/options/PdfRotateOptions.js';
import { ProcessingProgress } from './workspace/ProcessingProgress.js';
import { ProcessingResult, ProcessedItem } from './workspace/ProcessingResult.js';
import { RelatedTools } from './workspace/RelatedTools.js';
import { ToolFaq } from './workspace/ToolFaq.js';

interface ToolWorkspaceProps {
  tool: ToolDefinition;
  onBackToTools: () => void;
  onSelectTool?: (toolId: string) => void;
  isEditingEnabled?: boolean;
}

export function ToolWorkspace({
  tool,
  onBackToTools,
  onSelectTool,
  isEditingEnabled = false,
}: ToolWorkspaceProps) {
  // File Queue state
  const [queue, setQueue] = useState<FileQueueEntry[]>([]);
  const [validating, setValidating] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Common Tool States
  const [outputFormat, setOutputFormat] = useState<SupportedOutputFormat>('image/webp');
  const [quality, setQuality] = useState(85);

  // Resizer state
  const [resizeWidth, setResizeWidth] = useState<number>(1200);
  const [resizeHeight, setResizeHeight] = useState<number>(800);
  const [originalWidth, setOriginalWidth] = useState<number>(1200);
  const [originalHeight, setOriginalHeight] = useState<number>(800);
  const [maintainRatio, setMaintainRatio] = useState(true);

  // Compressor state
  const [compressMaxDim, setCompressMaxDim] = useState<number | undefined>(undefined);

  // Cropper state
  const [cropRect, setCropRect] = useState<CropRectangle>({ x: 0, y: 0, width: 800, height: 600 });

  // Rotator state
  const [rotationAngle, setRotationAngle] = useState<0 | 90 | 180 | 270>(90);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // PDF tools state
  const [pdfTotalPages, setPdfTotalPages] = useState<number | null>(null);
  const [pdfDocName, setPdfDocName] = useState('images_document.pdf');
  const [pdfOrientation, setPdfOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [pdfMargin, setPdfMargin] = useState<'none' | 'compact' | 'normal'>('none');
  const [mergeOutputName, setMergeOutputName] = useState('merged_document.pdf');
  const [splitStart, setSplitStart] = useState(1);
  const [splitEnd, setSplitEnd] = useState(1);
  const [pdfRotateAngle, setPdfRotateAngle] = useState<90 | 180 | 270>(90);
  const [pdfRotateScope, setPdfRotateScope] = useState<'all' | 'odd' | 'even' | 'custom'>('all');
  const [pdfRotateCustom, setPdfRotateCustom] = useState('');

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ProcessedItem[]>([]);

  // Reset workspace when tool changes
  useEffect(() => {
    // Revoke old object URLs
    queue.forEach((item) => {
      if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
    });
    setQueue([]);
    setResults([]);
    setError(null);
    setProgress(0);
    setPdfTotalPages(null);
    // Set appropriate default output format
    if (tool.id === 'image-compressor') {
      setOutputFormat('image/jpeg');
    } else if (tool.category === 'image') {
      setOutputFormat('image/webp');
    }
  }, [tool.id]);

  // Handle incoming files
  const handleFilesSelected = async (files: FileList | File[]) => {
    setError(null);
    setResults([]);
    setValidating(true);

    const incoming = Array.from(files);
    const isSingleTool = tool.fileLimits.maxBatchCount === 1;
    const baseList = isSingleTool ? incoming.slice(0, 1) : incoming;

    const newEntries: FileQueueEntry[] = [];

    for (const f of baseList) {
      const v = await validateFile(f, tool.acceptedFormats, DEFAULT_LIMITS);
      let thumb: string | undefined = undefined;
      let pages: number | undefined = undefined;

      if (v.isValid) {
        if (f.type.startsWith('image/')) {
          thumb = URL.createObjectURL(f);
        } else if (f.type === 'application/pdf' || f.name.endsWith('.pdf')) {
          try {
            const buf = await f.arrayBuffer();
            const info = await inspectPdf(buf);
            pages = info.pageCount;
          } catch {
            // pdf page count optional
          }
        }
      }

      newEntries.push({
        file: f,
        validation: v,
        thumbnailUrl: thumb,
        pdfPages: pages,
      });
    }

    const updatedQueue = isSingleTool ? newEntries : [...queue, ...newEntries].slice(0, tool.fileLimits.maxBatchCount);
    setQueue(updatedQueue);

    // Initial tool configuration pre-population
    const firstValid = updatedQueue.find((e) => e.validation.isValid);
    if (firstValid) {
      if (firstValid.validation.dimensions) {
        const { width, height } = firstValid.validation.dimensions;
        setOriginalWidth(width);
        setOriginalHeight(height);
        setResizeWidth(width);
        setResizeHeight(height);
        setCropRect({ x: 0, y: 0, width, height });
      }

      if (firstValid.pdfPages) {
        setPdfTotalPages(firstValid.pdfPages);
        setSplitStart(1);
        setSplitEnd(Math.max(1, firstValid.pdfPages));
      }
    }

    setValidating(false);
  };

  // Reordering queue items
  const handleMoveQueueItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= queue.length) return;
    const updated = [...queue];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setQueue(updated);
  };

  // Removing queue item
  const handleRemoveQueueItem = (idx: number) => {
    const item = queue[idx];
    if (item && item.thumbnailUrl) {
      URL.revokeObjectURL(item.thumbnailUrl);
    }
    const updated = queue.filter((_, i) => i !== idx);
    setQueue(updated);
  };

  // Clear all files
  const handleClearQueue = () => {
    queue.forEach((item) => {
      if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
    });
    setQueue([]);
    setResults([]);
    setError(null);
  };

  // Execute in-browser processing strictly client-side
  const handleProcess = async () => {
    const validEntries = queue.filter((item) => item.validation.isValid);
    if (validEntries.length === 0) {
      setError('Please provide at least one valid file supported by this tool.');
      return;
    }

    setProcessing(true);
    setProgress(10);
    setError(null);
    setResults([]);

    try {
      const outputItems: ProcessedItem[] = [];

      // 1. Image Format Converter
      if (tool.id === 'image-converter') {
        for (let i = 0; i < validEntries.length; i++) {
          const entry = validEntries[i];
          setStatusMessage(`Converting ${entry.file.name} to ${outputFormat}...`);
          let fileData: ArrayBuffer = await entry.file.arrayBuffer();

          if (entry.file.type.includes('svg') || entry.file.name.endsWith('.svg')) {
            const sanitized = sanitizeSvgBuffer(fileData);
            fileData = sanitized.buffer.slice(
              sanitized.byteOffset,
              sanitized.byteOffset + sanitized.byteLength
            ) as ArrayBuffer;
          }

          const res = await convertImage(fileData, outputFormat, quality / 100, entry.file.type);
          const ext = outputFormat === 'image/jpeg' ? 'jpg' : outputFormat === 'image/png' ? 'png' : 'webp';
          const baseName = entry.file.name.replace(/\.[^/.]+$/, '');
          const outName = `${baseName}_converted.${ext}`;
          const previewUrl = URL.createObjectURL(res.blob);

          outputItems.push({
            data: res.blob,
            fileName: outName,
            mimeType: outputFormat,
            size: res.size,
            previewUrl,
            originalSize: entry.file.size,
          });

          setProgress(Math.round(20 + ((i + 1) / validEntries.length) * 75));
        }
      }

      // 2. Image Compressor
      else if (tool.id === 'image-compressor') {
        for (let i = 0; i < validEntries.length; i++) {
          const entry = validEntries[i];
          setStatusMessage(`Compressing ${entry.file.name} (${quality}% quality)...`);
          const fileData = await entry.file.arrayBuffer();

          const res = await compressImage(
            fileData,
            quality / 100,
            compressMaxDim,
            outputFormat,
            entry.file.type
          );
          const ext = outputFormat === 'image/webp' ? 'webp' : 'jpg';
          const baseName = entry.file.name.replace(/\.[^/.]+$/, '');
          const outName = `${baseName}_compressed.${ext}`;
          const previewUrl = URL.createObjectURL(res.blob);

          outputItems.push({
            data: res.blob,
            fileName: outName,
            mimeType: outputFormat,
            size: res.size,
            previewUrl,
            originalSize: entry.file.size,
          });

          setProgress(Math.round(20 + ((i + 1) / validEntries.length) * 75));
        }
      }

      // 3. Image Resizer
      else if (tool.id === 'image-resizer') {
        for (let i = 0; i < validEntries.length; i++) {
          const entry = validEntries[i];
          setStatusMessage(`Resizing ${entry.file.name} to ${resizeWidth}×${resizeHeight}px...`);
          const fileData = await entry.file.arrayBuffer();

          const res = await resizeImage(
            fileData,
            resizeWidth,
            resizeHeight,
            maintainRatio,
            outputFormat,
            0.92,
            entry.file.type
          );
          const ext = outputFormat === 'image/jpeg' ? 'jpg' : outputFormat === 'image/png' ? 'png' : 'webp';
          const baseName = entry.file.name.replace(/\.[^/.]+$/, '');
          const outName = `${baseName}_resized.${ext}`;
          const previewUrl = URL.createObjectURL(res.blob);

          outputItems.push({
            data: res.blob,
            fileName: outName,
            mimeType: outputFormat,
            size: res.size,
            previewUrl,
            originalSize: entry.file.size,
          });

          setProgress(Math.round(20 + ((i + 1) / validEntries.length) * 75));
        }
      }

      // 4. Image Cropper
      else if (tool.id === 'image-cropper') {
        const entry = validEntries[0];
        setStatusMessage(`Extracting crop area (${Math.round(cropRect.width)}×${Math.round(cropRect.height)}px)...`);
        const fileData = await entry.file.arrayBuffer();

        const res = await cropImage(fileData, cropRect, outputFormat, 0.92, entry.file.type);
        const ext = outputFormat === 'image/jpeg' ? 'jpg' : outputFormat === 'image/png' ? 'png' : 'webp';
        const baseName = entry.file.name.replace(/\.[^/.]+$/, '');
        const outName = `${baseName}_cropped.${ext}`;
        const previewUrl = URL.createObjectURL(res.blob);

        outputItems.push({
          data: res.blob,
          fileName: outName,
          mimeType: outputFormat,
          size: res.size,
          previewUrl,
          originalSize: entry.file.size,
        });

        setProgress(95);
      }

      // 5. Image Rotator & Flipper
      else if (tool.id === 'image-rotator') {
        for (let i = 0; i < validEntries.length; i++) {
          const entry = validEntries[i];
          setStatusMessage(`Applying rotation (${rotationAngle}°) to ${entry.file.name}...`);
          const fileData = await entry.file.arrayBuffer();

          const res = await rotateImage(
            fileData,
            rotationAngle,
            flipH,
            flipV,
            outputFormat,
            0.92,
            entry.file.type
          );
          const ext = outputFormat === 'image/jpeg' ? 'jpg' : outputFormat === 'image/png' ? 'png' : 'webp';
          const baseName = entry.file.name.replace(/\.[^/.]+$/, '');
          const outName = `${baseName}_rotated.${ext}`;
          const previewUrl = URL.createObjectURL(res.blob);

          outputItems.push({
            data: res.blob,
            fileName: outName,
            mimeType: outputFormat,
            size: res.size,
            previewUrl,
            originalSize: entry.file.size,
          });

          setProgress(Math.round(20 + ((i + 1) / validEntries.length) * 75));
        }
      }

      // 6. Image to PDF
      else if (tool.id === 'image-to-pdf') {
        setStatusMessage('Preparing image streams for PDF encoding...');
        const imageItems: ImageToPdfItem[] = [];

        for (let i = 0; i < validEntries.length; i++) {
          const entry = validEntries[i];
          const rawBuf = await entry.file.arrayBuffer();
          const mime = entry.file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          imageItems.push({
            data: rawBuf,
            mimeType: mime,
            name: entry.file.name,
          });
          setProgress(Math.round(20 + (i / validEntries.length) * 50));
        }

        setStatusMessage('Generating multi-page PDF document...');
        const pdfBytes = await imageToPdf(imageItems);
        setProgress(95);

        const outName = pdfDocName.endsWith('.pdf') ? pdfDocName : `${pdfDocName}.pdf`;
        outputItems.push({
          data: pdfBytes,
          fileName: outName,
          mimeType: 'application/pdf',
          size: pdfBytes.byteLength,
        });
      }

      // 7. PDF Merge
      else if (tool.id === 'pdf-merge') {
        if (validEntries.length < 2) {
          throw new Error('PDF Merge requires at least 2 PDF documents.');
        }

        setStatusMessage('Reading PDF document structures...');
        const buffers: ArrayBuffer[] = [];

        for (let i = 0; i < validEntries.length; i++) {
          const buf = await validEntries[i].file.arrayBuffer();
          buffers.push(buf);
          setProgress(Math.round(20 + (i / validEntries.length) * 50));
        }

        setStatusMessage('Concatenating PDF pages and preserving vector text...');
        const mergedBytes = await mergePdfs(buffers);
        setProgress(95);

        const outName = mergeOutputName.endsWith('.pdf') ? mergeOutputName : `${mergeOutputName}.pdf`;
        outputItems.push({
          data: mergedBytes,
          fileName: outName,
          mimeType: 'application/pdf',
          size: mergedBytes.byteLength,
        });
      }

      // 8. PDF Split
      else if (tool.id === 'pdf-split') {
        const entry = validEntries[0];
        setStatusMessage(`Extracting pages ${splitStart} through ${splitEnd}...`);
        const buf = await entry.file.arrayBuffer();

        const splitResults = await splitPdf(buf, [{ start: splitStart, end: splitEnd }]);
        setProgress(95);

        const baseName = entry.file.name.replace(/\.[^/.]+$/, '');
        const outName = `${baseName}_p${splitStart}-${splitEnd}.pdf`;

        outputItems.push({
          data: splitResults[0].data,
          fileName: outName,
          mimeType: 'application/pdf',
          size: splitResults[0].data.byteLength,
          originalSize: entry.file.size,
        });
      }

      // 9. PDF Rotate
      else if (tool.id === 'pdf-rotate') {
        const entry = validEntries[0];
        setStatusMessage(`Rotating PDF pages by ${pdfRotateAngle}°...`);
        const buf = await entry.file.arrayBuffer();

        let targetPages: number[] | undefined = undefined;
        if (pdfRotateScope === 'odd' && pdfTotalPages) {
          targetPages = [];
          for (let p = 1; p <= pdfTotalPages; p += 2) targetPages.push(p);
        } else if (pdfRotateScope === 'even' && pdfTotalPages) {
          targetPages = [];
          for (let p = 2; p <= pdfTotalPages; p += 2) targetPages.push(p);
        } else if (pdfRotateScope === 'custom' && pdfRotateCustom) {
          targetPages = pdfRotateCustom
            .split(',')
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n) && n >= 1 && (pdfTotalPages ? n <= pdfTotalPages : true));
        }

        const rotatedBytes = await rotatePdf(buf, pdfRotateAngle, targetPages);
        setProgress(95);

        const baseName = entry.file.name.replace(/\.[^/.]+$/, '');
        outputItems.push({
          data: rotatedBytes,
          fileName: `${baseName}_rotated.pdf`,
          mimeType: 'application/pdf',
          size: rotatedBytes.byteLength,
          originalSize: entry.file.size,
        });
      }

      setProgress(100);
      setResults(outputItems);
    } catch (err: any) {
      console.error('Client processing failure:', err);
      setError(err.message || 'An error occurred during client-side processing.');
    } finally {
      setProcessing(false);
    }
  };

  // Download handlers
  const handleDownloadItem = (item: ProcessedItem) => {
    triggerDirectDownload(item.data, item.fileName, item.mimeType);
  };

  const handleDownloadAll = () => {
    results.forEach((item, idx) => {
      setTimeout(() => {
        triggerDirectDownload(item.data, item.fileName, item.mimeType);
      }, idx * 350);
    });
  };

  const validFilesCount = queue.filter((i) => i.validation.isValid).length;
  const canReorder = tool.id === 'image-to-pdf' || tool.id === 'pdf-merge';
  const firstThumbnail = queue.find((i) => i.thumbnailUrl)?.thumbnailUrl;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Tool Header with Breadcrumbs */}
      <ToolHeader
        tool={tool}
        onBackToTools={onBackToTools}
        onSelectCategory={() => onBackToTools()}
      />

      {/* 2. Privacy Guarantee Banner */}
      <PrivacyNotice />

      {/* 3. Drag & Drop File Intake Zone */}
      <div className="space-y-4">
        <FileDropzone
          tool={tool}
          onFilesSelected={handleFilesSelected}
          disabled={processing}
        />

        {/* Hidden Input for 'Add more files' button */}
        <input
          ref={hiddenInputRef}
          type="file"
          multiple={tool.fileLimits.maxBatchCount > 1}
          accept={tool.acceptedExtensions.join(',')}
          onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
          className="hidden"
        />
      </div>

      {/* 4. File Queue & Integrity Inspection */}
      {queue.length > 0 && (
        <FileQueue
          queue={queue}
          onRemoveItem={handleRemoveQueueItem}
          onMoveItem={handleMoveQueueItem}
          onClearAll={handleClearQueue}
          onAddMore={() => hiddenInputRef.current?.click()}
          maxBatchCount={tool.fileLimits.maxBatchCount}
          canReorder={canReorder}
        />
      )}

      {/* 5. Tool-Specific Parameters Panel */}
      {validFilesCount > 0 && (
        <div className="space-y-4">
          {tool.id === 'image-converter' && (
            <ConverterOptions
              outputFormat={outputFormat}
              onChangeOutputFormat={setOutputFormat}
              quality={quality}
              onChangeQuality={setQuality}
              fileCount={validFilesCount}
            />
          )}

          {tool.id === 'image-compressor' && (
            <CompressorOptions
              quality={quality}
              onChangeQuality={setQuality}
              maxDimension={compressMaxDim}
              onChangeMaxDimension={setCompressMaxDim}
              outputFormat={outputFormat}
              onChangeOutputFormat={setOutputFormat}
              originalSizeTotal={queue.reduce((acc, i) => acc + i.file.size, 0)}
            />
          )}

          {tool.id === 'image-resizer' && (
            <ResizerOptions
              width={resizeWidth}
              height={resizeHeight}
              onChangeWidth={setResizeWidth}
              onChangeHeight={setResizeHeight}
              maintainRatio={maintainRatio}
              onToggleMaintainRatio={setMaintainRatio}
              originalWidth={originalWidth}
              originalHeight={originalHeight}
              outputFormat={outputFormat}
              onChangeOutputFormat={setOutputFormat}
            />
          )}

          {tool.id === 'image-cropper' && (
            <CropperOptions
              cropRect={cropRect}
              onChangeCropRect={setCropRect}
              naturalWidth={originalWidth}
              naturalHeight={originalHeight}
              thumbnailUrl={firstThumbnail}
              outputFormat={outputFormat}
              onChangeOutputFormat={setOutputFormat}
            />
          )}

          {tool.id === 'image-rotator' && (
            <RotatorOptions
              rotationAngle={rotationAngle}
              onChangeRotationAngle={setRotationAngle}
              flipH={flipH}
              onToggleFlipH={setFlipH}
              flipV={flipV}
              onToggleFlipV={setFlipV}
              thumbnailUrl={firstThumbnail}
              outputFormat={outputFormat}
              onChangeOutputFormat={setOutputFormat}
            />
          )}

          {tool.id === 'image-to-pdf' && (
            <ImageToPdfOptions
              imageCount={validFilesCount}
              documentName={pdfDocName}
              onChangeDocumentName={setPdfDocName}
              orientation={pdfOrientation}
              onChangeOrientation={setPdfOrientation}
              margin={pdfMargin}
              onChangeMargin={setPdfMargin}
            />
          )}

          {tool.id === 'pdf-merge' && (
            <PdfMergeOptions
              documentCount={validFilesCount}
              totalEstimatedPages={queue.reduce((acc, i) => acc + (i.pdfPages || 0), 0)}
              outputName={mergeOutputName}
              onChangeOutputName={setMergeOutputName}
            />
          )}

          {tool.id === 'pdf-split' && (
            <PdfSplitOptions
              totalPages={pdfTotalPages}
              startPage={splitStart}
              onChangeStartPage={setSplitStart}
              endPage={splitEnd}
              onChangeEndPage={setSplitEnd}
              outputName="document_split.pdf"
              onChangeOutputName={() => {}}
            />
          )}

          {tool.id === 'pdf-rotate' && (
            <PdfRotateOptions
              rotationAngle={pdfRotateAngle}
              onChangeRotationAngle={setPdfRotateAngle}
              pageScope={pdfRotateScope}
              onChangePageScope={setPdfRotateScope}
              customPages={pdfRotateCustom}
              onChangeCustomPages={setPdfRotateCustom}
              totalPages={pdfTotalPages}
            />
          )}

          {/* Primary Process Execution Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={processing || (tool.id === 'pdf-merge' && validFilesCount < 2)}
              onClick={handleProcess}
              className="px-8 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm transition-all shadow-lg shadow-sky-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing In Browser Memory...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    Execute {tool.name} ({validFilesCount} {validFilesCount === 1 ? 'file' : 'files'})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 6. Processing Progress Bar */}
      {processing && (
        <ProcessingProgress progress={progress} statusText={statusMessage} />
      )}

      {/* 7. Error Notification */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Processing failed</span>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* 8. Success Result & Download Panel */}
      {results.length > 0 && (
        <ProcessingResult
          results={results}
          onDownloadItem={handleDownloadItem}
          onDownloadAll={results.length > 1 ? handleDownloadAll : undefined}
          onReset={handleClearQueue}
        />
      )}

      {/* 9. Related Tools Carousel/Grid */}
      <RelatedTools
        currentToolId={tool.id}
        onSelectTool={(id) => {
          if (onSelectTool) onSelectTool(id);
        }}
      />

      {/* 10. Tool-Specific FAQ Section */}
      <ToolFaq toolId={tool.id} />
    </div>
  );
}
