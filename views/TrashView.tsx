import React from 'react';
import { useDocuments } from '../lib/DocumentContext';
import { Trash2, RotateCcw, FileText, Image as ImageIcon, Video, File, XOctagon } from 'lucide-react';

const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
    case 'doc': return <FileText className="w-8 h-8 text-blue-500" />;
    case 'image': return <ImageIcon className="w-8 h-8 text-green-500" />;
    case 'video': return <Video className="w-8 h-8 text-purple-500" />;
    default: return <File className="w-8 h-8 text-gray-500" />;
  }
};

const TrashView: React.FC = () => {
  const { documents, restoreFromTrash, deletePermanently, emptyTrash } = useDocuments();

  const trashDocs = documents.filter(doc => doc.inTrash);

  return (
    <div className="h-full">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
             Trash
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Items in trash will be permanently deleted after 30 days.
          </p>
        </div>
        {trashDocs.length > 0 && (
          <button
            onClick={emptyTrash}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <XOctagon className="w-4 h-4" /> Empty Trash
          </button>
        )}
      </div>

      {trashDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-dashed border-gray-300">
          <Trash2 className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">Trash is empty</h3>
          <p className="text-gray-500">No deleted files.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {trashDocs.map((doc) => (
            <div key={doc.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col h-48 relative group">
               <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button
                   onClick={() => restoreFromTrash(doc.id)}
                   title="Restore"
                   className="p-1.5 bg-white hover:bg-blue-50 text-blue-600 rounded-md border border-gray-200 shadow-sm"
                 >
                   <RotateCcw className="w-4 h-4" />
                 </button>
                 <button
                   onClick={() => deletePermanently(doc.id)}
                   title="Delete Permanently"
                   className="p-1.5 bg-white hover:bg-red-50 text-red-600 rounded-md border border-gray-200 shadow-sm"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
               </div>

               <div className="p-2 bg-gray-200 rounded-lg w-max mb-4 opacity-50">
                  {getFileIcon(doc.type)}
               </div>
               <div className="mt-auto opacity-70">
                 <h3 className="font-medium text-gray-900 truncate line-through" title={doc.name}>{doc.name}</h3>
                 <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
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

export default TrashView;
