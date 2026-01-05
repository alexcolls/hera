'use client';

import { useEffect, useState } from 'react';
import { Job, JobStatus } from '@/lib/types/job';

const STEPS: JobStatus[] = [
  'pending',
  'analyzing',
  'generating_scenes',
  'composing_music',
  'stitching',
  'completed'
];

const LABELS: Record<JobStatus, string> = {
  pending: 'Queueing...',
  analyzing: 'Analyzing Image...',
  generating_scenes: 'Generating 6 Viral Scenes...',
  composing_music: 'Composing Unique Soundtrack...',
  stitching: 'Assembling Final Edit...',
  completed: 'Done!',
  failed: 'Failed',
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

  if (!job) return <div className="text-center p-4">Loading job status...</div>;

  const currentStepIndex = STEPS.indexOf(job.status as JobStatus);
  const progress = Math.max(5, ((currentStepIndex + 1) / (STEPS.length - 1)) * 100);

  return (
    <div className="space-y-6 bg-gray-900 p-6 rounded-lg border border-gray-800 mt-6">
      <h2 className="text-xl font-bold">Generation Status</h2>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
        <div 
          className="bg-blue-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${job.status === 'completed' ? 100 : progress}%` }}
        />
      </div>

      <div className="flex justify-between text-sm text-gray-400">
        <span>{LABELS[job.status as JobStatus] || job.status}</span>
        <span>{job.status === 'completed' ? '100%' : `${Math.round(progress)}%`}</span>
      </div>

      {/* Logs */}
      <div className="bg-black/50 p-4 rounded h-48 overflow-y-auto font-mono text-xs text-green-400 border border-gray-800">
        {job.logs.map((log, i) => (
          <div key={i}>&gt; {log}</div>
        ))}
      </div>

      {/* Result */}
      {job.status === 'completed' && job.result?.videoUrl && (
        <div className="mt-4 animate-fade-in">
          <h3 className="text-lg font-bold mb-2 text-green-400">Video Ready!</h3>
          <video 
            src={job.result.videoUrl} 
            controls 
            className="w-full rounded border border-gray-700 aspect-[9/16] max-w-sm mx-auto"
            autoPlay
            loop
          />
          <div className="mt-4 flex gap-2 justify-center">
            <a 
              href={job.result.videoUrl} 
              download 
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold"
            >
              Download Video
            </a>
          </div>
        </div>
      )}

      {job.status === 'failed' && (
        <div className="text-red-500 bg-red-900/20 p-4 rounded border border-red-900">
          Error: {job.error}
        </div>
      )}
    </div>
  );
}
