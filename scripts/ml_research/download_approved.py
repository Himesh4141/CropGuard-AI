#!/usr/bin/env python3
"""Opt-in download for manually licensed/approved images, never run by installer.

Input CSV: https_url,license,sha256,filename,rights_reviewed
Only explicit rights_reviewed=yes and independently verified hash are fetched.
Does not scrape third-party services or assume dataset names imply reuse rights.
"""
from __future__ import annotations
import argparse, csv, hashlib, re
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from manifest_audit import ACCEPTABLE
MAX_BYTES=25*1024*1024

def fetch(row:dict[str,str],destination:Path):
    url=row['https_url'].strip();p=urlparse(url)
    if p.scheme!='https' or not p.hostname or p.username or p.password:
        raise ValueError('Only explicit HTTPS links without embedded credentials are accepted')
    if row['rights_reviewed'].lower().strip()!='yes' or row['license'].strip() not in ACCEPTABLE:
        raise ValueError('Rights/license review is required before fetching')
    expected=row['sha256'].strip().lower()
    if not re.fullmatch('[a-f0-9]{64}',expected):raise ValueError('Expected SHA256 required')
    name=Path(row['filename']).name
    if name!=row['filename'] or name in {'','.','..'}:raise ValueError('Unsafe filename')
    target=destination/name
    if target.exists():raise FileExistsError('Refusing overwrite: '+name)
    with urlopen(Request(url,headers={'User-Agent':'CropGuard-research-manual/1.0'}),timeout=30) as response:
        if urlparse(response.geturl()).scheme!='https':raise ValueError('Redirected to insecure HTTP')
        if response.headers.get('Content-Length') and int(response.headers['Content-Length'])>MAX_BYTES:raise ValueError('File too large')
        content=response.read(MAX_BYTES+1)
    if len(content)>MAX_BYTES:raise ValueError('File too large')
    if hashlib.sha256(content).hexdigest()!=expected:raise ValueError('SHA256 mismatch; rejected')
    destination.mkdir(parents=True,exist_ok=True);target.write_bytes(content)
    return target

def main():
    p=argparse.ArgumentParser();p.add_argument('approved_manifest',type=Path);p.add_argument('output_dir',type=Path);args=p.parse_args()
    with args.approved_manifest.open(encoding='utf-8-sig',newline='') as fd:
        reader=csv.DictReader(fd);req={'https_url','license','sha256','filename','rights_reviewed'}
        if not req.issubset(reader.fieldnames or []):raise ValueError('Missing explicit license approval/hash columns')
        rows=list(reader)
    for row in rows:print('VERIFIED DOWNLOAD:',fetch(row,args.output_dir))
if __name__=='__main__': main()
