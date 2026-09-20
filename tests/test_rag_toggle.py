"""Scope-locked Cannes RAG toggle: ON retrieves <=3 boards; OFF retrieves none."""
import unittest
from unittest.mock import MagicMock, patch

from design_engine import create_board, validate_input
from writing_engine import refine_copy


class RagToggleTests(unittest.TestCase):
    def setUp(self):
        self.inputs = {
            'brand': 'REFILL',
            'campaign': 'The next refill',
            'brief': 'People forget reusable bottles at festivals. REFILL placed refill stations and clear signs so refilling was the easiest next step.',
            'results': 'Festival partners reported fuller refill station use across the weekend.',
            'mandatories': '',
            'direction': 'Editorial and clear',
            'color': '#dc5737',
            'has_image': False,
        }
        self.corpus = MagicMock()
        self.corpus.config = {'model': 'gemini-3.6-flash'}
        self.corpus.search.return_value = [
            {'id': '1', 'title': 'Ref One', 'source': 'https://lovethework.com/a', 'year': '2024',
             'filename': '2024_1_Ref_One.jpg', 'thumbnail': '/api/boards/1/thumbnail'},
            {'id': '2', 'title': 'Ref Two', 'source': 'https://lovethework.com/b', 'year': '2023',
             'filename': '2023_2_Ref_Two.jpg', 'thumbnail': '/api/boards/2/thumbnail'},
            {'id': '3', 'title': 'Ref Three', 'source': 'https://lovethework.com/c', 'year': '2022',
             'filename': '2022_3_Ref_Three.jpg', 'thumbnail': '/api/boards/3/thumbnail'},
            {'id': '4', 'title': 'Ref Four', 'source': 'https://lovethework.com/d', 'year': '2021',
             'filename': '2021_4_Ref_Four.jpg', 'thumbnail': '/api/boards/4/thumbnail'},
        ]
        self.corpus.image.return_value = b'jpeg-bytes'
        self.corpus.records = {}

    def _valid_draft(self):
        return {
            'headline': 'Make refill the easiest next step',
            'subhead': 'Festival signs and stations removed the friction.',
            'context': 'People forget reusable bottles at festivals.',
            'insight': 'Forgetfulness may block reuse more than unwillingness.',
            'idea': 'Place refill stations and clear signs where people already buy drinks.',
            'execution': 'REFILL placed refill stations and clear signs at food stalls.',
            'rationale': 'Editorial layout keeps the idea dominant and proof quiet.',
            'layout': 'editorial',
            'principle_ids': ['hierarchy', 'restraint'],
            'missing': [],
            'support': {
                'context': 'People forget reusable bottles at festivals.',
                'insight': 'People forget reusable bottles at festivals.',
                'idea': 'REFILL placed refill stations and clear signs so refilling was the easiest next step.',
                'execution': 'REFILL placed refill stations and clear signs so refilling was the easiest next step.',
            },
        }

    def test_validate_input_accepts_use_rag(self):
        payload = dict(self.inputs, use_rag=False)
        result = validate_input(payload)
        self.assertIs(result['use_rag'], False)

    @patch('design_engine.model_json')
    @patch('design_engine.library')
    def test_rag_on_retrieves_at_most_three(self, library, model_json):
        library.return_value = {'version': 't', 'principles': [
            {'id': 'hierarchy', 'rule': 'One dominant idea'},
            {'id': 'restraint', 'rule': 'Generous margins'},
        ], 'coverage': {}}
        model_json.return_value = self._valid_draft()
        draft = create_board(self.corpus, dict(self.inputs, use_rag=True), 'key')
        self.corpus.search.assert_called_once()
        self.assertEqual(draft['rag_mode'], 'RAG-ON')
        self.assertTrue(draft['use_rag'])
        self.assertLessEqual(len(draft['provenance']), 3)
        self.assertEqual(len(draft['provenance']), 3)
        self.assertEqual(self.corpus.image.call_count, 3)
        for item in draft['provenance']:
            self.assertIn('filename', item)
            self.assertIn('thumbnail', item)

    @patch('design_engine.model_json')
    @patch('design_engine.library')
    def test_rag_off_skips_retrieval(self, library, model_json):
        library.return_value = {'version': 't', 'principles': [
            {'id': 'hierarchy', 'rule': 'One dominant idea'},
            {'id': 'restraint', 'rule': 'Generous margins'},
        ], 'coverage': {}}
        model_json.return_value = self._valid_draft()
        draft = create_board(self.corpus, dict(self.inputs, use_rag=False), 'key')
        self.corpus.search.assert_not_called()
        self.corpus.image.assert_not_called()
        self.assertEqual(draft['rag_mode'], 'RAG-OFF')
        self.assertFalse(draft['use_rag'])
        self.assertEqual(draft['provenance'], [])
        prompt = model_json.call_args.args[2]
        self.assertIn('RAG is OFF', prompt)

    @patch('writing_engine.model_json')
    @patch('writing_engine.library')
    def test_writing_rag_off_skips_reference_search(self, library, model_json):
        library.return_value = {'principles': []}
        model_json.return_value = {
            'proposed_text': 'Make refill the easiest next step at the stall.',
            'rationale': 'Sharpens the action without new claims.',
            'evidence': [{'source': 'brief', 'excerpt': 'REFILL placed refill stations and clear signs so refilling was the easiest next step.'}],
            'missing': [],
            'is_interpretation': False,
        }
        self.corpus.search.return_value = []
        result = refine_copy(self.corpus, {
            'campaign': {k: self.inputs[k] for k in ('brand', 'campaign', 'brief', 'results', 'mandatories')},
            'field': 'headline',
            'current_text': 'Make refill the easiest next step',
            'action': 'sharpen',
            'intent': '',
            'results_verified': True,
            'use_rag': False,
        }, 'key')
        self.corpus.search.assert_not_called()
        self.assertEqual(result['rag_mode'], 'RAG-OFF')
        self.assertEqual(result['provenance'], [])


if __name__ == '__main__':
    unittest.main()
