const OutputCard = ({ output, onCopy, copied, isLoading }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition dark:border-slate-700/70 dark:bg-slate-900/70">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">Generated Post</h2>
      <button
        type="button"
        onClick={onCopy}
        disabled={!output || isLoading}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-100"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>

    {isLoading ? (
      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        Generating your post...
      </div>
    ) : output ? (
      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">{output}</p>
    ) : (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Your polished post will show up here. Share your idea and click generate to get started.
      </p>
    )}
  </div>
);

export default OutputCard;
