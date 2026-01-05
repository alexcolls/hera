'use client';

import { useEffect, useState } from 'react';
import { Job, JobStatus } from '@/lib/types/job';
import StoryboardReview from './StoryboardReview';

const STEPS: JobStatus[] = [
  'pending',
  'analyzing',
  'generating_storyboard',
  'waiting_for_approval',
  'generating_video',
  'stitching',
  'completed'
];

const LABELS: Record<JobStatus, string> = {
  pending: 'INITIALIZING SYSTEM...',
  analyzing: 'ANALYZING VISUAL DATA...',
  generating_storyboard: 'GENERATING STORYBOARD FRAMES...',
  waiting_for_approval: 'AWAITING USER CONFIRMATION',
  generating_video: 'SYNTHESIZING MOTION VIDEO...',
  stitching: 'ASSEMBLING FINAL CUT...',
  completed: 'SEQUENCE COMPLETE',
  failed: 'SYSTEM FAILURE',
};

export default function JobStatusDisplay({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data.job);
          if (data.job.status === 'completed' || data.job.status === 'failed') {
            clearInterval(interval);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchStatus();
    interval = setInterval(fetchStatus, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  if (!job) return <div className="text-center p-4 font-mono text-xs animate-pulse">ESTABLISHING CONNECTION...</div>;

  const currentStepIndex = STEPS.indexOf(job.status as JobStatus);
  const progress = Math.max(5, ((currentStepIndex + 1) / (STEPS.length - 1)) * 100);

  return (
    <div className="space-y-8 bg-black p-8 border border-white/20 mt-6 animate-fade-in">
      <h2 className="text-sm font-bold tracking-widest uppercase mb-4">Status Log // {jobId.slice(0, 8)}</h2>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-900 h-2">
        <div 
          className="bg-white h-full transition-all duration-300 ease-linear"
          style={{ width: `${job.status === 'completed' ? 100 : progress}%` }}
        />
      </div>

      <div className="flex justify-between text-xs font-mono uppercase tracking-wider text-gray-400">
        <span className="text-white">{LABELS[job.status as JobStatus] || job.status}</span>
        <span>{job.status === 'completed' ? '100%' : `${Math.round(progress)}%`}</span>
      </div>

      {/* Logs */}
      <div className="bg-black p-4 h-48 overflow-y-auto font-mono text-xs text-gray-300 border border-gray-800 leading-relaxed">
        {job.logs.map((log, i) => (
          <div key={i} className="mb-1">
            <span className="text-gray-600 mr-2">[{String(i).padStart(2, '0')}]</span>
            {log}
          </div>
        ))}
        {job.status === 'pending' && <div className="animate-pulse">_</div>}
      </div>

      {/* Storyboard Approval Mode */}
      {job.status === 'waiting_for_approval' && job.storyboard && (
        <div className="mt-8 border-t border-white/20 pt-8">
            <StoryboardReview 
                jobId={job.id} 
                scenes={job.storyboard} 
                onApprove={() => setJob({ ...job, status: 'generating_video' })} // Optimistic update
                onRegenerateScene={(sceneId) => console.log('Regenerate', sceneId)}
            />
        </div>
      )}

      {/* Result */}
      {job.status === 'completed' && job.result?.videoUrl && (
        <div className="mt-8 space-y-4 animate-fade-in">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white border-b border-white/20 pb-2">Output Generated</h3>
          <video 
            src={job.result.videoUrl} 
            controls 
            className="w-full border border-gray-800 aspect-[9/16] max-w-sm mx-auto"
            autoPlay
            loop
          />
          <div className="flex justify-center pt-4">
            <a 
              href={job.result.videoUrl} 
              download 
              className="bg-white text-black hover:bg-gray-200 px-8 py-3 text-sm font-bold uppercase tracking-widest transition-colors"
            >
              Download Asset
            </a>
          </div>
        </div>
      )}

      {job.status === 'failed' && (
        <div className="text-red-500 border border-red-900/50 p-4 font-mono text-xs uppercase">
          CRITICAL ERROR: {job.error}
        </div>
      )}
    </div>
  );
}
