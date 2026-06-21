export enum AppMode {
  CONTACTS = 'CONTACTS',
  TEXT = 'TEXT',
  VOICE = 'VOICE'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  groundingMetadata?: any;
}

export interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  color: string;
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  description: string;
  systemInstruction: string;
  avatar: string; // URL for the image
  color: string; // Tailwind gradient classes
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  avatarColor: string; // Hex for visualizer
  isVerified?: boolean;
  useThinking?: boolean;
  useSearch?: boolean;
}