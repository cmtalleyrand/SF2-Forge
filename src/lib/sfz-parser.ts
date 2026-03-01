export interface SFZRegion {
  sample?: string;
  pitch_keycenter?: string | number;
  lokey?: string | number;
  hikey?: string | number;
  key?: string | number;
  [key: string]: any;
}

export const parseSFZ = (text: string): SFZRegion[] => {
  const regions: SFZRegion[] = [];
  const cleanText = text.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  
  const sections = cleanText.split(/(<[^>]+>)/).filter(s => s.trim().length > 0);
  
  let currentGlobal: any = {};
  let currentGroup: any = {};
  let currentRegion: any = null;
  
  let currentHeader = '';

  for (const section of sections) {
    if (section.startsWith('<') && section.endsWith('>')) {
      currentHeader = section.toLowerCase();
      if (currentHeader === '<global>') {
        currentGlobal = {};
      } else if (currentHeader === '<group>') {
        currentGroup = {};
      } else if (currentHeader === '<region>') {
        currentRegion = { ...currentGlobal, ...currentGroup };
        regions.push(currentRegion);
      }
    } else {
      // Split by opcode= to handle unquoted values with spaces
      const opcodeRegex = /([a-z0-9_]+)\s*=/gi;
      let lastIndex = 0;
      let match;
      const opcodes: { key: string, value: string }[] = [];
      
      while ((match = opcodeRegex.exec(section)) !== null) {
        if (opcodes.length > 0) {
          opcodes[opcodes.length - 1].value = section.substring(lastIndex, match.index).trim().replace(/^"|"$/g, '');
        }
        opcodes.push({ key: match[1].toLowerCase(), value: '' });
        lastIndex = opcodeRegex.lastIndex;
      }
      
      if (opcodes.length > 0) {
        opcodes[opcodes.length - 1].value = section.substring(lastIndex).trim().replace(/^"|"$/g, '');
      }

      for (const { key, value } of opcodes) {
        if (currentHeader === '<global>') {
          currentGlobal[key] = value;
        } else if (currentHeader === '<group>') {
          currentGroup[key] = value;
        } else if (currentHeader === '<region>' && currentRegion) {
          currentRegion[key] = value;
        }
      }
    }
  }
  
  return regions;
};
