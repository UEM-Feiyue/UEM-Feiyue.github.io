"""Security and idempotency checks for the Issue-to-Markdown publisher."""
import base64
import json
import tempfile
import unittest
from pathlib import Path
from importlib.util import module_from_spec, spec_from_file_location

ROOT = Path(__file__).resolve().parents[1]
spec = spec_from_file_location("importer", ROOT / "scripts/import_completed_submission.py")
importer = module_from_spec(spec)
spec.loader.exec_module(importer)


def event(number=81, **changes):
    data = dict(version=1, category="career", author="张同学",
                year="2026", destination="某公司", program="产品经理",
                body="## 准备过程\n\n这是一篇用于测试完整投稿流程的示例文章。", contact="")
    data.update(changes)
    encoded = base64.urlsafe_b64encode(json.dumps(data, ensure_ascii=False).encode()).decode().rstrip("=")
    body = ("**署名：** " + data["author"] + "\n**去向：** " + data["destination"] +
            "\n\n" + data["body"] + "\n<!-- uem-submission-v1:" + encoded + " -->")
    return dict(issue=dict(number=number,state="closed",state_reason="completed",
                           title="[飞跃投稿] [就业] " + data["author"] + " — " + data["destination"],
                           body=body))


class ImportTests(unittest.TestCase):
    def test_publish_and_deduplicate(self):
        with tempfile.TemporaryDirectory() as d:
            status, path = importer.import_event(event(), d)
            self.assertEqual(status, "published")
            self.assertEqual(path.name, "issue-81.md")
            source = path.read_text()
            self.assertIn("source_issue: 81", source)
            self.assertIn("destination: 某公司", source)
            self.assertEqual(importer.import_event(event(), d)[0], "already-published")

    def test_rejected_close_cannot_publish(self):
        with tempfile.TemporaryDirectory() as d:
            sample = event()
            sample["issue"]["state_reason"] = "not_planned"
            with self.assertRaises(ValueError):
                importer.import_event(sample, d)

    def test_tampered_payload_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            sample = event()
            sample["issue"]["title"] = "[飞跃投稿] [就业] 恶意更改"
            with self.assertRaises(ValueError):
                importer.import_event(sample, d)

    def test_category_year_and_length_validated(self):
        for extra in ({"category":"invalid"}, {"year":"bad"}, {"body":"短"}, {"author":""}):
            with self.subTest(extra=extra), tempfile.TemporaryDirectory() as d:
                sample = event(**extra)
                with self.assertRaises(ValueError):
                    importer.import_event(sample, d)

    def test_no_markers_or_test_issue(self):
        with tempfile.TemporaryDirectory() as d:
            sample = event()
            sample["issue"]["body"] = "Ordinary issue"
            with self.assertRaises(ValueError):
                importer.import_event(sample, d)
            sample = event()
            sample["issue"]["title"] += " TEST ONLY"
            with self.assertRaises(ValueError):
                importer.import_event(sample, d)


if __name__ == "__main__":
    unittest.main()
