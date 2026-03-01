export const noteToMidi = (note: string | number | undefined | null): number | null => {
  if (note === undefined || note === null) return null;
  if (typeof note === 'number') return note;
  if (typeof note === 'string' && !isNaN(parseInt(note)) && /^\d+$/.test(note.trim())) return parseInt(note);
  
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const match = String(note).trim().match(/^([A-G][#b]?)(-?\d+)$/i);
  if (!match) return null;
  
  let name = match[1].toUpperCase();
  if (name === 'BB') name = 'A#';
  if (name === 'DB') name = 'C#';
  if (name === 'EB') name = 'D#';
  if (name === 'GB') name = 'F#';
  if (name === 'AB') name = 'G#';
  
  const octave = parseInt(match[2]);
  const index = notes.indexOf(name);
  if (index === -1) return null;
  return (octave + 1) * 12 + index;
};
