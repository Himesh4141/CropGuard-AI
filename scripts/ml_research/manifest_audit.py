#!/usr/bin/env python3
"""Offline ML image manifest validator. NEVER downloads datasets or trains a model.

CSV columns: path,source,license,group_id,species,disease,split.
'license' must be independently reviewed; this tool rejects blank/restricted values.
'Split' must be one of train,val,test; source group must occur in only one split.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path

ACCEPTABLE = {"CC0-1.0", "CC-BY-4.0", "CC-BY-SA-4.0", "CC-BY-3.0", "CC-BY-SA-3.0"}
REQUIRED = {"path", "source", "license", "group_id", "species", "disease", "split"}

def audit(manifest: Path) -> dict:
    groups: dict[str,set[str]] = defaultdict(set)
    hashes: dict[str,str] = {}
    total = 0
    problems = []
    with manifest.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        missing = REQUIRED - set(reader.fieldnames or [])
        if missing: raise ValueError("Missing columns: " + ", ".join(sorted(missing)))
        for line, row in enumerate(reader, 2):
            total += 1
            path = Path(row["path"])
            if not path.is_absolute(): path = manifest.parent / path
            if not path.is_file(): problems.append(f"line {line}: file missing"); continue
            if row["license"].strip() not in ACCEPTABLE:
                problems.append(f"line {line}: license requires independent review")
            if not all(row[k].strip() for k in ("source","group_id","species","disease")):
                problems.append(f"line {line}: missing provenance or label")
            split = row["split"].strip().lower()
            if split not in {"train","val","test"}: problems.append(f"line {line}: invalid split")
            groups[row["source"] + "|" + row["group_id"]].add(split)
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest in hashes and hashes[digest] != split:
                problems.append(f"line {line}: identical image appears in different splits")
            hashes[digest] = split
    for group, splits in groups.items():
        if len(splits) > 1: problems.append("group leaks between splits: " + group)
    return {"images":total,"groups":len(groups),"issues":problems,"passed":not problems,
            "warning":"Licenses and labels need human verification; this script cannot establish real-world accuracy."}

def main():
    p = argparse.ArgumentParser(); p.add_argument("manifest", type=Path)
    args=p.parse_args()
    try: result=audit(args.manifest)
    except (OSError,ValueError) as exc: result={"passed":False,"issues":[str(exc)]}
    print(json.dumps(result,indent=2))
    return 0 if result["passed"] else 1
if __name__ == "__main__": raise SystemExit(main())
