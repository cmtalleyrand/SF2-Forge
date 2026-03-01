import React, { useState } from 'react';
import { Sparkles, Download, Piano, Loader2 } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import JSZip from 'jszip';
import { SF2Builder } from './lib/sf2-builder';
import { parseSFZ, SFZRegion } from './lib/sfz-parser';
import { noteToMidi } from './lib/midi-utils';
import { analyzeAndRepairSF2, SF2Analysis } from './lib/sf2-analyzer';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { Keyboard } from './components/Keyboard';
import { UploadZone } from './components/UploadZone';
import { SampleList, SampleData } from './components/SampleList';
import { RepairModal } from './components/RepairModal';
import { FileInfo, UploadedFileInfo } from './components/FileInfo';

export default function App() {
  const [samples, setSamples] = useState<SampleData[]>([]);
  const [sfzRegions, setSfzRegions] = useState<SFZRegion[]>([]);
  const [loadedFilesInfo, setLoadedFilesInfo] = useState<UploadedFileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [repairResult, setRepairResult] = useState<SF2Analysis | null>(null);
  const [soundFontName, setSoundFontName] = useState('My SoundFont');
  const [exportMode, setExportMode] = useState<'all' | 'bank' | 'preset'>('all');

  const { activeNote, playNote, stopNote, getAudioCtx } = useAudioPlayer(samples);

  function getCommonPrefix(words: string[]) {
    if (!words || words.length === 0) return "";
    let prefix = words[0];
    for (let i = 1; i < words.length; i++) {
      while (words[i].indexOf(prefix) !== 0) {
        prefix = prefix.substring(0, prefix.length - 1);
        if (prefix === "") return "";
      }
    }
    return prefix.replace(/[-_.\s]+$/, '');
  }

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setLoading(true);
    setLoadingStatus('Processing files...');
    const ctx = getAudioCtx();

    const audioFiles = files.filter(f => f.type.startsWith('audio/') || f.name.toLowerCase().endsWith('.wav') || f.name.toLowerCase().endsWith('.flac') || f.name.toLowerCase().endsWith('.ogg'));
    const sfzFiles = files.filter(f => f.name.toLowerCase().endsWith('.sfz'));
    const sf2Files = files.filter(f => f.name.toLowerCase().endsWith('.sf2'));

    let guessedName = soundFontName;
    if (sfzFiles.length > 0) {
      guessedName = sfzFiles[0].name.replace(/\.[^/.]+$/, "");
    } else if (audioFiles.length > 0) {
      const prefix = getCommonPrefix(audioFiles.map(f => f.name.replace(/\.[^/.]+$/, "")));
      if (prefix.length > 2) guessedName = prefix;
    }
    if (samples.length === 0) setSoundFontName(guessedName);

    let newSamples: SampleData[] = [];
    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      if (samples.some(s => s.name === file.name)) continue;

      setLoadingStatus(`Decoding audio ${i + 1} of ${audioFiles.length}...`);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        newSamples.push({
          id: Math.random().toString(36).substr(2, 9),
          file: file,
          name: file.name,
          buffer: audioBuffer,
          rootKey: 60,
          lowKey: 0,
          highKey: 127,
          sampleRate: audioBuffer.sampleRate,
          bank: 0,
          preset: 0,
          presetName: guessedName
        });
      } catch (err) {
        console.error("Error decoding audio file:", file.name, err);
      }
    }

    let currentSfzRegions = [...sfzRegions];
    const newFileInfos: UploadedFileInfo[] = [];

    if (sfzFiles.length > 0) {
      setLoadingStatus('Parsing SFZ...');
      for (const sfzFile of sfzFiles) {
        const text = await sfzFile.text();
        const regions = parseSFZ(text);
        currentSfzRegions = [...currentSfzRegions, ...regions];
        
        newFileInfos.push({
          filename: sfzFile.name,
          type: 'sfz',
          stats: {
            regions: regions.length,
            groups: new Set(regions.map(r => r.group)).size
          }
        });
      }
      setSfzRegions(currentSfzRegions);
    }

    if (sf2Files.length > 0) {
      setLoadingStatus('Analyzing SF2...');
      for (const sf2File of sf2Files) {
        try {
          const analysis = await analyzeAndRepairSF2(sf2File);
          newFileInfos.push({
            filename: sf2File.name,
            type: 'sf2',
            stats: {
              presets: analysis.stats.presets,
              instruments: analysis.stats.instruments,
              samples: analysis.stats.samples,
              banks: analysis.stats.banks
            }
          });
        } catch (e) {
          console.error("Failed to parse SF2 for info", e);
        }
      }
    }

    if (newFileInfos.length > 0) {
      setLoadedFilesInfo(prev => [...prev, ...newFileInfos]);
    }

    setLoadingStatus('Applying SFZ mapping...');
    
    setSamples(prev => {
      const allSamples = [...prev, ...newSamples];
      
      if (currentSfzRegions.length > 0) {
        return allSamples.map(sample => {
          const sampleNameNoExt = sample.name.replace(/\.[^/.]+$/, "").toLowerCase();
          
          const matchingRegion = currentSfzRegions.find(r => {
            if (!r.sample) return false;
            const regionBaseName = r.sample.split(/[\\/]/).pop()?.toLowerCase() || '';
            const regionNameNoExt = regionBaseName.replace(/\.[^/.]+$/, "");
            
            return regionBaseName === sample.name.toLowerCase() || 
                   r.sample.toLowerCase() === sample.name.toLowerCase() ||
                   regionNameNoExt === sampleNameNoExt;
          });

          if (matchingRegion) {
            const root = noteToMidi(matchingRegion.pitch_keycenter || matchingRegion.key);
            const low = noteToMidi(matchingRegion.lokey || matchingRegion.key);
            const high = noteToMidi(matchingRegion.hikey || matchingRegion.key);
            const bank = matchingRegion.bank ? parseInt(matchingRegion.bank) : undefined;
            const preset = matchingRegion.program || matchingRegion.preset ? parseInt(matchingRegion.program || matchingRegion.preset) : undefined;

            return {
              ...sample,
              rootKey: root !== null ? root : sample.rootKey,
              lowKey: low !== null ? low : sample.lowKey,
              highKey: high !== null ? high : sample.highKey,
              bank: bank !== undefined ? bank : sample.bank,
              preset: preset !== undefined ? preset : sample.preset,
              volume: matchingRegion.volume ? parseFloat(matchingRegion.volume) : undefined,
              pan: matchingRegion.pan ? parseFloat(matchingRegion.pan) : undefined,
              tune: matchingRegion.tune ? parseInt(matchingRegion.tune) : undefined,
              loopMode: matchingRegion.loop_mode,
              loopStart: matchingRegion.loop_start ? parseInt(matchingRegion.loop_start) : undefined,
              loopEnd: matchingRegion.loop_end ? parseInt(matchingRegion.loop_end) : undefined,
              attack: matchingRegion.ampeg_attack ? parseFloat(matchingRegion.ampeg_attack) : undefined,
              decay: matchingRegion.ampeg_decay ? parseFloat(matchingRegion.ampeg_decay) : undefined,
              sustain: matchingRegion.ampeg_sustain ? parseFloat(matchingRegion.ampeg_sustain) : undefined,
              release: matchingRegion.ampeg_release ? parseFloat(matchingRegion.ampeg_release) : undefined,
            };
          }
          return sample;
        });
      }
      return allSamples;
    });

    setLoading(false);
    setLoadingStatus('');
  };

  const updateSample = (id: string, field: keyof SampleData, value: any) => {
    setSamples(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSample = (id: string) => {
    setSamples(prev => prev.filter(s => s.id !== id));
  };

  const autoMapSamples = async () => {
    if (samples.length === 0) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      alert("API Key is missing.");
      return;
    }

    setLoading(true);
    setLoadingStatus('Initializing AI...');
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const fileNames = samples.map(s => s.name);
      
      const chunkSize = 20;
      const chunks = [];
      for (let i = 0; i < fileNames.length; i += chunkSize) {
        chunks.push(fileNames.slice(i, i + chunkSize));
      }

      const mappingMap = new Map();

      for (let i = 0; i < chunks.length; i++) {
        setLoadingStatus(`Analyzing batch ${i + 1} of ${chunks.length}...`);
        const chunk = chunks[i];
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Analyze these audio sample filenames and map them to MIDI root notes (integer 0-127). Middle C is 60.
          Look for clues like "C3", "F#4", "kick", "snare". 
          If it's a drum, map Kick:36, Snare:38, Hat:42, etc.
          Return a JSON object where keys are filenames and values are the integer MIDI note.
          Filenames to analyze:
          ${JSON.stringify(chunk)}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                mapping: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      filename: { type: Type.STRING },
                      midiNote: { type: Type.INTEGER }
                    }
                  }
                }
              }
            }
          }
        });

        const result = JSON.parse(response.text || '{}');
        const mapping = result.mapping || [];
        mapping.forEach((m: any) => mappingMap.set(m.filename, m.midiNote));
      }

      setLoadingStatus('Applying mapping...');
      setSamples(prev => {
        const updated = prev.map(s => {
          if (mappingMap.has(s.name)) {
            return { ...s, rootKey: mappingMap.get(s.name) ?? 60 };
          }
          return s;
        });
        const sorted = [...updated].sort((a, b) => a.rootKey - b.rootKey);
        for (let i = 0; i < sorted.length; i++) {
          const current = sorted[i];
          const prevSample = i > 0 ? sorted[i - 1] : null;
          const nextSample = i < sorted.length - 1 ? sorted[i + 1] : null;
          let low = 0;
          let high = 127;
          if (prevSample) low = Math.ceil((prevSample.rootKey + current.rootKey) / 2);
          if (nextSample) high = Math.floor((current.rootKey + nextSample.rootKey) / 2);
          const originalIndex = updated.findIndex(u => u.id === current.id);
          if (originalIndex !== -1) {
            updated[originalIndex] = { ...current, lowKey: low, highKey: high };
          }
        }
        return updated;
      });
    } catch (e) {
      console.error("AI Auto Map failed", e);
      alert("AI Mapping failed. Please check console.");
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  const handleRepairSF2 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setLoading(true);
    setLoadingStatus('Analyzing SF2 file...');
    
    try {
      const analysis = await analyzeAndRepairSF2(file);
      setRepairResult(analysis);
    } catch (err: any) {
      console.error(err);
      alert(`Error analyzing SF2: ${err.message}`);
    } finally {
      setLoading(false);
      setLoadingStatus('');
      e.target.value = '';
    }
  };

  const exportSF2 = async () => {
    if (samples.length === 0) return;
    setLoading(true);
    setLoadingStatus('Building SF2 file(s)...');
    
    try {
      if (exportMode === 'all') {
        const builder = new SF2Builder();
        samples.forEach(s => builder.addSample(s));
        const sf2Data = builder.build(soundFontName);
        const blob = new Blob([sf2Data], { type: 'audio/x-soundfont' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${soundFontName}.sf2`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (exportMode === 'bank') {
        const banks = new Map<number, SampleData[]>();
        samples.forEach(s => {
          const b = s.bank || 0;
          if (!banks.has(b)) banks.set(b, []);
          banks.get(b)!.push(s);
        });

        if (banks.size === 1) {
          const builder = new SF2Builder();
          samples.forEach(s => builder.addSample(s));
          const sf2Data = builder.build(soundFontName);
          const blob = new Blob([sf2Data], { type: 'audio/x-soundfont' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${soundFontName}.sf2`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          setLoadingStatus('Zipping multiple banks...');
          const zip = new JSZip();
          for (const [bank, bankSamples] of banks.entries()) {
            const builder = new SF2Builder();
            bankSamples.forEach(s => builder.addSample(s));
            const sf2Data = builder.build(`${soundFontName} Bank ${bank}`);
            zip.file(`${soundFontName}_Bank_${bank}.sf2`, sf2Data);
          }
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${soundFontName}_Banks.zip`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else if (exportMode === 'preset') {
        const presets = new Map<string, SampleData[]>();
        samples.forEach(s => {
          const b = s.bank || 0;
          const p = s.preset || 0;
          const key = `${b}_${p}`;
          if (!presets.has(key)) presets.set(key, []);
          presets.get(key)!.push(s);
        });

        if (presets.size === 1) {
          const builder = new SF2Builder();
          samples.forEach(s => builder.addSample(s));
          const sf2Data = builder.build(soundFontName);
          const blob = new Blob([sf2Data], { type: 'audio/x-soundfont' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${soundFontName}.sf2`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          setLoadingStatus('Zipping multiple presets...');
          const zip = new JSZip();
          for (const [key, presetSamples] of presets.entries()) {
            const b = presetSamples[0].bank || 0;
            const p = presetSamples[0].preset || 0;
            const pName = presetSamples[0].presetName || `P${p}`;
            const builder = new SF2Builder();
            presetSamples.forEach(s => builder.addSample(s));
            const sf2Data = builder.build(`${soundFontName} ${pName}`);
            zip.file(`${soundFontName}_B${b}_${pName}.sf2`, sf2Data);
          }
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${soundFontName}_Presets.zip`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Failed to build SF2");
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-7xl mx-auto w-full p-5 box-border">
      <header className="flex justify-between items-center mb-5 pb-5 border-b border-[#333]">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold text-[#bb86fc] flex items-center gap-2.5">
            <Piano className="w-8 h-8" />
            SF2 Forge
          </div>
          <div className="h-8 w-px bg-[#333] mx-2"></div>
          <input 
            type="text" 
            value={soundFontName} 
            onChange={(e) => setSoundFontName(e.target.value)}
            className="bg-[#1c1c1e] border border-[#333] text-white px-3 py-1.5 rounded-lg text-lg font-medium focus:border-[#bb86fc] outline-none w-64"
            placeholder="SoundFont Name"
          />
        </div>
        <div className="flex gap-3">
          <button 
            className="bg-[#bb86fc] text-black font-bold py-2 px-4 rounded flex items-center gap-2 hover:bg-[#a370f7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={autoMapSamples} 
            disabled={loading || samples.length === 0}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Auto-Map with AI
          </button>
          <button 
            className="bg-[#bb86fc] text-black font-bold py-2 px-4 rounded flex items-center gap-2 hover:bg-[#a370f7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
            disabled={loading}
          >
            <input 
              type="file" 
              accept=".sf2" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={handleRepairSF2}
            />
            <Sparkles className="w-4 h-4" />
            Repair .SF2
          </button>
          <div className="flex items-center gap-2 bg-[#1c1c1e] border border-[#333] rounded pl-2">
            <select 
              value={exportMode} 
              onChange={(e) => setExportMode(e.target.value as any)}
              className="bg-transparent text-white text-sm font-medium focus:outline-none py-2 cursor-pointer"
            >
              <option value="all">Export: Single File</option>
              <option value="bank">Export: Split by Bank</option>
              <option value="preset">Export: Split by Preset</option>
            </select>
            <button 
              className="bg-[#bb86fc] text-black font-bold py-2 px-4 rounded-r flex items-center gap-2 hover:bg-[#a370f7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-full"
              onClick={exportSF2} 
              disabled={loading || samples.length === 0}
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      </header>

      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#1c1c1e] p-6 rounded-xl border border-[#333] flex flex-col items-center gap-4 min-w-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-[#bb86fc]" />
            <div className="text-center">
              <h3 className="font-bold text-lg mb-1">Working...</h3>
              <p className="text-[#888] text-sm">{loadingStatus}</p>
            </div>
          </div>
        </div>
      )}

      <main className="flex flex-1 gap-5 min-h-0">
        <aside className="w-[300px] bg-[#1c1c1e] rounded-lg p-4 flex flex-col gap-4 overflow-y-auto">
          <UploadZone onUpload={handleFileUpload} />
          <FileInfo files={loadedFilesInfo} />
          <div className="bg-[#1c1c1e] p-4 rounded-lg text-center border border-[#333]">
            <h3 className="text-sm font-bold mb-1">Preview</h3>
            <p className="text-[10px] text-[#888] mb-3 uppercase tracking-widest">Click keys to play mapped samples</p>
            <Keyboard 
              activeNote={activeNote} 
              onPlayNote={playNote} 
              onStopNote={stopNote} 
            />
          </div>
        </aside>

        <section className="flex-1 bg-[#1c1c1e] rounded-lg flex flex-col overflow-hidden border border-[#333]">
          <SampleList 
            samples={samples} 
            onUpdate={updateSample} 
            onRemove={removeSample} 
          />
        </section>
      </main>

      {repairResult && (
        <RepairModal 
          result={repairResult} 
          onClose={() => setRepairResult(null)} 
        />
      )}
    </div>
  );
}
