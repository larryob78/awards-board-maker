import json
import base64
import io
from PIL import Image
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from image_engine import ImageJobs, MODEL, credential, download_image


class ImageTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.jobs=ImageJobs({},self.temp.name)
        self.data={'id':'a'*32,'prompt':'An original abstract red sculpture in warm daylight','ratio':'1536:1920'}

    @patch('image_engine.credential',return_value='secret-test-value')
    @patch('image_engine.provider',return_value={'id':'provider-task'})
    def test_same_request_is_not_billed_twice_and_receipt_survives_restart(self,provider,key):
        result=self.jobs.create(self.data)
        self.assertEqual(result['model'],MODEL)
        restarted=ImageJobs({},self.temp.name)
        restarted.create(self.data)
        self.assertEqual(provider.call_count,1)
        saved=Path(self.temp.name,'a'*32+'.json').read_text()
        self.assertNotIn('secret-test-value',saved)
        self.assertNotIn('task_id',result)
        payload=provider.call_args.args[2]
        self.assertEqual(payload['outputCount'],1)
        self.assertEqual(payload['model'],MODEL)
        self.assertEqual(payload['quality'],'high')
        self.assertNotIn('referenceImages',payload)

    @patch('image_engine.credential',return_value='key')
    @patch('image_engine.provider',side_effect=RuntimeError('Uncertain response'))
    def test_uncertain_submission_not_retried(self,provider,key):
        self.assertEqual(self.jobs.create(self.data)['status'],'UNCONFIRMED')
        self.jobs.create(self.data);self.jobs.status(self.data['id'])
        self.assertEqual(provider.call_count,1)

    @patch('image_engine.credential',return_value='key')
    @patch('image_engine.provider')
    @patch('image_engine.download_image')
    def test_completed_image_is_saved_and_recoverable(self,download,provider,key):
        output=io.BytesIO();Image.new('RGB',(1536,1920),'red').save(output,format='JPEG')
        download.return_value='data:image/jpeg;base64,'+base64.b64encode(output.getvalue()).decode()
        provider.side_effect=[{'id':'task'}, {'status':'SUCCEEDED','output':['https://media.cloudfront.net/image.jpg']}]
        self.jobs.create(self.data)
        result=self.jobs.status(self.data['id'])
        self.assertIn('image',result)
        self.assertEqual(ImageJobs({},self.temp.name).status(self.data['id']),result)
        self.assertEqual(provider.call_count,2)

    @patch('image_engine.credential',side_effect=RuntimeError('Locked'))
    @patch('image_engine.provider')
    def test_locked_vault_never_submits(self,provider,key):
        with self.assertRaises(RuntimeError):self.jobs.create(self.data)
        provider.assert_not_called()
        self.assertFalse(list(Path(self.temp.name).glob('*.json')))

    def test_invalid_ids_prompts_and_media_hosts(self):
        for change in [{'id':'../secret'},{'ratio':'999:999'},{'prompt':'short'},{'prompt':'x'*4001}]:
            with self.assertRaises(ValueError):self.jobs.create({**self.data,**change})
        for url in ['http://localhost/image','https://evil.test/image','https://cloudfront.net.evil.test/a','https://key@a.cloudfront.net/a']:
            with self.assertRaises(RuntimeError):download_image(url)

    @patch.dict('os.environ',{'RUNWAY_API_KEY':'old-invalid-key'},clear=True)
    @patch('image_engine.subprocess.run')
    def test_explicit_vault_reference_takes_priority_over_environment(self,run):
        run.return_value.returncode=0;run.return_value.stdout='vault-key'
        self.assertEqual(credential({'runway_secret_ref':'op://vault/item/key'}),'vault-key')

    @patch.dict('os.environ',{},clear=True)
    @patch('image_engine.subprocess.run')
    def test_vault_error_does_not_leak_raw_output(self,run):
        run.return_value.returncode=1;run.return_value.stderr='secret provider error';run.return_value.stdout=''
        with self.assertRaises(RuntimeError) as error:credential({'runway_secret_ref':'op://vault/item/key'})
        self.assertNotIn('secret provider error',str(error.exception))

if __name__=='__main__':unittest.main()
