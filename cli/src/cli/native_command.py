"""Parse bea's own options without splitting a native short-option token."""

from __future__ import annotations

from typing import Any

from typer._click.parser import _OptionParser
from typer.core import TyperCommand


class _ForwardingParser(_OptionParser):
    def _match_short_opt(self, arg: str, state: Any) -> None:
        # Click normally searches every character in an unknown short-option
        # cluster. That turns the h inside native -o/home/out.bean into -h.
        # Only a token beginning with one of bea's own short flags is ours.
        if self.ignore_unknown_options and arg[:2] not in self._short_opt:
            state.largs.append(arg)
            return
        super()._match_short_opt(arg, state)


class ForwardingCommand(TyperCommand):
    def make_parser(self, ctx: Any) -> _OptionParser:
        # Use Click's normal option registration and value/delimiter handling;
        # only unknown short-token matching differs for native delegation.
        parser = _ForwardingParser(ctx)
        for param in self.get_params(ctx):
            param.add_to_parser(parser, ctx)
        return parser
