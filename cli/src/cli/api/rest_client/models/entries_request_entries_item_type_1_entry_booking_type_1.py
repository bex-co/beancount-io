from enum import StrEnum


class EntriesRequestEntriesItemType1EntryBookingType1(StrEnum):
    FIFO = "FIFO"
    HIFO = "HIFO"
    LIFO = "LIFO"
    NONE = "NONE"
    STRICT = "STRICT"
    STRICT_WITH_SIZE = "STRICT_WITH_SIZE"

    def __str__(self) -> str:
        return str(self.value)
