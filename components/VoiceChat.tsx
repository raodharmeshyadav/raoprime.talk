import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Mic, MicOff, PhoneOff, Volume2, Grid, Phone, Signal, Wifi, Battery } from 'lucide-react';
import { Persona } from '../types';
import Visualizer from './Visualizer';

interface VoiceChatProps {
  onBack: () => void;
  persona: Persona;
  currentTime: Date;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ onBack, persona, currentTime }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const currentSessionRef = useRef<any>(null);

  useEffect(() => {
    let interval: number;
    if (isConnected) {
      interval = window.setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
  };

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
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const disconnect = useCallback(async () => {
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    if (processorRef.current) processorRef.current.disconnect();
    if (inputAudioContextRef.current) await inputAudioContextRef.current.close().catch(() => {});
    if (outputAudioContextRef.current) await outputAudioContextRef.current.close().catch(() => {});
    if (currentSessionRef.current?.close) currentSessionRef.current.close();
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const startSession = async () => {
    await disconnect();
    setIsConnecting(true);
    setError(null);

    try {
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);
      outputNodeRef.current = outputNode;

      const newAnalyser = outputCtx.createAnalyser();
      newAnalyser.fftSize = 256;
      outputNode.connect(newAnalyser);
      setAnalyser(newAnalyser);
      analyserRef.current = newAnalyser;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);

            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
              mediaStreamRef.current = stream;
              const source = inputCtx.createMediaStreamSource(stream);
              const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                if (isMicMuted) return;
                const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputCtx.destination);
              processorRef.current = scriptProcessor;
            }).catch(err => {
              setError("Microphone permission denied");
              setIsConnecting(false);
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsConnected(false),
          onerror: (e) => {
            console.error('Session Error:', e);
            // Often generic errors here, but if we haven't connected yet, it might be auth/quota
            if (isConnecting) {
                 setError("Connection failed");
                 setIsConnecting(false);
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: persona.voiceName } }
          },
          systemInstruction: persona.systemInstruction,
        }
      });

      sessionPromise
        .then(s => {
            currentSessionRef.current = s;
        })
        .catch(err => {
            console.error("Live session init failed:", err);
            setIsConnecting(false);
            const errMsg = err?.message || err?.toString() || '';
            if (errMsg.includes('429') || errMsg.includes('quota')) {
                setError("Quota exceeded. Try later.");
            } else if (errMsg.includes('Permission')) {
                setError("Permissions denied");
            } else {
                setError("Connection failed");
            }
        });

    } catch (e: any) {
      console.error(e);
      setError("Failed to start call");
      setIsConnecting(false);
    }
  };

  useEffect(() => { startSession(); return () => { disconnect(); }; }, []);

  return (
    <div className="h-[100dvh] w-full bg-[#1c1c1e] flex flex-col items-center relative overflow-hidden font-sans">
      <div className={`absolute inset-0 bg-gradient-to-br ${persona.color} opacity-40 blur-3xl scale-125`}></div>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-3xl"></div>

      <div className="w-full px-6 pt-3 pb-2 flex justify-between items-center text-[15px] font-semibold tracking-wide z-30 text-white safe-top">
           <span className="w-[54px] text-center font-medium">{formatTime(currentTime)}</span>
           <div className="flex gap-1.5 items-center">
             <Signal className="w-4 h-4 fill-white" />
             <Wifi className="w-4 h-4" />
             <div className="relative flex items-center gap-1">
                <span className="text-xs font-bold">85%</span>
                <div className="relative">
                   <Battery className="w-6 h-6 text-white" />
                   <div className="absolute top-[7px] left-[2.5px] w-[13px] h-[9px] bg-white rounded-[1px]"></div>
                </div>
             </div>
           </div>
        </div>

      <div className="flex-1 w-full flex flex-col justify-between items-center z-20 relative pt-8 pb-safe-bottom">
         <div className="flex flex-col items-center justify-center flex-1 w-full">
             <div className="flex flex-col items-center space-y-2 mb-8">
                 <h2 className="text-[34px] font-semibold text-white tracking-tight leading-none text-center px-4">{persona.name}</h2>
                 {error ? (
                    <span className="text-[#FF453A] text-lg font-medium px-4 text-center animate-pulse">{error}</span>
                 ) : (
                    <span className="text-white/60 text-[19px] font-normal">
                        {isConnected ? formatDuration(callDuration) : (isConnecting ? 'connecting...' : 'ready')}
                    </span>
                 )}
             </div>

             <div className="relative flex flex-col items-center justify-center">
                 <div className="w-40 h-40 rounded-full bg-[#2c2c2e]/50 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden">
                     <img src={persona.avatar} alt={persona.name} className="w-full h-full object-cover" />
                 </div>
                 <div className="w-64 h-24 mt-6 opacity-80 flex items-center justify-center">
                     {isConnected && <Visualizer analyser={analyser} isActive={isConnected} color="#ffffff" />}
                 </div>
             </div>
         </div>

         <div className="w-full max-w-[350px] px-6 mb-4">
            <div className="grid grid-cols-3 gap-x-4 gap-y-6 mb-8">
                 <div className="flex flex-col items-center gap-2">
                    <button onClick={() => setIsMicMuted(!isMicMuted)} className={`w-[68px] h-[68px] rounded-full flex items-center justify-center transition-all ${isMicMuted ? 'bg-white text-black' : 'bg-white/10 text-white backdrop-blur-md'}`}>
                        {isMicMuted ? <MicOff className="w-8 h-8" strokeWidth={1.5} /> : <Mic className="w-8 h-8" strokeWidth={1.5} />}
                    </button>
                    <span className="text-white text-[12px]">mute</span>
                 </div>
                 <div className="flex flex-col items-center gap-2">
                    <button className="w-[68px] h-[68px] rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md"><Grid className="w-8 h-8" strokeWidth={1.5} /></button>
                    <span className="text-white text-[12px]">keypad</span>
                 </div>
                 <div className="flex flex-col items-center gap-2">
                    <button className="w-[68px] h-[68px] rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md"><Volume2 className="w-8 h-8" strokeWidth={1.5} /></button>
                    <span className="text-white text-[12px]">audio</span>
                 </div>
            </div>
            <div className="flex justify-center pb-2">
                 <button onClick={onBack} className="w-[72px] h-[72px] rounded-full bg-[#FF3B30] flex items-center justify-center text-white shadow-lg active:opacity-80 transition-opacity">
                    <PhoneOff className="w-9 h-9 fill-current" />
                 </button>
            </div>
         </div>
      </div>
       <div className="absolute bottom-0 w-full h-[34px] z-30 flex justify-center items-end pb-2 pointer-events-none">
            <div className="w-[134px] h-[5px] bg-white rounded-full opacity-40"></div>
        </div>
    </div>
  );
};

export default VoiceChat;