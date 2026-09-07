from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.get_user_profile_response_200_type_0_email_report_status_type_1 import (
    GetUserProfileResponse200Type0EmailReportStatusType1,
)
from ..models.get_user_profile_response_200_type_0_email_report_status_type_2_type_1 import (
    GetUserProfileResponse200Type0EmailReportStatusType2Type1,
)
from ..models.get_user_profile_response_200_type_0_email_report_status_type_3_type_1 import (
    GetUserProfileResponse200Type0EmailReportStatusType3Type1,
)
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.get_user_profile_response_200_type_0_limits import GetUserProfileResponse200Type0Limits


T = TypeVar("T", bound="GetUserProfileResponse200Type0")


@_attrs_define
class GetUserProfileResponse200Type0:
    """
    Attributes:
        id (str):
        email (str):
        locale (str):
        tier (str):
        limits (GetUserProfileResponse200Type0Limits):
        has_ever_subscribed (bool):
        first_name (None | str | Unset):
        last_name (None | str | Unset):
        email_report_status (GetUserProfileResponse200Type0EmailReportStatusType1 |
            GetUserProfileResponse200Type0EmailReportStatusType2Type1 |
            GetUserProfileResponse200Type0EmailReportStatusType3Type1 | None | Unset):
        username (None | str | Unset):
    """

    id: str
    email: str
    locale: str
    tier: str
    limits: GetUserProfileResponse200Type0Limits
    has_ever_subscribed: bool
    first_name: None | str | Unset = UNSET
    last_name: None | str | Unset = UNSET
    email_report_status: (
        GetUserProfileResponse200Type0EmailReportStatusType1
        | GetUserProfileResponse200Type0EmailReportStatusType2Type1
        | GetUserProfileResponse200Type0EmailReportStatusType3Type1
        | None
        | Unset
    ) = UNSET
    username: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        email = self.email

        locale = self.locale

        tier = self.tier

        limits = self.limits.to_dict()

        has_ever_subscribed = self.has_ever_subscribed

        first_name: None | str | Unset
        if isinstance(self.first_name, Unset):
            first_name = UNSET
        else:
            first_name = self.first_name

        last_name: None | str | Unset
        if isinstance(self.last_name, Unset):
            last_name = UNSET
        else:
            last_name = self.last_name

        email_report_status: None | str | Unset
        if isinstance(self.email_report_status, Unset):
            email_report_status = UNSET
        elif isinstance(self.email_report_status, GetUserProfileResponse200Type0EmailReportStatusType1):
            email_report_status = self.email_report_status.value
        elif isinstance(self.email_report_status, GetUserProfileResponse200Type0EmailReportStatusType2Type1):
            email_report_status = self.email_report_status.value
        elif isinstance(self.email_report_status, GetUserProfileResponse200Type0EmailReportStatusType3Type1):
            email_report_status = self.email_report_status.value
        else:
            email_report_status = self.email_report_status

        username: None | str | Unset
        if isinstance(self.username, Unset):
            username = UNSET
        else:
            username = self.username

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "email": email,
                "locale": locale,
                "tier": tier,
                "limits": limits,
                "hasEverSubscribed": has_ever_subscribed,
            }
        )
        if first_name is not UNSET:
            field_dict["firstName"] = first_name
        if last_name is not UNSET:
            field_dict["lastName"] = last_name
        if email_report_status is not UNSET:
            field_dict["emailReportStatus"] = email_report_status
        if username is not UNSET:
            field_dict["username"] = username

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_user_profile_response_200_type_0_limits import (
            GetUserProfileResponse200Type0Limits,  # noqa: PLC0415
        )

        d = dict(src_dict)
        id = d.pop("id")

        email = d.pop("email")

        locale = d.pop("locale")

        tier = d.pop("tier")

        limits = GetUserProfileResponse200Type0Limits.from_dict(d.pop("limits"))

        has_ever_subscribed = d.pop("hasEverSubscribed")

        def _parse_first_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        first_name = _parse_first_name(d.pop("firstName", UNSET))

        def _parse_last_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        last_name = _parse_last_name(d.pop("lastName", UNSET))

        def _parse_email_report_status(
            data: object,
        ) -> (
            GetUserProfileResponse200Type0EmailReportStatusType1
            | GetUserProfileResponse200Type0EmailReportStatusType2Type1
            | GetUserProfileResponse200Type0EmailReportStatusType3Type1
            | None
            | Unset
        ):
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                email_report_status_type_1 = GetUserProfileResponse200Type0EmailReportStatusType1(data)

                return email_report_status_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                email_report_status_type_2_type_1 = GetUserProfileResponse200Type0EmailReportStatusType2Type1(data)

                return email_report_status_type_2_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                email_report_status_type_3_type_1 = GetUserProfileResponse200Type0EmailReportStatusType3Type1(data)

                return email_report_status_type_3_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(
                GetUserProfileResponse200Type0EmailReportStatusType1
                | GetUserProfileResponse200Type0EmailReportStatusType2Type1
                | GetUserProfileResponse200Type0EmailReportStatusType3Type1
                | None
                | Unset,
                data,
            )

        email_report_status = _parse_email_report_status(d.pop("emailReportStatus", UNSET))

        def _parse_username(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        username = _parse_username(d.pop("username", UNSET))

        get_user_profile_response_200_type_0 = cls(
            id=id,
            email=email,
            locale=locale,
            tier=tier,
            limits=limits,
            has_ever_subscribed=has_ever_subscribed,
            first_name=first_name,
            last_name=last_name,
            email_report_status=email_report_status,
            username=username,
        )

        get_user_profile_response_200_type_0.additional_properties = d
        return get_user_profile_response_200_type_0

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
