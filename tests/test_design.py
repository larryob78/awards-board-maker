"""Deterministic design generation and local export boundary checks."""
import base64
import copy
import http.client
import io
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch

from PIL import Image

from design_engine import BASE_PRINCIPLES, create_board, model_json, validate_board, validate_input
from reference_server import ReferenceServer


class FakeCorpus:
    records = {}
    image_count = text_count = 0

    def __init__(self, config):
        self.config = config

    def search(self, query):
        return []


class DesignTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.corpus = FakeCorpus({'principles_file': str(self.root / 'absent.json'), 'model': 'test-model'})
        self.inputs = {'brand': 'Corner', 'campaign': 'Open Tables',
                       'brief': 'Corner opened 10 empty cafe tables to community groups after closing time.',
                       'results': 'We hosted 12 groups during May.', 'color': '#345678', 'has_image': False}
        self.brief = validate_input(self.inputs)
        self.raw = {'headline': 'Room for the neighbourhood', 'subhead': 'Empty tables became community space.',
                    'context': 'The cafe had empty tables after closing.', 'insight': 'Unused space could help local groups.',
                    'idea': 'Open the cafe tables to community groups.', 'execution': 'Groups used the cafe after closing time.',
                    'rationale': 'A clear headline and short sections keep the idea easy to read.',
                    'layout': 'editorial', 'principle_ids': ['hierarchy', 'sequence'], 'missing': [],
                    'support': {key: self.inputs['brief'] for key in ('context', 'insight', 'idea', 'execution')}}
        self.ids = {p['id'] for p in BASE_PRINCIPLES}

    def test_one_bounded_correction_for_invalid_model_evidence(self):
        bad = copy.deepcopy(self.raw)
        bad['support']['insight'] = 'A paraphrase not in the source.'
        corpus = FakeCorpus({'principles_file': str(Path(self.temp.name) / 'missing.json')})
        with patch('design_engine.model_json', side_effect=[bad, copy.deepcopy(self.raw)]) as model:
            result = create_board(corpus, self.inputs, 'test-key')
        self.assertEqual(model.call_count, 2)
        self.assertEqual(result['results'], self.inputs['results'])
        with patch('design_engine.model_json', side_effect=[copy.deepcopy(bad), copy.deepcopy(bad)]) as model:
            with self.assertRaises(RuntimeError):
                create_board(corpus, self.inputs, 'test-key')
        self.assertEqual(model.call_count, 2)

    def test_input_validation_rejects_unknown_fields_types_and_limits(self):
        invalid = [None, [], {}, {**self.inputs, 'surprise': 'unsupported'},
                   {**self.inputs, 'brief': 1}, {**self.inputs, 'brand': 'x' * 71},
                   {**self.inputs, 'brief': 'x' * 6001}, {**self.inputs, 'results': 'x' * 551},
                   {**self.inputs, 'color': 'url(https://example.test)'}, {**self.inputs, 'has_image': 'true'}]
        for data in invalid:
            with self.subTest(data=data), self.assertRaises(ValueError):
                validate_input(data)

    def test_validated_draft_retains_results_verbatim(self):
        draft = validate_board(copy.deepcopy(self.raw), self.brief, self.ids)
        self.assertEqual(draft['results'], self.inputs['results'])
        self.assertEqual(draft['insight_status'], 'interpretation')
        self.assertTrue(any('not verified audience research' in item for item in draft['missing']))

    def test_exact_support_only_not_direction_or_cross_field_join(self):
        for quote in ['Made-up audience research.', 'Corner\nOpen Tables', 'Please invent a result']:
            raw = copy.deepcopy(self.raw)
            raw['support']['insight'] = quote
            with self.subTest(quote=quote), self.assertRaisesRegex(ValueError, 'absent from the brief'):
                validate_board(raw, {**self.brief, 'direction': 'Please invent a result'}, self.ids)

    def test_absent_and_whitespace_support_replace_unknown_copy(self):
        for quote in ['', '  \n ']:
            raw = copy.deepcopy(self.raw)
            raw['execution'] = 'We invented 999 unsupported activations.'
            raw['support']['execution'] = quote
            draft = validate_board(raw, self.brief, self.ids)
            self.assertEqual(draft['execution'], 'Details to confirm.')
            self.assertEqual(draft['support']['execution'], '')
            self.assertIn('Confirm the execution with campaign evidence.', draft['missing'])

    def test_unknown_output_and_support_sections_fail(self):
        raw = copy.deepcopy(self.raw)
        raw['unsupported_section'] = 'Do not expose this'
        with self.assertRaises(ValueError):
            validate_board(raw, self.brief, self.ids)
        raw = copy.deepcopy(self.raw)
        raw['support']['unsupported_section'] = self.inputs['brief']
        with self.assertRaises(ValueError):
            validate_board(raw, self.brief, self.ids)

    def test_numbers_units_and_currency_cannot_be_invented(self):
        for headline in ['999 new groups', '$10 of value', '10 million tables', '10% of all tables']:
            with self.subTest(headline=headline), self.assertRaisesRegex(ValueError, 'number absent'):
                validate_board({**copy.deepcopy(self.raw), 'headline': headline}, self.brief, self.ids)
        draft = validate_board({**copy.deepcopy(self.raw), 'headline': '10 tables for the community'}, self.brief, self.ids)
        self.assertIn('10', draft['headline'])

    def test_principle_ids_are_known_unique_and_bounded(self):
        for ids in [[], ['imaginary'], ['hierarchy', 'hierarchy'], list(self.ids), [['hierarchy']]]:
            with self.subTest(ids=ids), self.assertRaises(ValueError):
                validate_board({**copy.deepcopy(self.raw), 'principle_ids': ids}, self.brief, self.ids)

    def test_learned_principles_are_passed_and_verified(self):
        learned = {'version': 'test-sample', 'principles': [{'id': 'learned-space', 'rule': 'Allow space around the headline.'}],
                   'coverage': {'images_scanned': 20, 'ai_reviewed': 3}}
        path = self.root / 'principles.json'
        path.write_text(json.dumps(learned))
        corpus = FakeCorpus({'principles_file': str(path), 'model': 'test-model'})
        raw = {**copy.deepcopy(self.raw), 'principle_ids': ['learned-space']}
        with patch('design_engine.model_json', return_value=raw) as model:
            draft = create_board(corpus, self.inputs, 'fake-key')
        self.assertEqual(draft['principles_version'], 'test-sample')
        self.assertEqual(draft['coverage']['ai_reviewed'], 3)
        self.assertEqual(draft['applied_principles'], learned['principles'])
        self.assertEqual(json.loads(model.call_args.args[3][0]['text'])['design_principles'], learned['principles'])
        with patch('design_engine.model_json', return_value=copy.deepcopy(self.raw)):
            with self.assertRaisesRegex(RuntimeError, 'Unverified design principle'):
                create_board(corpus, self.inputs, 'fake-key')

    def test_missing_key_and_bad_model_never_call_network(self):
        with patch('design_engine.urlopen') as network:
            with self.assertRaises(RuntimeError):
                model_json({}, '', '', [], {})
            for model in [[], '../untrusted', 'a:b']:
                with self.assertRaises(ValueError):
                    model_json({'model': model}, 'fake-key', '', [], {})
            network.assert_not_called()

    def start_server(self):
        root_patch = patch('reference_server.ROOT', self.root)
        root_patch.start()
        self.addCleanup(root_patch.stop)
        server = ReferenceServer(('127.0.0.1', 0), self.corpus)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        return server

    def request(self, server, path, body=None, headers=None):
        client = http.client.HTTPConnection('127.0.0.1', server.server_port, timeout=5)
        try:
            client.request('POST' if body is not None else 'GET', path,
                           json.dumps(body) if body is not None else None,
                           headers or ({'Content-Type': 'application/json'} if body is not None else {}))
            response = client.getresponse()
            return response.status, response.read(), dict(response.getheaders())
        finally:
            client.close()

    def test_create_route_rejects_bad_input_and_releases_generation_lock(self):
        server = self.start_server()
        with patch('reference_server.create_board') as provider, patch('reference_server.api_key', return_value='fake'):
            self.assertEqual(self.request(server, '/api/create-board', {'brief': 'short'})[0], 400)
            provider.assert_not_called()
            server.generation_lock.acquire()
            self.assertEqual(self.request(server, '/api/create-board', self.inputs)[0], 429)
            server.generation_lock.release()
            provider.side_effect = RuntimeError('Safe provider failure.')
            self.assertEqual(self.request(server, '/api/create-board', self.inputs)[0], 502)
            self.assertFalse(server.generation_lock.locked())
            provider.side_effect = None
            provider.return_value = {'headline': 'A safe draft'}
            self.assertEqual(self.request(server, '/api/create-board', self.inputs)[0], 200)
            self.assertFalse(server.generation_lock.locked())

    def test_exports_roundtrip_real_png_and_project_with_opaque_paths(self):
        server = self.start_server()
        image = io.BytesIO()
        Image.new('RGB', (16, 12), 'white').save(image, format='PNG')
        project = json.dumps({'format': 'awards-board-studio-v1', 'versions': []}).encode()
        for kind, payload in [('png', image.getvalue()), ('json', project)]:
            status, body, _ = self.request(server, '/api/export', {'format': kind, 'data': base64.b64encode(payload).decode()})
            self.assertEqual(status, 200)
            saved = json.loads(body)
            self.assertRegex(saved['url'], rf'^/api/download/[a-f0-9]{{32}}\.{kind}$')
            status, downloaded, headers = self.request(server, saved['url'])
            self.assertEqual((status, downloaded), (200, payload))
            self.assertEqual(headers['X-Content-Type-Options'], 'nosniff')
            self.assertNotIn(str(self.root), body.decode())

    def test_export_rejects_malformed_files_formats_and_cross_origin(self):
        server = self.start_server()
        invalid = [(['png'], b'x'), ('html', b'<html>'), ('png', b'\x89PNG\r\n\x1a\njunk'),
                   ('pdf', b'%PDF-incomplete'), ('json', b'[]'), ('json', b'{"format":"other"}')]
        for kind, payload in invalid:
            with self.subTest(kind=kind, payload=payload):
                self.assertEqual(self.request(server, '/api/export', {'format': kind, 'data': base64.b64encode(payload).decode()})[0], 400)
        self.assertEqual(self.request(server, '/api/export', {'format': 'png', 'data': 'not base64!'})[0], 400)
        self.assertEqual(self.request(server, '/api/export', {'format': 'json', 'data': 'e30='},
                                      {'Origin': 'https://attacker.test', 'Content-Type': 'application/json'})[0], 403)
        for path in ['/api/download/../../private.json', '/reference-data/exports/example.json', '/references.local.json']:
            self.assertEqual(self.request(server, path)[0], 404)
        self.assertFalse((self.root / 'reference-data/exports').exists())


    def test_rag_toggle_skips_retrieval_and_records_mode(self):
        class TrackingCorpus(FakeCorpus):
            def search(self, query):
                self.searched = query
                return [{'id': 'ref-1', 'title': 'Example', 'source': 'https://example.test', 'year': '2024', 'filename': '2024_ref-1_Example.jpg', 'thumbnail': '/api/boards/ref-1/thumbnail'}]
            def image(self, board_id, size):
                return b'jpeg-bytes'
        corpus = TrackingCorpus({'principles_file': str(self.root / 'absent.json'), 'model': 'test-model'})
        with patch('design_engine.model_json', return_value=copy.deepcopy(self.raw)) as model:
            off = create_board(corpus, {**self.inputs, 'use_rag': False}, 'fake-key')
        self.assertEqual(off['rag_mode'], 'RAG-OFF')
        self.assertFalse(off['use_rag'])
        self.assertEqual(off['provenance'], [])
        self.assertFalse(hasattr(corpus, 'searched'))
        sent = json.loads(model.call_args.args[3][0]['text'])
        self.assertEqual(sent['rag_mode'], 'RAG-OFF')
        with patch('design_engine.model_json', return_value=copy.deepcopy(self.raw)):
            on = create_board(corpus, {**self.inputs, 'use_rag': True}, 'fake-key')
        self.assertEqual(on['rag_mode'], 'RAG-ON')
        self.assertTrue(on['use_rag'])
        self.assertEqual(on['provenance'][0]['id'], 'ref-1')
        self.assertEqual(on['provenance'][0]['filename'], '2024_ref-1_Example.jpg')
        self.assertTrue(hasattr(corpus, 'searched'))

    def test_use_rag_must_be_boolean(self):
        with self.assertRaises(ValueError):
            validate_input({**self.inputs, 'use_rag': 'yes'})


if __name__ == '__main__':
    unittest.main()
