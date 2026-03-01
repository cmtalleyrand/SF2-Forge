import React, { useState } from 'react';
import { Upload } from 'lucide-react';

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files: File[] = [];
    const items = Array.from(e.dataTransfer.items);

    const readEntry = async (entry: any) => {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve) => entry.file(resolve));
        files.push(file);
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        let allEntries: any[] = [];
        
        const readBatch = async () => {
          const entries = await new Promise<any[]>((resolve) => {
            dirReader.readEntries(resolve);
          });
          if (entries.length > 0) {
            allEntries = allEntries.concat(entries);
            await readBatch();
          }
        };
        
        await readBatch();
        
        for (const childEntry of allEntries) {
          await readEntry(childEntry);
        }
      }
    };

    for (const item of items) {
      const entry = item.webkitGetAsEntry();
      if (entry) {
        await readEntry(entry);
      }
    }

    if (files.length > 0) {
      onUpload(files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onUpload(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all relative ${isDragging ? 'border-[#bb86fc] text-[#bb86fc] bg-[#bb86fc]/10' : 'border-[#333] text-[#a0a0a0] hover:border-[#bb86fc] hover:text-[#bb86fc]'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept="audio/*,.sfz"
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      <div className="flex flex-col items-center gap-2 pointer-events-none">
        <Upload className="w-8 h-8 transition-transform" />
        <p className="text-sm font-medium">Drag files/folders here</p>
        <p className="text-[10px] uppercase tracking-wider opacity-50">or click to upload</p>
      </div>
    </div>
  );
};
