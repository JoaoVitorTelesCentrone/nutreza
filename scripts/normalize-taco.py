"""Normalize the official NEPA/UNICAMP TACO 4th edition spreadsheet to JSONL.

Usage: python scripts/normalize-taco.py taco.xlsx data/taco-4.jsonl
Requires openpyxl. The output keeps missing and trace markers explicit.
"""

import json
import sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from openpyxl import load_workbook


FIELDS = {
    "energia_kcal_100g": 3,
    "proteina_g_100g": 5,
    "lipidios_g_100g": 6,
    "carboidrato_g_100g": 8,
    "fibra_g_100g": 9,
    "sodio_mg_100g": 17,
}


def number(value, name, markers):
    if isinstance(value, (int, float)):
        rounded = Decimal(str(value)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
        if rounded < 0:
            if rounded < Decimal("-0.1"):
                raise ValueError(f"Negative nutrient: {name}")
            markers.append(f"adjusted_negative:{name}")
            return "0.0000"
        return str(rounded)
    if value == "Tr":
        markers.append(f"trace:{name}")
        return "0.0000"
    markers.append(f"missing:{name}")
    return None


def main(source, target):
    sheet = load_workbook(source, read_only=True, data_only=True).worksheets[0]
    group = ""
    seen = set()
    count = 0
    with Path(target).open("w", encoding="utf-8", newline="\n") as output:
        for row in sheet.values:
            code, name = row[:2]
            if isinstance(code, str) and not name and code.strip():
                group = code.strip()
                continue
            if not isinstance(code, int) or not isinstance(name, str):
                continue
            if code in seen:
                raise ValueError(f"Repeated TACO code: {code}")
            seen.add(code)
            markers = []
            label = name.strip()
            if len(label) < 2:
                markers.append("missing:nome")
                label = f"TACO {code} (descrição indisponível na planilha)"
            food = {"codigo": str(code), "nome": label, "grupo": group,
                    "dados_ausentes": markers}
            for field, index in FIELDS.items():
                food[field] = number(row[index], field, markers)
            output.write(json.dumps(food, ensure_ascii=False, sort_keys=True) + "\n")
            count += 1
    if count != 597:
        raise ValueError(f"Expected 597 TACO foods, found {count}")
    print(f"Normalized {count} foods to {target}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python scripts/normalize-taco.py <official.xlsx> <target.jsonl>")
    main(sys.argv[1], sys.argv[2])
