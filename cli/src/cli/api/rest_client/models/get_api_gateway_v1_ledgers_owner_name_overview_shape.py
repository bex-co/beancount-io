from enum import StrEnum


class GetApiGatewayV1LedgersOwnerNameOverviewShape(StrEnum):
    FAVA = "fava"
    SUMMARY = "summary"

    def __str__(self) -> str:
        return str(self.value)
