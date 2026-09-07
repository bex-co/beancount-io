from enum import StrEnum


class CreateApiKeyScopesItem(StrEnum):
    LEDGER_ADMIN = "ledger.admin"
    LEDGER_READ = "ledger.read"
    LEDGER_WRITE = "ledger.write"

    def __str__(self) -> str:
        return str(self.value)
