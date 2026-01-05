import { NextRequest, NextResponse } from 'next/server';
import { CreateJobRequest, Job } from '@/lib/types/job';
import { jobStore } from '@/lib/services/jobStore';
import { v4 as uuidv4 } from 'uuid';
import { startWorkflow } from '@/lib/services/workflow';

export async function POST(req: NextRequest) {
  try {
    const body: CreateJobRequest = await req.json();
    
    // Basic validation
    if (!body.imageUrl || !body.style) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, style' },
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

    await jobStore.createJob(newJob);

    // Trigger the workflow asynchronously
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
