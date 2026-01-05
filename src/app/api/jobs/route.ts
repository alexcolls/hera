import { NextRequest, NextResponse } from 'next/server';
import { CreateJobRequest, Job } from '@/lib/types/job';
import { jobStore } from '@/lib/services/jobStore';
import { v4 as uuidv4 } from 'uuid';
import { startWorkflow } from '@/lib/services/workflow';

export async function POST(req: NextRequest) {
  try {
    const body: CreateJobRequest = await req.json();
    
    // Basic validation
    if (!body.imageUrl || !body.style || !body.hookText) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, style, hookText' },
        { status: 400 }
      );
    }

    const jobId = uuidv4();
    const newJob: Job = {
      id: jobId,
      status: 'pending',
      createdAt: Date.now(),
      input: body,
      logs: ['Job created'],
    };

    jobStore.createJob(newJob);

    // Trigger the workflow asynchronously
    // Note: In Vercel serverless environment, you should use Inngest, Trigger.dev, or a separate worker.
    // For this MVP setup running locally or on a long-running server (like Railway), this works.
    // If deploying to Vercel, this promise might be killed if not awaited, 
    // but we can't await it or the request times out.
    // We will implement the "fire and forget" pattern here for the MVP architecture 
    // assuming a capable host or knowing the limitations.
    startWorkflow(jobId).catch(console.error);

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
