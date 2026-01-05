import { NextRequest, NextResponse } from 'next/server';
import { jobStore } from '@/lib/services/jobStore';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await jobStore.getJob(id);

  if (!job) {
    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ job });
}
