from enum import StrEnum


class GetApiGatewayV1LedgersOwnerNameManagedPricesResponse200ItemFreshness(StrEnum):
    RECENT = "recent"
    STALE = "stale"
    UNAVAILABLE = "unavailable"

    def __str__(self) -> str:
        return str(self.value)
