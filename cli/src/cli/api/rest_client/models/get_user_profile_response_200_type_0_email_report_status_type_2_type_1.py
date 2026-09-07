from enum import StrEnum


class GetUserProfileResponse200Type0EmailReportStatusType2Type1(StrEnum):
    MONTHLY = "MONTHLY"
    OFF = "OFF"
    WEEKLY = "WEEKLY"

    def __str__(self) -> str:
        return str(self.value)
