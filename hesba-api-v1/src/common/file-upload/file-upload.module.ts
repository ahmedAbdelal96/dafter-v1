/**
 * File Upload Module
 * موديول الرفع المركزي
 *
 * يوفر:
 * - FileUploadService: خدمة الرفع المركزية
 * - Multer Configurations: إعدادات الرفع المختلفة
 * - استخدام سهل في أي موديول آخر
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileUploadService } from './file-upload.service';

@Module({
  imports: [ConfigModule],
  providers: [FileUploadService],
  exports: [FileUploadService],
})
export class FileUploadModule {}
