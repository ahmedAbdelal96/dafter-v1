/**
 * File Upload Module - Public API
 * نقطة الوصول الرئيسية للموديول
 */

export { FileUploadService } from './file-upload.service';
export { FileUploadModule } from './file-upload.module';
export type {
  UploadOptions,
  UploadedFile,
  FileValidationResult,
  FileUploadConfig,
  FileUploadResult,
  FileDeleteResult,
  StoredFileMetadata,
} from './file-upload.interface';
export {
  createMulterStorage,
  singleFileUploadOptions,
  multipleFileUploadOptions,
  documentUploadOptions,
  imageUploadOptions,
} from './multer.config';
