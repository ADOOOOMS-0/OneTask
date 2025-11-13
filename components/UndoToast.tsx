import React, { useEffect, useState } from 'react';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  isVisible: boolean;
}

const UndoToast: React.FC<UndoToastProps> = ({ message, onUndo, isVisible }) => {
  const [isRendered, setIsRendered] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');

  useEffect(() => {
    if (isVisible) {
      setCurrentMessage(message);
    }
  }, [isVisible, message]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isVisible) {
      setIsRendered(true);
    } else if (isRendered) {
      // When isVisible becomes false, we wait for the animation to finish before un-rendering.
      timer = setTimeout(() => setIsRendered(false), 300); // Must match transition duration
    }
    return () => clearTimeout(timer);
  }, [isVisible, isRendered]);

  if (!isRendered) return null;

  return (
    <div
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center justify-between gap-4 px-4 py-3 rounded-md shadow-lg bg-slate-800 text-white transition-all duration-300 ease-in-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      role="alert"
    >
      <p className="text-sm">{currentMessage}</p>
      <button
        onClick={onUndo}
        className="px-3 py-1 text-sm font-semibold bg-slate-600 hover:bg-slate-500 rounded-md transition-colors"
      >
        Undo
      </button>
    </div>
  );
};

export default UndoToast;
