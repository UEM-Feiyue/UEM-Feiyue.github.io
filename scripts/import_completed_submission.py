#!/usr/bin/env python3
"""Import one reviewed, structured GitHub Issue as a static Markdown article."""
import base64
import json
import os
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = json.loads((ROOT / "data/schema.json").read_text(encoding="utf-8"))
OUTPUT = ROOT / "content" / "submissions"
MARKER = re.compile(r"^<!-- uem-submission-v1:([A-Za-z0-9_-]{1,24000}) -->$", re.M)


def validate(data):
    if not isinstance(data, dict) or data.get("version") != 1:
        raise ValueError("Unsupported submission version")
    allowed = {"version", "category"} | {field["name"] for field in SCHEMA["fields"]}
    if set(data) != allowed:
        raise ValueError("Unexpected or missing submission field")
    if data["category"] not in {cat["id"] for cat in SCHEMA["categories"]}:
        raise ValueError("Unknown category")
    for field in SCHEMA["fields"]:
        value = data[field["name"]]
        if not isinstance(value, str):
            raise ValueError("Field must be text: " + field["name"])
        if field.get("required") and not value.strip():
            raise ValueError("Required field empty: " + field["name"])
        if len(value) > field.get("maxLength", 20000):
            raise ValueError("Field too long: " + field["name"])
        if re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", value):
            raise ValueError("Control character in submission")
        if field.get("pattern") and value and not re.fullmatch(field["pattern"], value):
            raise ValueError("Invalid field pattern: " + field["name"])
    if not 20 <= len(data["body"].strip()) <= 12000:
        raise ValueError("Invalid article length")
    if len(data["contact"]) > 4000:
        raise ValueError("Contact too long")


def import_event(event, directory=OUTPUT):
    issue = event.get("issue", {})
    number = issue.get("number")
    if not (isinstance(number, int) and 1 <= number <= 9999999 and
            issue.get("state") == "closed" and issue.get("state_reason") == "completed" and
            isinstance(issue.get("title"), str) and
            issue["title"].startswith("[飞跃投稿] ") and
            not re.search(r"TEST ONLY|DO NOT PUBLISH", issue["title"], re.I)):
        raise ValueError("Not an eligible completed submission")
    body = issue.get("body")
    if not isinstance(body, str):
        raise ValueError("Missing Issue body")
    matches = MARKER.findall(body)
    if len(matches) != 1:
        raise ValueError("Expected exactly one structured submission marker")
    token = matches[0]
    try:
        decoded = base64.b64decode(token + "=" * (-len(token) % 4), altchars=b"-_", validate=True)
        data = json.loads(decoded.decode("utf-8"))
    except (ValueError, UnicodeError) as exc:
        raise ValueError("Invalid structured payload") from exc
    validate(data)
    category_label = next(cat["label"] for cat in SCHEMA["categories"]
                          if cat["id"] == data["category"])
    expected = "[飞跃投稿] [" + category_label + "] " + data["author"].strip() + " — " + data["destination"].strip()
    if issue["title"] != expected[:200]:
        raise ValueError("Title does not match structured payload")
    if (data["body"].strip() not in body or
            "**署名：** " + data["author"].strip() not in body or
            "**去向：** " + data["destination"].strip() not in body):
        raise ValueError("Visible Issue body differs from structured payload")
    destination = Path(directory) / ("issue-" + str(number) + ".md")
    meta = {key: data[key].strip() for key in
            ("category", "author", "year", "destination", "program", "contact")
            if data[key].strip()}
    meta["source_issue"] = number
    article = "---\n" + yaml.safe_dump(meta, allow_unicode=True, sort_keys=False) + "---\n\n" + data["body"].strip() + "\n"
    if destination.exists():
        # Rerunning an approved event cannot mutate a published story.
        return "already-published", destination
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(article, encoding="utf-8")
    return "published", destination


def main():
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    if not event_path:
        raise ValueError("GITHUB_EVENT_PATH is required")
    event = json.loads(Path(event_path).read_text(encoding="utf-8"))
    status, path = import_event(event)
    print(status + ": " + str(path.relative_to(ROOT)))
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as out:
            out.write("recorded=true\n")
            out.write("status=" + status + "\n")


if __name__ == "__main__":
    main()
