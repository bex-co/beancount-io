from enum import StrEnum


class EntriesRequestEntriesItemType1Type(StrEnum):
    OPEN = "open"

    def __str__(self) -> str:
        return str(self.value)
