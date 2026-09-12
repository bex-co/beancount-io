"""The frontend's side of the ADR014 process boundary: where the engine is, and how to call it.

Nothing here imports `beancount`, `beanquery` or `fava`, and nothing here ever
will — that is the point of the package. It resolves an engine interpreter
(`paths`), installs one on first use (`provision`), and runs engine programs as
child processes (`launch`). The helper code is bundled as resources in the same beancount-io wheel.
"""
