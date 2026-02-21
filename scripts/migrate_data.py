#!/usr/bin/env python3
"""
Data Migration Script
=====================
Migrates existing JSON file data into PostgreSQL AppConfigDB.
Run this once after Phase 1 database is up.

Usage:
    python scripts/migrate_data.py [--data-dir ./data]
"""

import json
import os
import sys
import argparse
from pathlib import Path
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


MIGRATION_MAP = {
    "admin_config.json": "admin_config",
    "job_queue.json": "job_queue",
    "cb_config.json": "cb_config",
    "segment_intel.json": "segment_intel",
    "strategy_reports.json": "strategy_reports",
    "competitors.json": "competitors",
    "competitive_analyses.json": "competitive_analyses",
    "msa_intel.json": "msa_intel",
    "insights.json": "insights",
    "product_roadmap_intel.json": "product_roadmap_intel",
    "public_data_cache.json": "public_data_cache",
}

PER_ITEM_DIRS = {
    "market_research": "research_",
    "summaries": "summary_",
    "source_cache": "source_cache_",
}


def migrate_file(data_dir: Path, filename: str, db_key: str, db_save):
    """Migrate a single JSON file to database."""
    filepath = data_dir / filename
    if not filepath.exists():
        print(f"  SKIP {filename} (not found)")
        return False

    try:
        with open(filepath, "r") as f:
            data = json.load(f)
        db_save(db_key, data)
        print(f"  OK   {filename} -> {db_key}")
        return True
    except Exception as e:
        print(f"  FAIL {filename}: {e}")
        return False


def migrate_directory(data_dir: Path, subdir: str, key_prefix: str, db_save):
    """Migrate per-item JSON files from a directory."""
    dir_path = data_dir / subdir
    if not dir_path.exists():
        print(f"  SKIP {subdir}/ (not found)")
        return 0

    count = 0
    for filepath in sorted(dir_path.glob("*.json")):
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
            item_id = filepath.stem
            if item_id.endswith("_summary"):
                item_id = item_id[:-8]
            db_key = f"{key_prefix}{item_id}"
            db_save(db_key, data)
            count += 1
        except Exception as e:
            print(f"  FAIL {filepath.name}: {e}")

    print(f"  OK   {subdir}/ -> {count} items migrated (prefix: {key_prefix})")
    return count


def main():
    parser = argparse.ArgumentParser(description="Migrate JSON data to PostgreSQL")
    parser.add_argument("--data-dir", default="./data", help="Path to the data directory")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be migrated without writing")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        print(f"Data directory not found: {data_dir}")
        sys.exit(1)

    print(f"Migrating data from {data_dir.absolute()}")
    print("=" * 60)

    if args.dry_run:
        print("DRY RUN - no data will be written\n")
        for filename, db_key in MIGRATION_MAP.items():
            filepath = data_dir / filename
            status = "EXISTS" if filepath.exists() else "MISSING"
            size = filepath.stat().st_size if filepath.exists() else 0
            print(f"  {status:7s} {filename:40s} -> {db_key} ({size:,} bytes)")
        for subdir, prefix in PER_ITEM_DIRS.items():
            dir_path = data_dir / subdir
            if dir_path.exists():
                count = len(list(dir_path.glob("*.json")))
                print(f"  EXISTS  {subdir}/:  {count} JSON files -> prefix: {prefix}")
            else:
                print(f"  MISSING {subdir}/")
        return

    from src.database import init_db
    from src.db_utils import db_save

    print("Initializing database...")
    init_db()
    print()

    print("Migrating single-file data:")
    file_count = 0
    for filename, db_key in MIGRATION_MAP.items():
        if migrate_file(data_dir, filename, db_key, db_save):
            file_count += 1

    print()
    print("Migrating per-item directories:")
    item_count = 0
    for subdir, prefix in PER_ITEM_DIRS.items():
        item_count += migrate_directory(data_dir, subdir, prefix, db_save)

    print()
    print("=" * 60)
    print(f"Migration complete: {file_count} files, {item_count} directory items")
    print(f"Timestamp: {datetime.utcnow().isoformat()}")


if __name__ == "__main__":
    main()
