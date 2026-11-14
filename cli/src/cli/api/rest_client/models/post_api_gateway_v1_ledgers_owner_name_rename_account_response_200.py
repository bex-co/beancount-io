from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_accounts_item import (
        PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200AccountsItem,
    )
    from ..models.post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_bank_mappings_item import (
        PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200BankMappingsItem,
    )
    from ..models.post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_files_item import (
        PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200FilesItem,
    )
    from ..models.post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_new_errors_item import (
        PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200NewErrorsItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200:
    """
    Attributes:
        message (str):
        dry_run (bool):
        from_ (str):
        to (str):
        accounts (list[PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200AccountsItem]): Accounts renamed,
            descendants included.
        files (list[PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200FilesItem]): Each loaded file the rename
            changes, with every line it rewrites.
        bank_mappings (list[PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200BankMappingsItem]): Bank mappings
            moved.
        errors_before (int):
        errors_after (int):
        new_errors (list[PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200NewErrorsItem]):
        valid (bool): True only when the write adds no bean-check error. A dry run returns the new errors instead of
            refusing, so gate on this, not on the status.
        commit (str | Unset): The sha of the commit this write made; absent on a preview or a read.
        checked (bool | Unset): Present, as false, when bean-check could not run, so the other fields say nothing;
            `checkError` says why.
        check_error (str | Unset):
    """

    message: str
    dry_run: bool
    from_: str
    to: str
    accounts: list[PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200AccountsItem]
    files: list[PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200FilesItem]
    bank_mappings: list[PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200BankMappingsItem]
    errors_before: int
    errors_after: int
    new_errors: list[PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200NewErrorsItem]
    valid: bool
    commit: str | Unset = UNSET
    checked: bool | Unset = UNSET
    check_error: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        message = self.message

        dry_run = self.dry_run

        from_ = self.from_

        to = self.to

        accounts = []
        for accounts_item_data in self.accounts:
            accounts_item = accounts_item_data.to_dict()
            accounts.append(accounts_item)

        files = []
        for files_item_data in self.files:
            files_item = files_item_data.to_dict()
            files.append(files_item)

        bank_mappings = []
        for bank_mappings_item_data in self.bank_mappings:
            bank_mappings_item = bank_mappings_item_data.to_dict()
            bank_mappings.append(bank_mappings_item)

        errors_before = self.errors_before

        errors_after = self.errors_after

        new_errors = []
        for new_errors_item_data in self.new_errors:
            new_errors_item = new_errors_item_data.to_dict()
            new_errors.append(new_errors_item)

        valid = self.valid

        commit = self.commit

        checked = self.checked

        check_error = self.check_error

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "message": message,
                "dryRun": dry_run,
                "from": from_,
                "to": to,
                "accounts": accounts,
                "files": files,
                "bankMappings": bank_mappings,
                "errorsBefore": errors_before,
                "errorsAfter": errors_after,
                "newErrors": new_errors,
                "valid": valid,
            }
        )
        if commit is not UNSET:
            field_dict["commit"] = commit
        if checked is not UNSET:
            field_dict["checked"] = checked
        if check_error is not UNSET:
            field_dict["checkError"] = check_error

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_accounts_item import (
            PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200AccountsItem,  # noqa: PLC0415
        )
        from ..models.post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_bank_mappings_item import (
            PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200BankMappingsItem,  # noqa: PLC0415
        )
        from ..models.post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_files_item import (
            PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200FilesItem,  # noqa: PLC0415
        )
        from ..models.post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_new_errors_item import (
            PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200NewErrorsItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        message = d.pop("message")

        dry_run = d.pop("dryRun")

        from_ = d.pop("from")

        to = d.pop("to")

        accounts = []
        _accounts = d.pop("accounts")
        for accounts_item_data in _accounts:
            accounts_item = PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200AccountsItem.from_dict(
                accounts_item_data
            )

            accounts.append(accounts_item)

        files = []
        _files = d.pop("files")
        for files_item_data in _files:
            files_item = PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200FilesItem.from_dict(files_item_data)

            files.append(files_item)

        bank_mappings = []
        _bank_mappings = d.pop("bankMappings")
        for bank_mappings_item_data in _bank_mappings:
            bank_mappings_item = PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200BankMappingsItem.from_dict(
                bank_mappings_item_data
            )

            bank_mappings.append(bank_mappings_item)

        errors_before = d.pop("errorsBefore")

        errors_after = d.pop("errorsAfter")

        new_errors = []
        _new_errors = d.pop("newErrors")
        for new_errors_item_data in _new_errors:
            new_errors_item = PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200NewErrorsItem.from_dict(
                new_errors_item_data
            )

            new_errors.append(new_errors_item)

        valid = d.pop("valid")

        commit = d.pop("commit", UNSET)

        checked = d.pop("checked", UNSET)

        check_error = d.pop("checkError", UNSET)

        post_api_gateway_v1_ledgers_owner_name_rename_account_response_200 = cls(
            message=message,
            dry_run=dry_run,
            from_=from_,
            to=to,
            accounts=accounts,
            files=files,
            bank_mappings=bank_mappings,
            errors_before=errors_before,
            errors_after=errors_after,
            new_errors=new_errors,
            valid=valid,
            commit=commit,
            checked=checked,
            check_error=check_error,
        )

        post_api_gateway_v1_ledgers_owner_name_rename_account_response_200.additional_properties = d
        return post_api_gateway_v1_ledgers_owner_name_rename_account_response_200

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
