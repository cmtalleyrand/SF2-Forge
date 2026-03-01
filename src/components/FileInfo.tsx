import React from 'react';
import { FileAudio, Info } from 'lucide-react';

export interface UploadedFileInfo {
  filename: string;
  type: 'sfz' | 'sf2';
  stats: {
    regions?: number;
    groups?: number;
    presets?: number;
    instruments?: number;
    samples?: number;
    banks?: number[];
  };
}

interface FileInfoProps {
  files: UploadedFileInfo[];
}

export const FileInfo: React.FC<FileInfoProps> = ({ files }) => {
  if (files.length === 0) return null;

  return (
    <div className="bg-[#1c1c1e] p-4 rounded-lg border border-[#333] flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[#bb86fc] font-bold text-sm">
        <Info className="w-4 h-4" />
        Loaded Mapping Files
      </div>
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {files.map((f, i) => (
          <div key={i} className="bg-[#121212] p-2 rounded border border-[#333] text-xs">
            <div className="font-bold text-[#e0e0e0] mb-1 truncate" title={f.filename}>
              {f.filename}
            </div>
            {f.type === 'sfz' ? (
              <div className="text-[#888] flex gap-2">
                <span>Regions: {f.stats.regions}</span>
                <span>Groups: {f.stats.groups}</span>
              </div>
            ) : (
              <div className="text-[#888] flex flex-col gap-1">
                <div className="flex gap-2">
                  <span>Presets: {f.stats.presets}</span>
                  <span>Instruments: {f.stats.instruments}</span>
                </div>
                {f.stats.banks && f.stats.banks.length > 0 && (
                  <div>Banks: {f.stats.banks.join(', ')}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
