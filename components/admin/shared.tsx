'use client';

import React from 'react';

// Word Counter Component
export function WordCounter({ text, limit }: { text: string; limit: number }) {
  const words = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const isOver = limit > 0 && words > limit;

  return (
    <div className={`text-xs font-mono text-right mt-1 ${isOver ? 'text-amber-600 font-bold' : 'text-[#8C8C8C]'}`}>
      {words} {limit > 0 ? `/ ${limit}` : ''} words
    </div>
  );
}

// Progress Bar Component
export function ProgressBar({ progress, message }: { progress: number; message?: string }) {
  return (
    <div className="w-full space-y-2">
      {message && <div className="text-xs font-medium text-[#525252]">{message}</div>}
      <div className="w-full h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#1A1A1A] transition-all duration-300 ease-out"
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
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

  const baseClasses = "fixed bottom-4 right-4 p-4 rounded-xl shadow-material-hover flex items-start gap-3 max-w-sm z-50 animate-fade-in-up border";
  const typeClasses = type === 'success' 
    ? "bg-green-50 border-green-200 text-green-800" 
    : "bg-red-50 border-red-200 text-red-800";
    
  const icon = type === 'success' ? 'check_circle' : 'error';

  return (
    <div className={`${baseClasses} ${typeClasses}`} role="alert">
      <span className="material-symbols-rounded text-lg shrink-0 mt-0.5">{icon}</span>
      <p className="text-sm font-medium leading-tight">{message}</p>
      <button onClick={onClose} className="shrink-0 opacity-50 hover:opacity-100 transition ml-2">
        <span className="material-symbols-rounded text-base">close</span>
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-material-hover max-w-md w-full overflow-hidden animate-fade-in-up border border-[#E5E5E5]">
        <div className="p-6">
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">{title}</h3>
          <p className="text-[#525252] text-sm leading-relaxed">{message}</p>
        </div>
        <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#E5E5E5] flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-[#525252] hover:bg-[#E5E5E5] rounded-xl transition"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition shadow-sm ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1A1A1A] hover:bg-black'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
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
