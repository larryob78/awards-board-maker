"""Public image routes, without credentials, private corpus or provider calls."""
import http.client
import json
import tempfile
import threading
import unittest
from unittest.mock import patch

from image_engine import ImageJobs
from reference_server import Corpus, ReferenceServer


class ImageHTTPTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.server = ReferenceServer(('127.0.0.1', 0), Corpus({}))
        self.server.image_jobs = ImageJobs({}, self.temp.name)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)

    def request(self, path, body=None, headers=None):
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        try:
            connection.request('GET' if body is None else 'POST', path,
                               None if body is None else json.dumps(body),
                               headers or ({} if body is None else {'Content-Type': 'application/json'}))
            response = connection.getresponse()
            return response.status, json.loads(response.read())
        finally:
            connection.close()

    @patch('image_engine.credential', side_effect=AssertionError('Must not read a credential'))
    @patch('image_engine.provider', side_effect=AssertionError('Must not call provider'))
    def test_capabilities_and_invalid_input_are_credential_free(self, provider, credential):
        status, result = self.request('/api/image-models')
        self.assertEqual(status, 200)
        self.assertFalse(result['live_verified'])
        self.assertEqual(len(result['models']), 3)
        self.assertFalse(any(row['provider_native_mask'] for row in result['models']))
        for body in ({'id': 'a' * 32, 'prompt': 'short'},
                     {'id': '../secret', 'prompt': 'A valid detailed image description'},
                     {'id': 'a' * 32, 'prompt': 'A valid detailed image description',
                      'mode': 'selection', 'source': 'https://private.invalid/image.png'}):
            self.assertEqual(self.request('/api/create-image', body)[0], 400)
        credential.assert_not_called()
        provider.assert_not_called()

    def test_private_receipts_and_cross_origin_calls_are_blocked(self):
        for path in ('/reference-data/image-jobs/' + 'a' * 32 + '.json',
                     '/image_craft.py', '/references.local.json'):
            self.assertEqual(self.request(path)[0], 404)
        self.assertEqual(self.request('/api/image-models', headers={'Host': 'attacker.invalid'})[0], 403)
        self.assertEqual(self.request('/api/create-image', {},
                         {'Origin': 'https://attacker.invalid', 'Content-Type': 'application/json'})[0], 403)
        self.assertEqual(self.request('/api/image-jobs/' + 'a' * 32)[0], 404)

    @patch('image_engine.credential', return_value='test-only-no-real-secret')
    @patch('image_engine.provider', return_value={'id': 'fixture-task'})
    def test_route_reuses_receipt_and_keeps_provider_details_private(self, provider, credential):
        body = {'id': 'a' * 32, 'prompt': 'A beautiful abstract paper sculpture'}
        status, first = self.request('/api/create-image', body)
        self.assertEqual(status, 200)
        self.assertEqual(first['status'], 'PENDING')
        self.assertNotIn('task_id', first)
        self.assertNotIn('provider_input_hash', first)
        self.assertEqual(self.request('/api/create-image', body)[1], first)
        self.assertEqual(provider.call_count, 1)
        self.assertEqual(self.request('/api/create-image', dict(body, prompt='A different abstract paper sculpture'))[0], 400)
        self.assertEqual(provider.call_count, 1)


if __name__ == '__main__':
    unittest.main()
