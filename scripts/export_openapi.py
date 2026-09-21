"""
scripts/export_openapi.py

Phase 4B (Week 8): Interactive Docs Portal & OpenAPI Export.
Exports the complete OpenAPI 3.1.0 specification for Anuvaad backend services
to docs/openapi.json and frontend/public/data/openapi.json.
"""

import json
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app


def export_openapi_schema(output_paths: list[str]) -> dict:
    openapi_schema = app.openapi()
    for p in output_paths:
        out_file = Path(p)
        out_file.parent.mkdir(parents=True, exist_ok=True)
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(openapi_schema, f, indent=2)
        print(f"[OpenAPI Exporter] Exported schema to {p}")
    return openapi_schema


if __name__ == "__main__":
    export_openapi_schema([
        "docs/openapi.json",
        "frontend/public/data/openapi.json",
    ])
