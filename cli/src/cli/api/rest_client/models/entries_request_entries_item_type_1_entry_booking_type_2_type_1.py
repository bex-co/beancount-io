from enum import StrEnum


class EntriesRequestEntriesItemType1EntryBookingType2Type1(StrEnum):
    FIFO = "FIFO"
    LIFO = "LIFO"
    NONE = "NONE"
    STRICT = "STRICT"

    def __str__(self) -> str:
        return str(self.value)
