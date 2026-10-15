'use client';

import React from 'react';
import Icon from '@/components/Icon';

// Word Counter Component
export function WordCounter({ text, limit }: { text: string; limit: number }) {
  const words = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const isOver = limit > 0 && words > limit;

  return (
    <div className={`text-base sm:text-xs font-mono text-right mt-1 ${isOver ? 'text-amber-800 font-bold' : 'text-[#625e56]'}`}>
      {words} {limit > 0 ? `/ ${limit}` : ''} words
    </div>
  );
}

// Progress Bar Component
export function ProgressBar({ progress, message }: { progress: number; message?: string }) {
  return (
    <div className="w-full space-y-2">
      {message && <div className="text-xs font-medium text-[#525252]">{message}</div>}
      <div role="progressbar" aria-label={message || 'Upload progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(Math.max(progress, 0), 100)} className="w-full h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
        <div 
          className="h-full w-full origin-left bg-[#1A1A1A] transition-transform duration-200 ease-out"
          style={{ transform: `scaleX(${Math.min(Math.max(progress, 0), 100) / 100})` }}
        />
      </div>
    </div>
  );
}

// Toast Component
export function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const baseClasses = "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 sm:left-auto p-4 rounded-xl shadow-material-hover flex items-start gap-3 max-w-sm z-50 animate-fade-in-up border";
  const typeClasses = type === 'success' 
    ? "bg-green-50 border-green-200 text-green-800" 
    : "bg-red-50 border-red-200 text-red-800";
    
  const icon = type === 'success' ? 'check' : 'warning';

  return (
    <div className={`${baseClasses} ${typeClasses}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon name={icon} className="shrink-0 mt-0.5" />
      <p className="min-w-0 break-words text-base sm:text-sm font-medium leading-relaxed">{message}</p>
      <button type="button" aria-label="Dismiss notification" onClick={onClose} className="min-h-11 min-w-11 shrink-0 opacity-80 hover:opacity-100 transition-opacity ml-2">
        <Icon name="close" />
      </button>
    </div>
  );
}

// Confirm Dialog Component
export function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false
}: { 
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}) {
  const dialog = React.useRef<HTMLDialogElement>(null);
  const cancelButton = React.useRef<HTMLButtonElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    const modal = dialog.current;
    if (!isOpen || !modal) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    modal.showModal();
    document.body.style.overflow = 'hidden';
    cancelButton.current?.focus({ preventScroll: true });

    return () => {
      if (modal.open) modal.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); onCancel(); }}
      className="w-[calc(100%_-_2rem)] max-w-md max-h-[calc(100dvh_-_2rem)] overflow-auto overscroll-contain rounded-2xl bg-white p-0 text-[#1A1A1A] shadow-material-hover border border-[#E5E5E5] backdrop:bg-black/40"
    >
        <div className="p-6">
          <h2 id={titleId} className="text-lg font-bold text-[#1A1A1A] mb-2">{title}</h2>
          <p id={descriptionId} className="text-[#525252] text-base sm:text-sm leading-relaxed">{message}</p>
        </div>
        <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#E5E5E5] flex flex-wrap justify-end gap-3">
          <button 
            ref={cancelButton}
            type="button"
            onClick={onCancel}
            className="min-h-11 px-4 py-2 text-base sm:text-sm font-semibold text-[#525252] hover:bg-[#E5E5E5] rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button 
            type="button"
            onClick={onConfirm}
            className={`min-h-11 px-4 py-2 text-base sm:text-sm font-semibold text-white rounded-xl transition-colors shadow-sm ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1A1A1A] hover:bg-black'
            }`}
          >
            {confirmText}
          </button>
        </div>
    </dialog>
  );
}

// Simple Markdown Preview
export function MarkdownPreview({ content }: { content: string }) {
  if (!content) return <div className="text-sm text-[#8C8C8C] italic">No content</div>;
  
  // Very basic markdown rendering for preview purposes
  // In a real app, use a proper markdown parser like marked or react-markdown
  const renderedLines = content.split('\n').map((line, i) => {
    if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
    if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-3 mb-2">{line.slice(3)}</h2>;
    if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold mt-2 mb-1">{line.slice(4)}</h3>;
    if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>;
    if (line.trim() === '') return <br key={i} />;
    return <p key={i} className="mb-2">{line}</p>;
  });

  return (
    <div className="prose prose-sm max-w-none text-[#1A1A1A] font-sans">
      {renderedLines}
    </div>
  );
}
