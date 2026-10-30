#!/usr/bin/env python3
"""Turn audited public-source snippets into conservative website content.
The default provider is deterministic demo mode; a server-side AI adapter can be added later.
"""
import json, os, re, sys, time
from pathlib import Path

def sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text or "") if len(s.strip()) > 30]

def main():
    source_file = sys.argv[1] if len(sys.argv) > 1 else "artifacts/social-results.json"
    data = json.loads(Path(source_file).read_text(encoding="utf-8")) if Path(source_file).exists() else {"sources": []}
    usable = [s for s in data.get("sources", []) if s.get("status") == "ok"]
    evidence = []
    for item in usable:
        sample = sentences(item.get("preview", ""))[:2]
        evidence.append({"url": item.get("url"), "kind": item.get("kind"), "retrieved_at": item.get("retrieved_at"), "facts": sample})
    topic = os.getenv("CONTENT_TOPIC", "актуальні цифрові рішення для бізнесу")
    result = {
        "topic": topic,
        "provider": os.getenv("AI_PROVIDER", "demo"),
        "title": f"{topic.capitalize()}: короткий огляд",
        "summary": "Матеріал сформовано з відкритих джерел. Перевірте факти редактором перед комерційною публікацією.",
        "sections": [{"heading": "Що варто знати", "body": " ".join(f["facts"][0] for f in evidence if f["facts"])}],
        "sources": evidence,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "requires_human_review": True,
    }
    Path("artifacts").mkdir(exist_ok=True)
    Path("artifacts/generated-content.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
