from enum import StrEnum


class GetApiGatewayV1LedgersOwnerNameCollaboratorsResponse200ItemPermission(StrEnum):
    ADMIN = "admin"
    READ = "read"
    WRITE = "write"

    def __str__(self) -> str:
        return str(self.value)
