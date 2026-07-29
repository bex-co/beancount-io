import { useState } from "react";
import { FileUpload } from "./file-upload";
import { ParsingProgress } from "./parsing-progress";
import { ParseErrorDisplay } from "./parse-error-display";
import { useMultiStageParser } from "../../../hooks/use-multi-stage-parser";
import type { CSVParseResult } from "../../../types";

type UploadStepProps = {
  onParseComplete: (result: CSVParseResult) => void;
};

/**
 * Upload step that handles file selection, parsing progress, and parse errors
 * All upload-related states and parsing logic are self-contained within this component
 */
export function UploadStep({ onParseComplete }: UploadStepProps) {
  const parser = useMultiStageParser();
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  const handleFileSelected = async (file: File) => {
    setSelectedFileName(file.name);
    try {
      const result = await parser.parseFile(file);
      onParseComplete(result);
    } catch (err) {
      console.error("File parsing failed:", err);
      // Error is already set in the hook
    }
  };

  const handleReset = () => {
    setSelectedFileName("");
    parser.reset();
  };

  // Show parsing progress
  if (parser.isLoading) {
    return <ParsingProgress stage={parser.stage} fileName={selectedFileName} />;
  }

  // Show parse error
  if (parser.stage === "error" && parser.error && parser.fileFormat) {
    return (
      <ParseErrorDisplay
        error={parser.error}
        fileFormat={parser.fileFormat}
        onReset={handleReset}
      />
    );
  }

  // Show file upload
  return <FileUpload onFileSelected={handleFileSelected} />;
}
