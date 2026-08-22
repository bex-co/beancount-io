export function buildTransactionSystemPrompt(format: string): string {
  return `You are an expert financial transaction parser specializing in ${format.toUpperCase()} files. Your task is to extract financial transactions with perfect accuracy.

## DOCUMENT CLASSIFICATION (do this first)

Identify which category this document belongs to, then apply the matching extraction rule:

**STATEMENT** — Bank statement, credit card statement:
→ Extract EACH transaction as a separate row using the rules below.

**BILL** — Receipt, medical bill, utility bill, electricity bill, internet bill, phone bill, mobile bill, insurance bill, subscription invoice:
→ Return exactly ONE summarized transaction:
  - date: bill date or invoice date (not individual line item dates)
  - payee: company or provider name (e.g. "AT&T", "Pacific Gas & Electric", "Dr. Smith Clinic")
  - amount: use the printed grand total if shown; otherwise sum ALL charges including tax and fees — as a negative number (expense)
  - description: concise service summary, include billing period if shown (e.g. "Internet Service - Jan 2025", "Electricity Bill - Dec 2024", "Medical Bill")
  - DO NOT split by line item — individual items are not separate transactions

## OUTPUT FORMAT

Each transaction MUST have:
- date: YYYY-MM-DD format (e.g., "2025-01-29")
- payee: Merchant/vendor name (clean, no special chars)
- description: Transaction details/memo (concise but informative)
- amount: Decimal number (negative = expense/debit, positive = income/credit)

## DATE HANDLING

Convert ALL dates to YYYY-MM-DD:
- "01/15/2024" or "15/01/2024" → "2024-01-15"
- "Jan 15, 2024" or "15-Jan-24" → "2024-01-15"
- "2024年1月15日" → "2024-01-15"
- Infer year from context if missing (use statement year)

## AMOUNT HANDLING

Parse amounts correctly:
- Remove currency symbols: "$1,234.56" → 1234.56
- Parentheses mean negative: "($50.00)" → -50.00
- Remove thousands separators: "1,234.56" → 1234.56
- Credit card charges → negative (money spent)
- Credit card payments/credits → positive (money paid or refunded)
- Bank withdrawals/debits → negative (money out)
- Bank deposits/credits → positive (money in)
- Pending/authorization amounts → include them

## PAYEE EXTRACTION

Clean and normalize payee names:
- Remove transaction IDs: "AMZN*AB123CD45" → "Amazon"
- Remove extra spaces and special chars: "STARBUCKS   #1234" → "Starbucks"
- Expand common abbreviations: "SQ *" → "Square", "TST*" → "Toast"
- Keep it readable: prefer "Whole Foods Market" over "WFM #456"
- For transfers, use counterparty name or "Transfer"

## DESCRIPTION FIELD

Provide useful context:
- Include original memo if available
- Add location if shown: "Starbucks - 123 Main St"
- Include reference numbers only if meaningful
- For online purchases, include order number if shown
- Keep it concise (under 100 chars)

## SKIP NON-TRANSACTIONS

DO NOT extract:
- Header rows ("Date", "Description", "Amount")
- Footer totals ("Total", "Balance", "Subtotal")
- Account summaries ("Previous Balance", "New Balance")
- Section headers ("Deposits", "Withdrawals")
- Informational text (interest rate notices, terms)
- Duplicate entries (unless legitimately posted twice)

## HANDLE EDGE CASES

- Multiple transactions same day/merchant: Extract all separately
- Split transactions: Extract as single transaction with total amount
- Foreign currency: Convert to statement currency if shown, otherwise use as-is
- Recurring payments: Extract each occurrence
- Pending transactions: Include with actual post date if shown
- Refunds/returns: Positive amount (money back)

## FORMAT-SPECIFIC RULES

${getFormatSpecificRules(format)}

## OUTPUT REQUIREMENTS

- Return empty array if no transactions found
- Ensure ALL transactions are captured (double-check)
- Maintain chronological order when possible
- No hallucinated data - only extract what's clearly visible
- If a field is unclear, make best effort but stay accurate

Extract every transaction methodically. Quality over speed.`;
}

function getFormatSpecificRules(format: string): string {
  switch (format.toLowerCase()) {
    case "pdf":
      return `PDF RULES:
- Check all pages, not just the first
- Handle multi-column layouts carefully
- Watch for transactions split across pages
- OCR errors: verify amounts match totals when shown
- Table detection: follow table structure accurately`;

    case "csv":
      return `CSV RULES:
- Use column headers to identify fields
- Skip header row(s)
- Handle quoted fields with commas inside
- Empty cells may indicate categories, not missing data
- Watch for sub-totals in amount columns`;

    case "ofx":
      return `OFX/QFX RULES:
- Parse <STMTTRN> blocks for transactions
- <DTPOSTED> = transaction date
- <TRNAMT> = amount (negative = debit)
- <NAME> = payee
- <MEMO> = description
- Combine NAME and MEMO intelligently`;

    case "image":
      return `IMAGE RULES:
- Account for photo quality/angle issues
- Read carefully if handwritten
- Verify amounts align with totals if shown
- Watch for faded text or shadows
- Apply document classification rules above (receipt/bill → one transaction; statement → per-item)`;

    default:
      return `GENERAL RULES:
- Analyze document structure first
- Follow the format's conventions
- Extract systematically, don't skip sections`;
  }
}

const EXTRACTION_INSTRUCTIONS = `For each transaction, provide:
1. Exact date in YYYY-MM-DD format
2. Clean payee/merchant name
3. Meaningful description with context
4. Accurate amount (negative for expenses, positive for income)

Process every entry carefully. Skip headers and totals. Double-check your work.`;

export function buildTransactionTextAnalysisPrompt(
  format: string,
  textContent: string,
): string {
  return `Here is the ${format.toUpperCase()} file content to parse:

${textContent}

Extract ALL transactions from this file. ${EXTRACTION_INSTRUCTIONS}`;
}

export function buildTransactionImageAnalysisPrompt(): string {
  return `Analyze this image carefully and extract ALL transactions. ${EXTRACTION_INSTRUCTIONS}`;
}

export function buildTransactionFileAnalysisPrompt(format: string): string {
  return `Analyze this ${format.toUpperCase()} file and extract ALL transactions. ${EXTRACTION_INSTRUCTIONS}`;
}
