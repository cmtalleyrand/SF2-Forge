import React from 'react';
import { X, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { SF2Analysis } from '../lib/sf2-analyzer';

interface RepairModalProps {
  result: SF2Analysis;
  onClose: () => void;
}

export const RepairModal: React.FC<RepairModalProps> = ({ result, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1c1c1e] p-6 rounded-xl border border-[#333] max-w-lg w-full flex flex-col gap-5">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            {result.needsRepair ? (
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            ) : (
              <CheckCircle className="w-6 h-6 text-green-500" />
            )}
            <h2 className="text-xl font-bold">SF2 Analysis Result</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-[#888] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#121212] p-4 rounded-lg border border-[#333]">
          <h3 className="font-bold mb-2 text-[#bb86fc]">{result.filename}</h3>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div className="bg-[#1c1c1e] p-2 rounded">
              <div className="text-2xl font-bold">{result.stats.presets}</div>
              <div className="text-xs text-[#888] uppercase">Presets</div>
            </div>
            <div className="bg-[#1c1c1e] p-2 rounded">
              <div className="text-2xl font-bold">{result.stats.instruments}</div>
              <div className="text-xs text-[#888] uppercase">Instruments</div>
            </div>
            <div className="bg-[#1c1c1e] p-2 rounded">
              <div className="text-2xl font-bold">{result.stats.samples}</div>
              <div className="text-xs text-[#888] uppercase">Samples</div>
            </div>
          </div>
          
          {result.stats.banks.length > 0 && (
            <div className="mb-4 text-sm text-[#ccc]">
              <span className="font-bold text-[#bb86fc]">Banks Found:</span> {result.stats.banks.join(', ')}
            </div>
          )}
          
          {result.needsRepair ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-yellow-500 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                Found {result.issues.length} structural issues:
              </div>
              <ul className="list-disc list-inside text-sm text-[#ccc] space-y-1 max-h-32 overflow-y-auto">
                {result.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-500 font-bold text-sm">
              <CheckCircle className="w-4 h-4" />
              No structural issues found. The file is valid.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded font-bold text-[#888] hover:text-white hover:bg-[#333] transition-colors"
          >
            Close
          </button>
          {result.repairedBuffer && (
            <button 
              className="bg-[#bb86fc] text-black font-bold py-2 px-4 rounded flex items-center gap-2 hover:bg-[#a370f7] transition-colors"
              onClick={() => {
                const blob = new Blob([result.repairedBuffer!], { type: 'audio/x-soundfont' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = result.filename.replace('.sf2', '_repaired.sf2');
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setTimeout(onClose, 500);
              }}
            >
              <Download className="w-4 h-4" />
              Download Repaired File
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
