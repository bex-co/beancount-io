let _legIdCounter = 0;
const nextId = () => `leg-${++_legIdCounter}`;

export type Leg = {
  id: string;
  account: string;
  amountInput: string;
  amountCents: number;
  isAuto: boolean;
};

export type ValidationError = "unbalanced" | "missingAccount" | "zeroAmount";

function parseCents(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;
  const n = parseFloat(trimmed);
  if (isNaN(n)) return 0;
  return Math.round(n * 100);
}

function centsToInput(cents: number): string {
  const abs = Math.abs(cents);
  const sign = cents < 0 ? "-" : "";
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

function applyAutoFill(legs: Leg[]): Leg[] {
  const lastIdx = legs.length - 1;
  if (lastIdx < 1) return legs;
  const last = legs[lastIdx];
  if (!last.isAuto) return legs;
  const sumOfOthers = legs
    .slice(0, lastIdx)
    .reduce((s, l) => s + l.amountCents, 0);
  const autoCents = sumOfOthers !== 0 ? -sumOfOthers : 0;
  return legs.map((l, i) =>
    i === lastIdx
      ? { ...l, amountCents: autoCents, amountInput: centsToInput(autoCents) }
      : l,
  );
}

export function makeLeg(partial?: Partial<Leg>): Leg {
  return {
    id: nextId(),
    account: "",
    amountInput: "0.00",
    amountCents: 0,
    isAuto: false,
    ...partial,
  };
}

export function createInitialLegs(
  firstAsset: string,
  firstExpense: string,
): Leg[] {
  return applyAutoFill([
    makeLeg({ account: firstAsset, isAuto: false }),
    makeLeg({ account: firstExpense, isAuto: true }),
  ]);
}

export function remainder(legs: Leg[]): number {
  return legs.reduce((s, l) => s + l.amountCents, 0);
}

export function updateLegAccount(
  legs: Leg[],
  index: number,
  account: string,
): Leg[] {
  return legs.map((l, i) => (i === index ? { ...l, account } : l));
}

export function updateLegAmount(
  legs: Leg[],
  index: number,
  input: string,
): Leg[] {
  const cents = parseCents(input);
  const isLast = index === legs.length - 1;
  const updated = legs.map((l, i) =>
    i === index
      ? {
          ...l,
          amountInput: input,
          amountCents: cents,
          isAuto: isLast ? false : l.isAuto,
        }
      : l,
  );
  return applyAutoFill(updated);
}

export function toggleLastLegAuto(legs: Leg[]): Leg[] {
  const lastIdx = legs.length - 1;
  const updated = legs.map((l, i) =>
    i === lastIdx ? { ...l, isAuto: !l.isAuto } : l,
  );
  return applyAutoFill(updated);
}

export function addLeg(legs: Leg[]): Leg[] {
  const withNoAuto = legs.map((l, i) =>
    i === legs.length - 1 ? { ...l, isAuto: false } : l,
  );
  return applyAutoFill([...withNoAuto, makeLeg({ isAuto: true })]);
}

export function removeLeg(legs: Leg[], index: number): Leg[] {
  if (legs.length <= 2) return legs;
  const newLegs = legs.filter((_, i) => i !== index);
  if (index >= newLegs.length) {
    const withAuto = newLegs.map((l, i) =>
      i === newLegs.length - 1 ? { ...l, isAuto: true } : l,
    );
    return applyAutoFill(withAuto);
  }
  return applyAutoFill(newLegs);
}

export function validateLegs(legs: Leg[]): ValidationError | null {
  for (const leg of legs) {
    if (!leg.account) return "missingAccount";
    if (leg.amountCents === 0) return "zeroAmount";
  }
  if (remainder(legs) !== 0) return "unbalanced";
  return null;
}

export function buildEntryInput(
  legs: Leg[],
  opts: {
    date: string;
    payee: string;
    narration: string;
    currency: string;
  },
) {
  return {
    date: opts.date,
    flag: "*",
    narration: opts.narration,
    payee: opts.payee,
    type: "Transaction",
    meta: {},
    postings: legs.map((leg) => ({
      account: leg.account,
      amount: `${centsToInput(leg.amountCents)} ${opts.currency}`,
    })),
  };
}
