from enum import StrEnum


class GetCliAuthSessionResponse200Status(StrEnum):
    AUTHORIZED = "AUTHORIZED"
    CONSUMED = "CONSUMED"
    DENIED = "DENIED"
    EXPIRED = "EXPIRED"
    PENDING = "PENDING"

    def __str__(self) -> str:
        return str(self.value)
