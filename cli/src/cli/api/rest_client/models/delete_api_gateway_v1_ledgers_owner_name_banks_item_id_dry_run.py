from enum import StrEnum


class DeleteApiGatewayV1LedgersOwnerNameBanksItemIdDryRun(StrEnum):
    FALSE = "false"
    TRUE = "true"

    def __str__(self) -> str:
        return str(self.value)
