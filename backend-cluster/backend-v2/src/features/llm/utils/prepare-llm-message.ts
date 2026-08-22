import { type ImagePart, type FilePart, type ModelMessage } from "ai";
import { classifyFile, resolveMediaType } from "./media-type-utils";
import { ServiceUnavailableError } from "@/shared/errors";

type PromptBuilders = {
  system: (format: string) => string;
  text: (format: string, content: string) => string;
  image: () => string;
  file: (format: string) => string;
};

export async function prepareLlmMessage({
  fileUrl,
  format,
  mediaType,
  prompts,
}: {
  fileUrl: string;
  format: string;
  mediaType?: string;
  prompts: PromptBuilders;
}): Promise<{ system: string; messages: ModelMessage[] }> {
  const system = prompts.system(format);
  const category = classifyFile(format, mediaType);

  if (category === "text") {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new ServiceUnavailableError(
        `File download (${response.status} ${response.statusText})`.trim(),
      );
    }
    const textContent = await response.text();
    return {
      system,
      messages: [
        {
          role: "user",
          content: prompts.text(format, textContent),
        },
      ],
    };
  }

  if (category === "image") {
    const imagePart: ImagePart = { type: "image", image: fileUrl };
    return {
      system,
      messages: [
        {
          role: "user",
          content: [imagePart, { type: "text", text: prompts.image() }],
        },
      ],
    };
  }

  const filePart: FilePart = {
    type: "file",
    mediaType: resolveMediaType(format, mediaType),
    data: fileUrl,
  };
  return {
    system,
    messages: [
      {
        role: "user",
        content: [filePart, { type: "text", text: prompts.file(format) }],
      },
    ],
  };
}
