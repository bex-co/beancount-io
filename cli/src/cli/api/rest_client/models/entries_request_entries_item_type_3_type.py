from enum import StrEnum


class EntriesRequestEntriesItemType3Type(StrEnum):
    BALANCE = "balance"

    def __str__(self) -> str:
        return str(self.value)
