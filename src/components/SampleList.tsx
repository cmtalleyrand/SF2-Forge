import React, { useState, useMemo } from 'react';
import { X, FileAudio, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

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
  onRemovePreset?: (bank: number, preset: number) => void;
}

export const SampleList: React.FC<SampleListProps> = ({ samples, onUpdate, onRemove, onRemovePreset }) => {
  const [expandedPresets, setExpandedPresets] = useState<Set<string>>(new Set());

  const groupedSamples = useMemo(() => {
    const groups = new Map<string, SampleData[]>();
    samples.forEach(s => {
      const key = `${s.bank ?? 0}-${s.preset ?? 0}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    });
    return Array.from(groups.entries()).sort((a, b) => {
      const [bankA, presetA] = a[0].split('-').map(Number);
      const [bankB, presetB] = b[0].split('-').map(Number);
      if (bankA !== bankB) return bankA - bankB;
      return presetA - presetB;
    });
  }, [samples]);

  const togglePreset = (key: string) => {
    const newExpanded = new Set(expandedPresets);
    if (newExpanded.has(key)) newExpanded.delete(key);
    else newExpanded.add(key);
    setExpandedPresets(newExpanded);
  };

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
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-2.5 custom-scrollbar">
        {samples.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-[#555] gap-2">
            <FileAudio size={48} className="opacity-20" />
            <p className="text-sm">No samples loaded. Upload some WAV or SFZ files to begin.</p>
          </div>
        )}
        {groupedSamples.map(([key, groupSamples]) => {
          const isExpanded = expandedPresets.has(key);
          const firstSample = groupSamples[0];
          const bank = firstSample.bank ?? 0;
          const preset = firstSample.preset ?? 0;
          const presetName = firstSample.presetName || `Preset ${preset}`;
          
          return (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between bg-[#1c1c1e] p-2 rounded border border-[#333] hover:border-[#444] transition-colors">
                <button 
                  className="flex items-center gap-2 text-sm font-bold text-[#bb86fc] flex-1 text-left"
                  onClick={() => togglePreset(key)}
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  Bank {bank} : Preset {preset} - {presetName} ({groupSamples.length} samples)
                </button>
                {onRemovePreset && (
                  <button 
                    onClick={() => onRemovePreset(bank, preset)}
                    className="text-[#ff5555] hover:text-[#ff8888] p-1 rounded hover:bg-[#ff5555]/10 transition-colors flex items-center gap-1 text-xs font-bold"
                    title="Remove entire preset"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                )}
              </div>
              
              {isExpanded && (
                <div className="flex flex-col gap-1 pl-4 border-l-2 border-[#333] ml-2">
                  {groupSamples.map((s) => (
                    <div key={s.id} className="bg-[#2a2a2d] p-2 rounded grid grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_1fr_auto] gap-2.5 items-center group animate-in fade-in slide-in-from-left-2">
                      <div className="whitespace-nowrap overflow-hidden text-ellipsis text-xs font-medium" title={s.name}>
                        {s.name}
                      </div>
                      <div>
                        <input
                          type="number"
                          value={s.bank ?? 0}
                          onChange={(e) => onUpdate(s.id, 'bank', parseInt(e.target.value))}
                          min="0"
                          max="128"
                          className="bg-[#111] border border-[#333] text-white p-1 rounded w-full text-center text-xs focus:border-[#bb86fc] outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={s.preset ?? 0}
                          onChange={(e) => onUpdate(s.id, 'preset', parseInt(e.target.value))}
                          min="0"
                          max="127"
                          className="bg-[#111] border border-[#333] text-white p-1 rounded w-full text-center text-xs focus:border-[#bb86fc] outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={s.presetName || ''}
                          onChange={(e) => onUpdate(s.id, 'presetName', e.target.value)}
                          placeholder="Preset Name"
                          className="bg-[#111] border border-[#333] text-white p-1 rounded w-full text-xs focus:border-[#bb86fc] outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={s.rootKey}
                          onChange={(e) => onUpdate(s.id, 'rootKey', parseInt(e.target.value))}
                          min="0"
                          max="127"
                          className="bg-[#111] border border-[#333] text-white p-1 rounded w-full text-center text-xs focus:border-[#bb86fc] outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={s.lowKey}
                          onChange={(e) => onUpdate(s.id, 'lowKey', parseInt(e.target.value))}
                          min="0"
                          max="127"
                          className="bg-[#111] border border-[#333] text-white p-1 rounded w-full text-center text-xs focus:border-[#bb86fc] outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={s.highKey}
                          onChange={(e) => onUpdate(s.id, 'highKey', parseInt(e.target.value))}
                          min="0"
                          max="127"
                          className="bg-[#111] border border-[#333] text-white p-1 rounded w-full text-center text-xs focus:border-[#bb86fc] outline-none"
                        />
                      </div>
                      <button
                        onClick={() => onRemove(s.id)}
                        className="w-8 h-8 flex items-center justify-center text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded transition-colors"
                        title="Remove sample"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
