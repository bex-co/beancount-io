"""Completion callbacks with an explicit shell when detection is unavailable."""

from typing import Any

from cli.errors import UsageError

_SHELLS = ("bash", "zsh", "fish", "powershell", "pwsh")


def _shell(ctx: Any) -> str:
    # The root parser has read all global flags before an eager callback runs,
    # so --shell works on either side of --show/--install-completion.
    shell = ctx.find_root().meta.get("completion_shell")
    if not shell:
        # Shellingham is supplied by Typer. Use its detector directly because
        # Typer has moved the private detection helper between releases.
        import shellingham

        try:
            shell = shellingham.detect_shell()[0]
        except (shellingham.ShellDetectionFailure, OSError):
            shell = None
    if not shell:
        raise UsageError(
            "Could not detect your shell. Specify one, for example: bea --shell zsh --show-completion. "
            f"Available shells: {', '.join(_SHELLS)}."
        )
    if shell not in _SHELLS:
        raise UsageError(f"Shell {shell!r} is not supported. Choose --shell from: {', '.join(_SHELLS)}.")
    return str(shell)


def show(ctx: Any, param: Any, value: bool) -> None:
    if value and not ctx.resilient_parsing:
        from typer import completion

        completion.show_callback(ctx, param, _shell(ctx))


def install(ctx: Any, param: Any, value: bool) -> None:
    if value and not ctx.resilient_parsing:
        from typer import completion

        completion.install_callback(ctx, param, _shell(ctx))
