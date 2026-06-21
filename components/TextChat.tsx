import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ArrowLeft, Phone, Video, Image, Heart, Mic, Battery, Wifi, Signal, Camera, Smile, BadgeCheck, Globe } from 'lucide-react';
import { ChatMessage, Persona } from '../types';
import VideoCall from './VideoCall';

interface TextChatProps {
  onBack: () => void;
  onVoiceCall: () => void;
  persona: Persona;
  currentTime: Date;
}

const TextChat: React.FC<TextChatProps> = ({ onBack, onVoiceCall, persona, currentTime }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      let model = 'gemini-3-flash-preview';
      let config: any = {
        systemInstruction: persona.systemInstruction,
      };

      if (persona.useThinking) {
        model = 'gemini-3-pro-preview';
        config.thinkingConfig = { thinkingBudget: 32768 };
      } else if (persona.useSearch) {
        model = 'gemini-3-flash-preview';
        config.tools = [{ googleSearch: {} }];
      }

      const chat = ai.chats.create({
        model,
        config,
      });
      setChatSession(chat);
    };
    initChat();
  }, [persona]);

  useEffect(() => {
    if (!isVideoCallActive) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isVideoCallActive]);

  const handleSend = async () => {
    if (!input.trim() || !chatSession || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await chatSession.sendMessageStream({ message: userMsg.text });

      let fullText = '';
      let collectedGroundingMetadata: any = null;
      const botMsgId = (Date.now() + 1).toString();

      setMessages(prev => [...prev, {
        id: botMsgId,
        role: 'model',
        text: '',
        timestamp: new Date()
      }]);

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        const text = c.text;

        if (c.candidates?.[0]?.groundingMetadata) {
             collectedGroundingMetadata = c.candidates[0].groundingMetadata;
        }

        if (text) {
            fullText += text;
            setMessages(prev => prev.map(msg =>
                msg.id === botMsgId ? { ...msg, text: fullText, groundingMetadata: collectedGroundingMetadata || msg.groundingMetadata } : msg
            ));
        } else if (collectedGroundingMetadata) {
            // Update metadata even if no text in this chunk (could be last chunk)
            setMessages(prev => prev.map(msg =>
                msg.id === botMsgId ? { ...msg, groundingMetadata: collectedGroundingMetadata } : msg
            ));
        }
      }
    } catch (error: any) {
      console.error("Error sending message:", error);

      let errorMessage = "Message failed to send.";
      const errStr = error?.toString() || '';
      const errObjMsg = error?.message || '';

      if (errStr.includes('429') || objMsgIncludes(errObjMsg, ['429', 'quota', 'limit'])) {
          errorMessage = "⚠️ Quota exceeded. Please wait a moment or try again later.";
      } else if (objMsgIncludes(errObjMsg, ['503', 'overloaded'])) {
          errorMessage = "⚠️ Server overloaded. Please try again.";
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: errorMessage,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const objMsgIncludes = (msg: string, terms: string[]) => {
      const lower = msg.toLowerCase();
      return terms.some(term => lower.includes(term));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
  };

  const VerifiedBadge = ({ size = "w-3 h-3" }: { size?: string }) => (
    <BadgeCheck className={`${size} fill-[#0095F6] text-white stroke-[2px]`} />
  );

  return (
    <div className="flex flex-col h-full bg-black max-w-md mx-auto relative overflow-hidden font-sans animate-slide-in">

      {/* Background Gradient Mesh (Subtle Theme) */}
      <div className={`absolute inset-0 bg-gradient-to-br ${persona.color} opacity-5 pointer-events-none`}></div>

      {/* Video Call Overlay */}
      {isVideoCallActive && (
          <VideoCall persona={persona} onEnd={() => setIsVideoCallActive(false)} />
      )}

      {/* Status Bar */}
        <div className="px-6 pt-3 pb-2 flex justify-between items-center text-[15px] font-semibold tracking-wide z-30 bg-black safe-top border-b border-transparent">
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

      {/* Instagram Chat Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/90 backdrop-blur-sm z-30 sticky top-[34px]">
         <div className="flex items-center gap-3">
             <button onClick={onBack} className="active:opacity-50 p-1">
                 <ArrowLeft className="w-7 h-7 text-white" />
             </button>
             <div className="flex items-center gap-3">
                 <div className="relative">
                    <img src={persona.avatar} alt={persona.name} className="w-[34px] h-[34px] rounded-full object-cover border border-white/10" />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black"></div>
                 </div>
                 <div className="flex flex-col justify-center">
                    <h3 className="font-semibold text-white text-[15px] leading-tight flex items-center gap-1">
                        {persona.name}
                        {persona.isVerified && <VerifiedBadge size="w-3.5 h-3.5" />}
                    </h3>
                    <p className="text-[12px] text-gray-400 leading-none">raoprime_talk</p>
                 </div>
             </div>
         </div>

         <div className="flex items-center gap-5 text-white pr-2">
             <button onClick={onVoiceCall} className="active:opacity-50">
                <Phone className="w-[26px] h-[26px] stroke-[1.5]" />
             </button>
             <button onClick={() => setIsVideoCallActive(true)} className="active:opacity-50">
                 <Video className="w-[28px] h-[28px] stroke-[1.5]" />
             </button>
         </div>
      </div>

      {/* Messages Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-hide z-10">

        {/* Profile Info in Chat */}
        <div className="flex flex-col items-center mt-6 mb-12 animate-scale-in">
            <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-tr from-gray-700 to-gray-500 mb-3">
                <img src={persona.avatar} alt={persona.name} className="w-full h-full rounded-full object-cover border-4 border-black" />
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-1">
                {persona.name}
                {persona.isVerified && <VerifiedBadge size="w-5 h-5" />}
            </h2>
            <p className="text-sm text-gray-400 mb-1">{persona.role} • Instagram</p>
            <p className="text-xs text-gray-500">{persona.description}</p>
            <button className="mt-4 px-4 py-1.5 bg-[#262626] hover:bg-[#363636] text-white text-sm font-semibold rounded-lg transition-colors">
                View Profile
            </button>
        </div>

        {/* Date Separator */}
        <div className="flex justify-center my-6">
            <span className="text-gray-500 text-[11px] font-medium">Today {formatTime(currentTime)}</span>
        </div>

        {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const showAvatar = !isUser && (idx === messages.length - 1 || messages[idx+1]?.role === 'user');

            return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start items-end gap-2'} mb-1 group`}>
                    {!isUser && (
                        <div className="w-7 h-7 flex-shrink-0">
                            {showAvatar && <img src={persona.avatar} className="w-7 h-7 rounded-full object-cover" />}
                        </div>
                    )}

                    <div className="relative max-w-[75%]">
                        <div
                        className={`px-4 py-2.5 text-[15px] leading-snug break-words ${
                            isUser
                            ? `bg-gradient-to-l ${persona.color} text-white rounded-[20px] rounded-br-md`
                            : 'bg-[#262626] text-white rounded-[20px] rounded-bl-md'
                        }`}
                        >
                        {msg.text}

                        {/* Search Grounding Display */}
                        {msg.groundingMetadata?.groundingChunks && (
                            <div className="mt-3 pt-2 border-t border-white/10 flex flex-col gap-1.5">
                                <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                                    <Globe className="w-3 h-3" /> Sources
                                </div>
                                {msg.groundingMetadata.groundingChunks.map((chunk: any, i: number) => {
                                    if (chunk.web?.uri) {
                                        return (
                                            <a key={i} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1.5 bg-black/20 p-1.5 rounded-md transition-colors">
                                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></span>
                                                <span className="truncate">{chunk.web.title || chunk.web.uri}</span>
                                            </a>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        )}
                        </div>
                        {!isUser && (
                            <div className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Heart className="w-4 h-4 text-gray-500" />
                            </div>
                        )}
                    </div>
                </div>
            )
        })}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
           <div className="flex justify-start items-end gap-2 mt-2">
                <div className="w-7 h-7 flex-shrink-0">
                     <img src={persona.avatar} className="w-7 h-7 rounded-full object-cover" />
                </div>
                <div className="bg-[#262626] rounded-[22px] px-4 py-3 h-[42px] flex items-center gap-1.5 w-16">
                   <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                   <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-100"></span>
                   <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-200"></span>
               </div>
           </div>
        )}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Instagram Input Area */}
      <div className="px-3 py-2 bg-black safe-bottom z-20">
        <div className="flex items-end gap-2 bg-[#262626] rounded-[24px] px-1 py-1 min-h-[48px] border border-transparent focus-within:border-gray-700 transition-colors">

           <div className="w-[36px] h-[36px] rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0 ml-1 mb-1 self-end">
              <Camera className="w-5 h-5 fill-white" />
           </div>

           <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              className="flex-1 bg-transparent border-none focus:outline-none text-white placeholder-gray-400 text-[16px] py-3 max-h-24"
              disabled={isLoading}
              autoComplete="off"
           />

           <div className="flex items-center gap-3 pr-3 pb-2.5 self-end text-white/90">
                {input.trim() ? (
                    <button onClick={handleSend} className="text-blue-500 font-semibold text-[15px] hover:text-blue-400">Send</button>
                ) : (
                    <>
                        <Mic className="w-[22px] h-[22px]" />
                        <Image className="w-[22px] h-[22px]" />
                        <Smile className="w-[22px] h-[22px]" />
                    </>
                )}
           </div>
        </div>
      </div>

       <div className="absolute bottom-0 w-full h-[20px] z-30 flex justify-center items-end pb-2 pointer-events-none">
            <div className="w-[134px] h-[5px] bg-white rounded-full opacity-40"></div>
        </div>
    </div>
  );
};

export default TextChat;