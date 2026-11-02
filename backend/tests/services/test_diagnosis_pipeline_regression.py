import asyncio
from io import BytesIO
import json
from pathlib import Path
from types import SimpleNamespace
import time
from uuid import uuid4
import numpy as np
import pytest
from PIL import Image, ImageOps
from fastapi import UploadFile
from starlette.datastructures import Headers
from app.core.config import settings
from app.ml.onnx_classifier import OnnxMultiCropDiseaseClassifier, canonical_crop, CROP_ALIASES
from app.ml.base import DiseasePrediction
from app.services.diagnosis_service import DiagnosisService, DiagnosisInferenceError

@pytest.mark.parametrize('name', ['Pineapple','Sweet potato','Crabapple','Tomatillo'])
def test_unsupported_crop_not_matched_by_substring(name):
    model=OnnxMultiCropDiseaseClassifier.__new__(OnnxMultiCropDiseaseClassifier)
    model.crop_to_indices={'Apple':[0,1], 'Potato':[2,3], 'Tomato':[4,5]}
    model.engine_name='test'; model.engine_version='test'
    assert model.predict(image_bytes=b'',crop_name=name).label=='unsupported_crop'

def test_exact_supported_aliases_preserved():
    for alias,expected in CROP_ALIASES.items():
        assert canonical_crop(alias)==expected

@pytest.mark.parametrize('orientation',range(1,9))
def test_exif_orientation_matches_displayed_pixels(orientation):
    model=OnnxMultiCropDiseaseClassifier.__new__(OnnxMultiCropDiseaseClassifier); model.image_size=288
    rng=np.random.default_rng(4141)
    im=Image.fromarray(rng.integers(0,256,(331,479,3),dtype=np.uint8))
    exif=Image.Exif(); exif[274]=orientation
    b=BytesIO(); im.save(b,format='PNG',exif=exif)
    corrected=ImageOps.exif_transpose(Image.open(BytesIO(b.getvalue())))
    c=BytesIO(); corrected.save(c,format='PNG')
    np.testing.assert_array_equal(model._prepare_views(b.getvalue())[0][0],model._prepare_views(c.getvalue())[0][0])

def test_artifact_resolution_preserves_nested_configured_path(tmp_path):
    backend=tmp_path/'backend'; backend.mkdir()
    relative=Path('ml/artifacts/field_robust_v2/model.onnx')
    model=tmp_path/relative; model.parent.mkdir(parents=True); model.touch()
    assert OnnxMultiCropDiseaseClassifier._resolve_artifact(backend,relative)==model
    packaged=backend/relative; packaged.parent.mkdir(parents=True); packaged.touch()
    assert OnnxMultiCropDiseaseClassifier._resolve_artifact(backend,relative)==packaged

@pytest.mark.parametrize('shape',[[1,37],[1,39],[38]])
def test_metadata_output_mismatch_fails_closed(monkeypatch,tmp_path,shape):
    import app.ml.onnx_classifier as module
    model=tmp_path/'model.onnx'; model.touch()
    metadata=tmp_path/'model.json'; metadata.write_text(json.dumps({'classes':['Tomato___healthy','Tomato___Late_blight'],'image_size':288}))
    monkeypatch.setattr(settings,'ml_model_path',model); monkeypatch.setattr(settings,'ml_metadata_path',metadata)
    session=SimpleNamespace(get_inputs=lambda:[SimpleNamespace(name='input',type='tensor(float)',shape=[1,3,288,288])],get_outputs=lambda:[SimpleNamespace(shape=shape)])
    monkeypatch.setattr(module.ort,'InferenceSession',lambda *a,**k:session)
    with pytest.raises(RuntimeError,match='class count'):
        OnnxMultiCropDiseaseClassifier()

class SlowClassifier:
    inference_mode='test'
    def __init__(self,fail=False): self.fail=fail; self.running=False
    def predict(self,**kwargs):
        self.running=True
        time.sleep(.15)
        self.running=False
        if self.fail: raise RuntimeError('test failure')
        return DiseasePrediction(label='test',confidence=.5,severity='unknown',advisory='test',engine_name='test',engine_version='test')

def make_service(classifier):
    service=DiagnosisService.__new__(DiagnosisService)
    service.fields=SimpleNamespace(get_owned=lambda *args:SimpleNamespace(crop_name='Tomato'))
    service.diagnoses=SimpleNamespace(add=lambda x:x,save=lambda x:x)
    service.storage=SimpleNamespace(save=lambda **kwargs:SimpleNamespace(path='test.png'),delete=lambda x:None)
    service.classifier=classifier
    return service

def make_upload():
    b=BytesIO(); Image.new('RGB',(96,96),(40,120,70)).save(b,format='PNG')
    return UploadFile(file=BytesIO(b.getvalue()),filename='private-name.png',headers=Headers({'content-type':'image/png'}))

def test_inference_yields_event_loop_and_records_stages(caplog):
    caplog.set_level('INFO',logger='app.services.diagnosis_service')
    async def run():
        classifier=SlowClassifier()
        f=make_upload()
        task=asyncio.create_task(make_service(classifier).upload(owner_id=uuid4(),field_id=uuid4(),file=f,create_care_case=False))
        ticks_during_inference=0
        while not task.done():
            await asyncio.sleep(.005)
            if classifier.running: ticks_during_inference+=1
        await task
        assert ticks_during_inference > 0, 'Blocking inference starved the event loop'
        assert f.file.closed
    asyncio.run(run())
    assert 'diagnosis_timing' in caplog.text
    assert 'model_acquire' in caplog.text
    assert 'private-name' not in caplog.text

def test_failure_closes_file_and_releases_inference_lock():
    async def run():
        f=make_upload()
        with pytest.raises(DiagnosisInferenceError):
            await make_service(SlowClassifier(fail=True)).upload(owner_id=uuid4(),field_id=uuid4(),file=f,create_care_case=False)
        assert f.file.closed
        f2=make_upload()
        await asyncio.wait_for(make_service(SlowClassifier()).upload(owner_id=uuid4(),field_id=uuid4(),file=f2,create_care_case=False),timeout=5)
        assert f2.file.closed
    asyncio.run(run())
