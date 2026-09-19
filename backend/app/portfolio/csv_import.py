import csv
import io

REQUIRED_COLUMNS = {"ticker", "quantity"}
OPTIONAL_COLUMNS = {"asset_class", "region"}


def parse_holdings_csv(content: bytes) -> list[dict]:
    """Parse a CSV with columns: ticker,quantity[,asset_class,region].

    Raises ValueError with a descriptive message on malformed input.
    """
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise ValueError("CSV appears to be empty")

    columns = {c.strip().lower() for c in reader.fieldnames}
    missing = REQUIRED_COLUMNS - columns
    if missing:
        raise ValueError(f"CSV is missing required column(s): {', '.join(sorted(missing))}")

    rows = []
    for i, raw_row in enumerate(reader, start=2):
        row = {k.strip().lower(): (v.strip() if v else v) for k, v in raw_row.items()}
        if not row.get("ticker"):
            continue
        try:
            quantity = float(row["quantity"])
        except (TypeError, ValueError):
            raise ValueError(f"row {i}: quantity '{row.get('quantity')}' is not a number")
        rows.append(
            {
                "ticker": row["ticker"],
                "quantity": quantity,
                "asset_class": row.get("asset_class", "other"),
                "region": row.get("region", "US"),
            }
        )
    if not rows:
        raise ValueError("CSV contained no valid holding rows")
    return rows
