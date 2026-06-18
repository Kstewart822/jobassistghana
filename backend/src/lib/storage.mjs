/**
 * Cloud storage abstraction layer
 * Supports local storage and AWS S3
 */
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import AWS from 'aws-sdk';
import { config } from '../config/environment.mjs';
import logger from '../utils/logger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Base storage interface
 */
class StorageProvider {
  async upload(file, destination) {
    throw new Error('upload() must be implemented');
  }

  async download(fileKey) {
    throw new Error('download() must be implemented');
  }

  async delete(fileKey) {
    throw new Error('delete() must be implemented');
  }

  async getUrl(fileKey) {
    throw new Error('getUrl() must be implemented');
  }
}

/**
 * Local file storage provider
 */
class LocalStorageProvider extends StorageProvider {
  constructor(uploadDir = './storage/uploads') {
    super();
    this.uploadDir = uploadDir;
  }

  async upload(file, destination = '') {
    try {
      const dir = path.join(this.uploadDir, destination);
      await fs.mkdir(dir, { recursive: true });

      const filename = `${Date.now()}-${file.originalname}`;
      const filepath = path.join(dir, filename);

      await fs.writeFile(filepath, file.buffer);

      logger.info('File uploaded locally', {
        filename,
        size: file.size,
      });

      return {
        key: path.join(destination, filename),
        url: `/uploads/${destination}/${filename}`,
        filename,
        size: file.size,
      };
    } catch (error) {
      logger.error('Local file upload failed', { error: error.message });
      throw error;
    }
  }

  async download(fileKey) {
    try {
      const filepath = path.join(this.uploadDir, fileKey);
      return await fs.readFile(filepath);
    } catch (error) {
      logger.error('Local file download failed', { error: error.message });
      throw error;
    }
  }

  async delete(fileKey) {
    try {
      const filepath = path.join(this.uploadDir, fileKey);
      await fs.unlink(filepath);
      logger.info('File deleted locally', { fileKey });
    } catch (error) {
      logger.error('Local file deletion failed', { error: error.message });
      throw error;
    }
  }

  async getUrl(fileKey) {
    return `/uploads/${fileKey}`;
  }
}

/**
 * AWS S3 storage provider
 */
class S3StorageProvider extends StorageProvider {
  constructor() {
    super();
    this.s3 = new AWS.S3({
      region: config.cloud.aws.region,
      accessKeyId: config.cloud.aws.accessKeyId,
      secretAccessKey: config.cloud.aws.secretAccessKey,
    });
    this.bucket = config.cloud.aws.bucket;
  }

  async upload(file, destination = '') {
    try {
      const key = `${destination}/${Date.now()}-${file.originalname}`;

      await this.s3.putObject({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      }).promise();

      const url = await this.getUrl(key);

      logger.info('File uploaded to S3', {
        key,
        size: file.size,
      });

      return {
        key,
        url,
        filename: file.originalname,
        size: file.size,
      };
    } catch (error) {
      logger.error('S3 file upload failed', { error: error.message });
      throw error;
    }
  }

  async download(fileKey) {
    try {
      const result = await this.s3.getObject({
        Bucket: this.bucket,
        Key: fileKey,
      }).promise();

      return result.Body;
    } catch (error) {
      logger.error('S3 file download failed', { error: error.message });
      throw error;
    }
  }

  async delete(fileKey) {
    try {
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: fileKey,
      }).promise();

      logger.info('File deleted from S3', { fileKey });
    } catch (error) {
      logger.error('S3 file deletion failed', { error: error.message });
      throw error;
    }
  }

  async getUrl(fileKey) {
    return `https://${this.bucket}.s3.${config.cloud.aws.region}.amazonaws.com/${fileKey}`;
  }
}

/**
 * Storage factory
 */
export function createStorageProvider() {
  if (config.cloud.provider === 's3') {
    return new S3StorageProvider();
  }
  return new LocalStorageProvider(config.uploads.uploadDir);
}

// Export singleton instance
export const storage = createStorageProvider();

export default { StorageProvider, LocalStorageProvider, S3StorageProvider, storage };
