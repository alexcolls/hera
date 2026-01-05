'use client';

import { useState } from 'react';
import CreateJobForm from './components/CreateJobForm';
import JobStatusDisplay from './components/JobStatusDisplay';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import { useI18n } from '@/lib/providers/i18n-provider';

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-foreground selection:text-background">
      <main className="flex-1 w-full p-6 md:p-12">
        <div className="max-w-xl mx-auto space-y-12">
          <header className="text-center space-y-4 pt-8">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground">
              HERA
            </h1>
            <div className="flex items-center justify-center gap-4 text-xs font-mono uppercase tracking-widest text-gray-500">
              <span>{t('home.tagline')}</span>
              <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
              <span>v0.1.0</span>
            </div>
          </header>

          {!jobId ? (
            <CreateJobForm onJobCreated={setJobId} />
          ) : (
            <div>
              <button 
                onClick={() => setJobId(null)}
                className="mb-8 text-xs font-mono uppercase tracking-widest text-gray-500 hover:text-foreground transition-colors"
              >
                {t('home.initiateNewSequence')}
              </button>
              <JobStatusDisplay jobId={jobId} />
            </div>
          )}
        </div>
      </main>
      
      <footer className="w-full border-t border-gray-200 dark:border-gray-800 py-2 bg-background">
        <div className="container mx-auto px-6 flex items-center justify-between text-[10px] font-mono uppercase text-gray-500">
          <div>
            &copy; {new Date().getFullYear()} Hera Inc. {t('footer.rights')}
          </div>
          <div>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}
