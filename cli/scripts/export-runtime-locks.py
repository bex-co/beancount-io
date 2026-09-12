"""Generate upstream-only, cross-platform runtime locks; never build another distribution."""

import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / "src/cli/engine/manifest.json").read_text())
scratch = root / "tmp" / "runtime-locks"
scratch.mkdir(parents=True, exist_ok=True)
profiles = [(manifest["lockfile"], [])] + [
    (spec["lockfile"], spec["requirements"]) for spec in manifest["optional"].values()
]
for filename, extra in profiles:
    source = scratch / (filename + ".in")
    source.write_text("\n".join(manifest["requirements"] + extra) + "\n")
    command = [
        "uv",
        "pip",
        "compile",
        "--universal",
        "--python-version",
        manifest["requires_python"],
        "--generate-hashes",
        "--no-annotate",
        "--no-header",
        "--quiet",
        str(source),
        "--output-file",
        str(root / filename),
    ]
    if extra:
        command += ["--constraint", str(root / manifest["lockfile"])]
    subprocess.run(command, cwd=root, check=True)
