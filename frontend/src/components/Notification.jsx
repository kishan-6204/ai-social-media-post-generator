const styles = {
  success:
    'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
  error: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
};

const Notification = ({ type = 'success', message }) => {
  if (!message) return null;

  return (
    <div className={`rounded-xl border px-4 py-2 text-sm transition ${styles[type]}`} role="status" aria-live="polite">
      {message}
    </div>
  );
};

export default Notification;
