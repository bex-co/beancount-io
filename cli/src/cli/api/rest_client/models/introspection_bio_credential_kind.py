from enum import StrEnum


class IntrospectionBioCredentialKind(StrEnum):
    APIKEY = "apikey"
    OAUTH = "oauth"
    SESSION = "session"
    SYSTEM = "system"

    def __str__(self) -> str:
        return str(self.value)
