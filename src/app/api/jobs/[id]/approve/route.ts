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

    if (job.status !== 'waiting_for_approval') {
      return NextResponse.json({ error: 'Job is not waiting for approval' }, { status: 400 });
    }

    // Resume workflow
    // We can call a specific function to resume, or just re-call startWorkflow 
    // and let it handle the state (since it's idempotent-ish or we add a resume flag).
    // Better: Add a resumeWorkflow function.
    
    // For now, let's update status and trigger the next step manually here or via workflow service
    await jobStore.updateJob(id, { status: 'generating_video' });
    await jobStore.addLog(id, 'Storyboard approved. Starting video generation...');
    
    // Trigger the rest of the workflow (Phase 3)
    // We need to export a resume function or split startWorkflow.
    // Let's refactor startWorkflow to handle resumption.
    startWorkflow(id, true).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error approving job:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
