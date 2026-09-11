export function screenshotFont(
  fontList: string,
  runtimeLocale: string,
): { name: string; family: string } {
  const candidates = [
    { name: "Arial-Unicode-MS", family: "Arial Unicode MS" },
    ...(runtimeLocale === "zh"
      ? [{ name: "Heiti-SC-Medium", family: "Heiti SC" }]
      : [{ name: "Arial", family: "Arial" }]),
  ];
  for (const candidate of candidates) {
    if (
      fontList
        .split("\n")
        .some((line) => line.trim() === `Font: ${candidate.name}`)
    ) {
      return candidate;
    }
  }
  throw new Error(
    `No screenshot font for ${runtimeLocale}; install ${candidates.map((candidate) => candidate.name).join(" or ")}.`,
  );
}
