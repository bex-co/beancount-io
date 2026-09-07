from enum import StrEnum


class PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType3Type1(StrEnum):
    ADMIN = "admin"
    READ = "read"
    WRITE = "write"

    def __str__(self) -> str:
        return str(self.value)
