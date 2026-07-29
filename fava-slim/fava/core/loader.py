from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import TYPE_CHECKING

from ..beans.load import load_uncached


if TYPE_CHECKING:
    from collections.abc import Generator

    from ..beans.types import LoaderResult


def load_file(path: str | Path) -> LoaderResult:
    """Load a local Beancount file."""
    return load_uncached(str(path), is_encrypted=False)


@contextmanager
def clone_and_load_beanfile(git_url: str, beanfile_path: str = "main.bean", branch: str | None = None) -> Generator[LoaderResult, None, None]:
    """
    Create a temporary directory, clone a git repository, and load the specified beancount file.

    Args:
        git_url: URL of the Git repository
        beanfile_path: Relative path to the beancount file in the repository, defaults to "main.bean"
        branch: Branch to clone, if None uses the default branch

    Yields:
        Tuple[Entries, list[BeancountError]]: beancount loaded entries and errors

    Raises:
        subprocess.CalledProcessError: If git clone fails
        FileNotFoundError: If the specified beanfile doesn't exist
        beancount.loader.LoadError: If beancount file loading fails
    """
    temp_dir = None
    try:
        # Create temporary directory
        temp_dir = tempfile.mkdtemp(prefix="beancount_clone_")
        temp_path = Path(temp_dir)

        # Build git clone command — always shallow to minimise transfer size
        clone_cmd = ["git", "clone", "--depth", "1"]
        if branch:
            clone_cmd.extend(["-b", branch])
        clone_cmd.extend([git_url, str(temp_path)])

        # Execute git clone
        subprocess.run(clone_cmd, capture_output=True, text=True, check=True)

        # Check if beanfile exists
        beanfile_full_path = temp_path / beanfile_path
        if not beanfile_full_path.exists():
            raise FileNotFoundError(f"Beanfile not found: {beanfile_path}")

        # Load file using beancount
        result = load_uncached(str(beanfile_full_path), is_encrypted=False)

        yield result

    finally:
        # Clean up temporary directory
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)


def clone_and_load_beanfile_sync(git_url: str, beanfile_path: str = "main.bean", branch: str | None = None) -> LoaderResult:
    """
    Synchronous version of the clone and load function, without using context manager.

    Args:
        git_url: URL of the Git repository
        beanfile_path: Relative path to the beancount file in the repository, defaults to "main.bean"
        branch: Branch to clone, if None uses the default branch

    Returns:
        Tuple[Directives, list[BeancountError], OptionsMap]: beancount loaded entries and errors

    Raises:
        subprocess.CalledProcessError: If git clone fails
        FileNotFoundError: If the specified beanfile doesn't exist
        beancount.loader.LoadError: If beancount file loading fails
    """
    result: LoaderResult
    with clone_and_load_beanfile(git_url, beanfile_path, branch) as result:
        return result
