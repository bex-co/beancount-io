from enum import StrEnum


class EntriesRequestEntriesItemType2Type(StrEnum):
    CLOSE = "close"

    def __str__(self) -> str:
        return str(self.value)
