import React, { useEffect, useState } from 'react';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  isVisible: boolean;
}

const UndoToast: React.FC<UndoToastProps> = ({ message, onUndo, isVisible }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');

  // Update message when visible
  useEffect(() => {
    if (isVisible) {
      setCurrentMessage(message);
      setShouldRender(true);
    } else {
        // Delay unmounting for animation
        const timer = setTimeout(() => setShouldRender(false), 300);
        return () => clearTimeout(timer);
    }
  }, [isVisible, message]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center justify-between gap-4 px-4 py-3 rounded-md shadow-lg bg-slate-800 text-white transition-all duration-300 ease-in-out z-50 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      role="alert"
    >
      <p className="text-sm font-medium">{currentMessage}</p>
      <button
        onClick={onUndo}
        className="px-3 py-1 text-sm font-bold bg-slate-600 hover:bg-slate-500 rounded-md transition-colors border border-slate-500"
      >
        Undo
      </button>
    </div>
  );
};

export default UndoToast;