/**
 * Multi-stage parser hook
 * Tries client-side CSV parsing first, falls back to LLM for complex formats
 */

import { useState, useCallback } from "react";
import { useCSVParser } from "./use-csv-parser";
import { useLLMParser } from "./use-llm-parser";
import { detectFileFormat } from "../utils/file-format-detector";
import type { CSVParseResult, ParseStage, FileFormat } from "../types";

export function useMultiStageParser() {
  const [stage, setStage] = useState<ParseStage>("idle");
  const [error, setError] = useState<unknown>(null);
  const [fileFormat, setFileFormat] = useState<FileFormat | null>(null);

  const csvParser = useCSVParser();
  const llmParser = useLLMParser();

  const parseFile = useCallback(
    async (file: File): Promise<CSVParseResult> => {
      setError(null);
      setStage("detecting");

      // Detect file format
      const format = detectFileFormat(file);
      setFileFormat(format);

      // Stage 1: Try client-side parsing for CSV
      if (format === "csv") {
        setStage("client-parsing");
        try {
          const result = await csvParser.parseFile(file);

          // Check if parsing was successful (has valid rows)
          if (result.validCount > 0) {
            setStage("complete");
            return result;
          }

          // If no valid rows, fall through to server-side parsing
          console.warn(
            "Client-side CSV parsing found no valid rows, trying LLM...",
          );
        } catch (err) {
          console.warn("Client-side CSV parsing failed, trying LLM...", err);
        }
      }

      // Stage 2: Server-side LLM parsing
      // (for non-CSV files, CSV parse failures, or no valid rows)
      setStage("server-parsing");
      try {
        const result = await llmParser.parseFile(file, format);
        setStage("complete");
        return result;
      } catch (err) {
        // Stage 3: LLM parsing failed - show error
        setError(err);
        setStage("error");
        throw err;
      }
    },
    [csvParser, llmParser],
  );

  const reset = useCallback(() => {
    setStage("idle");
    setError(null);
    setFileFormat(null);
  }, []);

  return {
    parseFile,
    reset,
    stage,
    error,
    fileFormat,
    isLoading: ["detecting", "client-parsing", "server-parsing"].includes(
      stage,
    ),
  };
}
