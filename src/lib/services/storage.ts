import { supabaseAdmin } from '../supabase/admin';

export interface StorageService {
  uploadFile(file: Buffer | Blob, fileName: string, contentType: string): Promise<string>;
  downloadFile(url: string): Promise<Buffer>;
}

class SupabaseStorageService implements StorageService {
  private bucket = 'assets';

  async uploadFile(file: Buffer | Blob, fileName: string, contentType: string): Promise<string> {
    const { data, error } = await supabaseAdmin
      .storage
      .from(this.bucket)
      .upload(fileName, file, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const { data: publicData } = supabaseAdmin
      .storage
      .from(this.bucket)
      .getPublicUrl(fileName);

    return publicData.publicUrl;
  }

  async downloadFile(url: string): Promise<Buffer> {
    // If it's a Supabase URL, we can download it. 
    // If it's external (e.g. from Grok/Suno), we use fetch.
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download file from ${url}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

class MockStorageService implements StorageService {
  async uploadFile(file: Buffer | Blob, fileName: string, contentType: string): Promise<string> {
    console.log(`[MockStorage] Uploading ${fileName} (${contentType})`);
    return `https://mock-storage.com/${fileName}`;
  }

  async downloadFile(url: string): Promise<Buffer> {
    console.log(`[MockStorage] Downloading from ${url}`);
    return Buffer.from('mock-data');
  }
}

export const storageService = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new SupabaseStorageService()
  : new MockStorageService();
