import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { EditableHeading, EditableParagraph } from './InlineEditor.js';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  faqList: FaqItem[];
  onUpdateFaq: (index: number, field: string, val: string) => void;
  isEditingEnabled: boolean;
}

export function FaqSection({
  faqList,
  onUpdateFaq,
  isEditingEnabled,
}: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (idx: number) => {
    setOpenIndex((current) => (current === idx ? null : idx));
  };

  return (
    <section id="faq" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-10">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
          <HelpCircle className="w-3.5 h-3.5 text-sky-500" />
          <span>Clear Answers</span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span>Zero Ambiguity</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Frequently Asked Questions
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
          Security, privacy, and technical operations explained transparently.
        </p>
      </div>

      <div className="space-y-3">
        {faqList.map((item, idx) => {
          const isOpen = openIndex === idx;

          return (
            <div
              key={idx}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 overflow-hidden shadow-xs transition-colors"
            >
              <div
                onClick={() => toggleIndex(idx)}
                className="p-5 flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleIndex(idx);
                }}
                aria-expanded={isOpen}
              >
                <div className="flex-1 pr-2">
                  <EditableHeading
                    level={4}
                    value={item.question}
                    onSave={(val) => onUpdateFaq(idx, 'question', val)}
                    isEditingEnabled={isEditingEnabled}
                    className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white"
                    fieldId={`faq-q-${idx}`}
                  />
                </div>
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-sky-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60">
                  <EditableParagraph
                    value={item.answer}
                    onSave={(val) => onUpdateFaq(idx, 'answer', val)}
                    isEditingEnabled={isEditingEnabled}
                    className="text-slate-700 dark:text-slate-300"
                    fieldId={`faq-a-${idx}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
