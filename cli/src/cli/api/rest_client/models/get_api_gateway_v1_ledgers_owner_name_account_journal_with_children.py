from enum import StrEnum


class GetApiGatewayV1LedgersOwnerNameAccountJournalWithChildren(StrEnum):
    FALSE = "false"
    TRUE = "true"

    def __str__(self) -> str:
        return str(self.value)
