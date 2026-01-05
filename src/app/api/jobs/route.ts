import { NextRequest, NextResponse } from 'next/server';
import { Job } from '@/lib/types/job';
import { jobStore } from '@/lib/services/jobStore';
import { v4 as uuidv4 } from 'uuid';
import { startWorkflow } from '@/lib/services/workflow';
import { storageService } from '@/lib/services/storage';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const imageFile = formData.get('imageFile') as File | null;
    const style = formData.get('style') as string;
    const hookText = formData.get('hookText') as string; // Will be empty string or null if not provided

    // Basic validation
    if (!imageFile || !style) {
      return NextResponse.json(
        { error: 'Missing required fields: imageFile, style' },
        { status: 400 }
      );
    }

    // Upload the file
    // For MVP with MockStorage, this works. 
    // For real S3, we would convert File to Buffer or stream it.
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const imageUrl = await storageService.uploadFile(buffer, `upload_${uuidv4()}_${imageFile.name}`, imageFile.type);

    const jobId = uuidv4();
    const newJob: Job = {
      id: jobId,
      status: 'pending',
      createdAt: Date.now(),
      input: {
        imageUrl,
        style,
        hookText: hookText || undefined
      },
      logs: ['Job created', 'Image uploaded successfully'],
    };

    jobStore.createJob(newJob);

    // Trigger the workflow asynchronously
    startWorkflow(jobId).catch(console.error);

    return NextResponse.json({ jobId });
  } catch (error: any) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
