const toastStyles = {
  success: 'border-emerald-300/80 bg-emerald-500/20 text-emerald-100',
  error: 'border-rose-300/80 bg-rose-500/20 text-rose-100',
  limit: 'border-amber-300/80 bg-amber-500/20 text-amber-100',
  cooldown: 'border-sky-300/80 bg-sky-500/20 text-sky-100'
};

function ToastContainer({ toasts = [] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-card backdrop-blur animate-fadeIn ${toastStyles[toast.type] || toastStyles.error}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
