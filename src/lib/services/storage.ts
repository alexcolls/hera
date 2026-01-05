export interface StorageService {
  uploadFile(file: Buffer | Blob, fileName: string, contentType: string): Promise<string>;
  downloadFile(url: string): Promise<Buffer>;
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

// In real implementation, we would export an instance of S3StorageService or VercelBlobService
export const storageService = new MockStorageService();
