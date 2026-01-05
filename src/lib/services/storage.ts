import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';

export interface StorageService {
  uploadFile(file: Buffer | Blob | string, fileName: string, contentType: string): Promise<string>;
  downloadFile(url: string): Promise<Buffer>;
  getSignedUrl(fileName: string): Promise<string>;
}

// Environment variables
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET || 'hera-assets';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY;
// Optional: Custom endpoint for things like MinIO or R2
const S3_ENDPOINT = process.env.S3_ENDPOINT; 

class S3StorageServiceImpl implements StorageService {
  private client: S3Client;

  constructor() {
    if (!S3_ACCESS_KEY || !S3_SECRET_KEY) {
      console.warn('S3 credentials not found. S3StorageService will fail if used.');
    }
    
    this.client = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT,
      credentials: S3_ACCESS_KEY && S3_SECRET_KEY ? {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY
      } : undefined
    });
  }

  async uploadFile(file: Buffer | Blob | string, fileName: string, contentType: string): Promise<string> {
    try {
      // Handle different input types
      let body: any = file;
      if (typeof file === 'string') {
        // Assume path or base64? 
        // For this implementation, let's assume Buffer if passed from Node
        // or Blob if passed from client (though this runs server side)
        body = Buffer.from(file); 
      }

      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: S3_BUCKET,
          Key: fileName,
          Body: body,
          ContentType: contentType,
          ACL: 'public-read', // Caution: Depending on bucket settings
        },
      });

      await upload.done();
      
      // Return public URL (assuming standard S3 hosting or CloudFront)
      // If bucket is private, we should return a signed URL or proxy it.
      // For MVP, we'll construct the URL.
      if (S3_ENDPOINT) {
         return `${S3_ENDPOINT}/${S3_BUCKET}/${fileName}`;
      }
      return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${fileName}`;
    } catch (error) {
      console.error('S3 Upload Error:', error);
      throw error;
    }
  }

  async downloadFile(url: string): Promise<Buffer> {
    // If it's a remote URL not in our bucket, just fetch it
    if (url.startsWith('http')) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}`);
        return Buffer.from(await res.arrayBuffer());
    }
    
    // If it's a key in our bucket
    try {
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: url,
        });
        const response = await this.client.send(command);
        // stream to buffer
        const stream = response.Body as Readable;
        return new Promise((resolve, reject) => {
            const chunks: any[] = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
    } catch (error) {
        console.error('S3 Download Error:', error);
        throw error;
    }
  }

  async getSignedUrl(fileName: string): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: fileName,
    });
    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }
}

class MockStorageService implements StorageService {
  async uploadFile(file: Buffer | Blob, fileName: string, contentType: string): Promise<string> {
    console.log(`[MockStorage] Uploading ${fileName} (${contentType})`);
    return `https://mock-storage.com/${fileName}`;
  }

  async downloadFile(url: string): Promise<Buffer> {
    console.log(`[MockStorage] Downloading from ${url}`);
    // Return a valid empty buffer or dummy data to prevent crashes
    return Buffer.from('mock-data'); 
  }
  
  async getSignedUrl(fileName: string): Promise<string> {
      return `https://mock-storage.com/${fileName}?token=123`;
  }
}

// Switch based on env
export const storageService = (process.env.S3_ACCESS_KEY_ID) 
    ? new S3StorageServiceImpl() 
    : new MockStorageService();
