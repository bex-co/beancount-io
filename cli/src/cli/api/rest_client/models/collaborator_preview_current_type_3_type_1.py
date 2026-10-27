from enum import StrEnum


class CollaboratorPreviewCurrentType3Type1(StrEnum):
    ADMIN = "admin"
    READ = "read"
    WRITE = "write"

    def __str__(self) -> str:
        return str(self.value)
