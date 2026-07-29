import io
import re


CURRENCY_RE = r"[A-Z][A-Z0-9\'\.\_\-]{0,22}[A-Z0-9]"
ALIGN_RE = re.compile(
    rf'([^";]*?)\s+([-+]?\s*[\d,]+(?:\.\d*)?)\s+({CURRENCY_RE}\b.*)',
)


def align(string: str, currency_column: int) -> str:
    """Align currencies in one column."""
    output = io.StringIO()
    for line in string.splitlines():
        match = ALIGN_RE.match(line)
        if match:
            prefix, number, rest = match.groups()
            num_of_spaces = currency_column - len(prefix) - len(number) - 4
            spaces = " " * num_of_spaces
            output.write(prefix + spaces + "  " + number + " " + rest)
        else:
            output.write(line)
        output.write("\n")

    return output.getvalue()
