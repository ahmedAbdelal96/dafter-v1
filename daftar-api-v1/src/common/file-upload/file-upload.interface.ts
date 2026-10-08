/**
 * File Upload System - Interfaces
 * نظام الرفع - واجهات البرمجة
 */

export interface UploadOptions {
  /**
   * المجلد الفرعي (مثل: users/avatars, employees/documents)
   * Subdirectory path (e.g., users/avatars, employees/documents)
   */
  subFolder: string;

  /**
   * الحد الأقصى لحجم الملف بالـ bytes
   * Max file size in bytes
   */
  maxFileSize?: number; // Default: 10MB

  /**
   * الامتدادات المسموحة (بدون النقطة)
   * Allowed file extensions (without dot)
   */
  allowedExtensions?: string[];

  /**
   * نوع MIME المسموح
   * Allowed MIME types
   */
  allowedMimeTypes?: string[];

  /**
   * سياسة إعادة تسمية الملف
   * File naming policy
   */
  fileNamingStrategy?: 'original' | 'timestamp' | 'uuid';

  /**
   * هل يتم حفظ الملف الأصلي؟
   * Preserve original filename?
   */
  preserveOriginalName?: boolean;

  /**
   * مكان الحفظ (local أو cloud)
   * Storage location
   */
  storageType?: 'local' | 'aws-s3' | 'cloudinary';
}

export interface UploadedFile {
  /**
   * معرّف الملف الفريد
   * Unique file identifier
   */
  id: string;

  /**
   * اسم الملف الأصلي
   * Original filename
   */
  originalName: string;

  /**
   * اسم الملف المحفوظ
   * Stored filename
   */
  storedName: string;

  /**
   * نوع MIME للملف
   * File MIME type
   */
  mimeType: string;

  /**
   * حجم الملف بالـ bytes
   * File size in bytes
   */
  fileSize: number;

  /**
   * المسار النسبي للملف
   * File relative path
   */
  filePath: string;

  /**
   * رابط الملف الكامل
   * Full file URL
   */
  fileUrl: string;

  /**
   * تاريخ الرفع
   * Upload timestamp
   */
  uploadedAt: Date;

  /**
   * معرّف المستخدم الذي رفع الملف
   * Uploader user ID
   */
  uploadedBy: string;

  /**
   * البيانات الإضافية (hash، dimensions للصور، إلخ)
   * Metadata (hash, dimensions for images, etc)
   */
  metadata?: Record<string, any>;
}

export interface FileValidationResult {
  /**
   * هل الملف صحيح؟
   * Is file valid?
   */
  isValid: boolean;

  /**
   * رسالة الخطأ (إن وجدت)
   * Error message if any
   */
  error?: string;

  /**
   * نوع الخطأ
   * Error type
   */
  errorCode?:
    | 'FILE_TOO_LARGE'
    | 'INVALID_EXTENSION'
    | 'INVALID_MIME_TYPE'
    | 'INVALID_FILE';
}

export interface FileUploadConfig {
  /**
   * المسار الأساسي للرفع
   * Base upload directory
   */
  baseUploadDir: string;

  /**
   * رابط الـ base URL للملفات
   * Base URL for accessing files
   */
  baseFileUrl: string;

  /**
   * الحد الأقصى الافتراضي لحجم الملف (بالـ MB)
   * Default max file size (in MB)
   */
  defaultMaxFileSizeMB: number;

  /**
   * الامتدادات المسموحة افتراضياً
   * Default allowed extensions
   */
  defaultAllowedExtensions: string[];

  /**
   * نوع التخزين الافتراضي
   * Default storage type
   */
  defaultStorageType: 'local' | 'aws-s3' | 'cloudinary';

  /**
   * إعدادات AWS S3 (إذا كانت مفعّلة)
   * AWS S3 config
   */
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  };

  /**
   * إعدادات Cloudinary (إذا كانت مفعّلة)
   * Cloudinary config
   */
  cloudinary?: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
}

/**
 * نتيجة عملية الرفع
 * File upload operation result
 */
export interface FileUploadResult {
  success: boolean;
  file?: UploadedFile;
  error?: string;
  errorCode?: string;
}

/**
 * نتيجة حذف الملف
 * File deletion result
 */
export interface FileDeleteResult {
  success: boolean;
  message: string;
}

/**
 * معلومات الملف المخزنة في قاعدة البيانات
 * File metadata stored in database
 */
export interface StoredFileMetadata {
  id: string;
  entityType: string; // 'user', 'employee', 'document', etc
  entityId: string; // ID of the entity owning the file
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  fileUrl: string;
  category?: string; // 'avatar', 'document', 'certificate', etc
  uploadedBy: string;
  uploadedAt: Date;
  deletedAt?: Date;
  metadata?: Record<string, any>;
}
