import React, { useState } from 'react';
import {
  Folder, FileText, Star, Trash2, Lock, Sparkles, Search,
  Menu, X, Bell, UserCircle, UploadCloud, ChevronRight, Settings
} from 'lucide-react';
import { AppMode, Persona } from './types';
import TextChat from './components/TextChat';
import VoiceChat from './components/VoiceChat';
import { PERSONAS } from './constants';
import DashboardView from './views/DashboardView';
import VaultView from './views/VaultView';
import TrashView from './views/TrashView';
import AITabView from './views/AITabView';

export type AppView = 'dashboard' | 'favorites' | 'vault' | 'trash' | 'ai';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // AI Chat states (if they want to jump straight to chat)
  const [aiMode, setAiMode] = useState<AppMode | null>(null);
  const [activePersona, setActivePersona] = useState<Persona | null>(null);

  const navItems = [
    { id: 'dashboard', label: 'My Files', icon: FileText },
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'vault', label: 'Secure Vault', icon: Lock },
    { id: 'ai', label: 'AI Assistant', icon: Sparkles },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ];

  const handleStartChat = (persona: Persona, mode: AppMode) => {
    setActivePersona(persona);
    setAiMode(mode);
  };

  const handleBackToApp = () => {
    setAiMode(null);
    setActivePersona(null);
  };

  // Render full screen AI modes if active
  if (aiMode === AppMode.TEXT && activePersona) {
    return (
      <TextChat
        persona={activePersona}
        onBack={handleBackToApp}
        onVoiceCall={() => setAiMode(AppMode.VOICE)}
        currentTime={new Date()}
      />
    );
  }

  if (aiMode === AppMode.VOICE && activePersona) {
    return <VoiceChat persona={activePersona} onBack={handleBackToApp} currentTime={new Date()} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col bg-white border-r border-gray-200 transition-all duration-300 z-20`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            {sidebarOpen && <span className="font-bold text-xl whitespace-nowrap">DocStore</span>}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-gray-100 rounded-lg">
            <Menu className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as AppView)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left ${
                currentView === item.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${currentView === item.id ? 'text-blue-600' : 'text-gray-500'}`} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}

          {sidebarOpen && (
            <div className="mt-8 mb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Folders
            </div>
          )}

          <button className={`flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 w-full text-left ${!sidebarOpen && 'justify-center'}`}>
            <Folder className="w-5 h-5 text-yellow-500 shrink-0 fill-yellow-100" />
            {sidebarOpen && <span>Work Documents</span>}
          </button>
          <button className={`flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 w-full text-left ${!sidebarOpen && 'justify-center'}`}>
            <Folder className="w-5 h-5 text-blue-500 shrink-0 fill-blue-100" />
            {sidebarOpen && <span>Personal</span>}
          </button>
        </div>

        <div className="p-4 border-t border-gray-200">
           <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
             <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
               <UserCircle className="w-full h-full text-gray-500" />
             </div>
             {sidebarOpen && (
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
                 <p className="text-xs text-gray-500 truncate">Pro Plan</p>
               </div>
             )}
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex-1 max-w-2xl">
             <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Advanced Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-100 rounded-lg py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 border border-transparent focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
             </div>
          </div>
          <div className="flex items-center gap-4 ml-4">
             <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
             </button>
             <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <Settings className="w-5 h-5" />
             </button>
             <button className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                <UploadCloud className="w-4 h-4" />
                Upload
             </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-auto p-6">
          {currentView === 'dashboard' && <DashboardView searchQuery={searchQuery} />}
          {currentView === 'favorites' && <DashboardView searchQuery={searchQuery} filter="favorites" />}
          {currentView === 'vault' && <VaultView />}
          {currentView === 'trash' && <TrashView />}
          {currentView === 'ai' && <AITabView onStartChat={handleStartChat} />}
        </div>
      </main>
    </div>
  );
};

export default App;
