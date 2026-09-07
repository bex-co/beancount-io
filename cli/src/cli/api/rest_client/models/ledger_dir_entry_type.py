from enum import StrEnum


class LedgerDirEntryType(StrEnum):
    DIR = "dir"
    FILE = "file"

    def __str__(self) -> str:
        return str(self.value)
