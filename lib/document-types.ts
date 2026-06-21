export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'image' | 'video' | 'other';
  size: string;
  createdAt: string;
  isFavorite: boolean;
  folderId?: string | null;
  inTrash: boolean;
  isVault: boolean;
  url?: string;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
}
