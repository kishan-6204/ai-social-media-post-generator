import { useEffect, useMemo, useState } from 'react';
import FormField from './components/FormField';
import OutputCard from './components/OutputCard';
import HistoryPanel from './components/HistoryPanel';
import Notification from './components/Notification';

const platforms = ['Instagram', 'LinkedIn', 'Twitter/X'];
const tones = ['Professional', 'Casual', 'Motivational'];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function App() {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState(platforms[0]);
  const [tone, setTone] = useState(tones[0]);
  const [output, setOutput] = useState('');
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ type: 'success', message: '' });
  const [copied, setCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/history`);
        const data = await response.json();
        if (response.ok) {
          setHistory(data.history || []);
        }
      } catch {
        // Ignore startup history failures and keep UI usable.
      }
    };

    loadHistory();
  }, []);

  const canGenerate = useMemo(() => topic.trim().length >= 3 && !isLoading, [topic, isLoading]);

  const generatePost = async ({ regenerate = false } = {}) => {
    if (topic.trim().length < 3) {
      setError('Please enter a topic with at least 3 characters.');
      return;
    }

    setError('');
    setCopied(false);
    setNotification({ type: 'success', message: '' });
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: topic.trim(),
          platform,
          tone,
          regenerate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Unable to generate text right now.');
      }

      setOutput(data.text || 'No output generated. Try again with more detail.');
      setHistory(data.history || []);
      setNotification({ type: 'success', message: regenerate ? 'Fresh variation generated.' : 'Post generated successfully.' });
    } catch (requestError) {
      const message = requestError.message || 'Something went wrong. Please try again.';
      setError(message);
      setNotification({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  };

  const copyOutput = async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setNotification({ type: 'success', message: 'Copied to clipboard.' });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Copy failed. Please copy manually.');
      setNotification({ type: 'error', message: 'Copy failed. Please copy manually.' });
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 transition dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100 md:py-10">
      <section className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur transition dark:border-slate-800 dark:bg-slate-900/60 md:p-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">Phase-2 MVP</p>
            <h1 className="text-2xl font-bold md:text-3xl">AI Social Media Post Generator</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300 md:text-base">
              Generate platform-ready copy with stronger validation, better feedback, and session history.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDarkMode((value) => !value)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium transition hover:border-brand-500 dark:border-slate-700"
          >
            {isDarkMode ? 'Light mode' : 'Dark mode'}
          </button>
        </div>

        <Notification type={notification.type} message={notification.message} />

        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <FormField id="topic" label="Topic / Idea" required hint="Example: Product launch for new AI writing course for freelancers.">
              <textarea
                id="topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                rows={5}
                placeholder="e.g. Sharing 3 lessons from my first month as an indie creator"
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100"
              />
            </FormField>

            <FormField id="platform" label="Platform" required>
              <select
                id="platform"
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100"
              >
                {platforms.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="tone" label="Tone" required>
              <select
                id="tone"
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100"
              >
                {tones.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => generatePost()}
                disabled={!canGenerate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
                {isLoading ? 'Generating...' : 'Generate'}
              </button>

              {output ? (
                <button
                  type="button"
                  onClick={() => generatePost({ regenerate: true })}
                  disabled={isLoading}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold transition hover:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700"
                >
                  Regenerate
                </button>
              ) : null}
            </div>

            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          </div>

          <div className="space-y-5">
            <OutputCard output={output} onCopy={copyOutput} copied={copied} isLoading={isLoading} />
            <HistoryPanel history={history} />
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
