
import React, { useState, useRef } from 'react';
import { List, Priority, Task } from '../types';
import { PlusIcon, TrashIcon, PencilIcon, QueueListIcon } from './icons';
import ToggleSwitch from './ToggleSwitch';

interface ListViewProps {
  lists: List[];
  onSelectList: (listId: string) => void;
  onAddList: (name: string, icon?: string) => void;
  onDeleteList: (listId: string) => void;
  onUpdateList: (listId: string, updates: { name?: string; icon?: string; isPriorityRotationEnabled?: boolean }) => void;
  onReorderLists: (lists: List[]) => void;
}

const ListView: React.FC<ListViewProps> = ({ lists, onSelectList, onAddList, onDeleteList, onUpdateList, onReorderLists }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListIcon, setNewListIcon] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingIcon, setEditingIcon] = useState('');
  const [editingPriorityRotation, setEditingPriorityRotation] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const commonEmojis = ['📁', '💼', '🏠', '🎓', '🚀', '🛠️', '🎨', '🛒', '📅', '💡'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (isEditing) {
          setEditingIcon(base64String);
        } else {
          setNewListIcon(base64String);
        }
        // Reset file input
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = () => {
    if (newListName.trim()) {
      onAddList(newListName.trim(), newListIcon.trim() || undefined);
      setNewListName('');
      setNewListIcon('');
      setIsAdding(false);
      setAddError(null);
    } else {
      setAddError('List name is required');
    }
  };

  const handleUpdate = (id: string) => {
    if (editingName.trim()) {
      onUpdateList(id, { 
        name: editingName.trim(), 
        icon: editingIcon.trim() || undefined,
        isPriorityRotationEnabled: editingPriorityRotation
      });
      setEditingId(null);
      setEditError(null);
    } else {
      setEditError('List name is required');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingIcon('');
    setEditingPriorityRotation(false);
    setEditError(null);
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, list: List) => {
    e.dataTransfer.setData('text/plain', list.id);
    setTimeout(() => {
        setDraggedId(list.id);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetList: List) => {
    const draggedListId = e.dataTransfer.getData('text/plain');
    if (draggedListId === targetList.id) return;

    const draggedIndex = lists.findIndex(l => l.id === draggedListId);
    const targetIndex = lists.findIndex(l => l.id === targetList.id);

    if (draggedIndex === -1) return;

    const reorderedLists = [...lists];
    const [draggedItem] = reorderedLists.splice(draggedIndex, 1);
    reorderedLists.splice(targetIndex, 0, draggedItem);
    
    onReorderLists(reorderedLists);
  };

  const renderIcon = (icon?: string, className: string = "w-6 h-6", emojiSize: string = "text-2xl") => {
    if (!icon) return <QueueListIcon className={className} />;
    
    if (icon.startsWith('http') || icon.startsWith('data:image')) {
      return <img src={icon} alt="List icon" className={`${className} object-cover rounded-md`} referrerPolicy="no-referrer" />;
    }
    
    return <span className={emojiSize}>{icon}</span>;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">My Workspaces</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Select a list to view your projects and tasks.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
        >
          <PlusIcon className="w-5 h-5" />
          Create New List
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isAdding && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 flex flex-col gap-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">New List</h3>
            
            <div className="flex gap-4 items-start">
              <div className="flex flex-col gap-2">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group">
                  {renderIcon(newListIcon, "w-12 h-12", "text-4xl")}
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                <div className="flex gap-1 flex-wrap">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewListIcon(emoji)}
                      className={`w-7 h-7 flex items-center justify-center rounded border ${
                        newListIcon === emoji ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-600'
                      } hover:border-indigo-300 transition-colors text-base`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 dark:border-slate-600 hover:border-indigo-300 transition-colors text-indigo-600 dark:text-indigo-400"
                    title="Upload Image"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, false)}
                  />
                </div>
                <input
                  autoFocus
                  type="text"
                  value={newListName}
                  onChange={(e) => {
                    setNewListName(e.target.value);
                    if (addError) setAddError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  className={`w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border ${
                    addError ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                  } outline-none`}
                  placeholder="List Name (e.g. Work)"
                />
                {addError && (
                  <p className="text-xs text-red-500 font-medium">{addError}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={handleAdd}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setAddError(null);
                }}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {lists.map((list) => (
          <div
            key={list.id}
            className={`group relative bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all hover:shadow-xl cursor-pointer ${draggedId === list.id ? 'opacity-30' : 'opacity-100'} cursor-grab`}
            onClick={() => onSelectList(list.id)}
            draggable
            onDragStart={(e) => handleDragStart(e, list)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, list)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400 w-12 h-12 flex items-center justify-center overflow-hidden">
                {renderIcon(list.icon)}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(list.id);
                    setEditingName(list.name);
                    setEditingIcon(list.icon || '');
                    setEditingPriorityRotation(list.isPriorityRotationEnabled || false);
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteList(list.id);
                  }}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-slate-500 hover:text-red-600"
                  title="Delete List"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {editingId === list.id ? (
              <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-3">
                <div className="flex gap-3 items-start">
                  <div className="flex flex-col gap-1">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative">
                      {renderIcon(editingIcon, "w-10 h-10", "text-3xl")}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex gap-1 flex-wrap">
                      {commonEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEditingIcon(emoji)}
                          className={`w-6 h-6 flex items-center justify-center rounded text-xs border ${
                            editingIcon === emoji ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-600'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 dark:border-slate-600 hover:border-indigo-300 transition-colors text-indigo-600 dark:text-indigo-400"
                        title="Upload Image"
                      >
                        <PlusIcon className="w-3 h-3" />
                      </button>
                      <input
                        type="file"
                        ref={editFileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, true)}
                      />
                    </div>
                    <input
                      autoFocus
                      type="text"
                      value={editingName}
                      onChange={(e) => {
                        setEditingName(e.target.value);
                        if (editError) setEditError(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(list.id)}
                      className={`w-full px-2 py-1 text-lg font-bold bg-slate-50 dark:bg-slate-900 border-b-2 ${
                        editError ? 'border-red-500' : 'border-indigo-500'
                      } outline-none`}
                    />
                    {editError && (
                      <p className="text-xs text-red-500 font-medium">{editError}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Priority Rotation</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Order projects by highest task priority</span>
                  </div>
                  <ToggleSwitch
                    checked={editingPriorityRotation}
                    onChange={setEditingPriorityRotation}
                    aria-label="Toggle Priority Rotation"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdate(list.id)}
                    className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1 truncate" title={list.name}>{list.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {list.projects.length} {list.projects.length === 1 ? 'Project' : 'Projects'}
                </p>
              </div>
            )}
            
            <div className="mt-6 flex flex-wrap -space-x-2">
                {(() => {
                    let projectsToRender = [...list.projects];
                    
                    if (list.isPriorityRotationEnabled) {
                        const getHighestPriority = (p: any) => {
                            const now = new Date();
                            const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                            const visibleTasks = p.tasks.filter((t: any) => !t.scheduledDate || t.scheduledDate <= today);
                            
                            if (visibleTasks.length === 0) return -1;
                            if (visibleTasks.some((t: any) => t.priority === Priority.High)) return 3;
                            if (visibleTasks.some((t: any) => t.priority === Priority.Medium)) return 2;
                            if (visibleTasks.some((t: any) => t.priority === Priority.Low)) return 1;
                            return 0;
                        };

                        projectsToRender.sort((a, b) => getHighestPriority(b) - getHighestPriority(a));
                    }

                    return projectsToRender.map((p) => {
                        const now = new Date();
                        const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                        const visibleTasks = p.tasks.filter(t => !t.scheduledDate || t.scheduledDate <= today);

                        const highestPriority = visibleTasks.length > 0 ? (
                            visibleTasks.some(t => t.priority === Priority.High) ? Priority.High :
                            visibleTasks.some(t => t.priority === Priority.Medium) ? Priority.Medium :
                            Priority.Low
                        ) : null;

                        const ringClass = highestPriority === Priority.High ? 'ring-2 ring-red-500' :
                                        highestPriority === Priority.Medium ? 'ring-2 ring-yellow-500' :
                                        highestPriority === Priority.Low ? 'ring-2 ring-blue-500' :
                                        '';

                        return (
                                <div 
                                    key={p.id} 
                                    className={`inline-block h-8 w-8 rounded-full ${ringClass} bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 transition-all`}
                                    title={`${p.name}${highestPriority ? ` (${highestPriority} Priority)` : ''}`}
                                >
                                    {(() => {
                                        const clean = p.name.replace(/[^a-zA-Z0-9]/g, '');
                                        return clean.slice(0, 2).toUpperCase() || p.name.trim().slice(0, 2).toUpperCase();
                                    })()}
                                </div>
                        );
                    });
                })()}
            </div>
          </div>
        ))}
      </div>

      {lists.length === 0 && !isAdding && (
        <div className="mt-12 flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <QueueListIcon className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">No lists created yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
            Create your first list to start organizing your projects. You can have separate lists for work, school, or personal goals.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="mt-8 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all active:scale-95"
          >
            Get Started
          </button>
        </div>
      )}
    </div>
  );
};

export default ListView;
