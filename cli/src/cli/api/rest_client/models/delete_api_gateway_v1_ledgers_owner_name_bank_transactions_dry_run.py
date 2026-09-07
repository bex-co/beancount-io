from enum import StrEnum


class DeleteApiGatewayV1LedgersOwnerNameBankTransactionsDryRun(StrEnum):
    FALSE = "false"
    TRUE = "true"

    def __str__(self) -> str:
        return str(self.value)
