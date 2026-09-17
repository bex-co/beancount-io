"""Probe the hosted price feed and record its mount status (w1/m29/t006).

Run `make live-prices` from `cli/`. Writes
`tests/managed_prices_live_status.json`: `mounted` with the URL, revision,
observed-at, and fetched-at of a verified end-to-end fetch, or `pending`
with the probe evidence and date. The suite's live test trips when the
route's state no longer matches the record — re-run this script and commit
the promotion.
"""

from __future__ import annotations

import json
import sys
import tempfile
from datetime import UTC, date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from bea_engine.managed_price_cache import resolve_feed  # noqa: E402
from bea_engine.managed_prices import (  # noqa: E402
    check_feed_identity,
    fetch_managed_price_feed,
    validate_managed_price_text,
)

URL = "https://beancount.io/prices/BTC-USD"
RECORD = ROOT / "tests" / "managed_prices_live_status.json"


def main() -> int:
    today = date.today().isoformat()
    record: dict[str, object] = {
        "_readme": (
            "Probe record for the hosted price feed (w1/m29/t006). Regenerate with "
            "`make live-prices` from cli/. The suite's live test trips when the route "
            "no longer matches; a promotion commit re-runs this script and commits the result."
        ),
        "url": URL,
        "date": today,
    }
    result = fetch_managed_price_feed(URL)
    if result.kind == "fetched":
        validation = check_feed_identity(validate_managed_price_text(result.text), "BTC-USD", None)
        if not validation.ok:
            record.update(
                status="pending",
                evidence=f"HTTP 200 but invalid feed: {validation.reason}",
                revision=None,
                observed_at=None,
                fetched_at=None,
            )
        else:
            with tempfile.TemporaryDirectory(prefix="bea-live-prices-") as cache:
                resolved = resolve_feed(URL, "BTC-USD", root=Path(cache))
            blob = resolved.blob
            assert blob is not None
            fetched = datetime.fromtimestamp(blob.fetched_at, UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
            record.update(
                status="mounted",
                evidence=f"HTTP 200 with {len(blob.feed.prices)} validated prices",
                revision=blob.revision,
                observed_at=blob.feed.latest_observed_at,
                fetched_at=fetched,
            )
    elif result.kind == "not-modified":
        record.update(
            status="pending",
            evidence="unexpected 304 without a conditional request",
            revision=None,
            observed_at=None,
            fetched_at=None,
        )
    else:
        record.update(
            status="pending",
            evidence=f"{result.reason}: {result.message}",
            revision=None,
            observed_at=None,
            fetched_at=None,
        )
    RECORD.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(record, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
