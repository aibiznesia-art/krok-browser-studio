#!/usr/bin/env python3
"""Collect structural signals from public competitor pages without paid APIs.

Safety defaults: HTTPS only, public DNS/IP only, robots.txt required, no redirects,
small response limit, rate limit, and structural metadata only.
"""
import argparse
import html
import ipaddress
import json
import re
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_RE = re.compile(r"(?:\+?\d[\d ()-]{7,}\d)")
MAX_BYTES = 512_000


def redact(value: str, limit: int = 180) -> str:
    value = html.unescape(re.sub(r"\s+", " ", value or "")).strip()
    value = EMAIL_RE.sub("[redacted-email]", value)
    value = PHONE_RE.sub("[redacted-phone]", value)
    return value[:limit]


def public_https(url: str) -> bool:
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != "https" or not parsed.hostname:
            return False
        host = parsed.hostname
        if host.lower() in {"localhost", "localhost.localdomain"}:
            return False
        for info in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM):
            address = info[4][0]
            ip = ipaddress.ip_address(address)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                return False
        return True
    except (ValueError, OSError, socket.gaierror):
        return False


class StructuralParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.description = ""
        self.headings = []
        self.links = 0
        self.forms = 0
        self.images = 0
        self.scripts = 0
        self._title_depth = 0
        self._meta = {}
        self._buffer = []
        self._body_words = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "title":
            self._title_depth = 1
        elif tag in {"h1", "h2", "h3"}:
            self._buffer = []
            self.headings.append({"level": tag, "text": ""})
        elif tag == "a":
            self.links += 1
        elif tag == "form":
            self.forms += 1
        elif tag == "img":
            self.images += 1
        elif tag == "script":
            self.scripts += 1
        elif tag == "meta":
            key = (attrs.get("name") or attrs.get("property") or "").lower()
            if key:
                self._meta[key] = attrs.get("content", "")

    def handle_endtag(self, tag):
        if tag == "title":
            self.title = redact(" ".join(self._buffer))
            self._buffer = []
            self._title_depth = 0
        elif tag in {"h1", "h2", "h3"} and self.headings:
            self.headings[-1]["text"] = redact(" ".join(self._buffer))
            self._buffer = []

    def handle_data(self, data):
        if self._title_depth or self.headings and self.headings[-1]["text"] == "":
            self._buffer.append(data)
        self._body_words += len(data.split())

    def result(self):
        self.description = redact(self._meta.get("description", ""))
        return {
            "title": self.title,
            "description": self.description,
            "headings": [item for item in self.headings[:20] if item["text"]],
            "counts": {"links": self.links, "forms": self.forms, "images": self.images, "scripts": self.scripts, "words": self._body_words},
            "signals": {
                "has_h1": any(item["level"] == "h1" for item in self.headings),
                "has_description": bool(self.description),
                "has_forms": self.forms > 0,
                "has_images": self.images > 0,
                "has_scripts": self.scripts > 0,
            },
        }


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch_robots(url: str, user_agent: str):
    parsed = urllib.parse.urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    if not public_https(robots_url):
        return False, "robots_host_not_public"
    try:
        request = urllib.request.Request(robots_url, headers={"User-Agent": user_agent, "Accept": "text/plain"})
        with urllib.request.build_opener(NoRedirect).open(request, timeout=10) as response:
            if response.status >= 400:
                return False, f"robots_http_{response.status}"
            data = response.read(MAX_BYTES).decode("utf-8", errors="replace")
        parser = urllib.robotparser.RobotFileParser()
        parser.parse(data.splitlines())
        if not parser.can_fetch(user_agent, url):
            return False, "robots_disallow"
        return True, "robots_allow"
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return True, "robots_not_found"
        return False, f"robots_http_{error.code}"
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        return False, f"robots_unavailable:{type(error).__name__}"


def scan_url(url: str, user_agent: str):
    if not public_https(url):
        return {"url": url, "status": "blocked", "reason": "public_https_required"}
    allowed, robots_status = fetch_robots(url, user_agent)
    if not allowed:
        return {"url": url, "status": "blocked", "reason": robots_status}
    try:
        request = urllib.request.Request(url, headers={"User-Agent": user_agent, "Accept": "text/html,application/xhtml+xml"})
        with urllib.request.build_opener(NoRedirect).open(request, timeout=15) as response:
            if response.status != 200:
                return {"url": url, "status": "blocked", "reason": f"http_{response.status}"}
            content_type = response.headers.get_content_type()
            if content_type not in {"text/html", "application/xhtml+xml"}:
                return {"url": url, "status": "skipped", "reason": f"not_html:{content_type}"}
            body = response.read(MAX_BYTES)
        parser = StructuralParser()
        parser.feed(body.decode("utf-8", errors="replace"))
        return {"url": url, "status": "collected", "robots": robots_status, "signals": parser.result(), "requires_human_review": True}
    except urllib.error.HTTPError as error:
        return {"url": url, "status": "blocked", "reason": f"http_{error.code}"}
    except (urllib.error.URLError, TimeoutError, OSError, UnicodeError) as error:
        return {"url": url, "status": "error", "reason": type(error).__name__}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("config", help="JSON competitor-sources configuration")
    parser.add_argument("--output", default="artifacts/competitor-research.json")
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text())
    user_agent = config.get("user_agent", "KROK-PublicResearch/1.0")
    urls = list(dict.fromkeys(config.get("urls", [])))[: int(config.get("max_sites", 5))]
    delay = max(1.0, float(config.get("delay_seconds", 2)))
    results = []
    for index, url in enumerate(urls):
        if index:
            time.sleep(delay)
        results.append(scan_url(url, user_agent))
    payload = {
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "mode": "public-structural-signals-only",
        "paid_api": False,
        "requires_human_review": True,
        "policy": {"https_only": True, "robots_required": True, "no_redirects": True, "max_bytes": MAX_BYTES},
        "results": results,
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"ok": True, "output": str(output), "sites": len(results), "collected": sum(item["status"] == "collected" for item in results)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
