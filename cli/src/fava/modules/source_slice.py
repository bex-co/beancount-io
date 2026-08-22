from __future__ import annotations

import hashlib
from itertools import takewhile
from typing import TYPE_CHECKING

from beancount.core.inventory import Inventory

from ..beans.abc import Balance, Directive, Transaction
from ..beans.account import get_entry_accounts
from ..beans.funcs import get_position, hash_entry
from ..beans.str import to_string


if TYPE_CHECKING:  # pragma: no cover
    from ..file_system import FileSystem
    from ..ledger import FavaLedger


class SourceSliceModule:
    def __init__(self, ledger: FavaLedger) -> None:
        self._ledger = ledger

    def get_entry(self, entry_hash: str) -> Directive:
        """Find an entry by its hash.

        Arguments:
            entry_hash: Hash of the entry.

        Returns:
            The entry with the given hash.

        Raises:
            KeyError: If there is no entry for the given hash.
        """
        for entry in self._ledger.all_entries:
            if entry_hash == hash_entry(entry):
                return entry
        raise KeyError(f"No entry found with hash: {entry_hash}")

    def context(
        self,
        entry_hash: str,
        owner: str | None = None,
        repo_name: str | None = None,
        file_system: FileSystem | None = None,
    ) -> tuple[
        Directive,
        dict[str, list[str]] | None,
        dict[str, list[str]] | None,
        str,
        str,
    ]:
        """Context for an entry.

        Arguments:
            entry_hash: Hash of entry.
            owner: Repository owner (required for file backend operations)
            repo_name: Repository name (required for file backend operations)
            file_system: Backend for reading the source file

        Returns:
            A tuple ``(entry, before, after, source_slice, sha256sum)`` of the
            (unique) entry with the given ``entry_hash``. If the entry is a
            Balance or Transaction then ``before`` and ``after`` contain
            the balances before and after the entry of the affected accounts.
        """
        entry = self.get_entry(entry_hash)
        source_slice, sha256sum = self._get_entry_slice(entry, owner, repo_name, file_system)

        if not isinstance(entry, Balance | Transaction):
            return entry, None, None, source_slice, sha256sum

        entry_accounts = get_entry_accounts(entry)
        balances = {account: Inventory() for account in entry_accounts}
        for entry_ in takewhile(lambda e: e is not entry, self._ledger.all_entries):
            if isinstance(entry_, Transaction):
                for posting in entry_.postings:
                    balance = balances.get(posting.account)
                    if balance is not None:
                        balance.add_position(posting)  # type: ignore[arg-type]

        def visualise(inv: Inventory) -> list[str]:
            return [to_string(pos) for pos in sorted(iter(inv))]

        before = {acc: visualise(inv) for acc, inv in balances.items()}

        if isinstance(entry, Balance):
            return entry, before, None, source_slice, sha256sum

        for posting in entry.postings:
            balances[posting.account].add_position(posting)  # type: ignore[arg-type]
        after = {acc: visualise(inv) for acc, inv in balances.items()}
        return entry, before, after, source_slice, sha256sum

    def _get_entry_slice(
        self,
        entry: Directive,
        owner: str | None,
        repo_name: str | None,
        file_system: FileSystem | None,
    ) -> tuple[str, str]:
        """Get source slice for an entry via the file backend.

        Falls back to basic formatting if no backend is provided or the read fails.
        """
        if file_system is None or owner is None or repo_name is None:
            return self._get_entry_slice_basic(entry)

        try:
            filename, lineno = get_position(entry)
            result = file_system.read_file(owner, repo_name, filename)
            if result is None:
                return self._get_entry_slice_basic(entry)
            file_content, _ = result
            lines = file_content.splitlines(keepends=True)
            entry_lines = self._find_entry_lines(lines, lineno - 1)
            entry_source = "".join(entry_lines).rstrip("\n")
            return entry_source, self._sha256_str(entry_source)
        except Exception:
            return self._get_entry_slice_basic(entry)

    def _get_entry_slice_basic(self, entry: Directive) -> tuple[str, str]:
        """Basic entry slice implementation without file access."""
        entry_str = to_string(entry, _currency_column=61, _indent=2)
        return entry_str, self._sha256_str(entry_str)

    def _find_entry_lines(self, lines: list[str], lineno: int) -> list[str]:
        """Find the lines that make up an entry starting from the given line number."""
        if lineno >= len(lines):
            return []

        entry_lines = []
        line = lines[lineno]

        entry_lines.append(line)

        for i in range(lineno + 1, len(lines)):
            next_line = lines[i]
            if not next_line.strip():
                break
            elif next_line.startswith((" ", "\t")):
                entry_lines.append(next_line)
            else:
                break

        return entry_lines

    @staticmethod
    def _sha256_str(text: str) -> str:
        """Calculate SHA256 hash of a string."""
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def delete_source_slice(
        self,
        entry_hash: str,
        sha256sum: str,
        owner: str,
        repo_name: str,
        file_system: FileSystem,
    ) -> str:
        """Delete a source slice from the file backend.

        Args:
            entry_hash: Hash of the entry to delete
            sha256sum: SHA256 hash of the current entry source for validation
            owner: Repository owner
            repo_name: Repository name
            file_system: Backend for reading and writing the source file

        Returns:
            Success message

        Raises:
            KeyError: If entry is not found
            ValueError: If SHA256 hash doesn't match
        """
        entry = None
        for e in self._ledger.all_entries:
            if hash_entry(e) == entry_hash:
                entry = e
                break

        if entry is None:
            raise KeyError(f"Entry with hash {entry_hash} not found")

        _current_source, current_sha256 = self._get_entry_slice(entry, owner, repo_name, file_system)

        if current_sha256 != sha256sum:
            raise ValueError(f"SHA256 hash mismatch. Expected {sha256sum}, got {current_sha256}")

        filename, lineno = get_position(entry)

        try:
            result = file_system.read_file(owner, repo_name, filename)
            if result is None:
                raise FileNotFoundError(f"File {filename} not found")

            file_content, sha = result
            lines = file_content.splitlines(keepends=True)

            entry_lines = self._find_entry_lines(lines, lineno - 1)
            entry_start = lineno - 1
            entry_end = entry_start + len(entry_lines)

            new_lines = lines[:entry_start] + lines[entry_end:]
            new_content = "".join(new_lines)

            file_system.write_file(owner, repo_name, filename, new_content, sha, "Delete entry")
            return f"Deleted entry {entry_hash}"

        except Exception as e:
            raise RuntimeError(f"Failed to delete entry {entry_hash}: {e!s}") from e

    def delete_multi_source_slices(
        self,
        entries_to_delete: list[tuple[str, str]],
        owner: str,
        repo_name: str,
        file_system: FileSystem,
    ) -> str:
        """Delete multiple source slices in a single operation per file.

        Entries across different files are each handled with one read + one write per file,
        avoiding redundant API calls.  Entries within the same file are removed bottom-to-top
        so that earlier line numbers remain valid throughout the process.

        Args:
            entries_to_delete: List of ``(entry_hash, sha256sum)`` pairs to delete.
            owner: Repository owner.
            repo_name: Repository name.
            file_system: Backend for reading and writing the source files.

        Returns:
            Success message listing deleted entry hashes.

        Raises:
            KeyError: If any entry hash is not found.
            ValueError: If any SHA256 hash doesn't match the current source.
        """
        from collections import defaultdict

        resolved: list[tuple[Directive, str]] = []
        for entry_hash, sha256sum in entries_to_delete:
            entry = None
            for e in self._ledger.all_entries:
                if hash_entry(e) == entry_hash:
                    entry = e
                    break
            if entry is None:
                raise KeyError(f"Entry with hash {entry_hash} not found")
            resolved.append((entry, sha256sum))

        by_file: dict[str, list[tuple[Directive, str, int]]] = defaultdict(list)
        for entry, sha256sum in resolved:
            filename, lineno = get_position(entry)
            by_file[filename].append((entry, sha256sum, lineno))

        deleted_hashes: list[str] = []

        try:
            for filename, file_entries in by_file.items():
                result = file_system.read_file(owner, repo_name, filename)
                if result is None:
                    raise FileNotFoundError(f"File {filename} not found")

                file_content, sha = result
                lines = file_content.splitlines(keepends=True)

                for entry, sha256sum, lineno in file_entries:
                    entry_lines = self._find_entry_lines(lines, lineno - 1)
                    entry_source = "".join(entry_lines).rstrip("\n")
                    current_sha256 = self._sha256_str(entry_source)
                    if current_sha256 != sha256sum:
                        raise ValueError(f"SHA256 hash mismatch for entry {hash_entry(entry)}. Expected {sha256sum}, got {current_sha256}")

                for entry, _sha256sum, lineno in sorted(file_entries, key=lambda x: x[2], reverse=True):
                    entry_start = lineno - 1
                    entry_end = entry_start + len(self._find_entry_lines(lines, entry_start))
                    lines = lines[:entry_start] + lines[entry_end:]
                    deleted_hashes.append(hash_entry(entry))

                new_content = "".join(lines)
                message = f"Delete {len(file_entries)} {'entry' if len(file_entries) == 1 else 'entries'}"
                file_system.write_file(owner, repo_name, filename, new_content, sha, message)

        except (KeyError, ValueError, FileNotFoundError):
            raise
        except Exception as e:
            raise RuntimeError(f"Failed to delete entries: {e!s}") from e

        return f"Deleted {len(deleted_hashes)} entries: {', '.join(deleted_hashes)}"

    def update_source_slice(
        self,
        entry_hash: str,
        sha256sum: str,
        new_content: str,
        owner: str,
        repo_name: str,
        file_system: FileSystem,
    ) -> tuple[str, str]:
        """Update a source slice via the file backend.

        Args:
            entry_hash: Hash of the entry to update
            sha256sum: SHA256 hash of the current entry source for validation
            new_content: New content for the entry
            owner: Repository owner
            repo_name: Repository name
            file_system: Backend for reading and writing the source file

        Returns:
            Tuple of (success message, new SHA256 hash)

        Raises:
            KeyError: If entry is not found
            ValueError: If SHA256 hash doesn't match
        """
        entry = None
        for e in self._ledger.all_entries:
            if hash_entry(e) == entry_hash:
                entry = e
                break

        if entry is None:
            raise KeyError(f"Entry with hash {entry_hash} not found")

        _current_source, current_sha256 = self._get_entry_slice(entry, owner, repo_name, file_system)

        if current_sha256 != sha256sum:
            raise ValueError(f"SHA256 hash mismatch. Expected {sha256sum}, got {current_sha256}")

        filename, lineno = get_position(entry)

        try:
            result = file_system.read_file(owner, repo_name, filename)
            if result is None:
                raise FileNotFoundError(f"File {filename} not found")

            file_content, sha = result
            lines = file_content.splitlines(keepends=True)

            entry_lines = self._find_entry_lines(lines, lineno - 1)
            entry_start = lineno - 1
            entry_end = entry_start + len(entry_lines)

            new_lines = [*lines[:entry_start], new_content + "\n", *lines[entry_end:]]
            new_file_content = "".join(new_lines)

            new_sha256sum = self._sha256_str(new_content)

            file_system.write_file(owner, repo_name, filename, new_file_content, sha, "Update entry")
            return f"Updated entry {entry_hash}", new_sha256sum

        except Exception as e:
            raise RuntimeError(f"Failed to update entry {entry_hash}: {e!s}") from e
