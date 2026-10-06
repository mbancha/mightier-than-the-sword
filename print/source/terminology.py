import re

def wording(s):
    if not isinstance(s,str): return s
    parts=re.split(r'(<[^>]*>|\[[^\]]*\])',s)
    for i in range(0,len(parts),2):
        t=parts[i]
        t=t.replace('unlocks that row level','improves that row level').replace('unlocks its board row','improves its board row')
        t=t.replace('unlock the next reserve','release the next reserve')
        t=re.sub(r'\bunlock(ing|ed|s)?\b',lambda m: ('Foreshadow' if m[0][0].isupper() else 'foreshadow')+(m[1] or ''),t,flags=re.I)
        t=t.replace("the ink's owner", "the Inkling's owner")
        t=re.sub(r'\b1 supply ink\b','1 supply Inkling',t,flags=re.I)
        t=re.sub(r'\bper ink\b','per Inkling',t,flags=re.I)
        t=re.sub(r'\bink\b','Inklings',t,flags=re.I)
        t=re.sub(r'\binklings?\b',lambda m:'Inkling' if m[0].lower()=='inkling' else 'Inklings',t,flags=re.I)
        t=t.replace('Inklings is','Inklings are').replace('Inklings stays','Inklings stay')
        t=t.replace('one of your Inklings are','one of your Inklings is')
        t=t.replace("Erase returns Inklings to its owner's", "Erase returns Inklings to their owner's")
        t=t.replace('Place Inklings in an empty numbered space','Place each Inkling in an empty numbered space')
        t=t.replace('until Inklings are placed there','until an Inkling is placed there')
        t=t.replace('Whenever Inklings are PLACED','Whenever an Inkling is PLACED')
        t=t.replace('the reward Inklings','the reward Inkling')
        t=t.replace('overflow on your Quill\'s page','overflow at your Quill\'s book')
        t=t.replace('Suspend sends it to', 'Suspend sends an Inkling to')
        parts[i]=t
    return ''.join(parts)
