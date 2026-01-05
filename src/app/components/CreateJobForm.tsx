'use client';

import { useState, useRef } from 'react';

export default function CreateJobForm({ onJobCreated }: { onJobCreated: (jobId: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    // Validate file
    const file = formData.get('imageFile') as File;
    if (!file || file.size === 0) {
      setError('Please upload an image.');
      setLoading(false);
      return;
    }

    try {
      // Send FormData directly (browser sets Content-Type to multipart/form-data)
      const res = await fetch('/api/jobs', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create job');
      }

      const { jobId } = await res.json();
      onJobCreated(jobId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-black p-8 border border-white/20 rounded-none max-w-xl mx-auto animate-fade-in">
      
      {/* Image Upload Area */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400">Target Subject</label>
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative w-full aspect-square md:aspect-video border-2 border-dashed 
            ${preview ? 'border-white' : 'border-gray-700 hover:border-gray-500'} 
            flex flex-col items-center justify-center cursor-pointer transition-colors group
          `}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center space-y-2 group-hover:text-white text-gray-500">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-mono uppercase">Click to Upload Image</span>
            </div>
          )}
          <input 
            ref={fileInputRef}
            type="file" 
            name="imageFile" 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Style Selection */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400">Aesthetic</label>
        <div className="grid grid-cols-2 gap-4">
          {['Cyberpunk', 'Cinematic', 'Anime', 'Vaporwave'].map((style) => (
            <label key={style} className="cursor-pointer">
              <input type="radio" name="style" value={style.toLowerCase()} className="peer hidden" defaultChecked={style === 'Cyberpunk'} />
              <div className="
                border border-gray-800 p-4 text-center text-sm font-mono uppercase transition-all
                peer-checked:bg-white peer-checked:text-black peer-checked:border-white
                hover:border-gray-500
              ">
                {style}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Hook Text */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400">Text Overlay</label>
        <input
          name="hookText"
          placeholder="WAIT FOR IT..."
          className="w-full bg-transparent border-b border-gray-700 p-2 text-2xl font-black text-white placeholder-gray-800 focus:outline-none focus:border-white transition-colors uppercase text-center"
          required
        />
      </div>

      {error && <p className="text-red-500 text-xs font-mono border border-red-900 p-2 text-center">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="
          w-full bg-white text-black font-black uppercase py-4 tracking-widest text-sm
          hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-500 transition-colors
        "
      >
        {loading ? 'Processing Protocol...' : 'Initiate Sequence'}
      </button>
    </form>
  );
}
