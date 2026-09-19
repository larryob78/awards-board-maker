import copy
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest

from learn_principles import TIER_WEIGHTS, award_evidence, choose_sample, validate_principles


def fixture():
    records, scans = {}, []
    for group, tier in enumerate(TIER_WEIGHTS):
        for index in range(8):
            identifier = f'{group}-{index}'
            records[identifier] = {'id': identifier, 'path': Path(identifier + '.jpg'), 'award': tier,
                                   'year': str(2020 + index % 5)}
            scans.append({'file': identifier + '.jpg', 'brightness': index / 8,
                          'saturation': (7-index) / 8, 'entropy': index,
                          'edge_density': (index * 3 % 8) / 8, 'width': 800 + index * 200, 'height': 1000})
    return SimpleNamespace(records=records), scans


class SamplingTests(unittest.TestCase):
    def test_balanced_high_award_and_comparison_cohorts(self):
        corpus, scans = fixture()
        selected = choose_sample(corpus, scans, 16)
        counts = {tier: sum(corpus.records[i]['award'] == tier for i in selected) for tier in TIER_WEIGHTS}
        self.assertEqual(counts, TIER_WEIGHTS)
        self.assertEqual(len(set(selected)), 16)
        self.assertGreater(len({i.split('-')[1] for i in selected}), 3)

    def test_deterministic_and_order_independent(self):
        corpus, scans = fixture()
        selected = choose_sample(corpus, scans)
        corpus.records = dict(reversed(list(corpus.records.items())))
        self.assertEqual(selected, choose_sample(corpus, list(reversed(scans))))

    def test_small_empty_and_unreadable_corpora(self):
        corpus, scans = fixture()
        self.assertEqual(choose_sample(corpus, [], 16), [])
        self.assertEqual(choose_sample(corpus, scans, 0), [])
        self.assertEqual(len(choose_sample(corpus, scans, 4)), 4)
        limited = [{**s, 'error': 'broken'} if n else s for n, s in enumerate(scans)]
        self.assertEqual(choose_sample(corpus, limited, 16), ['0-0'])
        self.assertEqual(len(choose_sample(corpus, scans, 100)), 48)

    def test_awards_resolved_from_exact_sources_without_ambiguous_join(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            metadata = root / 'metadata.csv'
            metadata.write_text('id,bronzeLion,campaignUrl\n1,1,https://www.lovethework.com/campaign/1\n')
            entries = root / 'campaigns.json'
            entries.write_text(json.dumps([
                {'title': 'First', 'year': 2025, 'awardLevel': 'Silver', 'url': 'https://www.lovethework.com/entry/11'},
                {'title': 'First', 'year': 2024, 'awardLevel': 'Grand Prix', 'url': 'https://www.lovethework.com/entry/12'},
                {'title': 'Duplicate', 'year': 2025, 'awardLevel': 'Gold', 'url': 'https://www.lovethework.com/entry/13'},
                {'title': 'First', 'year': 2025, 'awardLevel': 'Grand Prix', 'url': 'https://untrusted.example/entry/14'},
            ]))
            corpus = SimpleNamespace(records={
                '1': {'title': 'First', 'year': '2025', 'award': 'Shortlisted'},
                '2': {'title': 'Duplicate', 'year': '2025', 'award': ''},
                '3': {'title': 'Duplicate', 'year': '2025', 'award': ''},
            })
            evidence = award_evidence(corpus, {'metadata_csv': str(metadata), 'campaign_json': str(entries)})
            self.assertEqual(evidence['1']['tier'], 'Silver')
            self.assertEqual(evidence['1']['sources'], ['https://www.lovethework.com/entry/11'])
            self.assertEqual(evidence['2']['tier'], 'Unknown')
            self.assertEqual(evidence['3']['tier'], 'Unknown')


class ProvenanceTests(unittest.TestCase):
    def setUp(self):
        categories = ['typography'] * 3 + ['writing'] * 3 + ['layout'] * 2 + ['evidence']
        self.result = {'principles': [
            {'id': f'learned-{index}', 'rule': 'Use hierarchy.', 'when_to_use': 'When a headline leads.',
             'avoid': 'Avoid dense copy.', 'observation': 'The headline precedes smaller supporting text.',
             'category': category, 'reference_ids': ['sample-1']}
            for index, category in enumerate(categories)]}

    def test_valid(self):
        self.assertEqual(len(validate_principles(self.result, ['sample-1'])), 9)

    def test_invalid_provenance_or_duplicate_ids(self):
        for value in ['sample-1', [], ['other'], ['sample-1'] * 2, [1], [['sample-1']]]:
            result = copy.deepcopy(self.result)
            result['principles'][0]['reference_ids'] = value
            with self.assertRaises(ValueError):
                validate_principles(result, ['sample-1'])
        for value in ['hierarchy', 'learned-1', 'Invalid_Id']:
            result = copy.deepcopy(self.result)
            result['principles'][0]['id'] = value
            with self.assertRaises(ValueError):
                validate_principles(result, ['sample-1'])

    def test_missing_craft_coverage_or_observation_rejected(self):
        for key, value in [('category', 'layout'), ('observation', ''), ('rule', 'a' * 451)]:
            result = copy.deepcopy(self.result)
            result['principles'][0][key] = value
            with self.assertRaises(ValueError):
                validate_principles(result, ['sample-1'])


if __name__ == '__main__':
    unittest.main()
