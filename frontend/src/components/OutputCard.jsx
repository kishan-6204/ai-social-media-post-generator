const OutputCard = ({ output, onCopy, copied }) => (
  <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 shadow-card">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold text-white">Generated Post</h2>
      <button
        type="button"
        onClick={onCopy}
        disabled={!output}
        className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:border-brand-500 hover:text-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>

    {output ? (
      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{output}</p>
    ) : (
      <p className="text-sm text-slate-400">
        Your polished post will show up here. Share your idea and click generate to get started.
      </p>
    )}
  </div>
);

export default OutputCard;
