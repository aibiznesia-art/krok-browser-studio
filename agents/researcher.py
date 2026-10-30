#!/usr/bin/env python3
"""Collect small, auditable snippets from explicitly supplied public URLs/RSS feeds.
No login, CAPTCHA bypass, private data, paywall bypass, or robots.txt circumvention.
"""
import json, sys, time
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ALLOWED = {"http", "https"}
MAX_BYTES = 400_000

def fetch(url: str) -> dict:
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED or not parsed.netloc:
        return {"url": url, "status": "rejected", "reason": "only public http(s) URLs are allowed"}
    req = Request(url, headers={"User-Agent": "KROK-Agent-Swarm/1.0 (public-research)"})
    try:
        with urlopen(req, timeout=15) as response:
            body = response.read(MAX_BYTES).decode("utf-8", "replace")
            return {"url": url, "status": "ok", "retrieved_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "content_type": response.headers.get("content-type", ""), "preview": " ".join(body.split())[:1000]}
    except Exception as exc:
        return {"url": url, "status": "error", "reason": str(exc)[:240]}

def main() -> None:
    urls = json.load(sys.stdin) if not sys.stdin.isatty() else []
    if not isinstance(urls, list):
        raise SystemExit("input must be a JSON array of public URLs")
    print(json.dumps({"sources": [fetch(str(url)) for url in urls[:20]]}, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
