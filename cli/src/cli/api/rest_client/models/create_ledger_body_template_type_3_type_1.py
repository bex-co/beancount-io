from enum import StrEnum


class CreateLedgerBodyTemplateType3Type1(StrEnum):
    SAMPLE = "SAMPLE"
    STARTER = "STARTER"

    def __str__(self) -> str:
        return str(self.value)
