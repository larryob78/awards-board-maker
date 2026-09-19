import csv
import http.client
import io
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from PIL import Image

from reference_server import Corpus, ReferenceServer, generate, validate_guidance


class ReferenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        for name in ('2025_10_River.jpg', '2025_10_River (1).jpg', '2025_20_Second.jpg', '2024_30_River.jpg'):
            Image.new('RGB', (60, 40), 'blue').save(root / name)
        with (root / 'metadata.csv').open('w', newline='') as stream:
            writer = csv.DictWriter(stream, fieldnames=['id', 'title', 'brand', 'campaignUrl'])
            writer.writeheader()
            writer.writerows([
                {'id': '10', 'title': 'River', 'brand': 'Water Brand', 'campaignUrl': 'https://www.lovethework.com/en/work/campaigns/river-10'},
                {'id': '20', 'title': 'Second', 'brand': 'Clock Brand', 'campaignUrl': 'javascript:alert(1)'},
                {'id': '30', 'title': 'River', 'brand': 'Another Brand'},
            ])
        (root / 'campaigns.json').write_text(json.dumps([
            {'title': 'River', 'year': 2025, 'id': 'unrelated-entry-id', 'sections': {'Idea': 'Restoring biodiversity in wetlands'}, 'url': 'https://www.lovethework.com/en/work/entries/river-100'},
            {'title': 'Second', 'year': 2025, 'sections': {'Idea': 'Ambiguous story A'}},
            {'title': 'Second', 'year': 2025, 'sections': {'Idea': 'Ambiguous story B'}},
        ]))
        self.corpus = Corpus({'board_dir': str(root), 'metadata_csv': str(root / 'metadata.csv'), 'campaign_json': str(root / 'campaigns.json')})

    def test_deduplication_and_unambiguous_provenance(self):
        self.assertEqual(self.corpus.image_count, 4)
        self.assertEqual(len(self.corpus.records), 3)
        self.assertEqual(self.corpus.text_count, 1)
        match = self.corpus.search('biodiversity')[0]
        self.assertEqual(match['id'], '10')
        self.assertTrue(match['text_source'].endswith('river-100'))
        self.assertNotIn('path', match)
        self.assertEqual(self.corpus.records['30']['description'], '')
        self.assertEqual(self.corpus.records['20']['description'], '')
        self.assertEqual(self.corpus.records['20']['source'], '')

    def test_search_has_no_fabricated_fallback(self):
        self.assertEqual(self.corpus.search('unfindableqqqq'), [])
        self.assertEqual(self.corpus.search('and the a'), [])
        self.assertEqual(self.corpus.search('Clock')[0]['id'], '20')
        self.assertEqual(len(self.corpus.search('Water')), 1)

    def test_images_are_valid_and_bounded(self):
        with Image.open(io.BytesIO(self.corpus.image('10', 30))) as image:
            self.assertEqual(image.size, (30, 20))

    def test_citations_cannot_escape_selection(self):
        good = {'summary': 'Advice', 'suggestions': [{'title': 'Hierarchy', 'guidance': 'Try a headline', 'reference_ids': ['10']}], 'missing_information': ['Actual results']}
        self.assertEqual(validate_guidance(good, {'10'}), good)
        good['suggestions'][0]['reference_ids'] = ['20']
        with self.assertRaises(ValueError):
            validate_guidance(good, {'10'})
        good['suggestions'][0]['reference_ids'] = []
        with self.assertRaises(ValueError):
            validate_guidance(good, {'10'})

    def start_server(self):
        server = ReferenceServer(('127.0.0.1', 0), self.corpus)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
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
            return response.status, response.read()
        finally:
            client.close()

    def test_http_search_images_and_private_paths(self):
        server = self.start_server()
        self.assertEqual(json.loads(self.request(server, '/api/search', {'query': 'wetlands'})[1])['results'][0]['id'], '10')
        self.assertEqual(self.request(server, '/api/boards/10/thumbnail')[0], 200)
        for path in ('/.git/config', '/references.local.json', '/.env', '/../reference_server.py', '/api/boards/999/image'):
            self.assertEqual(self.request(server, path)[0], 404)
        self.assertEqual(self.request(server, '/api/status', headers={'Host': 'attacker.invalid'})[0], 403)
        self.assertEqual(self.request(server, '/api/search', {'query': 'river'}, {'Origin': 'https://attacker.invalid', 'Content-Type': 'application/json'})[0], 403)
        self.assertEqual(self.request(server, '/api/search', {'query': 'river'}, {'Content-Type': 'text/plain'})[0], 403)

    def test_bad_input_never_calls_provider(self):
        server = self.start_server()
        with patch('reference_server.generate') as provider:
            for body in ({'ids': ['999'], 'board': {'brief': 'Test'}}, {'ids': ['10', '10'], 'board': {}},
                         {'ids': ['10'], 'board': {'brief': 'x' * 5001}}, {'ids': ['10'], 'board': {}}):
                self.assertEqual(self.request(server, '/api/guidance', body)[0], 400)
            provider.assert_not_called()

    def test_provider_errors_do_not_expose_response_or_key(self):
        with patch('reference_server.api_key', return_value='private-test-key'), patch('reference_server.urlopen', side_effect=HTTPError('url', 429, 'private diagnostic', {}, None)):
            with self.assertRaisesRegex(RuntimeError, 'HTTP 429') as error:
                generate(self.corpus, ['10'], {'brief': 'Test'}, '')
            self.assertNotIn('private', str(error.exception))


if __name__ == '__main__':
    unittest.main()
