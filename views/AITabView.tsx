import React from 'react';
import { AppMode, Persona } from '../types';
import { PERSONAS } from '../constants';
import { Sparkles, MessageSquare, Mic } from 'lucide-react';

interface AITabViewProps {
  onStartChat: (persona: Persona, mode: AppMode) => void;
}

const AITabView: React.FC<AITabViewProps> = ({ onStartChat }) => {
  return (
    <div className="h-full max-w-5xl mx-auto">
      <div className="mb-8 text-center mt-4">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-200">
           <Sparkles className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">DocStore AI Assistants</h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          Select an AI persona to help you analyze, summarize, and manage your documents. They can read through your files and provide intelligent insights.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PERSONAS.map((persona) => (
          <div key={persona.id} className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4 mb-4">
               <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${persona.color} p-1 shadow-inner flex-shrink-0`}>
                 <img src={persona.avatar} alt={persona.name} className="w-full h-full object-cover rounded-full border-2 border-white" />
               </div>
               <div>
                 <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1">
                   {persona.name}
                   {persona.isVerified && <span className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">✓</span>}
                 </h3>
                 <p className="text-sm font-medium text-blue-600">{persona.role}</p>
               </div>
            </div>

            <p className="text-gray-600 text-sm mb-6 flex-1 line-clamp-3">
              {persona.description}
            </p>

            <div className="flex gap-3 mt-auto">
               <button
                 onClick={() => onStartChat(persona, AppMode.TEXT)}
                 className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
               >
                 <MessageSquare className="w-4 h-4 text-gray-500" /> Text Chat
               </button>
               <button
                 onClick={() => onStartChat(persona, AppMode.VOICE)}
                 className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
               >
                 <Mic className="w-4 h-4" /> Voice Call
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AITabView;
