from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..models.create_ledger_body_template_type_1 import CreateLedgerBodyTemplateType1
from ..models.create_ledger_body_template_type_2_type_1 import CreateLedgerBodyTemplateType2Type1
from ..models.create_ledger_body_template_type_3_type_1 import CreateLedgerBodyTemplateType3Type1
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_ledger_body_setup_type_0 import CreateLedgerBodySetupType0


T = TypeVar("T", bound="CreateLedgerBody")


@_attrs_define
class CreateLedgerBody:
    """
    Attributes:
        name (str): Lowercase letters, numbers, and underscores, joined by single hyphens.
        description (None | str | Unset): A short description shown with the ledger, up to 2048 characters.
        private (bool | None | Unset): true or omitted keeps the ledger visible only to its owner and collaborators;
            false makes it public, readable by anyone.
        template (CreateLedgerBodyTemplateType1 | CreateLedgerBodyTemplateType2Type1 |
            CreateLedgerBodyTemplateType3Type1 | None | Unset): STARTER (the default) has options and accounts without
            transactions; SAMPLE has demonstration transactions.
        setup (CreateLedgerBodySetupType0 | None | Unset):
        request_id (None | str | Unset):
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
    setup: CreateLedgerBodySetupType0 | None | Unset = UNSET
    request_id: None | str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        from ..models.create_ledger_body_setup_type_0 import CreateLedgerBodySetupType0  # noqa: PLC0415

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

        setup: dict[str, Any] | None | Unset
        if isinstance(self.setup, Unset):
            setup = UNSET
        elif isinstance(self.setup, CreateLedgerBodySetupType0):
            setup = self.setup.to_dict()
        else:
            setup = self.setup

        request_id: None | str | Unset
        if isinstance(self.request_id, Unset):
            request_id = UNSET
        else:
            request_id = self.request_id

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
        if setup is not UNSET:
            field_dict["setup"] = setup
        if request_id is not UNSET:
            field_dict["requestId"] = request_id

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.create_ledger_body_setup_type_0 import CreateLedgerBodySetupType0  # noqa: PLC0415

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

        def _parse_setup(data: object) -> CreateLedgerBodySetupType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                setup_type_0 = CreateLedgerBodySetupType0.from_dict(data)

                return setup_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(CreateLedgerBodySetupType0 | None | Unset, data)

        setup = _parse_setup(d.pop("setup", UNSET))

        def _parse_request_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        request_id = _parse_request_id(d.pop("requestId", UNSET))

        create_ledger_body = cls(
            name=name,
            description=description,
            private=private,
            template=template,
            setup=setup,
            request_id=request_id,
        )

        return create_ledger_body
