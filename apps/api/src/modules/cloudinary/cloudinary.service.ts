import { Injectable, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

export interface UploadedImage {
  url: string;
  publicId: string;
}

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private configured = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');

    if (!cloudName || !apiKey || !apiSecret) {
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    this.configured = true;
  }

  async uploadImage(file: Express.Multer.File, folder = 'group-buy/products'): Promise<UploadedImage> {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Image upload is not configured. Set CLOUDINARY_* environment variables.',
      );
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }
          resolve(uploadResult);
        },
      );
      uploadStream.end(file.buffer);
    });

    return { url: result.secure_url, publicId: result.public_id };
  }

  async deleteImage(publicId: string): Promise<void> {
    if (!this.configured) return;
    await cloudinary.uploader.destroy(publicId);
  }
}
