from fava.core.loader import clone_and_load_beanfile, clone_and_load_beanfile_sync
from fava.file_system import FileSystem
from fava.helpers import BeancountError, FavaAPIError
from fava.ledger import FavaLedger
from fava.serialisation import deserialise, serialise


def test_core_imports() -> None:
    assert callable(clone_and_load_beanfile)
    assert callable(clone_and_load_beanfile_sync)


def test_ledger_import() -> None:
    assert FavaLedger is not None


def test_serialisation_imports() -> None:
    assert callable(serialise)
    assert callable(deserialise)


def test_error_types() -> None:
    assert issubclass(BeancountError, tuple)  # NamedTuple
    assert issubclass(FavaAPIError, Exception)


def test_file_system_protocol() -> None:
    assert FileSystem is not None
