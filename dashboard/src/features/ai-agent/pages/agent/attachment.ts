export interface StagedFile {
  file: File;
  /** S3 objectKey — set after the S3 PUT upload completes. */
  objectKey?: string;
  /** Local object URL for image preview while uploading. Must be revoked on cleanup. */
  previewObjectUrl?: string;
  uploading: boolean;
  error?: string;
}
