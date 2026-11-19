import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import UploadTriageFork from '../components/ingest/UploadTriageFork';
import ExpressIngestForm from '../components/ingest/ExpressIngestForm';
import MixedScanTriggerCard from '../components/ingest/MixedScanTriggerCard';
import ExcelColumnSplitter from '../components/ingest/ExcelColumnSplitter';
import IngestedDocsList from '../components/ingest/IngestedDocsList';
import HitlReviewInbox from '../components/ingest/HitlReviewInbox';
import AnnotatedPdfPreview from '../components/ingest/AnnotatedPdfPreview';
import PublishConfirmationModal from '../components/ingest/PublishConfirmationModal';
import { UploadMode, UploadResponse, IngestedDocumentSummary, LogicalBlockItem } from '../types/ingestion';

export type IngestStep =
  | 'select_file'
  | 'express_mode'
  | 'hitl_mixed_scan'
  | 'excel_mode'
  | 'hitl_review';

export const AdminIngestPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<IngestStep>('select_file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [scanResponse, setScanResponse] = useState<UploadResponse | null>(null);
  const [refreshHistoryKey, setRefreshHistoryKey] = useState<number>(0);
  const [activePage, setActivePage] = useState<number>(1);
  const [selectedBlock, setSelectedBlock] = useState<LogicalBlockItem | null>(null);
  const [cacheBustTimestamp, setCacheBustTimestamp] = useState<number>(Date.now());
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);

  const handleProceedFromTriage = (file: File, mode: UploadMode) => {
    setSelectedFile(file);
    if (mode === 'express_single_role') {
      setCurrentStep('express_mode');
    } else if (mode === 'hitl_mixed_visual') {
      setCurrentStep('hitl_mixed_scan');
    } else if (mode === 'excel_column_split') {
      setCurrentStep('excel_mode');
    }
  };

  const handleScanComplete = (response: UploadResponse) => {
    setScanResponse(response);
    setActiveDocId(response.doc_id);
    if (response.blocks && response.blocks.length > 0) {
      setSelectedBlock(response.blocks[0]);
      setActivePage(response.blocks[0].page_number || 1);
    }
    setCacheBustTimestamp(Date.now());
    setCurrentStep('hitl_review');
    setRefreshHistoryKey((prev) => prev + 1);
  };

  const handleSelectDocForReview = (doc: IngestedDocumentSummary) => {
    setActiveDocId(doc.doc_id);
    setSelectedBlock(null);
    setActivePage(1);
    setCacheBustTimestamp(Date.now());
    setCurrentStep('hitl_review');
  };

  const handleBackToSelect = () => {
    setCurrentStep('select_file');
    setSelectedFile(null);
    setScanResponse(null);
    setActiveDocId(null);
    setSelectedBlock(null);
    setActivePage(1);
    setRefreshHistoryKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-medium tracking-wider uppercase mb-2">
            <span>Admin Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-zinc-950">
            Document Ingestion & Security Mapping
          </h1>
          <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
            Triage enterprise documents, review sensitivity classifications, and inspect visual bounding box mappings.
          </p>
        </div>

        {currentStep !== 'select_file' && (
          <button
            type="button"
            onClick={handleBackToSelect}
            className="btn-secondary self-start sm:self-auto text-xs px-4 py-2 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Document Catalog</span>
          </button>
        )}
      </div>

      {/* Step 1: Upload Triage Fork & Documents Library */}
      {currentStep === 'select_file' && (
        <div className="space-y-10">
          <UploadTriageFork onProceed={handleProceedFromTriage} />
          <IngestedDocsList
            refreshKey={refreshHistoryKey}
            onSelectDocForReview={handleSelectDocForReview}
          />
        </div>
      )}

      {/* Step 2A: Express Single-Role Form */}
      {currentStep === 'express_mode' && selectedFile && (
        <ExpressIngestForm
          file={selectedFile}
          onBack={handleBackToSelect}
          onSuccess={() => setRefreshHistoryKey((k) => k + 1)}
        />
      )}

      {/* Step 2B: AI Structural Scan Trigger Card */}
      {currentStep === 'hitl_mixed_scan' && selectedFile && (
        <MixedScanTriggerCard
          file={selectedFile}
          onBack={handleBackToSelect}
          onScanComplete={handleScanComplete}
        />
      )}

      {/* Step 2C: Excel Column Splitter Workspace */}
      {currentStep === 'excel_mode' && selectedFile && (
        <ExcelColumnSplitter
          file={selectedFile}
          onBack={handleBackToSelect}
          onUploadSuccess={() => setRefreshHistoryKey((k) => k + 1)}
        />
      )}

      {/* Step 3: HITL Review Inbox & Colored PDF Bounding Box Viewer */}
      {currentStep === 'hitl_review' && activeDocId && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Columns: Logical Blocks Checklist */}
            <div className="lg:col-span-7">
              <HitlReviewInbox
                docId={activeDocId}
                initialBlocks={scanResponse?.blocks}
                selectedBlock={selectedBlock}
                onSelectBlock={(block) => {
                  setSelectedBlock(block);
                  if (block.page_number) {
                    setActivePage(block.page_number);
                  }
                }}
                onRepaintComplete={(ts) => setCacheBustTimestamp(ts)}
                onPublishClick={() => setIsPublishModalOpen(true)}
              />
            </div>

            {/* Right 5 Columns: Sticky Annotated PDF Preview */}
            <div className="lg:col-span-5">
              <AnnotatedPdfPreview
                docId={activeDocId}
                activePage={activePage}
                selectedBlock={selectedBlock}
                cacheBustTimestamp={cacheBustTimestamp}
                onPageChange={(p) => setActivePage(p)}
              />
            </div>
          </div>

          {/* Final Publish Confirmation Modal */}
          <PublishConfirmationModal
            isOpen={isPublishModalOpen}
            docId={activeDocId}
            totalBlocks={scanResponse?.total_blocks || 0}
            onClose={() => {
              setIsPublishModalOpen(false);
              handleBackToSelect();
            }}
            onPublishSuccess={() => setRefreshHistoryKey((k) => k + 1)}
          />
        </div>
      )}
    </div>
  );
};

export default AdminIngestPage;
