"""Require pinned engine locks in customer wheels, but not editable installs."""

import json
from pathlib import Path

from hatchling.builders.hooks.plugin.interface import BuildHookInterface


class CustomBuildHook(BuildHookInterface):
    def initialize(self, version, build_data):
        if version == "editable":
            return
        root = Path(self.root)
        manifest = json.loads((root / "src/cli/engine/manifest.json").read_text())
        locks = [manifest["lockfile"], *(feature["lockfile"] for feature in manifest["optional"].values())]
        for name in locks:
            source = root / name
            if not source.is_file():
                raise FileNotFoundError(f"Missing release lock {name}; run 'make release-lock' before building.")
            build_data["force_include"][str(source)] = f"cli/{name}"
