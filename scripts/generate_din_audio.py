"""
Generates the Digits-in-Noise audio used by the app (src/assets/audio/).

Requirements: pip install sherpa-onnx soundfile numpy scipy
Voices (sherpa-onnx TTS model releases on GitHub, extract next to this script):
  vits-piper-en_US-lessac-medium, vits-piper-ru_RU-irina-medium, vits-piper-kk_KZ-issai-high
Uzbek digits are rendered with the Kazakh voice using a Cyrillic transcription of the
Uzbek words (validated with Whisper ASR). Replace with studio recordings for clinical use.

Steps: synthesise each digit → trim silence (−38 dB) → 8 ms fades → RMS-equalise (0.08) →
concatenate into one sprite per language (offsets printed to meta.json) →
speech-shaped noise: Welch LTASS of all digits, random-phase periodic noise (2^16 samples,
loops seamlessly), same RMS as the digits (so gain difference = SNR).
"""
import sherpa_onnx, soundfile as sf, numpy as np, json, os
from scipy.signal import welch
def tts_model(d, name):
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f"{d}/{name}.onnx", tokens=f"{d}/tokens.txt", data_dir=f"{d}/espeak-ng-data",
        noise_scale=0.5, noise_scale_w=0.6, length_scale=1.0), num_threads=4))
    return sherpa_onnx.OfflineTts(cfg)
SR=22050
CFG = {
 'en': ('vits-piper-en_US-lessac-medium','en_US-lessac-medium',0, ['zero','one','two','three','four','five','six','seven','eight','nine']),
 'ru': ('vits-piper-ru_RU-irina-medium','ru_RU-irina-medium',0, ['ноль','один','два','три','четыре','пять','шесть','семь','восемь','девять']),
 'uz': ('vits-piper-kk_KZ-issai-high','kk_KZ-issai-high',4, ['нол','бир','икки','учь!','торт','беш','олти','етти','саккиз','тоққиз']),
}
def trim(x):
    f=int(0.01*SR); n=len(x)//f
    e=np.array([np.sqrt(np.mean(x[i*f:(i+1)*f]**2))+1e-9 for i in range(n)])
    db=20*np.log10(e/e.max())
    act=np.where(db>-38)[0]
    s=max(0,(act[0]-2)*f); t=min(len(x),(act[-1]+3)*f)
    y=x[s:t].copy()
    r=int(0.008*SR); w=0.5-0.5*np.cos(np.linspace(0,np.pi,r))
    y[:r]*=w; y[-r:]*=w[::-1]
    return y
OUT='final'; os.makedirs(OUT,exist_ok=True)
meta={}
for lang,(d,n,sid,words) in CFG.items():
    tts=tts_model(d,n)
    digs=[]
    for w in words:
        a=tts.generate(w,sid=sid,speed=1.0)
        assert a.sample_rate==SR
        digs.append(trim(np.array(a.samples,np.float64)))
    # RMS equalize to target
    rms=[np.sqrt(np.mean(x**2)) for x in digs]
    target=0.08
    digs=[x*(target/r) for x,r in zip(digs,rms)]
    peak=max(np.abs(x).max() for x in digs)
    # sprite
    gap=np.zeros(int(0.1*SR)); parts=[]; offs=[]; pos=0
    for x in digs:
        offs.append([pos, len(x)]); parts+= [x,gap]; pos+=len(x)+len(gap)
    sprite=np.concatenate(parts)
    sf.write(f'{OUT}/din-{lang}.wav', sprite.astype(np.float32), SR, subtype='PCM_16')
    # LTASS noise, periodic
    allsp=np.concatenate(digs)
    fr,p=welch(allsp,fs=SR,nperseg=1024)
    N=65536
    fgrid=np.fft.rfftfreq(N,1/SR)
    mag=np.sqrt(np.interp(fgrid,fr,p))
    mag[fgrid<80]=0
    rng=np.random.default_rng(42)
    ph=rng.uniform(0,2*np.pi,len(mag)); spec=mag*np.exp(1j*ph); spec[0]=0
    nz=np.fft.irfft(spec,N)
    nz*= target/np.sqrt(np.mean(nz**2))
    sf.write(f'{OUT}/noise-{lang}.wav', nz.astype(np.float32), SR, subtype='PCM_16')
    meta[lang]={'sampleRate':SR,'rms':target,'peak':float(peak),'noisePeak':float(np.abs(nz).max()),'digits':offs,'noiseSamples':N}
    print(lang,'peak',round(peak,3),'noise peak',round(float(np.abs(nz).max()),3),'durs',[round(o[1]/SR,2) for o in offs])
json.dump(meta,open(f'{OUT}/meta.json','w'),indent=1)
