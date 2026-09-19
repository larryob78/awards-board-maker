#!/usr/bin/env python3
"""Internal copy counts only; does not assert any festival portal's algorithm."""
import argparse
import json
import unicodedata
from pathlib import Path


def counts(text):
    normal = unicodedata.normalize('NFC', text.replace('\r\n', '\n').replace('\r', '\n'))
    return {
        'words': sum(any(c.isalnum() for c in token) for token in normal.split()),
        'characters': len(normal),
        'method': 'internal-nfc-whitespace-alnum-v1',
        'portal_verified': False,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file', type=Path, nargs='?', help='UTF-8 plain text, not HTML')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        cases = [('', 0, 0), ('clear-cut idea', 2, 14), ('Cafe\u0301 — 25%', 2, 10),
                 ('a\r\nb', 2, 3), ('one\u00a0two', 2, 7), ('東京', 1, 2)]
        for text, words, chars in cases:
            got = counts(text)
            assert (got['words'], got['characters']) == (words, chars), (text, got)
        print('PASS: 6 counting convention cases. No portal equivalence claimed.')
    if args.file:
        print(json.dumps(counts(args.file.read_text(encoding='utf-8')), indent=2))
    elif not args.self_test:
        parser.error('provide a text file or --self-test')


if __name__ == '__main__':
    main()
