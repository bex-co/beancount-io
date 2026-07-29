import { useCallback, useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { useTranslations } from "@/common/hooks/use-translations";

interface ReceiptUploadZoneProps {
  onFileAccepted: (file: File) => void;
  isUploading: boolean;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp"];
const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/jpg,image/webp";

export function ReceiptUploadZone({
  onFileAccepted,
  isUploading,
}: ReceiptUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { t } = useTranslations();

  const validateAndSelect = useCallback(
    (file: File) => {
      setValidationError(null);

      if (file.size > MAX_BYTES) {
        setValidationError(t("receipt.upload.fileTooLarge"));
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
        setValidationError(t("receipt.upload.unsupportedType"));
        return;
      }

      setSelectedFile(file);
      onFileAccepted(file);
    },
    [onFileAccepted, t],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect],
  );

  const handleChooseFile = useCallback(() => {
    document.getElementById("receipt-file-input")?.click();
  }, []);

  return (
    <div className="space-y-4">
      <div
        className={`
          border border-dashed rounded-lg p-12 text-center transition-colors
          ${isDragging ? "border-primary bg-primary/5" : "border-border"}
          ${isUploading ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-primary/50"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="receipt-file-input"
          className="hidden"
          accept={ACCEPT}
          onChange={handleFileInput}
          disabled={isUploading}
        />

        <div className="cursor-pointer" onClick={handleChooseFile}>
          {isUploading ? (
            <div className="space-y-4">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground animate-pulse" />
              <p className="text-sm text-muted-foreground">
                {t("receipt.upload.uploading")}
              </p>
            </div>
          ) : selectedFile ? (
            <div className="space-y-4">
              <FileText className="w-12 h-12 mx-auto text-primary" />
              <div>
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleChooseFile();
                }}
              >
                {t("receipt.upload.chooseDifferentFile")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {t("receipt.upload.dragAndDrop")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("receipt.upload.supports")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleChooseFile();
                }}
              >
                {t("receipt.upload.chooseFile")}
              </Button>
            </div>
          )}
        </div>
      </div>

      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
