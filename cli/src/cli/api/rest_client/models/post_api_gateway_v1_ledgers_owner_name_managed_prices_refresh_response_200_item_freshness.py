from enum import StrEnum


class PostApiGatewayV1LedgersOwnerNameManagedPricesRefreshResponse200ItemFreshness(StrEnum):
    RECENT = "recent"
    STALE = "stale"
    UNAVAILABLE = "unavailable"

    def __str__(self) -> str:
        return str(self.value)
