from enum import StrEnum


class CreateLedgerBodySetupType0ModulesItemId(StrEnum):
    INVESTMENTS1 = "investments@1"
    RENTAL_PROPERTY1 = "rental-property@1"
    SIDE_BUSINESS1 = "side-business@1"

    def __str__(self) -> str:
        return str(self.value)
