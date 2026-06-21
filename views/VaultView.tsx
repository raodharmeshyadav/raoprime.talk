import React, { useState } from 'react';
import { useDocuments } from '../lib/DocumentContext';
import { Lock, Unlock, FileText, Image as ImageIcon, Video, File, ArrowUpFromLine, Trash2 } from 'lucide-react';

const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
    case 'doc': return <FileText className="w-8 h-8 text-blue-500" />;
    case 'image': return <ImageIcon className="w-8 h-8 text-green-500" />;
    case 'video': return <Video className="w-8 h-8 text-purple-500" />;
    default: return <File className="w-8 h-8 text-gray-500" />;
  }
};

const VaultView: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { documents, removeFromVault, moveToTrash } = useDocuments();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Try "admin".');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)]">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Secure Vault</h2>
          <p className="text-gray-500 mb-6 text-sm">Enter your master password to access your encrypted files.</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              {error && <p className="text-red-500 text-sm mt-2 text-left">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Unlock Vault
            </button>
          </form>
        </div>
      </div>
    );
  }

  const vaultDocs = documents.filter(doc => doc.isVault && !doc.inTrash);

  return (
    <div className="h-full">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Unlock className="w-6 h-6 text-blue-600" /> Secure Vault
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {vaultDocs.length} encrypted {vaultDocs.length === 1 ? 'file' : 'files'}
          </p>
        </div>
        <button
          onClick={() => setIsAuthenticated(false)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
        >
          Lock Vault
        </button>
      </div>

      {vaultDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-dashed border-gray-300">
          <Lock className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">Vault is empty</h3>
          <p className="text-gray-500">Move files here for extra security.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {vaultDocs.map((doc) => (
            <div key={doc.id} className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col h-48 relative group">
               <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button
                   onClick={() => removeFromVault(doc.id)}
                   title="Remove from Vault"
                   className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md"
                 >
                   <ArrowUpFromLine className="w-4 h-4" />
                 </button>
                 <button
                   onClick={() => moveToTrash(doc.id)}
                   title="Move to Trash"
                   className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
               </div>

               <div className="p-2 bg-blue-50 rounded-lg w-max mb-4">
                  {getFileIcon(doc.type)}
               </div>
               <div className="mt-auto">
                 <h3 className="font-medium text-gray-900 truncate" title={doc.name}>{doc.name}</h3>
                 <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                   <span>Encrypted</span>
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

export default VaultView;
