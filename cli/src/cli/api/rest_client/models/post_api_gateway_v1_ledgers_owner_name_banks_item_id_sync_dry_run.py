from enum import StrEnum


class PostApiGatewayV1LedgersOwnerNameBanksItemIdSyncDryRun(StrEnum):
    FALSE = "false"
    TRUE = "true"

    def __str__(self) -> str:
        return str(self.value)
