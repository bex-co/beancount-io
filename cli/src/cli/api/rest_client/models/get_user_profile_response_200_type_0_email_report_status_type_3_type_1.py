from enum import StrEnum


class GetUserProfileResponse200Type0EmailReportStatusType3Type1(StrEnum):
    MONTHLY = "MONTHLY"
    OFF = "OFF"
    WEEKLY = "WEEKLY"

    def __str__(self) -> str:
        return str(self.value)
