import { useCallback, useState } from "react";
import { Upload, FileText, AlertCircle, Download } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { cn } from "@/common/lib/utils/utils";
import { useTranslations } from "@/common/hooks/use-translations";
import { useCSVParser } from "../../../hooks/use-csv-parser";
import type { CSVParseResult } from "../../../types";

interface FileUploadProps {
  onParsed?: (result: CSVParseResult) => void;
  onFileSelected?: (file: File) => void;
}

const CSV_FORMAT_EXAMPLE = `Date,Payee,Description,Amount
2025-12-01,Starbucks,Coffee Shop Purchase,-4.50
2025-12-02,Walmart,Grocery Store,-45.67
2025-12-03,Employer Inc,Salary Deposit,2500.00`;

export function FileUpload({ onParsed, onFileSelected }: FileUploadProps) {
  const { t } = useTranslations();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { parseFile, isLoading, error } = useCSVParser();

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file size (10MB max for PDFs)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert(t("importer.upload.fileSizeError"));
        return;
      }

      // Validate file type (accept multiple formats)
      const allowedExtensions = ["csv", "pdf", "ofx", "qfx"];
      const extension = file.name.split(".").pop()?.toLowerCase();
      const isImage = file.type.startsWith("image/");
      if (!isImage && (!extension || !allowedExtensions.includes(extension))) {
        alert(t("importer.upload.unsupportedFormatError"));
        return;
      }

      setSelectedFile(file);

      // If onFileSelected is provided, use that instead of parsing
      if (onFileSelected) {
        onFileSelected(file);
        return;
      }

      // Otherwise, use the built-in CSV parser
      try {
        const result = await parseFile(file);
        if (onParsed) {
          onParsed(result);
        }
      } catch (err) {
        console.error("Failed to parse CSV:", err);
      }
    },
    [t, parseFile, onParsed, onFileSelected],
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
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  const handleButtonClick = useCallback(() => {
    document.getElementById("csv-upload")?.click();
  }, []);

  return (
    <>
      <div
        className={cn(
          "border border-dashed rounded-lg p-12 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border",
          isLoading
            ? "opacity-50 pointer-events-none"
            : "cursor-pointer hover:border-primary/50",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="csv-upload"
          className="hidden"
          accept=".csv,.pdf,.ofx,.qfx,text/csv,application/pdf,image/*"
          onChange={handleFileInput}
          disabled={isLoading}
        />

        <div className="cursor-pointer" onClick={handleButtonClick}>
          {isLoading ? (
            <div className="space-y-4">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground animate-pulse" />
              <p className="text-sm text-muted-foreground">
                {t("importer.upload.parsingFile")}
              </p>
            </div>
          ) : selectedFile ? (
            <div className="space-y-4">
              <FileText className="w-12 h-12 mx-auto text-primary" />
              <div>
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleButtonClick();
                }}
              >
                {t("importer.upload.chooseDifferentFile")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {t("importer.upload.dragAndDrop")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("importer.upload.supportedFormats")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleButtonClick();
                }}
              >
                {t("importer.upload.chooseFile")}
              </Button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-4 p-4 bg-muted rounded-lg text-sm">
        <div className="flex items-center mb-2 space-x-2">
          <p className="font-medium">{t("importer.upload.csvFormatExample")}</p>
          <a
            href="/lgasset/csv_transactions.csv"
            download="example_transactions.csv"
            className="text-xs hover:underline flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
          </a>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          {t("importer.upload.csvFormatHint")}
        </p>
        <pre className="text-xs bg-background p-2 rounded border">
          {CSV_FORMAT_EXAMPLE}
        </pre>
        <p className="text-xs text-muted-foreground mt-2">
          {t("importer.upload.aiProcessingHint")}
        </p>
      </div>
    </>
  );
}
