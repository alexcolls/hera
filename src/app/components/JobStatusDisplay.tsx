'use client';

import { useEffect, useRef, useState } from 'react';
import { Job, JobLog, JobLogEntry, JobStatus } from '@/lib/types/job';
import StoryboardReview from './StoryboardReview';
import VideoReview from './VideoReview';
import { useI18n } from '@/lib/providers/i18n-provider';

const STEPS: JobStatus[] = [
  'pending',
  'analyzing',
  'generating_storyboard',
  'waiting_for_storyboard_approval',
  'generating_video',
  'waiting_for_video_approval',
  'generating_audio',
  'stitching',
  'completed'
];

const LABELS: Record<JobStatus, string> = {
  pending: 'statusLabel.pending',
  analyzing: 'statusLabel.analyzing',
  generating_storyboard: 'statusLabel.generating_storyboard',
  waiting_for_storyboard_approval: 'statusLabel.waiting_for_storyboard_approval',
  generating_video: 'statusLabel.generating_video',
  waiting_for_video_approval: 'statusLabel.waiting_for_video_approval',
  generating_audio: 'statusLabel.generating_audio',
  stitching: 'statusLabel.stitching',
  completed: 'statusLabel.completed',
  failed: 'statusLabel.failed',
};

export default function JobStatusDisplay({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null>(null);
  const [stickLogsToBottom, setStickLogsToBottom] = useState(true);
  const logsContainerRef = useRef<HTMLDivElement | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data.job);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  useEffect(() => {
    if (!job) return;
    if (!stickLogsToBottom) return;
    const el = logsContainerRef.current;
    if (!el) return;

    // Wait for DOM paint so scrollHeight includes the new log.
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [job?.logs.length, job?.status, stickLogsToBottom, job]);

  if (!job) return <div className="text-center p-4 font-mono text-xs animate-pulse">{t('status.establishingConnection')}</div>;

  const currentStepIndex = STEPS.indexOf(job.status as JobStatus);
  const progress = Math.max(5, ((currentStepIndex + 1) / (STEPS.length - 1)) * 100);

  return (
    <div className="space-y-8 bg-background p-8 border border-gray-200 dark:border-gray-800 mt-6 animate-fade-in">
      <h2 className="text-sm font-bold tracking-widest uppercase mb-4">
        {t('status.statusLog', { id: jobId.slice(0, 8) })}
      </h2>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-900 h-2">
        <div 
          className="bg-foreground h-full transition-all duration-300 ease-linear"
          style={{ width: `${job.status === 'completed' ? 100 : progress}%` }}
        />
      </div>

      <div className="flex justify-between text-xs font-mono uppercase tracking-wider text-gray-500">
        <span className="text-foreground">
          {t(LABELS[job.status as JobStatus] || (job.status as string))}
        </span>
        <span>{job.status === 'completed' ? '100%' : `${Math.round(progress)}%`}</span>
      </div>

      {/* Logs */}
      <div
        ref={logsContainerRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
          setStickLogsToBottom(distanceFromBottom < 48);
        }}
        className="bg-gray-50 dark:bg-black p-4 h-48 overflow-y-auto font-mono text-xs text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-800 leading-relaxed"
      >
        {job.logs.map((log: JobLog, i) => (
          <div key={i} className="mb-1">
            <span className="text-gray-400 dark:text-gray-600 mr-2">[{String(i).padStart(2, '0')}]</span>
            {typeof log === 'string'
              ? log
              : t((log as JobLogEntry).key, (log as JobLogEntry).vars)}
          </div>
        ))}
        {job.status === 'pending' && <div className="animate-pulse">_</div>}
      </div>

      {/* Storyboard Approval Mode */}
      {(job.status === 'waiting_for_storyboard_approval' || (job.status === 'generating_storyboard' && job.storyboard && job.storyboard.length > 0)) && (
        <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-8">
            <StoryboardReview 
                jobId={job.id} 
                scenes={job.storyboard ?? []} 
                onApprove={() => setJob({ ...job, status: 'generating_video' })} // Optimistic update
                onRegenerateScene={(sceneId) => console.log('Regenerate', sceneId)}
                isGenerating={job.status === 'generating_storyboard'}
            />
        </div>
      )}

      {/* Video Approval Mode */}
      {(job.status === 'waiting_for_video_approval' || (job.status === 'generating_video' && job.storyboard && job.storyboard.length > 0)) && job.storyboard && (
        <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-8">
            <VideoReview
                jobId={job.id}
                scenes={job.storyboard}
                onApprove={() => setJob({ ...job, status: 'generating_audio' })} // Optimistic update
                isGenerating={job.status === 'generating_video'}
            />
        </div>
      )}

      {/* Result */}
      {job.status === 'completed' && job.result?.videoUrl && (
        <div className="mt-8 space-y-4 animate-fade-in">
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground border-b border-gray-200 dark:border-gray-800 pb-2">
            {t('status.outputGenerated')}
          </h3>
          <video 
            src={job.result.videoUrl} 
            controls 
            className="w-full border border-gray-300 dark:border-gray-800 aspect-9/16 max-w-sm mx-auto"
            autoPlay
            loop
          />
          <div className="flex justify-center pt-4">
            <a 
              href={job.result.videoUrl} 
              download 
              className="bg-foreground text-background hover:opacity-90 px-8 py-3 text-sm font-bold uppercase tracking-widest transition-colors"
            >
              {t('status.downloadAsset')}
            </a>
          </div>
        </div>
      )}

      {job.status === 'failed' && (
        <div className="text-red-500 border border-red-900/50 p-4 font-mono text-xs uppercase">
          {t('status.failed', { error: job.error || '' })}
        </div>
      )}
    </div>
  );
}
