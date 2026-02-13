const HistoryPanel = ({ history }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
    <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent history (last 5)</h2>
    {history.length === 0 ? (
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No posts yet. Generate one to populate history.</p>
    ) : (
      <ul className="mt-4 space-y-3">
        {history.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
              {item.platform} • {item.tone}
            </p>
            <p className="max-h-24 overflow-hidden whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{item.text}</p>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export default HistoryPanel;
