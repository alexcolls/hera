'use client';

import CreateJobForm from './components/CreateJobForm';
import JobStatusDisplay from './components/JobStatusDisplay';
import { useState } from 'react';

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            HERA
          </h1>
          <p className="text-gray-400">Viral AI Video Generator</p>
        </header>

        {!jobId ? (
          <CreateJobForm onJobCreated={setJobId} />
        ) : (
          <div>
            <button 
              onClick={() => setJobId(null)}
              className="mb-4 text-sm text-gray-400 hover:text-white underline"
            >
              ← Create New Video
            </button>
            <JobStatusDisplay jobId={jobId} />
          </div>
        )}
        
        <footer className="text-center text-xs text-gray-600 pt-8">
          Powered by Grok xAI, Suno, & FFmpeg
        </footer>
      </div>
    </main>
  );
}
