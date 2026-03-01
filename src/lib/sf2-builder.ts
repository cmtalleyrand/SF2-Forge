export interface Sample {
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

const FOURCC_RIFF = 'RIFF';
const FOURCC_sfbk = 'sfbk';
const FOURCC_LIST = 'LIST';
const FOURCC_INFO = 'INFO';
const FOURCC_sdta = 'sdta';
const FOURCC_pdta = 'pdta';
const FOURCC_ifil = 'ifil';
const FOURCC_isng = 'isng';
const FOURCC_INAM = 'INAM';
const FOURCC_smpl = 'smpl';
const FOURCC_phdr = 'phdr';
const FOURCC_pbag = 'pbag';
const FOURCC_pgen = 'pgen';
const FOURCC_pmod = 'pmod';
const FOURCC_inst = 'inst';
const FOURCC_ibag = 'ibag';
const FOURCC_igen = 'igen';
const FOURCC_imod = 'imod';
const FOURCC_shdr = 'shdr';

const GEN_KEYRANGE = 43;
const GEN_SAMPLEID = 53;
const GEN_OVERRIDINGROOTKEY = 58;
const GEN_PAN = 17;
const GEN_ATTACKVOLENV = 34;
const GEN_DECAYVOLENV = 36;
const GEN_SUSTAINVOLENV = 37;
const GEN_RELEASEVOLENV = 38;
const GEN_INITIALATTENUATION = 48;
const GEN_FINETUNE = 52;
const GEN_SAMPLEMODES = 54;

function secondsToTimecents(seconds: number): number {
  if (seconds <= 0.001) return -12000;
  return Math.max(-12000, Math.min(8000, Math.round(1200 * Math.log2(seconds))));
}

function sustainToCentibels(sustainLevel: number): number {
  if (sustainLevel <= 0.1) return 1440;
  const db = 20 * Math.log10(sustainLevel / 100);
  return Math.max(0, Math.min(1440, Math.round(-db * 10)));
}

export class SF2Builder {
  private samples: Sample[] = [];

  addSample(sample: Sample) {
    this.samples.push(sample);
  }

  build(soundFontName: string = 'Gemini SoundFont'): Uint8Array {
    const sampleDataParts: Int16Array[] = [];
    const sampleHeaders: any[] = [];
    let currentOffset = 0;

    const bufferToSampleIndex = new Map<AudioBuffer, number>();
    const uniqueSamples: Sample[] = [];

    for (const s of this.samples) {
      if (!bufferToSampleIndex.has(s.buffer)) {
        bufferToSampleIndex.set(s.buffer, uniqueSamples.length);
        uniqueSamples.push(s);
      }
    }

    for (const sample of uniqueSamples) {
      const floatData = sample.buffer.getChannelData(0);
      const pcm16 = new Int16Array(floatData.length + 46);
      for (let i = 0; i < floatData.length; i++) {
        const s = Math.max(-1, Math.min(1, floatData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      const start = currentOffset;
      const end = currentOffset + floatData.length;
      const loopStart = sample.loopStart !== undefined ? start + sample.loopStart : start + 8;
      const loopEnd = sample.loopEnd !== undefined ? start + sample.loopEnd : end - 8;

      sampleDataParts.push(pcm16);

      sampleHeaders.push({
        name: sample.name.substring(0, 20),
        start: start,
        end: end,
        loopStart: loopStart,
        loopEnd: loopEnd,
        sampleRate: sample.sampleRate,
        originalPitch: sample.rootKey,
        pitchCorrection: 0,
        sampleLink: 0,
        sampleType: 1
      });

      currentOffset += pcm16.length;
    }

    sampleHeaders.push({
      name: 'EOS',
      start: 0,
      end: 0,
      loopStart: 0,
      loopEnd: 0,
      sampleRate: 0,
      originalPitch: 0,
      pitchCorrection: 0,
      sampleLink: 0,
      sampleType: 0
    });

    const totalSampleBytes = sampleDataParts.reduce((acc, part) => acc + part.byteLength, 0);
    const sdtaBuffer = new Uint8Array(totalSampleBytes);
    let offset = 0;
    for (const part of sampleDataParts) {
      sdtaBuffer.set(new Uint8Array(part.buffer), offset);
      offset += part.byteLength;
    }

    const igenList: any[] = [];
    const ibagList: any[] = [];
    const instList: any[] = [];

    const pgenList: any[] = [];
    const pbagList: any[] = [];
    const phasList: any[] = [];

    // Group samples by preset
    const presets = new Map<number, Sample[]>();
    for (const s of this.samples) {
      const p = s.preset || 0;
      if (!presets.has(p)) presets.set(p, []);
      presets.get(p)!.push(s);
    }

    let instNdx = 0;
    for (const [presetId, presetSamples] of presets.entries()) {
      // Find a name for this preset
      const customName = presetSamples.find(s => s.presetName)?.presetName;
      const presetName = customName || (presets.size === 1 ? soundFontName : `${soundFontName} P${presetId}`);
      const instName = presetName;

      // Add Instrument
      instList.push({ name: instName, bagNdx: ibagList.length });

      // Add Instrument Zones
      for (const s of presetSamples) {
        const sampleIndex = bufferToSampleIndex.get(s.buffer)!;
        ibagList.push({ genNdx: igenList.length, modNdx: 0 });
        igenList.push({ op: GEN_KEYRANGE, val: { lo: s.lowKey, hi: s.highKey } });
        igenList.push({ op: GEN_OVERRIDINGROOTKEY, val: { amount: s.rootKey } });
        igenList.push({ op: GEN_SAMPLEID, val: { amount: sampleIndex } });

        if (s.pan !== undefined) igenList.push({ op: GEN_PAN, val: { amount: Math.max(-500, Math.min(500, Math.round(s.pan * 5))) } });
        if (s.volume !== undefined) igenList.push({ op: GEN_INITIALATTENUATION, val: { amount: Math.max(0, Math.min(1440, Math.round(-s.volume * 10))) } });
        if (s.tune !== undefined) igenList.push({ op: GEN_FINETUNE, val: { amount: Math.max(-99, Math.min(99, Math.round(s.tune))) } });
        
        let sampleMode = 0;
        if (s.loopMode === 'loop_continuous') sampleMode = 1;
        else if (s.loopMode === 'loop_sustain') sampleMode = 3;
        else if (s.loopStart !== undefined && s.loopEnd !== undefined) sampleMode = 1;
        if (sampleMode > 0) igenList.push({ op: GEN_SAMPLEMODES, val: { amount: sampleMode } });

        if (s.attack !== undefined) igenList.push({ op: GEN_ATTACKVOLENV, val: { amount: secondsToTimecents(s.attack) } });
        if (s.decay !== undefined) igenList.push({ op: GEN_DECAYVOLENV, val: { amount: secondsToTimecents(s.decay) } });
        if (s.sustain !== undefined) igenList.push({ op: GEN_SUSTAINVOLENV, val: { amount: sustainToCentibels(s.sustain) } });
        if (s.release !== undefined) igenList.push({ op: GEN_RELEASEVOLENV, val: { amount: secondsToTimecents(s.release) } });
      }

      // Add Preset
      phasList.push({ 
        name: presetName, 
        preset: presetId, 
        bank: presetSamples[0].bank || 0, 
        bagNdx: pbagList.length 
      });

      // Add Preset Zone
      pbagList.push({ genNdx: pgenList.length, modNdx: 0 });
      pgenList.push({ op: 41, val: { amount: instNdx } }); // 41 is instrument ID

      instNdx++;
    }

    // Terminal records
    instList.push({ name: 'EOI', bagNdx: ibagList.length });
    ibagList.push({ genNdx: igenList.length, modNdx: 0 });
    igenList.push({ op: 0, val: 0 });

    phasList.push({ name: 'EOP', preset: 255, bank: 255, bagNdx: pbagList.length });
    pbagList.push({ genNdx: pgenList.length, modNdx: 0 });
    pgenList.push({ op: 0, val: 0 });

    const chunks = [
      this.createInfos(soundFontName),
      this.createChunk(FOURCC_LIST, [
        this.writeString(FOURCC_sdta),
        this.createChunk(FOURCC_smpl, [sdtaBuffer])
      ]),
      this.createChunk(FOURCC_LIST, [
        this.writeString(FOURCC_pdta),
        this.createPhdr(phasList),
        this.createPbag(pbagList),
        this.createPmod([{ src: 0, dest: 0, amt: 0, amtSrc: 0, trans: 0 }]),
        this.createPgen(pgenList),
        this.createInst(instList),
        this.createIbag(ibagList),
        this.createImod([{ src: 0, dest: 0, amt: 0, amtSrc: 0, trans: 0 }]),
        this.createIgen(igenList),
        this.createShdr(sampleHeaders)
      ])
    ];

    return this.createChunk(FOURCC_RIFF, [this.writeString(FOURCC_sfbk), ...chunks]);
  }

  private createChunk(id: string, parts: Uint8Array[]): Uint8Array {
    const totalSize = parts.reduce((acc, p) => acc + p.length, 0);
    const paddedSize = totalSize % 2 === 0 ? totalSize : totalSize + 1;
    const buffer = new Uint8Array(8 + paddedSize);
    const view = new DataView(buffer.buffer);
    this.writeStringData(view, 0, id);
    view.setUint32(4, totalSize, true); // Size is the actual size, not padded size
    let offset = 8;
    for (const part of parts) {
      buffer.set(part, offset);
      offset += part.length;
    }
    return buffer;
  }

  private writeString(str: string, nullTerminated = false): Uint8Array {
    const len = nullTerminated ? str.length + 1 : str.length;
    const b = new Uint8Array(len);
    for (let i = 0; i < str.length; i++) b[i] = str.charCodeAt(i);
    if (nullTerminated) b[str.length] = 0;
    return b;
  }

  private writeStringData(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  private createInfos(soundFontName: string): Uint8Array {
    const version = new Uint8Array(4);
    new DataView(version.buffer).setUint16(0, 2, true);
    new DataView(version.buffer).setUint16(2, 1, true);
    return this.createChunk(FOURCC_LIST, [
      this.writeString(FOURCC_INFO),
      this.createChunk(FOURCC_ifil, [version]),
      this.createChunk(FOURCC_isng, [this.writeString("EMU8000", true)]),
      this.createChunk(FOURCC_INAM, [this.writeString(soundFontName, true)])
    ]);
  }

  private createPhdr(items: any[]): Uint8Array {
    const size = 38;
    const buf = new Uint8Array(items.length * size);
    const view = new DataView(buf.buffer);
    items.forEach((item, i) => {
      const off = i * size;
      this.writeFixedString(view, off, item.name, 20);
      view.setUint16(off + 20, item.preset, true);
      view.setUint16(off + 22, item.bank, true);
      view.setUint16(off + 24, item.bagNdx, true);
      view.setUint32(off + 26, item.library || 0, true);
      view.setUint32(off + 30, item.genre || 0, true);
      view.setUint32(off + 34, item.morphology || 0, true);
    });
    return this.createChunk(FOURCC_phdr, [buf]);
  }

  private createPbag(items: any[]): Uint8Array {
    const size = 4;
    const buf = new Uint8Array(items.length * size);
    const view = new DataView(buf.buffer);
    items.forEach((item, i) => {
      const off = i * size;
      view.setUint16(off, item.genNdx, true);
      view.setUint16(off + 2, item.modNdx, true);
    });
    return this.createChunk(FOURCC_pbag, [buf]);
  }

  private createPgen(items: any[]): Uint8Array { return this.createGen(items, FOURCC_pgen); }

  private createInst(items: any[]): Uint8Array {
    const size = 22;
    const buf = new Uint8Array(items.length * size);
    const view = new DataView(buf.buffer);
    items.forEach((item, i) => {
      const off = i * size;
      this.writeFixedString(view, off, item.name, 20);
      view.setUint16(off + 20, item.bagNdx, true);
    });
    return this.createChunk(FOURCC_inst, [buf]);
  }

  private createIbag(items: any[]): Uint8Array {
    const size = 4;
    const buf = new Uint8Array(items.length * size);
    const view = new DataView(buf.buffer);
    items.forEach((item, i) => {
      const off = i * size;
      view.setUint16(off, item.genNdx, true);
      view.setUint16(off + 2, item.modNdx, true);
    });
    return this.createChunk(FOURCC_ibag, [buf]);
  }

  private createImod(items: any[]): Uint8Array { return this.createMod(items, FOURCC_imod); }
  private createPmod(items: any[]): Uint8Array { return this.createMod(items, FOURCC_pmod); }
  private createIgen(items: any[]): Uint8Array { return this.createGen(items, FOURCC_igen); }

  private createMod(items: any[], id: string): Uint8Array {
    const size = 10;
    const buf = new Uint8Array(items.length * size);
    const view = new DataView(buf.buffer);
    items.forEach((item, i) => {
      const off = i * size;
      view.setUint16(off, item.src, true);
      view.setUint16(off + 2, item.dest, true);
      view.setInt16(off + 4, item.amt, true);
      view.setUint16(off + 6, item.amtSrc, true);
      view.setUint16(off + 8, item.trans, true);
    });
    return this.createChunk(id as any, [buf]);
  }

  private createGen(items: any[], id: string): Uint8Array {
    const size = 4;
    const buf = new Uint8Array(items.length * size);
    const view = new DataView(buf.buffer);
    items.forEach((item, i) => {
      const off = i * size;
      view.setUint16(off, item.op, true);
      if (typeof item.val === 'object') {
        if (item.val.amount !== undefined) {
          view.setInt16(off + 2, item.val.amount, true);
        } else {
          view.setUint8(off + 2, item.val.lo);
          view.setUint8(off + 3, item.val.hi);
        }
      } else {
        view.setInt16(off + 2, item.val, true);
      }
    });
    return this.createChunk(id as any, [buf]);
  }

  private createShdr(items: any[]): Uint8Array {
    const size = 46;
    const buf = new Uint8Array(items.length * size);
    const view = new DataView(buf.buffer);
    items.forEach((item, i) => {
      const off = i * size;
      this.writeFixedString(view, off, item.name, 20);
      view.setUint32(off + 20, item.start, true);
      view.setUint32(off + 24, item.end, true);
      view.setUint32(off + 28, item.loopStart, true);
      view.setUint32(off + 32, item.loopEnd, true);
      view.setUint32(off + 36, item.sampleRate, true);
      view.setUint8(off + 40, item.originalPitch);
      view.setInt8(off + 41, item.pitchCorrection);
      view.setUint16(off + 42, item.sampleLink, true);
      view.setUint16(off + 44, item.sampleType, true);
    });
    return this.createChunk(FOURCC_shdr, [buf]);
  }

  private writeFixedString(view: DataView, offset: number, str: string, len: number) {
    for (let i = 0; i < len; i++) {
      view.setUint8(offset + i, i < str.length ? str.charCodeAt(i) : 0);
    }
  }
}
