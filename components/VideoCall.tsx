import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Persona } from '../types';

interface VideoCallProps {
  persona: Persona;
  onEnd: () => void;
}

const VideoCall: React.FC<VideoCallProps> = ({ persona, onEnd }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceVolume, setVoiceVolume] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const currentSessionRef = useRef<any>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const createBlob = (data: Float32Array): Blob => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, data[i] * 32768));
    }
    return {
        data: encode(new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength)),
        mimeType: 'audio/pcm;rate=16000'
    };
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> => {
    // CRITICAL: Correctly interpret aligned buffer
    const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    return buffer;
  };

  const disconnect = useCallback(async () => {
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    if (processorRef.current) processorRef.current.disconnect();
    if (inputAudioContextRef.current) await inputAudioContextRef.current.close().catch(() => {});
    if (outputAudioContextRef.current) await outputAudioContextRef.current.close().catch(() => {});
    if (currentSessionRef.current?.close) currentSessionRef.current.close();
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
  }, [onEnd]);

  const startSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const analyser = outputCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(outputCtx.destination);
      outputAnalyserRef.current = analyser;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnected(true);

            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return;
              const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            processorRef.current = scriptProcessor;

            // Stream video frames at a sustainable rate
            frameIntervalRef.current = window.setInterval(() => {
              if (isVideoOff || !localVideoRef.current) return;
              const canvas = canvasRef.current;
              const video = localVideoRef.current;
              canvas.width = 320;
              canvas.height = 240;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(blob => {
                  if (blob) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const base64 = (reader.result as string).split(',')[1];
                      sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } }));
                    };
                    reader.readAsDataURL(blob);
                  }
                }, 'image/jpeg', 0.5);
              }
            }, 500); // 2 FPS is safer for bandwidth/backend stability

            const updateVolume = () => {
                if (outputAnalyserRef.current) {
                    const dataArray = new Uint8Array(outputAnalyserRef.current.frequencyBinCount);
                    outputAnalyserRef.current.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                    setVoiceVolume(average);
                }
                if (currentSessionRef.current) requestAnimationFrame(updateVolume);
            };
            updateVolume();
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              const buffer = await decodeAudioData(decode(audioData), outputCtx);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAnalyserRef.current!);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('Session Error:', e);
            setError("Call encountered an error");
          },
          onclose: () => onEnd()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: persona.voiceName } } },
          systemInstruction: persona.systemInstruction,
        }
      });

      sessionPromise
        .then(s => { currentSessionRef.current = s; })
        .catch(err => {
            console.error("Live session init failed:", err);
            const errMsg = err?.message || err?.toString() || '';
            if (errMsg.includes('429') || errMsg.includes('quota')) {
                setError("Quota exceeded (429)");
            } else if (errMsg.includes('Permission')) {
                setError("Permissions denied");
            } else {
                setError("Connection failed");
            }
        });

    } catch (err: any) {
      console.error(err);
      setError("Permissions denied");
    }
  };

  useEffect(() => { startSession(); const timer = setInterval(() => setDuration(d => d + 1), 1000); return () => { disconnect(); clearInterval(timer); }; }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const dynamicGlow = isConnected ? Math.min(voiceVolume / 5, 20) : 0;
  const dynamicScale = isConnected ? 1 + (voiceVolume / 400) : 1;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col font-sans animate-scale-in h-[100dvh] overflow-hidden">
        <div className="flex-1 relative overflow-hidden bg-[#0a0a0a]">
            <div className="absolute inset-0 flex items-center justify-center transition-all duration-150" style={{ background: `radial-gradient(circle, ${persona.avatarColor}33 0%, transparent ${40 + dynamicGlow * 2}%)`, transform: `scale(${1 + dynamicGlow / 100})` }} />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative transition-transform duration-100 ease-out" style={{ transform: `scale(${dynamicScale})` }}>
                    <img src={persona.avatar} className={`w-full h-full object-cover transition-all duration-700 ${isConnected ? 'opacity-90 scale-105' : 'opacity-40'}`} alt="Remote" />
                    {voiceVolume > 10 && <div className="absolute inset-0 border-4 border-white/20 rounded-full animate-ping pointer-events-none" style={{ animationDuration: '1.5s' }} />}
                </div>
            </div>
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
            </div>
            <div className="absolute top-14 left-6 flex items-center gap-2 z-30">
                <div className="flex items-center gap-1.5 bg-red-600 px-2 py-0.5 rounded-sm">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live</span>
                </div>
            </div>
            <div className="absolute top-16 left-0 right-0 flex flex-col items-center z-10 pointer-events-none safe-top">
                 <h2 className="text-[26px] font-bold text-white shadow-xl tracking-tight drop-shadow-lg">{persona.name}</h2>
                 <p className="text-white/80 text-[16px] font-semibold mt-0.5 tabular-nums px-4 text-center">{error ? error : (isConnected ? formatDuration(duration) : 'Connecting...')}</p>
            </div>
        </div>
        <div className={`absolute top-20 right-4 w-28 h-40 bg-[#1c1c1e] rounded-2xl overflow-hidden border border-white/20 shadow-2xl z-40 transition-all duration-500 ${isVideoOff ? 'opacity-40 scale-90' : 'opacity-100 scale-100'}`}>
             {!isVideoOff && <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror-x" />}
        </div>
        <div className="absolute bottom-0 w-full z-50 pb-12 pt-10 px-8 safe-bottom">
            <div className="flex justify-between items-center max-w-[320px] mx-auto">
                 <button onClick={() => setIsVideoOff(!isVideoOff)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-white text-black' : 'bg-white/10 text-white backdrop-blur-md'}`}>
                    {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                 </button>
                 <button onClick={onEnd} className="w-16 h-16 rounded-full bg-[#FF3B30] flex items-center justify-center text-white shadow-2xl active:scale-95 transition-transform">
                    <PhoneOff size={32} />
                 </button>
                 <button onClick={() => setIsMuted(!isMuted)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white backdrop-blur-md'}`}>
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                 </button>
            </div>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-white/20 rounded-full" />
    </div>
  );
};

export default VideoCall;