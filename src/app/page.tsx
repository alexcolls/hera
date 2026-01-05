'use client';

import CreateJobForm from './components/CreateJobForm';
import JobStatusDisplay from './components/JobStatusDisplay';
import { useState } from 'react';

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-white selection:text-black">
      <div className="max-w-xl mx-auto space-y-12">
        <header className="text-center space-y-4 pt-8">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white">
            HERA
          </h1>
          <div className="flex items-center justify-center gap-4 text-xs font-mono uppercase tracking-widest text-gray-500">
            <span>Viral Engine</span>
            <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
            <span>v1.0.0</span>
          </div>
        </header>

        {!jobId ? (
          <CreateJobForm onJobCreated={setJobId} />
        ) : (
          <div>
            <button 
              onClick={() => setJobId(null)}
              className="mb-8 text-xs font-mono uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
            >
              ← Initiate New Sequence
            </button>
            <JobStatusDisplay jobId={jobId} />
          </div>
        )}
        
        <footer className="text-center text-[10px] font-mono uppercase text-gray-800 py-12">
          System Architecture: Grok xAI // Suno Audio // FFmpeg Core
        </footer>
      </div>
    </main>
  );
}
