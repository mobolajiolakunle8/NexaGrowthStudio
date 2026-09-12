import { useState } from 'react';

type PaymentProofUploadProps = {
  existingUrl?: string;
  onUploadComplete?: (proofDataUrl: string) => void;
};

export function PaymentProofUpload({ existingUrl, onUploadComplete }: PaymentProofUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      setError('Image must be under 1.5MB (use a compressed screenshot).');
      e.target.value = '';
      return;
    }
    setError(null);
    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = String(reader.result);
        if (onUploadComplete) onUploadComplete(base64);
        setUploading(false);
      };
      reader.onerror = () => {
        setError('Could not read the image. Please try again.');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setError('Upload failed. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2 pt-1 border-t border-slate-800">
      <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
        Receipt Screenshot / Receipt PDF
      </label>
      <label className="block cursor-pointer">
        <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" disabled={uploading} />
        <div className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-xs transition ${
          uploading ? 'border-[#C8862A] text-[#C8862A]' : existingUrl ? 'border-emerald-500/40 text-emerald-400' : 'border-slate-600 text-slate-400 hover:border-[#C8862A]/60 hover:text-[#C8862A]'
        }`}>
          {uploading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#C8862A] border-t-transparent" />
              Uploading...
            </>
          ) : existingUrl ? (
            <span className="flex items-center gap-1 text-emerald-400">✓ Proof attached</span>
          ) : (
            <>📤 Attach receipt (to review payment before confirmation)</>
          )}
        </div>
      </label>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {existingUrl && (
        <div className="relative mt-3 rounded-xl border border-[#C8862A]/30 overflow-hidden bg-[#0E1420]/50 max-w-[280px]">
          <img src={existingUrl} alt="Payment proof attached" className="h-24 w-full object-cover" />
          <a href={existingUrl} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center gap-1 bg-black/60 hover:bg-black/80 text-xs text-white transition-opacity" style={{ opacity: 0 }}>
            View full receipt
          </a>
        </div>
      )}
    </div>
  );
}
