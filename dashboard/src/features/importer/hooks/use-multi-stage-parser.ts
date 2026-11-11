/**
 * Multi-stage parser hook
 * Tries client-side CSV parsing first. Other formats go to the server's AI
 * parser; a CSV the client cannot read is offered to it only on request,
 * because AI parsing spends the account's AI tokens.
 */

import { useState, useCallback, useRef } from "react";
import { useCSVParser } from "./use-csv-parser";
import { useLLMParser } from "./use-llm-parser";
import { detectFileFormat } from "../utils/file-format-detector";
import { CsvEmptyError, CsvEncodingError } from "../utils/decode-csv-bytes";
import type { CSVParseResult, ParseStage, FileFormat } from "../types";

export function useMultiStageParser() {
  const [stage, setStage] = useState<ParseStage>("idle");
  const [error, setError] = useState<unknown>(null);
  const [fileFormat, setFileFormat] = useState<FileFormat | null>(null);

  const csvParser = useCSVParser();
  const llmParser = useLLMParser();

  // The CSV awaiting the user's choice to parse it with AI.
  const offeredFile = useRef<File | null>(null);

  const parseWithLlm = useCallback(
    async (file: File, format: FileFormat): Promise<CSVParseResult> => {
      setStage("server-parsing");
      try {
        const result = await llmParser.parseFile(file, format);
        setStage("complete");
        return result;
      } catch (err) {
        setError(err);
        setStage("error");
        throw err;
      }
    },
    [llmParser],
  );

  /**
   * Parse a file; `null` means a CSV the client could not read is waiting on
   * `parseWithAi` (or a different file).
   */
  const parseFile = useCallback(
    async (file: File): Promise<CSVParseResult | null> => {
      setError(null);
      setStage("detecting");

      // Detect file format
      const format = detectFileFormat(file);
      setFileFormat(format);

      if (format !== "csv") return parseWithLlm(file, format);

      setStage("client-parsing");
      try {
        const result = await csvParser.parseFile(file);

        // Keep CSV rows for repair even if validCount is 0 when the parser
        // read their columns (w4/961) or an amount failed the
        // representability guard, which AI parsing would re-stringify.
        if (result.validCount > 0 || result.blockLlmFallback) {
          setStage("complete");
          return result;
        }
      } catch (err) {
        // Bytes in another encoding are not the AI's to guess either: the
        // user re-saves the file as UTF-8 (w4/278). An empty file has
        // nothing for it to read; the user exports it again (w2/128).
        if (err instanceof CsvEncodingError || err instanceof CsvEmptyError) {
          setError(err);
          setStage("error");
          throw err;
        }
        console.warn("Client-side CSV parsing failed", err);
      }
      // Never spend AI tokens on a CSV without asking (w3/643).
      offeredFile.current = file;
      setStage("ai-offer");
      return null;
    },
    [csvParser, parseWithLlm],
  );

  /** The user chose to parse the offered CSV with AI. */
  const parseWithAi = useCallback(async (): Promise<CSVParseResult | null> => {
    const file = offeredFile.current;
    if (!file) return null;
    offeredFile.current = null;
    return parseWithLlm(file, "csv");
  }, [parseWithLlm]);

  const reset = useCallback(() => {
    offeredFile.current = null;
    setStage("idle");
    setError(null);
    setFileFormat(null);
  }, []);

  return {
    parseFile,
    parseWithAi,
    reset,
    stage,
    error,
    fileFormat,
    isLoading: ["detecting", "client-parsing", "server-parsing"].includes(
      stage,
    ),
  };
}
