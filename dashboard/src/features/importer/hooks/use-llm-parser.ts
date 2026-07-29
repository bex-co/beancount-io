/**
 * Hook for LLM-based file parsing
 *
 * Updated to use temporary asset upload for better performance and reliability
 * Supports any file format - backend determines media type from uploaded asset
 */

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import { ParseFileDocument } from "@/graphql/definitions";
import type { FileFormat, CSVParseResult } from "../types";
import { useTempAssetUpload } from "./use-temp-asset-upload";

export function useLLMParser() {
  const [parseFileMutation] = useMutation(ParseFileDocument);
  const { uploadFile } = useTempAssetUpload();

  const parseFile = useCallback(
    async (file: File, format: FileFormat): Promise<CSVParseResult> => {
      // Step 1: Upload file as temporary asset (best practice for GraphQL file uploads)
      // Backend will retrieve media type from temporary asset metadata
      const { objectKey } = await uploadFile(file);

      // Step 2: Call GraphQL mutation with temporary asset object key
      // NOTE: LLM parsing can take 10-30 seconds for complex files (PDFs, images)
      // Set generous timeout to prevent premature failures
      const result = await parseFileMutation({
        variables: {
          s3ObjectKey: objectKey,
          fileFormat: format, // Pass format directly as string
        },
        context: {
          fetchOptions: {
            signal: AbortSignal.timeout(30000), // 30 second timeout for LLM parsing
          },
        },
      });

      // Apollo Client will throw if there's a GraphQL error, so we can safely access data
      const graphqlRows = result.data?.parseFile?.rows;
      if (!graphqlRows) {
        throw new Error("No result returned from LLM parsing");
      }

      // Convert GraphQL response to CSVParseResult format
      // LLM returns clean data, so all rows are valid (no errors)
      const rows = graphqlRows.map((row) => ({
        date: row.date,
        payee: row.payee,
        description: row.description,
        amount: row.amount,
        errors: undefined, // LLM parser doesn't return errors
      }));

      return {
        rows,
        validCount: rows.length,
        errorCount: 0,
        hasErrors: false,
      };
    },
    [uploadFile, parseFileMutation],
  );

  return { parseFile };
}
