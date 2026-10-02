from enum import StrEnum


class GetApiGatewayV1AccountFeedResponse200ItemsItemSource(StrEnum):
    BLOG = "BLOG"
    CHANGELOG = "CHANGELOG"
    LEDGER_RSS = "LEDGER_RSS"

    def __str__(self) -> str:
        return str(self.value)
