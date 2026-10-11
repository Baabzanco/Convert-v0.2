import React, { useState } from 'react';
import { Edit3, Check, X, ExternalLink } from 'lucide-react';

interface EditableHeadingProps {
  level?: 1 | 2 | 3 | 4;
  value: string;
  onSave?: (newValue: string) => void;
  isEditingEnabled: boolean;
  className?: string;
  fieldId: string;
}

function HeadingTag({
  level,
  className,
  children,
}: {
  level: 1 | 2 | 3 | 4;
  className: string;
  children: React.ReactNode;
}) {
  if (level === 1) return <h1 className={className}>{children}</h1>;
  if (level === 2) return <h2 className={className}>{children}</h2>;
  if (level === 3) return <h3 className={className}>{children}</h3>;
  return <h4 className={className}>{children}</h4>;
}

export function EditableHeading({
  level = 2,
  value,
  onSave,
  isEditingEnabled,
  className = '',
  fieldId,
}: EditableHeadingProps) {
  const [editing, setEditing] = useState(false);
  const [currentVal, setCurrentVal] = useState(value);

  // Sync if external value updates
  React.useEffect(() => {
    setCurrentVal(value);
  }, [value]);

  if (!isEditingEnabled) {
    return (
      <HeadingTag level={level} className={className}>
        {value}
      </HeadingTag>
    );
  }

  const handleCommit = () => {
    if (onSave && currentVal !== value) {
      onSave(currentVal);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setCurrentVal(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="relative group inline-block w-full my-1">
        <input
          type="text"
          value={currentVal}
          onChange={(e) => setCurrentVal(e.target.value)}
          className={`w-full px-2 py-1 bg-slate-900 border-2 border-sky-500 rounded text-white focus:outline-none ${className}`}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCommit();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <div className="flex gap-1 mt-1 justify-end">
          <button
            type="button"
            onClick={handleCommit}
            className="flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded"
          >
            <Check className="w-3 h-3" /> Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="Click to edit heading"
      className="relative group cursor-pointer border border-transparent hover:border-dashed hover:border-sky-400/80 rounded p-0.5 transition"
      data-cms-field={fieldId}
    >
      <HeadingTag level={level} className={className}>
        {value}
      </HeadingTag>
      <span className="absolute -top-2.5 -right-2 hidden group-hover:flex items-center gap-0.5 bg-sky-600 text-white text-[10px] px-1 py-0.5 rounded shadow">
        <Edit3 className="w-2.5 h-2.5" /> Edit
      </span>
    </div>
  );
}

interface EditableParagraphProps {
  value: string;
  onSave?: (newValue: string) => void;
  isEditingEnabled: boolean;
  className?: string;
  fieldId: string;
}

export function EditableParagraph({
  value,
  onSave,
  isEditingEnabled,
  className = '',
  fieldId,
}: EditableParagraphProps) {
  const [editing, setEditing] = useState(false);
  const [currentVal, setCurrentVal] = useState(value);

  React.useEffect(() => {
    setCurrentVal(value);
  }, [value]);

  if (!isEditingEnabled) {
    return <p className={className}>{value}</p>;
  }

  const handleCommit = () => {
    if (onSave && currentVal !== value) {
      onSave(currentVal);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setCurrentVal(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="relative group w-full my-2">
        <textarea
          rows={3}
          value={currentVal}
          onChange={(e) => setCurrentVal(e.target.value)}
          className={`w-full px-2 py-1 bg-slate-900 border-2 border-sky-500 rounded text-white focus:outline-none text-sm ${className}`}
          autoFocus
        />
        <div className="flex gap-1 mt-1 justify-end">
          <button
            type="button"
            onClick={handleCommit}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded"
          >
            <Check className="w-3 h-3" /> Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="Click to edit paragraph"
      className="relative group cursor-pointer border border-transparent hover:border-dashed hover:border-sky-400/80 rounded p-0.5 transition"
      data-cms-field={fieldId}
    >
      <p className={className}>{value}</p>
      <span className="absolute -top-2.5 -right-2 hidden group-hover:flex items-center gap-0.5 bg-sky-600 text-white text-[10px] px-1 py-0.5 rounded shadow">
        <Edit3 className="w-2.5 h-2.5" /> Edit
      </span>
    </div>
  );
}

interface EditableButtonProps {
  label: string;
  url: string;
  onSave?: (newLabel: string, newUrl: string) => void;
  isEditingEnabled: boolean;
  className?: string;
  fieldId: string;
}

export function EditableButton({
  label,
  url,
  onSave,
  isEditingEnabled,
  className = '',
  fieldId,
}: EditableButtonProps) {
  const [editing, setEditing] = useState(false);
  const [currentLabel, setCurrentLabel] = useState(label);
  const [currentUrl, setCurrentUrl] = useState(url);

  React.useEffect(() => {
    setCurrentLabel(label);
    setCurrentUrl(url);
  }, [label, url]);

  if (!isEditingEnabled) {
    return (
      <a href={url} className={className}>
        {label}
      </a>
    );
  }

  const handleCommit = () => {
    if (onSave) {
      onSave(currentLabel, currentUrl);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-3 bg-slate-900 border-2 border-sky-500 rounded-lg shadow-xl text-left space-y-2 text-xs">
        <div>
          <label className="block text-[11px] text-slate-400 mb-0.5">Button Label</label>
          <input
            type="text"
            value={currentLabel}
            onChange={(e) => setCurrentLabel(e.target.value)}
            className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-0.5">Destination URL (safe http/https/relative)</label>
          <input
            type="text"
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            placeholder="/tools or https://..."
            className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white font-mono text-[11px]"
          />
        </div>
        <div className="flex gap-1 justify-end pt-1">
          <button
            type="button"
            onClick={handleCommit}
            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="Click to edit button & link destination"
      className="relative group inline-block cursor-pointer border border-transparent hover:border-dashed hover:border-sky-400/80 rounded transition"
      data-cms-field={fieldId}
    >
      <span className={className}>{label}</span>
      <span className="absolute -top-2.5 -right-2 hidden group-hover:flex items-center gap-0.5 bg-sky-600 text-white text-[10px] px-1 py-0.5 rounded shadow">
        <Edit3 className="w-2.5 h-2.5" /> Edit
      </span>
    </div>
  );
}
