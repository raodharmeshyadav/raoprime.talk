import React, { useState } from 'react';
import { useDocuments } from '../lib/DocumentContext';
import { Document } from '../lib/document-types';
import { FileText, Image as ImageIcon, Video, File, Star, MoreVertical, Trash2, Lock } from 'lucide-react';

interface DashboardViewProps {
  searchQuery: string;
  filter?: 'favorites';
}

const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
    case 'doc': return <FileText className="w-8 h-8 text-blue-500" />;
    case 'image': return <ImageIcon className="w-8 h-8 text-green-500" />;
    case 'video': return <Video className="w-8 h-8 text-purple-500" />;
    default: return <File className="w-8 h-8 text-gray-500" />;
  }
};

const DashboardView: React.FC<DashboardViewProps> = ({ searchQuery, filter }) => {
  const { documents, toggleFavorite, moveToTrash, moveToVault } = useDocuments();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const filteredDocs = documents.filter(doc => {
    if (doc.inTrash || doc.isVault) return false;
    if (filter === 'favorites' && !doc.isFavorite) return false;
    if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleMenuClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === id ? null : id);
  };

  return (
    <div className="h-full" onClick={() => setActiveMenu(null)}>
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {filter === 'favorites' ? 'Favorites' : 'My Files'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredDocs.length} {filteredDocs.length === 1 ? 'file' : 'files'}
          </p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
           <button className="px-3 py-1 bg-white shadow-sm rounded-md text-sm font-medium">Grid</button>
           <button className="px-3 py-1 text-gray-500 hover:text-gray-900 text-sm font-medium">List</button>
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-dashed border-gray-300">
          <File className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No files found</h3>
          <p className="text-gray-500">Upload files or adjust your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group relative cursor-pointer flex flex-col h-48">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-gray-50 rounded-lg">
                  {getFileIcon(doc.type)}
                </div>
                <div className="flex gap-1 relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(doc.id); }}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Star className={`w-5 h-5 ${doc.isFavorite ? 'fill-yellow-400 text-yellow-400 opacity-100' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => handleMenuClick(doc.id, e)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {/* Context Menu */}
                  {activeMenu === doc.id && (
                    <div className="absolute top-8 right-0 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                       <button
                         onClick={() => { moveToVault(doc.id); setActiveMenu(null); }}
                         className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                       >
                         <Lock className="w-4 h-4 text-gray-400" /> Move to Vault
                       </button>
                       <button
                         onClick={() => { moveToTrash(doc.id); setActiveMenu(null); }}
                         className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                       >
                         <Trash2 className="w-4 h-4" /> Move to Trash
                       </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto">
                <h3 className="font-medium text-gray-900 truncate" title={doc.name}>{doc.name}</h3>
                <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                  <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  <span>{doc.size}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardView;
