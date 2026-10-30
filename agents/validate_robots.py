#!/usr/bin/env python3
"""Validate robots.txt policy for configured public competitor URLs."""
import argparse
import json
import sys
from pathlib import Path

from competitor_scan import fetch_robots, public_https


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("config", help="competitor-sources.json")
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text())
    user_agent = config.get("user_agent", "KROK-PublicResearch/1.0")
    urls = list(dict.fromkeys(config.get("urls", [])))[: int(config.get("max_sites", 5))]
    results = []
    failed = False
    for url in urls:
        if not public_https(url):
            results.append({"url": url, "ok": False, "reason": "public_https_required"})
            failed = True
            continue
        allowed, reason = fetch_robots(url, user_agent)
        results.append({"url": url, "ok": allowed, "reason": reason})
        failed = failed or not allowed
    payload = {"ok": not failed, "checked": len(results), "results": results}
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
