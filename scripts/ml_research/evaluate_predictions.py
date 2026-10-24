#!/usr/bin/env python3
"""Evaluate *held-out*, human-labeled predictions; never train on test samples.
CSV: true_label,predicted_label,confidence,source_group
Use predicted_label=UNKNOWN when the model abstained or rejected an OOD image.
"""
from __future__ import annotations
from collections import Counter
import argparse,csv,json,math
from pathlib import Path

def evaluate(rows:list[dict[str,str]]) -> dict:
    if not rows:raise ValueError('Empty evaluation set')
    labels=set();groups=set();bins=[[] for _ in range(10)];pairs=[]
    for r in rows:
        actual=r['true_label'].strip();pred=r['predicted_label'].strip();source=r['source_group'].strip()
        if not actual or not pred or not source:raise ValueError('Missing label/source group')
        confidence=float(r['confidence'])
        if not math.isfinite(confidence) or confidence<0 or confidence>1:raise ValueError('Invalid model score')
        labels.add(actual); labels.add(pred);groups.add(source)
        pairs.append((actual,pred,confidence));bins[min(9,int(confidence*10))].append((confidence,float(actual==pred)))
    metrics={}
    for label in sorted(labels):
        tp=sum(a==label and p==label for a,p,_ in pairs);fp=sum(a!=label and p==label for a,p,_ in pairs);fn=sum(a==label and p!=label for a,p,_ in pairs)
        precision=tp/(tp+fp) if tp+fp else 0;recall=tp/(tp+fn) if tp+fn else 0
        f1=2*precision*recall/(precision+recall) if precision+recall else 0
        metrics[label]={'support':tp+fn,'precision':round(precision,4),'recall':round(recall,4),'f1':round(f1,4)}
    ece=sum(len(b)/len(rows)*abs(sum(x for x,_ in b)/len(b)-sum(a for _,a in b)/len(b)) for b in bins if b)
    unknown=[(a,p) for a,p,_ in pairs if a=='UNKNOWN']
    return {'total':len(rows),'source_groups':len(groups),'macro_f1':round(sum(m['f1'] for m in metrics.values())/len(metrics),4),
        'raw_score_ece':round(ece,4),'unknown_rejection_rate':(sum(p=='UNKNOWN' for a,p in unknown)/len(unknown) if unknown else None),
        'classes':metrics,'caution':'Only as credible as held-out labels, groups and sample provenance. Scores must NOT be marketed as calibrated without independent confirmation.'}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('heldout_csv',type=Path);args=ap.parse_args()
    with args.heldout_csv.open(encoding='utf8',newline='') as f:out=evaluate(list(csv.DictReader(f)))
    print(json.dumps(out,indent=2))
if __name__=='__main__':main()
