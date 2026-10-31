'use client';

import { useState, useRef, useEffect } from 'react';
import { completeJob, completeJobWithPhotos } from '@/app/actions';
import {
  Camera,
  UploadCloud,
  Check,
  X,
  Loader2,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
  FileText,
  MapPin,
  Calendar,
} from 'lucide-react';

interface CompleteJobModalProps {
  job: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locale?: string;
}

interface PhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  sizeLabel: string;
}

// Client-side canvas compression to ensure snappy uploads even on cellular data
async function compressImage(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  // If it's already a very small file (< 300KB), don't touch it
  if (file.size <= 300 * 1024) return file;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CompleteJobModal({
  job,
  isOpen,
  onClose,
  onSuccess,
  locale = 'en',
}: CompleteJobModalProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount or photo removal
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [photos]);

  // Reset state whenever modal opens for a new job
  useEffect(() => {
    if (isOpen) {
      setPhotos([]);
      setNotes('');
      setErrorMessage(null);
      setIsSubmitting(false);
      setIsCompressing(false);
    }
  }, [isOpen, job?.id]);

  if (!isOpen || !job) return null;

  const MAX_PHOTOS = 6;
  const customerName =
    job.properties?.customers
      ? `${job.properties.customers.first_name || ''} ${job.properties.customers.last_name || ''}`.trim() ||
        job.properties.customers.company_name ||
        (isEs ? 'Cliente' : 'Customer')
      : isEs
        ? 'Cliente'
        : 'Customer';

  const streetAddress = job.properties?.street_address || (isEs ? 'Dirección en archivo' : 'Address on file');
  const scheduledDate = job.scheduled_date
    ? new Date(job.scheduled_date).toLocaleDateString(isEs ? 'es-ES' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);

    const availableSlots = MAX_PHOTOS - photos.length;
    if (availableSlots <= 0) {
      setErrorMessage(
        isEs
          ? `Límite alcanzado: máximo ${MAX_PHOTOS} fotos permitidas.`
          : `Limit reached: maximum ${MAX_PHOTOS} photos allowed.`
      );
      return;
    }

    const filesToProcess = Array.from(fileList).slice(0, availableSlots);
    setIsCompressing(true);

    try {
      const newItems: PhotoItem[] = [];
      for (const file of filesToProcess) {
        if (!file.type.startsWith('image/')) continue;
        const compressed = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressed);
        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          file: compressed,
          previewUrl,
          sizeLabel: formatBytes(compressed.size),
        });
      }

      setPhotos((prev) => [...prev, ...newItems]);
    } catch (err) {
      console.error('Error processing photos:', err);
      setErrorMessage(
        isEs ? 'Error al procesar algunas fotos. Intenta de nuevo.' : 'Error processing some photos. Please try again.'
      );
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSubmitWithPhotos = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (photos.length > 0) {
        const formData = new FormData();
        formData.append('jobId', job.id);
        formData.append('notes', notes.trim());
        photos.forEach((item) => {
          formData.append('photos', item.file);
        });

        const res = await completeJobWithPhotos(formData);
        if (res?.error) {
          setErrorMessage(res.error);
          setIsSubmitting(false);
          return;
        }
      } else {
        // Complete without photos
        const res = await completeJob(job.id, { notes: notes.trim() });
        if (res?.error) {
          setErrorMessage(res.error);
          setIsSubmitting(false);
          return;
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error('Failed to complete job:', err);
      setErrorMessage(err?.message || (isEs ? 'Error al completar el job.' : 'Failed to complete job.'));
      setIsSubmitting(false);
    }
  };

  const handleSkipAndMarkDone = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await completeJob(job.id, { notes: notes.trim() });
      if (res?.error) {
        setErrorMessage(res.error);
        setIsSubmitting(false);
        return;
      }
      onSuccess();
    } catch (err: any) {
      console.error('Failed to complete job:', err);
      setErrorMessage(err?.message || (isEs ? 'Error al completar el job.' : 'Failed to complete job.'));
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-job-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h2 id="complete-job-title" className="text-lg font-bold text-slate-900 tracking-tight">
              {isEs ? 'Marcar Job como Completado' : 'Mark Job as Completed'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {job.job_type} • <span className="font-semibold text-slate-700">{customerName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={isEs ? 'Cerrar' : 'Close'}
            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Job summary pill */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate font-medium">{streetAddress}</span>
            </div>
            {scheduledDate ? (
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 shrink-0">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{scheduledDate}</span>
              </div>
            ) : null}
          </div>

          {/* Photo upload dropzone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isEs ? 'Fotos del Trabajo Terminado' : 'Completion Photos'}</span>
                <span className="text-[10px] font-normal text-slate-400">
                  ({photos.length}/{MAX_PHOTOS})
                </span>
              </label>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {isEs ? 'Van en el correo al cliente' : 'Included in customer email'}
              </span>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
              disabled={isSubmitting || isCompressing || photos.length >= MAX_PHOTOS}
            />

            {/* Clickable trigger button / dropzone */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || isCompressing || photos.length >= MAX_PHOTOS}
              className={`w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition cursor-pointer ${
                photos.length >= MAX_PHOTOS
                  ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                  : 'border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30'
              }`}
            >
              {isCompressing ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <p className="text-xs font-semibold text-slate-600">
                    {isEs ? 'Optimizando fotos...' : 'Optimizing photos...'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 shadow-xs">
                    <Camera className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-slate-800 text-xs">
                    {isEs ? 'Toma una foto o selecciona imágenes' : 'Take a photo or choose images'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isEs
                      ? `JPG, PNG, HEIC (hasta ${MAX_PHOTOS} fotos)`
                      : `JPG, PNG, HEIC (up to ${MAX_PHOTOS} photos)`}
                  </p>
                </>
              )}
            </button>

            {/* Photos thumbnail preview grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {photos.map((item, idx) => (
                  <div
                    key={item.id}
                    className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-square shadow-xs"
                  >
                    <img
                      src={item.previewUrl}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(item.id)}
                        disabled={isSubmitting}
                        title={isEs ? 'Eliminar foto' : 'Remove photo'}
                        className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded font-mono">
                      {item.sizeLabel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Optional notes textarea */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>{isEs ? 'Notas del Técnico (Opcional)' : 'Technician Notes (Optional)'}</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              placeholder={
                isEs
                  ? 'Ej: Trabajo completado exitosamente, portón asegurado con candado...'
                  : 'Ex: Work completed successfully, gate secured, debris hauled away...'
              }
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs"
            />
          </div>

          {/* Error banner */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Skip button for quick 1-click completion without photos */}
          <button
            type="button"
            onClick={handleSkipAndMarkDone}
            disabled={isSubmitting || isCompressing}
            className="w-full sm:w-auto text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 px-3 py-2 rounded-lg transition disabled:opacity-50 cursor-pointer order-2 sm:order-1 text-center"
          >
            {isEs ? 'Saltar fotos y completar' : 'Skip photos & complete'}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/60 border border-slate-300 rounded-lg transition disabled:opacity-50 cursor-pointer"
            >
              {isEs ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSubmitWithPhotos}
              disabled={isSubmitting || isCompressing}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs hover:shadow transition inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-wait cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isEs ? 'Completando...' : 'Completing...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {photos.length > 0
                      ? isEs
                        ? `Completar (${photos.length} fotos)`
                        : `Complete (${photos.length} photos)`
                      : isEs
                        ? 'Completar Job'
                        : 'Complete Job'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
