"""The frontend's side of the ADR014 process boundary: where the engine is, and how to call it.

Nothing here imports `beancount`, `beanquery` or `fava`, and nothing here ever
will — that is the point of the package. It resolves an engine interpreter
(`paths`), installs one on first use (`provision`), and runs engine programs as
child processes (`launch`). The engine's own code lives in `bea_engine` and the
`beancount-io-engine` distribution under `cli/engine/`.
"""
