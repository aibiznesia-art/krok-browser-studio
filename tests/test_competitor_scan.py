import unittest

from agents.competitor_scan import StructuralParser, public_https, redact


class CompetitorScanTests(unittest.TestCase):
    def test_structural_parser_keeps_signals_only(self):
        parser = StructuralParser()
        parser.feed('''<!doctype html><html><head><title>Example</title><meta name="description" content="Public page"></head><body><h1>Hero</h1><h2>Features</h2><a href="/x">Link</a><form></form><img src="x.png"><script></script></body></html>''')
        result = parser.result()
        self.assertEqual(result["title"], "Example")
        self.assertTrue(result["description"])
        self.assertEqual([item["text"] for item in result["headings"]], ["Hero", "Features"])
        self.assertEqual(result["counts"]["links"], 1)
        self.assertTrue(result["signals"]["has_forms"])
        self.assertNotIn("Public page", result.get("raw_html", ""))

    def test_redact_removes_contact_values(self):
        value = redact("Contact test@example.com or +380 44 123 4567")
        self.assertNotIn("test@example.com", value)
        self.assertNotIn("+380", value)
        self.assertIn("[redacted-email]", value)
        self.assertIn("[redacted-phone]", value)

    def test_public_https_rejects_unsafe_schemes_and_hosts(self):
        self.assertFalse(public_https("http://example.com"))
        self.assertFalse(public_https("https://127.0.0.1/private"))
        self.assertFalse(public_https("not-a-url"))


if __name__ == "__main__":
    unittest.main()
