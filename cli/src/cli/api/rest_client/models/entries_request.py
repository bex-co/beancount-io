from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.entries_request_entries_item_type_0 import EntriesRequestEntriesItemType0
    from ..models.entries_request_entries_item_type_1 import EntriesRequestEntriesItemType1
    from ..models.entries_request_entries_item_type_2 import EntriesRequestEntriesItemType2
    from ..models.entries_request_entries_item_type_3 import EntriesRequestEntriesItemType3
    from ..models.entries_request_entries_item_type_4 import EntriesRequestEntriesItemType4
    from ..models.entries_request_entries_item_type_5 import EntriesRequestEntriesItemType5
    from ..models.entries_request_entries_item_type_6 import EntriesRequestEntriesItemType6
    from ..models.entries_request_entries_item_type_7 import EntriesRequestEntriesItemType7
    from ..models.entries_request_entries_item_type_8 import EntriesRequestEntriesItemType8
    from ..models.entries_request_entries_item_type_9 import EntriesRequestEntriesItemType9


T = TypeVar("T", bound="EntriesRequest")


@_attrs_define
class EntriesRequest:
    """One or more directives to add to the ledger

    Attributes:
        entries (list[EntriesRequestEntriesItemType0 | EntriesRequestEntriesItemType1 | EntriesRequestEntriesItemType2 |
            EntriesRequestEntriesItemType3 | EntriesRequestEntriesItemType4 | EntriesRequestEntriesItemType5 |
            EntriesRequestEntriesItemType6 | EntriesRequestEntriesItemType7 | EntriesRequestEntriesItemType8 |
            EntriesRequestEntriesItemType9]): Directives to append, committed all-or-nothing
        allow_invalid (bool | None | Unset): Record unbalanced transactions deliberately instead of refusing them with
            UNBALANCED
    """

    entries: list[
        EntriesRequestEntriesItemType0
        | EntriesRequestEntriesItemType1
        | EntriesRequestEntriesItemType2
        | EntriesRequestEntriesItemType3
        | EntriesRequestEntriesItemType4
        | EntriesRequestEntriesItemType5
        | EntriesRequestEntriesItemType6
        | EntriesRequestEntriesItemType7
        | EntriesRequestEntriesItemType8
        | EntriesRequestEntriesItemType9
    ]
    allow_invalid: bool | None | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        from ..models.entries_request_entries_item_type_0 import EntriesRequestEntriesItemType0  # noqa: PLC0415
        from ..models.entries_request_entries_item_type_1 import EntriesRequestEntriesItemType1  # noqa: PLC0415
        from ..models.entries_request_entries_item_type_2 import EntriesRequestEntriesItemType2  # noqa: PLC0415
        from ..models.entries_request_entries_item_type_3 import EntriesRequestEntriesItemType3  # noqa: PLC0415
        from ..models.entries_request_entries_item_type_4 import EntriesRequestEntriesItemType4  # noqa: PLC0415
        from ..models.entries_request_entries_item_type_5 import EntriesRequestEntriesItemType5  # noqa: PLC0415
        from ..models.entries_request_entries_item_type_6 import EntriesRequestEntriesItemType6  # noqa: PLC0415
        from ..models.entries_request_entries_item_type_7 import EntriesRequestEntriesItemType7  # noqa: PLC0415
        from ..models.entries_request_entries_item_type_8 import EntriesRequestEntriesItemType8  # noqa: PLC0415

        entries = []
        for entries_item_data in self.entries:
            entries_item: dict[str, Any]
            if isinstance(entries_item_data, EntriesRequestEntriesItemType0):
                entries_item = entries_item_data.to_dict()
            elif isinstance(entries_item_data, EntriesRequestEntriesItemType1):
                entries_item = entries_item_data.to_dict()
            elif isinstance(entries_item_data, EntriesRequestEntriesItemType2):
                entries_item = entries_item_data.to_dict()
            elif isinstance(entries_item_data, EntriesRequestEntriesItemType3):
                entries_item = entries_item_data.to_dict()
            elif isinstance(entries_item_data, EntriesRequestEntriesItemType4):
                entries_item = entries_item_data.to_dict()
            elif isinstance(entries_item_data, EntriesRequestEntriesItemType5):
                entries_item = entries_item_data.to_dict()
            elif isinstance(entries_item_data, EntriesRequestEntriesItemType6):
                entries_item = entries_item_data.to_dict()
            elif isinstance(entries_item_data, EntriesRequestEntriesItemType7):
                entries_item = entries_item_data.to_dict()
            elif isinstance(entries_item_data, EntriesRequestEntriesItemType8):
                entries_item = entries_item_data.to_dict()
            else:
                entries_item = entries_item_data.to_dict()

            entries.append(entries_item)

        allow_invalid: bool | None | Unset
        if isinstance(self.allow_invalid, Unset):
            allow_invalid = UNSET
        else:
            allow_invalid = self.allow_invalid

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "entries": entries,
            }
        )
        if allow_invalid is not UNSET:
            field_dict["allowInvalid"] = allow_invalid

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.entries_request_entries_item_type_0 import EntriesRequestEntriesItemType0  # noqa: PLC0415
        from ..models.entries_request_entries_item_type_1 import EntriesRequestEntriesItemType1  # noqa: PLC0415
        from ..models.entries_request_entries_item_type_2 import EntriesRequestEntriesItemType2  # noqa: PLC0415
        from ..models.entries_request_entries_item_type_3 import EntriesRequestEntriesItemType3  # noqa: PLC0415
        from ..models.entries_request_entries_item_type_4 import EntriesRequestEntriesItemType4  # noqa: PLC0415
        from ..models.entries_request_entries_item_type_5 import EntriesRequestEntriesItemType5  # noqa: PLC0415
        from ..models.entries_request_entries_item_type_6 import EntriesRequestEntriesItemType6  # noqa: PLC0415
        from ..models.entries_request_entries_item_type_7 import EntriesRequestEntriesItemType7  # noqa: PLC0415
        from ..models.entries_request_entries_item_type_8 import EntriesRequestEntriesItemType8  # noqa: PLC0415
        from ..models.entries_request_entries_item_type_9 import EntriesRequestEntriesItemType9  # noqa: PLC0415

        d = dict(src_dict)
        entries = []
        _entries = d.pop("entries")
        for entries_item_data in _entries:

            def _parse_entries_item(
                data: object,
            ) -> (
                EntriesRequestEntriesItemType0
                | EntriesRequestEntriesItemType1
                | EntriesRequestEntriesItemType2
                | EntriesRequestEntriesItemType3
                | EntriesRequestEntriesItemType4
                | EntriesRequestEntriesItemType5
                | EntriesRequestEntriesItemType6
                | EntriesRequestEntriesItemType7
                | EntriesRequestEntriesItemType8
                | EntriesRequestEntriesItemType9
            ):
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    entries_item_type_0 = EntriesRequestEntriesItemType0.from_dict(data)

                    return entries_item_type_0
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    entries_item_type_1 = EntriesRequestEntriesItemType1.from_dict(data)

                    return entries_item_type_1
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    entries_item_type_2 = EntriesRequestEntriesItemType2.from_dict(data)

                    return entries_item_type_2
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    entries_item_type_3 = EntriesRequestEntriesItemType3.from_dict(data)

                    return entries_item_type_3
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    entries_item_type_4 = EntriesRequestEntriesItemType4.from_dict(data)

                    return entries_item_type_4
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    entries_item_type_5 = EntriesRequestEntriesItemType5.from_dict(data)

                    return entries_item_type_5
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    entries_item_type_6 = EntriesRequestEntriesItemType6.from_dict(data)

                    return entries_item_type_6
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    entries_item_type_7 = EntriesRequestEntriesItemType7.from_dict(data)

                    return entries_item_type_7
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    entries_item_type_8 = EntriesRequestEntriesItemType8.from_dict(data)

                    return entries_item_type_8
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                if not isinstance(data, dict):
                    raise TypeError()
                entries_item_type_9 = EntriesRequestEntriesItemType9.from_dict(data)

                return entries_item_type_9

            entries_item = _parse_entries_item(entries_item_data)

            entries.append(entries_item)

        def _parse_allow_invalid(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        allow_invalid = _parse_allow_invalid(d.pop("allowInvalid", UNSET))

        entries_request = cls(
            entries=entries,
            allow_invalid=allow_invalid,
        )

        return entries_request
