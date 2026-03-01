export interface SF2Analysis {
  filename: string;
  issues: string[];
  needsRepair: boolean;
  stats: {
    presets: number;
    instruments: number;
    samples: number;
    banks: number[];
    presetNames: string[];
  };
  repairedBuffer?: Uint8Array;
  repairedUrl?: string;
}

export async function analyzeAndRepairSF2(file: File): Promise<SF2Analysis> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  
  const readString = (offset: number, length: number) => {
    let str = '';
    for (let i = 0; i < length; i++) {
      const charCode = view.getUint8(offset + i);
      if (charCode === 0) break; // Null-terminated
      str += String.fromCharCode(charCode);
    }
    return str;
  };

  if (readString(0, 4) !== 'RIFF') throw new Error('Not a valid RIFF file');
  if (readString(8, 4) !== 'sfbk') throw new Error('Not a valid SoundFont file');

  let offset = 12;
  const outChunks: Uint8Array[] = [];
  const issues: string[] = [];
  let needsRepair = false;
  
  let presetsCount = 0;
  let instrumentsCount = 0;
  let samplesCount = 0;
  const banks = new Set<number>();
  const presetNames: string[] = [];

  while (offset < buffer.byteLength) {
    if (offset + 8 > buffer.byteLength) break;
    const id = readString(offset, 4);
    const size = view.getUint32(offset + 4, true);
    
    let chunkData: Uint8Array;
    const paddedSize = size % 2 === 0 ? size : size + 1;
    
    if (id === 'LIST') {
      const listType = readString(offset + 8, 4);
      if (listType === 'pdta') {
        let pdtaOffset = offset + 12;
        const pdtaEnd = offset + 8 + size;
        const pdtaSubChunks: Uint8Array[] = [];
        
        while (pdtaOffset < pdtaEnd) {
          if (pdtaOffset + 8 > pdtaEnd) break;
          let subId = readString(pdtaOffset, 4);
          const subSize = view.getUint32(pdtaOffset + 4, true);
          
          if (subId === 'phas') {
            issues.push(`Found invalid chunk header 'phas'. Fixed to 'phdr'.`);
            subId = 'phdr';
            needsRepair = true;
          }
          
          if (subId === 'phdr') {
            presetsCount = Math.max(0, Math.floor(subSize / 38) - 1);
            // Parse preset headers to get banks and names
            for (let i = 0; i < presetsCount; i++) {
              const pOffset = pdtaOffset + 8 + (i * 38);
              const pName = readString(pOffset, 20);
              const pBank = view.getUint16(pOffset + 22, true);
              banks.add(pBank);
              presetNames.push(pName);
            }
          }
          if (subId === 'inst') instrumentsCount = Math.max(0, Math.floor(subSize / 22) - 1);
          if (subId === 'shdr') samplesCount = Math.max(0, Math.floor(subSize / 46) - 1);
          
          let subChunkData = new Uint8Array(buffer, pdtaOffset, 8 + subSize);
          
          if (subId === 'phdr' && readString(pdtaOffset, 4) === 'phas') {
              const newSubChunkData = new Uint8Array(subChunkData);
              newSubChunkData[0] = 'p'.charCodeAt(0);
              newSubChunkData[1] = 'h'.charCodeAt(0);
              newSubChunkData[2] = 'd'.charCodeAt(0);
              newSubChunkData[3] = 'r'.charCodeAt(0);
              subChunkData = newSubChunkData;
          }
          
          pdtaSubChunks.push(subChunkData);
          
          const subPaddedSize = subSize % 2 === 0 ? subSize : subSize + 1;
          
          if (subSize % 2 !== 0) {
             if (pdtaOffset + 8 + subSize < pdtaEnd) {
                 const nextId = readString(pdtaOffset + 8 + subSize, 4);
                 if (/^[a-z]{4}$/.test(nextId)) {
                   issues.push(`Chunk '${subId}' is missing required 1-byte padding. Added padding.`);
                   needsRepair = true;
                   pdtaSubChunks.push(new Uint8Array([0]));
                   pdtaOffset += 8 + subSize;
                   continue;
                 }
             }
             if (pdtaOffset + 8 + subPaddedSize <= buffer.byteLength && pdtaOffset + 8 + subSize < pdtaEnd) {
                 pdtaSubChunks.push(new Uint8Array(buffer, pdtaOffset + 8 + subSize, 1));
             } else if (pdtaOffset + 8 + subSize === pdtaEnd) {
                 pdtaSubChunks.push(new Uint8Array([0]));
             }
          }
          
          pdtaOffset += 8 + subPaddedSize;
        }
        
        const pdtaTotalSize = pdtaSubChunks.reduce((acc, c) => acc + c.length, 0) + 4;
        const newPdtaChunk = new Uint8Array(8 + pdtaTotalSize);
        const pdtaView = new DataView(newPdtaChunk.buffer);
        
        pdtaView.setUint8(0, 'L'.charCodeAt(0));
        pdtaView.setUint8(1, 'I'.charCodeAt(0));
        pdtaView.setUint8(2, 'S'.charCodeAt(0));
        pdtaView.setUint8(3, 'T'.charCodeAt(0));
        pdtaView.setUint32(4, pdtaTotalSize, true);
        pdtaView.setUint8(8, 'p'.charCodeAt(0));
        pdtaView.setUint8(9, 'd'.charCodeAt(0));
        pdtaView.setUint8(10, 't'.charCodeAt(0));
        pdtaView.setUint8(11, 'a'.charCodeAt(0));
        
        let currentPdtaOffset = 12;
        for (const sc of pdtaSubChunks) {
            newPdtaChunk.set(sc, currentPdtaOffset);
            currentPdtaOffset += sc.length;
        }
        
        chunkData = newPdtaChunk;
        if (pdtaTotalSize % 2 !== 0) {
            const paddedChunk = new Uint8Array(chunkData.length + 1);
            paddedChunk.set(chunkData);
            chunkData = paddedChunk;
        }
      } else {
         const actualSize = Math.min(8 + paddedSize, buffer.byteLength - offset);
         chunkData = new Uint8Array(buffer, offset, actualSize);
      }
    } else {
        const actualSize = Math.min(8 + paddedSize, buffer.byteLength - offset);
        chunkData = new Uint8Array(buffer, offset, actualSize);
    }

    outChunks.push(chunkData);
    offset += 8 + paddedSize;
  }

  let repairedBuffer: Uint8Array | undefined;

  if (needsRepair) {
    const totalInnerSize = outChunks.reduce((acc, c) => acc + c.length, 0) + 4;
    const finalBuffer = new Uint8Array(8 + totalInnerSize);
    const finalView = new DataView(finalBuffer.buffer);
    
    finalView.setUint8(0, 'R'.charCodeAt(0));
    finalView.setUint8(1, 'I'.charCodeAt(0));
    finalView.setUint8(2, 'F'.charCodeAt(0));
    finalView.setUint8(3, 'F'.charCodeAt(0));
    finalView.setUint32(4, totalInnerSize, true);
    finalView.setUint8(8, 's'.charCodeAt(0));
    finalView.setUint8(9, 'f'.charCodeAt(0));
    finalView.setUint8(10, 'b'.charCodeAt(0));
    finalView.setUint8(11, 'k'.charCodeAt(0));
    
    let currentOffset = 12;
    for (const c of outChunks) {
        finalBuffer.set(c, currentOffset);
        currentOffset += c.length;
    }
    repairedBuffer = finalBuffer;
  }

  return {
    filename: file.name,
    issues,
    needsRepair,
    stats: {
      presets: presetsCount,
      instruments: instrumentsCount,
      samples: samplesCount,
      banks: Array.from(banks).sort((a, b) => a - b),
      presetNames
    },
    repairedBuffer
  };
}
