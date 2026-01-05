import { NextRequest, NextResponse } from 'next/server';
import { jobStore } from '@/lib/services/jobStore';
import { startWorkflow } from '@/lib/services/workflow';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const job = await jobStore.getJob(id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status !== 'waiting_for_video_approval') {
      return NextResponse.json({ error: 'Job is not waiting for video approval' }, { status: 400 });
    }

    // Resume workflow
    await jobStore.updateJob(id, { status: 'generating_audio' });
    await jobStore.addLog(id, { key: 'log.videosApprovedStartingAudio', ts: Date.now() });
    
    // Trigger Phase 3
    startWorkflow(id, 'generating_audio').catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error approving videos:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
