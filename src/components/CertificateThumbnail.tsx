import React, { useState } from 'react';
import { DriveCertificateFile } from '../types';
import { FileText, Image as ImageIcon, Eye } from 'lucide-react';

export const CertificateThumbnail: React.FC<{
  file: DriveCertificateFile;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ file, onClick, size = 'md', className = '' }) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Generate Google Drive thumbnail URL
  const thumbnailUrl =
    file.thumbnailLink ||
    (file.id && !file.id.startsWith('seed_')
      ? `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`
      : null);

  const isPdf =
    file.mimeType?.includes('pdf') || file.name?.toLowerCase().endsWith('.pdf');
  const isImage =
    file.mimeType?.includes('image') ||
    /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name || '');

  const ext = file.name ? file.name.split('.').pop()?.toUpperCase() || 'FILE' : 'DOC';

  const sizeClasses = {
    sm: 'w-12 h-14 min-w-12',
    md: 'w-20 h-24 min-w-20',
    lg: 'w-full h-44',
  }[size];

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden flex flex-col items-center justify-center cursor-pointer transition hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10 ${sizeClasses} ${className}`}
      title="Click to preview certificate"
    >
      {thumbnailUrl && !imgError ? (
        <>
          {!imgLoaded && (
            <div className="absolute inset-0 bg-slate-900 animate-pulse flex items-center justify-center">
              <FileText className="w-5 h-5 text-slate-600" />
            </div>
          )}
          <img
            src={thumbnailUrl}
            alt={file.name}
            className={`w-full h-full object-cover transition duration-200 group-hover:scale-105 ${
              imgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        </>
      ) : (
        /* Fallback Document Icon preview */
        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-slate-900 to-slate-950">
          {isImage ? (
            <ImageIcon className="w-6 h-6 text-indigo-400 mb-1" />
          ) : (
            <FileText className="w-6 h-6 text-blue-400 mb-1" />
          )}
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
            {ext}
          </span>
        </div>
      )}

      {/* Hover Overlay with Preview Icon */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
        <div className="p-1.5 rounded-full bg-blue-600 shadow-md">
          <Eye className="w-3.5 h-3.5" />
        </div>
        <span className="text-[10px] font-bold tracking-tight">Preview</span>
      </div>
    </div>
  );
};
