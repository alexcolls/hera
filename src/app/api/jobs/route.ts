import { NextRequest, NextResponse } from 'next/server';
import { Job } from '@/lib/types/job';
import { jobStore } from '@/lib/services/jobStore';
import { v4 as uuidv4 } from 'uuid';
import { startWorkflow } from '@/lib/services/workflow';
import { storageService } from '@/lib/services/storage';
import { AppLanguage } from '@/lib/i18n/i18n';
import { AudioType, JobGenre, WorkflowModelConfig } from '@/lib/types/job';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const imageFile = formData.get('imageFile') as File | null;
    const languageRaw = formData.get('language') as string | null;
    const language: AppLanguage = (languageRaw === 'en' || languageRaw === 'zh' || languageRaw === 'es') ? languageRaw : 'en';
    const style = formData.get('style') as string;
    const genreRaw = formData.get('genre');
    const audioTypeRaw = formData.get('audioType');
    const sceneCount = Number(formData.get('sceneCount') || 6);

    // Optional model overrides (advanced)
    const models: WorkflowModelConfig = {
      grokVisionModel: (formData.get('grokVisionModel') as string | null) || undefined,
      grokChatModel: (formData.get('grokChatModel') as string | null) || undefined,
      grokImageModel: (formData.get('grokImageModel') as string | null) || undefined,
      falImageModel: (formData.get('falImageModel') as string | null) || undefined,
      falVideoModel: (formData.get('falVideoModel') as string | null) || undefined,
      elevenlabsModelId: (formData.get('elevenlabsModelId') as string | null) || undefined,
      elevenlabsVoiceId: (formData.get('elevenlabsVoiceId') as string | null) || undefined,
      sunoModel: (formData.get('sunoModel') as string | null) || undefined,
    };

    const validGenres: readonly JobGenre[] = [
      'comedy',
      'tragedy',
      'thriller',
      'romance',
      'scifi',
      'fantasy',
      'mystery',
      'horror',
      'adventure',
      'historical',
    ] as const;
    const validAudioTypes: readonly AudioType[] = ['narrative', 'music'] as const;

    const genre =
      typeof genreRaw === 'string' && (validGenres as readonly string[]).includes(genreRaw)
        ? (genreRaw as JobGenre)
        : null;
    const audioType =
      typeof audioTypeRaw === 'string' && (validAudioTypes as readonly string[]).includes(audioTypeRaw)
        ? (audioTypeRaw as AudioType)
        : null;

    // Basic validation
    if (!imageFile || !style || !genre || !audioType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
        language,
        style,
        genre,
        audioType,
        sceneCount,
        models
      },
      logs: [
        { key: 'log.jobCreated', ts: Date.now() },
        { key: 'log.imageUploadedSuccessfully', ts: Date.now() }
      ],
    };

    await jobStore.createJob(newJob);

    // Trigger the workflow asynchronously
    startWorkflow(jobId).catch(console.error);

    return NextResponse.json({ jobId });
  } catch (error: unknown) {
    console.error('Error creating job:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
