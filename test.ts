import { SoundFont2 } from 'soundfont2';
import * as fs from 'fs';

const buffer = fs.readFileSync('test.sf2');
const sf2 = new SoundFont2(new Uint8Array(buffer));

console.log(sf2.presets.length);
