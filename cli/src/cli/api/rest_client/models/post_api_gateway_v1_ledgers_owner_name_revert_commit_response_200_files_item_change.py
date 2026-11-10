from enum import StrEnum


class PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200FilesItemChange(StrEnum):
    CREATED = "created"
    DELETED = "deleted"
    UPDATED = "updated"

    def __str__(self) -> str:
        return str(self.value)
