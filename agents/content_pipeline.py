from datetime import datetime, timezone
import json, os, sys
from pathlib import Path

def main():
    topic = sys.argv[1] if len(sys.argv) > 1 else 'KROK Agent Swarm'
    sources = json.loads(Path('social-sources.json').read_text())['sources']
    received = datetime.now(timezone.utc).isoformat()
    result = {
        'topic': topic,
        'received_at': received,
        'human_review_required': True,
        'policy': 'public-open-sources-only',
        'facts': [
            {'fact': 'This is a draft assembled from configured public source references.', 'source_url': s['url'], 'source_name': s['name'], 'received_at': received, 'open_source': True}
            for s in sources
        ],
        'note': 'No private access, login bypass, CAPTCHA, paywall, robots.txt bypass, or social publishing is performed.'
    }
    target = Path('generated/latest-content.json')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')

if __name__ == '__main__':
    main()
