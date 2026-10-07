import { useEffect } from 'react';

// Centered dialog: closes on Escape and on a click outside the panel.
export default function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-2xl'}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-800 sm:text-2xl">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-1 text-2xl leading-none text-gray-400 hover:text-gray-700">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
