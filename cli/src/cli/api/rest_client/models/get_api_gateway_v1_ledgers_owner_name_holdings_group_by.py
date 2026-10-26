from enum import StrEnum


class GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy(StrEnum):
    ACCOUNT = "account"
    COMMODITY = "commodity"

    def __str__(self) -> str:
        return str(self.value)
