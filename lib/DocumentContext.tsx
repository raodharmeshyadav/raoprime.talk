import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Document, Folder } from './document-types';
import { MOCK_DOCUMENTS, MOCK_FOLDERS } from './mock-data';

interface DocumentContextType {
  documents: Document[];
  folders: Folder[];
  toggleFavorite: (id: string) => void;
  moveToTrash: (id: string) => void;
  restoreFromTrash: (id: string) => void;
  deletePermanently: (id: string) => void;
  moveToVault: (id: string) => void;
  removeFromVault: (id: string) => void;
  addDocument: (doc: Omit<Document, 'id' | 'createdAt'>) => void;
  emptyTrash: () => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCUMENTS);
  const [folders] = useState<Folder[]>(MOCK_FOLDERS);

  const toggleFavorite = (id: string) => {
    setDocuments(docs => docs.map(doc => doc.id === id ? { ...doc, isFavorite: !doc.isFavorite } : doc));
  };

  const moveToTrash = (id: string) => {
    setDocuments(docs => docs.map(doc => doc.id === id ? { ...doc, inTrash: true } : doc));
  };

  const restoreFromTrash = (id: string) => {
    setDocuments(docs => docs.map(doc => doc.id === id ? { ...doc, inTrash: false } : doc));
  };

  const deletePermanently = (id: string) => {
    setDocuments(docs => docs.filter(doc => doc.id !== id));
  };

  const moveToVault = (id: string) => {
    setDocuments(docs => docs.map(doc => doc.id === id ? { ...doc, isVault: true } : doc));
  };

  const removeFromVault = (id: string) => {
    setDocuments(docs => docs.map(doc => doc.id === id ? { ...doc, isVault: false } : doc));
  };

  const addDocument = (doc: Omit<Document, 'id' | 'createdAt'>) => {
    const newDoc: Document = {
      ...doc,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    setDocuments(docs => [newDoc, ...docs]);
  };

  const emptyTrash = () => {
    setDocuments(docs => docs.filter(doc => !doc.inTrash));
  };

  return (
    <DocumentContext.Provider value={{
      documents,
      folders,
      toggleFavorite,
      moveToTrash,
      restoreFromTrash,
      deletePermanently,
      moveToVault,
      removeFromVault,
      addDocument,
      emptyTrash,
    }}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};
