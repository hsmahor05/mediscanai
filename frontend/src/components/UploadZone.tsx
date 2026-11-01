import { useRef, useState, type DragEvent } from "react";
import { FileText, Image as ImageIcon, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { formatSize, MAX_MB, validateFile } from "../utils/validateFile";

interface Props { file: File | null; onFile: (f: File | null) => void; disabled?: boolean; }

export default function UploadZone({ file, onFile, disabled }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = (f: File | undefined | null) => {
    if (!f) return;
    const err = validateFile(f);
    if (err) { setError(err); onFile(null); return; }
    setError(null); onFile(f);
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); if (!disabled) accept(e.dataTransfer.files?.[0]); };

  if (file) {
    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    return (
      <div className="card flex items-center gap-4 p-4" data-testid="selected-file">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">{isPdf ? <FileText /> : <ImageIcon />}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold" title={file.name}>{file.name}</p>
          <p className="text-sm text-slate-500">{formatSize(file.size)} - {isPdf ? "PDF document" : "Image"}</p>
        </div>
        <button type="button" className="btn-secondary" disabled={disabled} onClick={() => input.current?.click()}><RefreshCw className="h-4 w-4" aria-hidden />Replace</button>
        <button type="button" className="btn-secondary text-red-700" disabled={disabled} onClick={() => { onFile(null); setError(null); if (input.current) input.current.value = ""; }} aria-label="Remove file"><Trash2 className="h-4 w-4" aria-hidden /></button>
        <input ref={input} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => accept(e.target.files?.[0])} />
      </div>
    );
  }
  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${drag ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-white"}`}>
        <UploadCloud className="mx-auto h-10 w-10 text-brand-600" aria-hidden />
        <p className="mt-3 font-semibold">Drag and drop your lab report here</p>
        <p className="mt-1 text-sm text-slate-500">PDF, JPG or PNG, up to {MAX_MB} MB</p>
        <button type="button" className="btn-primary mt-5" onClick={() => input.current?.click()} disabled={disabled}>Choose a file</button>
        <input ref={input} data-testid="file-input" type="file" hidden accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => accept(e.target.files?.[0])} />
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">{error}</p>}
    </div>
  );
}
