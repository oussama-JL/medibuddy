import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ConfirmContext = createContext(null);

// Replaces window.confirm: `if (!(await confirm({ message: '...' }))) return;`
export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);
  const confirmButton = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setDialog({
          title: 'Confirmation',
          confirmLabel: 'Confirmer',
          cancelLabel: 'Annuler',
          danger: false,
          ...options,
        });
      }),
    []
  );

  const close = (answer) => {
    if (resolver.current) resolver.current(answer);
    resolver.current = null;
    setDialog(null);
  };

  useEffect(() => {
    if (!dialog) return undefined;
    confirmButton.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') close(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onMouseDown={() => close(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="confirm-title" className="text-lg font-bold text-gray-900">{dialog.title}</h2>
            <p id="confirm-message" className="mt-2 text-sm text-gray-600">{dialog.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => close(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                {dialog.cancelLabel}
              </button>
              <button
                ref={confirmButton}
                type="button"
                onClick={() => close(true)}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${dialog.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}
