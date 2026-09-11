export interface StagedFile {
  /** Stable identity for upload callbacks and chip keys across removals. */
  id: string;
  file: File;
  /** S3 objectKey — set after the S3 PUT upload completes. */
  objectKey?: string;
  /** Local object URL for image preview while uploading. Must be revoked on cleanup. */
  previewObjectUrl?: string;
  uploading: boolean;
  error?: string;
}

let stagedFileIdCounter = 0;

/** Test-only: reset the id counter between cases. */
export function resetStagedFileIdCounterForTests(): void {
  stagedFileIdCounter = 0;
}

export function createStagedEntries(files: File[]): StagedFile[] {
  return files.map((file) => ({
    id: `staged-${++stagedFileIdCounter}`,
    file,
    uploading: true,
    previewObjectUrl: file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined,
  }));
}

export function markStagedUploadSucceeded(
  staged: StagedFile[],
  id: string,
  objectKey: string,
): StagedFile[] {
  return staged.map((sf) =>
    sf.id === id ? { ...sf, uploading: false, objectKey } : sf,
  );
}

export function markStagedUploadFailed(
  staged: StagedFile[],
  id: string,
  error = "Upload failed",
): StagedFile[] {
  return staged.map((sf) =>
    sf.id === id ? { ...sf, uploading: false, error } : sf,
  );
}

export function removeStagedFile(
  staged: StagedFile[],
  id: string,
): StagedFile[] {
  const removed = staged.find((sf) => sf.id === id);
  if (removed?.previewObjectUrl) {
    URL.revokeObjectURL(removed.previewObjectUrl);
  }
  return staged.filter((sf) => sf.id !== id);
}
