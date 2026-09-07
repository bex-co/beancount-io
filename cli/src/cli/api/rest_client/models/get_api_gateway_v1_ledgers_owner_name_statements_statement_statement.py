from enum import StrEnum


class GetApiGatewayV1LedgersOwnerNameStatementsStatementStatement(StrEnum):
    BALANCE_SHEET = "balance-sheet"
    INCOME_STATEMENT = "income-statement"

    def __str__(self) -> str:
        return str(self.value)
