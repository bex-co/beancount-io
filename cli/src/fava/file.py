from beancount.core.data import Directive

from .beans.str import to_string


def format_entries(entry: list[Directive]) -> str:
    result = ""
    for e in entry:
        result += to_string(e) + "\n"  # type: ignore[arg-type]
    return result
