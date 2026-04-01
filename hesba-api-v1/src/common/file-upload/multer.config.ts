/**
 * Multer Configuration
 * إعدادات Multer للرفع
 */

import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Storage configuration for local file uploads
 * إعدادات تخزين الملفات المحلية
 */
export const createMulterStorage = (uploadDir: string): MulterOptions => ({
  storage: diskStorage({
    /**
     * تحديد مجلد الوجهة
     * Set destination folder
     */
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },

    /**
     * تحديد اسم الملف
     * Set filename
     */
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const baseName = path.basename(file.originalname, ext);
      const sanitized = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = Date.now();
      const random = crypto.randomBytes(4).toString('hex');
      const filename = `${timestamp}-${random}-${sanitized}${ext}`;

      cb(null, filename);
    },
  }),

  /**
   * تصفية الملفات المسموحة
   * File filter
   */
  fileFilter: (req, file, cb) => {
    // تحديد أنواع الملفات المسموحة
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`نوع الملف غير مسموح: ${file.mimetype}`), false);
    }
  },

  /**
   * الحد الأقصى لحجم الملف (10MB)
   * Max file size
   */
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/**
 * Configuration for single file upload
 * إعدادات رفع ملف واحد
 */
export const singleFileUploadOptions: MulterOptions = {
  ...createMulterStorage(process.env.UPLOAD_DIR || 'uploads'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
};

/**
 * Configuration for multiple file uploads
 * إعدادات رفع ملفات متعددة
 */
export const multipleFileUploadOptions: MulterOptions = {
  ...createMulterStorage(process.env.UPLOAD_DIR || 'uploads'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5, // Max 5 files
  },
};

/**
 * Configuration for document uploads (PDF, Word, Excel)
 * إعدادات رفع المستندات
 */
export const documentUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, process.env.UPLOAD_DIR || 'uploads');
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const baseName = path.basename(file.originalname, ext);
      const sanitized = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = Date.now();
      const random = crypto.randomBytes(4).toString('hex');
      const filename = `${timestamp}-${random}-${sanitized}${ext}`;
      cb(null, filename);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`نوع المستند غير مسموح: ${file.mimetype}`), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for documents
  },
};

/**
 * Configuration for image uploads
 * إعدادات رفع الصور
 */
export const imageUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, process.env.UPLOAD_DIR || 'uploads');
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const timestamp = Date.now();
      const random = crypto.randomBytes(4).toString('hex');
      const filename = `${timestamp}-${random}${ext}`;
      cb(null, filename);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`نوع الصورة غير مسموح: ${file.mimetype}`), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for images
  },
};
