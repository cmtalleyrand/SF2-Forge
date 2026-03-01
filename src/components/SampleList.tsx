import React from 'react';
import { X, FileAudio } from 'lucide-react';

export interface SampleData {
  id: string;
  file: File;
  name: string;
  buffer: AudioBuffer;
  rootKey: number;
  lowKey: number;
  highKey: number;
  sampleRate: number;
  bank?: number;
  preset?: number;
  presetName?: string;
  volume?: number;
  pan?: number;
  tune?: number;
  loopMode?: string;
  loopStart?: number;
  loopEnd?: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
}

interface SampleListProps {
  samples: SampleData[];
  onUpdate: (id: string, field: keyof SampleData, value: any) => void;
  onRemove: (id: string) => void;
}

export const SampleList: React.FC<SampleListProps> = ({ samples, onUpdate, onRemove }) => {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="grid grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_1fr_auto] gap-2.5 p-2.5 text-[#a0a0a0] text-xs font-bold uppercase tracking-wider border-b border-[#333]">
        <div>Sample Name</div>
        <div>Bank</div>
        <div>Preset</div>
        <div>Preset Name</div>
        <div>Root Key</div>
        <div>Low Key</div>
        <div>High Key</div>
        <div className="w-8"></div>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-2.5">
        {samples.map((s) => (
          <div key={s.id} className="bg-[#2a2a2d] p-2.5 rounded grid grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_1fr_auto] gap-2.5 items-center group animate-in fade-in slide-in-from-left-2">
            <div className="whitespace-nowrap overflow-hidden text-ellipsis text-sm font-medium" title={s.name}>
              {s.name}
            </div>
            <div>
              <input
                type="number"
                value={s.bank ?? 0}
                onChange={(e) => onUpdate(s.id, 'bank', parseInt(e.target.value))}
                min="0"
                max="128"
                className="bg-[#111] border border-[#333] text-white p-1 rounded w-full text-center text-sm focus:border-[#bb86fc] outline-none"
              />
            </div>
            <div>
              <input
                type="number"
                value={s.preset ?? 0}
                onChange={(e) => onUpdate(s.id, 'preset', parseInt(e.target.value))}
                min="0"
                max="127"
                className="bg-[#111] border border-[#333] text-white p-1 rounded w-full text-center text-sm focus:border-[#bb86fc] outline-none"
              />
            </div>
            <div>
              <input
                type="text"
                value={s.presetName || ''}
                onChange={(e) => onUpdate(s.id, 'presetName', e.target.value)}
                placeholder="Preset Name"
                className="bg-[#111] border border-[#333] text-white p-1 rounded w-full text-sm focus:border-[#bb86fc] outline-none"
              />
            </div>
            <div>
              <input
                type="number"
                value={s.rootKey}
                onChange={(e) => onUpdate(s.id, 'rootKey', parseInt(e.target.value))}
                min="0"
                max="127"
                className="bg-[#111] border border-[#333] text-white p-1 rounded w-full text-center text-sm focus:border-[#bb86fc] outline-none"
              />
            </div>
            <div>
              <input
                type="number"
                value={s.lowKey}
                onChange={(e) => onUpdate(s.id, 'lowKey', parseInt(e.target.value))}
                min="0"
                max="127"
                className="bg-[#111] border border-[#333] text-white p-1 rounded w-full text-center text-sm focus:border-[#bb86fc] outline-none"
              />
            </div>
            <div>
              <input
                type="number"
                value={s.highKey}
                onChange={(e) => onUpdate(s.id, 'highKey', parseInt(e.target.value))}
                min="0"
                max="127"
                className="bg-[#111] border border-[#333] text-white p-1 rounded w-full text-center text-sm focus:border-[#bb86fc] outline-none"
              />
            </div>
            <button
              className="w-8 h-8 flex items-center justify-center text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded transition-colors"
              onClick={() => onRemove(s.id)}
            >
              <X size={16} />
            </button>
          </div>
        ))}
        {samples.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-[#555] gap-2">
            <FileAudio size={48} className="opacity-20" />
            <p className="text-sm">No samples loaded. Upload some WAV or SFZ files to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
};
