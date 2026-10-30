#!/usr/bin/env python3
"""Collect metadata from public feeds/URLs only.
This module never logs in, bypasses access controls, or scrapes private content.
"""
import json, re, socket, sys, time
from ipaddress import ip_address
from urllib.parse import urlparse
from urllib.request import Request, urlopen

MAX_BYTES = 500_000

def public_host(host):
    if not host or '@' in host:
        return False
    try:
        addresses = {ip_address(host)}
    except ValueError:
        try:
            addresses = {ip_address(info[4][0]) for info in socket.getaddrinfo(host, None)}
        except socket.gaierror:
            return False
    return all(not (addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved) for addr in addresses)

def fetch_public(source):
    url = str(source.get("url", "")).strip()
    kind = source.get("kind", "public_url")
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or not public_host(parsed.hostname):
        return {"url": url, "kind": kind, "status": "rejected", "reason": "public http(s) URL required; private hosts are blocked"}
    if source.get("private") is True:
        return {"url": url, "kind": kind, "status": "rejected", "reason": "private sources are not supported"}
    req = Request(url, headers={"User-Agent": "KROK-Agent-Swarm/1.0 public-source-reader"})
    try:
        with urlopen(req, timeout=15) as response:
            body = response.read(MAX_BYTES).decode("utf-8", "replace")
            # Keep only a compact preview for downstream analysis and audit.
            text = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>|<[^>]+>", " ", body, flags=re.I)
            text = " ".join(text.split())[:1800]
            return {"url": url, "kind": kind, "status": "ok", "retrieved_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "content_type": response.headers.get("content-type", ""), "preview": text}
    except Exception as exc:
        return {"url": url, "kind": kind, "status": "error", "reason": str(exc)[:240]}

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "social-sources.json"
    with open(path, encoding="utf-8") as fh:
        config = json.load(fh)
    sources = config.get("sources", []) if isinstance(config, dict) else []
    result = {"policy": "public sources only; no login, private data, CAPTCHA, paywall, or robots bypass", "sources": [fetch_public(s) for s in sources[:20]], "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
