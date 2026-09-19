"""Writing proposals are grounded, bounded and never silently applied."""
import copy
import json
import unittest
from unittest.mock import patch

from writing_engine import refine_copy


class FakeCorpus:
    config = {'model': 'test-model'}
    records = {
        'bronze': {'title': 'Bronze example', 'award': 'Bronze', 'source': 'https://example.test/bronze',
                   'description': 'Explain a concrete problem then describe the mechanism and prove the outcome.'},
        'gold': {'title': 'Gold example', 'award': 'Gold', 'source': 'https://example.test/gold',
                 'text_source': 'https://example.test/gold-text',
                 'description': 'An inventive trail of little lights brought the empty street back to life.'},
        'empty': {'title': 'Metadata only', 'award': 'Grand Prix', 'description': ''},
    }

    def search(self, query):
        return [{'id': value} for value in ('bronze', 'gold', 'empty')]


class WritingTests(unittest.TestCase):
    def setUp(self):
        library_patch = patch('writing_engine.library', return_value={'principles': [{'id': 'test-writing', 'category': 'writing', 'rule': 'Use concise, grounded copy.'}]})
        library_patch.start()
        self.addCleanup(library_patch.stop)
        self.data = {
            'campaign': {'brand': 'Corner', 'campaign': 'Open Tables',
                         'brief': 'Corner opened its empty cafe tables to local community groups after closing time.',
                         'results': 'Attendance grew 10% during May. We hosted 12 community groups.'},
            'field': 'idea', 'action': 'sharpen',
            'current_text': 'We let local community groups use empty tables after we closed.'}
        self.raw = {
            'proposed_text': 'Open empty cafe tables to local groups after hours.',
            'rationale': 'Starts with the action and keeps the mechanism clear.',
            'evidence': [{'source': 'brief', 'excerpt': 'Corner opened its empty cafe tables to local community groups after closing time.'}],
            'missing': [], 'is_interpretation': False}

    def run_proposal(self, raw=None, data=None):
        with patch('writing_engine.model_json', return_value=copy.deepcopy(self.raw if raw is None else raw)) as model:
            answer = refine_copy(FakeCorpus(), copy.deepcopy(self.data if data is None else data), 'fake-key')
            return answer, model

    def test_grounded_proposal_is_review_only_and_award_aware(self):
        original = copy.deepcopy(self.data)
        result, model = self.run_proposal()
        self.assertEqual(self.data, original)
        self.assertEqual(result['proposed_text'], self.raw['proposed_text'])
        self.assertIn('review before applying', result['review_state'])
        self.assertEqual(result['provenance'][0]['id'], 'gold')
        self.assertEqual(result['provenance'][0]['source'], 'https://example.test/gold-text')
        self.assertNotIn('empty', [r['id'] for r in result['provenance']])
        sent = json.loads(model.call_args.args[3][0]['text'])
        self.assertEqual(sent['original_campaign_facts']['results'], '')
        self.assertEqual(sent['current_copy_not_evidence'], self.data['current_text'])
        self.assertEqual(sent['sampled_writing_principles'][0]['id'], 'test-writing')
        self.assertNotIn('excerpt', result['provenance'][0])

    def test_invented_support_and_current_draft_as_evidence_fail(self):
        for source, excerpt in [('brief', 'Research proved everyone wanted this.'),
                                ('current_text', self.data['current_text'])]:
            raw = copy.deepcopy(self.raw)
            raw['evidence'] = [{'source': source, 'excerpt': excerpt}]
            with self.subTest(source=source), self.assertRaisesRegex(RuntimeError, 'current copy is unchanged'):
                self.run_proposal(raw)

    def test_numeric_claim_and_changed_unit_fail(self):
        for text in ['We hosted 99 groups.', 'We hosted 12 million community groups.']:
            raw = {**self.raw, 'proposed_text': text}
            with self.subTest(text=text), self.assertRaisesRegex(RuntimeError, 'number or numeric unit'):
                self.run_proposal(raw)

    def test_reference_copy_cannot_be_laundered_as_campaign_copy(self):
        raw = {**self.raw, 'proposed_text': 'An inventive trail of little lights brought the empty street back to life.'}
        with self.assertRaisesRegex(RuntimeError, 'repeats reference campaign wording'):
            self.run_proposal(raw)

    def test_insight_always_marked_interpretation(self):
        result, _ = self.run_proposal(data={**self.data, 'field': 'insight'})
        self.assertTrue(result['is_interpretation'])
        self.assertIn('Suggested interpretation', result['review_state'])
        self.assertTrue(any('Confirm this interpretation' in note for note in result['missing']))

    def test_results_require_explicit_verification_before_provider_call(self):
        with patch('writing_engine.model_json') as model:
            with self.assertRaisesRegex(ValueError, 'verified results'):
                refine_copy(FakeCorpus(), {**self.data, 'field': 'results'}, 'fake-key')
            model.assert_not_called()

    def test_results_can_select_complete_supplied_claims(self):
        raw = {**self.raw, 'proposed_text': 'Attendance grew 10% during May.',
               'evidence': [{'source': 'results', 'excerpt': 'Attendance grew 10% during May.'}]}
        result, _ = self.run_proposal(raw, {**self.data, 'field': 'results', 'results_verified': True})
        self.assertEqual(result['proposed_text'], raw['proposed_text'])

    def test_results_cannot_swap_known_metrics_or_drop_timeframe(self):
        for text in ['Attendance grew 12% during May.', 'Attendance grew 10%.',
                     'We hosted 10% community groups.']:
            raw = {**self.raw, 'proposed_text': text,
                   'evidence': [{'source': 'results', 'excerpt': self.data['campaign']['results']}]}
            with self.subTest(text=text), self.assertRaises(RuntimeError):
                self.run_proposal(raw, {**self.data, 'field': 'results', 'results_verified': True})

    def test_shorten_cannot_lengthen(self):
        with self.assertRaisesRegex(RuntimeError, 'longer'):
            self.run_proposal(data={**self.data, 'action': 'shorten', 'current_text': 'Open tables.'})

    def test_malformed_inputs_never_call_provider(self):
        cases = [{**self.data, 'field': []}, {**self.data, 'action': 'invent'},
                 {**self.data, 'intent': ['anything']}, {**self.data, 'results_verified': 'true'},
                 {**self.data, 'unknown': True}, {**self.data, 'current_text': 'x' * 2001}]
        with patch('writing_engine.model_json') as model:
            for data in cases:
                with self.subTest(data=data), self.assertRaises(ValueError):
                    refine_copy(FakeCorpus(), data, 'fake-key')
            model.assert_not_called()

    def test_malformed_output_and_length_limits_reject(self):
        for change in [{'proposed_text': 'x' * 281}, {'evidence': []}, {'missing': 'none'},
                       {'is_interpretation': 'false'}, {'unexpected': 'field'}]:
            with self.subTest(change=change), self.assertRaises(RuntimeError):
                self.run_proposal({**self.raw, **change})

    def test_no_relevant_descriptions_reports_foundation_only(self):
        corpus = FakeCorpus()
        corpus.records = {}
        with patch('writing_engine.model_json', return_value=copy.deepcopy(self.raw)):
            result = refine_copy(corpus, self.data, 'fake-key')
        self.assertEqual(result['provenance'], [])
        self.assertIn('no relevant corpus descriptions', result['learning_basis'])


if __name__ == '__main__':
    unittest.main()
