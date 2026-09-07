from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..models.create_ledger_body_template_type_1 import CreateLedgerBodyTemplateType1
from ..models.create_ledger_body_template_type_2_type_1 import CreateLedgerBodyTemplateType2Type1
from ..models.create_ledger_body_template_type_3_type_1 import CreateLedgerBodyTemplateType3Type1
from ..types import UNSET, Unset

T = TypeVar("T", bound="CreateLedgerBody")


@_attrs_define
class CreateLedgerBody:
    """
    Attributes:
        name (str):
        description (None | str | Unset):
        private (bool | None | Unset):
        template (CreateLedgerBodyTemplateType1 | CreateLedgerBodyTemplateType2Type1 |
            CreateLedgerBodyTemplateType3Type1 | None | Unset):
    """

    name: str
    description: None | str | Unset = UNSET
    private: bool | None | Unset = UNSET
    template: (
        CreateLedgerBodyTemplateType1
        | CreateLedgerBodyTemplateType2Type1
        | CreateLedgerBodyTemplateType3Type1
        | None
        | Unset
    ) = UNSET

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        private: bool | None | Unset
        if isinstance(self.private, Unset):
            private = UNSET
        else:
            private = self.private

        template: None | str | Unset
        if isinstance(self.template, Unset):
            template = UNSET
        elif isinstance(self.template, CreateLedgerBodyTemplateType1):
            template = self.template.value
        elif isinstance(self.template, CreateLedgerBodyTemplateType2Type1):
            template = self.template.value
        elif isinstance(self.template, CreateLedgerBodyTemplateType3Type1):
            template = self.template.value
        else:
            template = self.template

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "name": name,
            }
        )
        if description is not UNSET:
            field_dict["description"] = description
        if private is not UNSET:
            field_dict["private"] = private
        if template is not UNSET:
            field_dict["template"] = template

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))

        def _parse_private(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        private = _parse_private(d.pop("private", UNSET))

        def _parse_template(
            data: object,
        ) -> (
            CreateLedgerBodyTemplateType1
            | CreateLedgerBodyTemplateType2Type1
            | CreateLedgerBodyTemplateType3Type1
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
                template_type_1 = CreateLedgerBodyTemplateType1(data)

                return template_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                template_type_2_type_1 = CreateLedgerBodyTemplateType2Type1(data)

                return template_type_2_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                template_type_3_type_1 = CreateLedgerBodyTemplateType3Type1(data)

                return template_type_3_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(
                CreateLedgerBodyTemplateType1
                | CreateLedgerBodyTemplateType2Type1
                | CreateLedgerBodyTemplateType3Type1
                | None
                | Unset,
                data,
            )

        template = _parse_template(d.pop("template", UNSET))

        create_ledger_body = cls(
            name=name,
            description=description,
            private=private,
            template=template,
        )

        return create_ledger_body
