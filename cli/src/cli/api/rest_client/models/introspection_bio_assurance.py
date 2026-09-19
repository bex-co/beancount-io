from enum import StrEnum


class IntrospectionBioAssurance(StrEnum):
    DELEGATED = "delegated"
    INTERACTIVE = "interactive"
    WORKLOAD = "workload"

    def __str__(self) -> str:
        return str(self.value)
