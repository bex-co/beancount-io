from enum import StrEnum


class GetApiGatewayV1LegacyJournalEntriesDetailed(StrEnum):
    FALSE = "false"
    TRUE = "true"

    def __str__(self) -> str:
        return str(self.value)
