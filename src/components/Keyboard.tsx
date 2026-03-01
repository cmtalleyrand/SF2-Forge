import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface KeyboardProps {
  activeNote: number | null;
  onPlayNote: (note: number) => void;
  onStopNote: (note: number) => void;
}

export const Keyboard: React.FC<KeyboardProps> = ({ activeNote, onPlayNote, onStopNote }) => {
  const keys = Array.from({ length: 24 }).map((_, i) => {
    const note = 48 + i;
    const isBlack = [1, 3, 6, 8, 10].includes(i % 12);
    return { note, isBlack };
  });

  return (
    <div className="inline-flex bg-black p-2.5 pb-0 rounded relative h-[120px] overflow-x-auto max-w-full scrollbar-hide">
      {keys.map(({ note, isBlack }) => (
        <div
          key={note}
          className={twMerge(
            clsx(
              "cursor-pointer transition-colors duration-75",
              isBlack 
                ? "bg-black h-[60px] w-5 -ml-3 -mr-2.5 z-10 border border-[#333] rounded-b-sm" 
                : "bg-white h-[100px] w-[30px] border border-[#ccc] rounded-b-md z-0",
              activeNote === note && "bg-[#bb86fc]"
            )
          )}
          onMouseDown={() => onPlayNote(note)}
          onMouseUp={() => onStopNote(note)}
          onMouseLeave={() => onStopNote(note)}
        />
      ))}
    </div>
  );
};
