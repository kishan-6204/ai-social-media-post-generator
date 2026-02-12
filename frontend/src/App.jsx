import { useState } from 'react';
import FormField from './components/FormField';
import OutputCard from './components/OutputCard';

const platforms = ['Instagram', 'LinkedIn', 'Twitter/X'];
const tones = ['Professional', 'Casual', 'Motivational'];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function App() {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState(platforms[0]);
  const [tone, setTone] = useState(tones[0]);
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generatePost = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic so I can craft a great post for you.');
      return;
    }

    setError('');
    setCopied(false);
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
          tone
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to generate text right now.');
      }

      setOutput(data.text || 'No output generated. Try again with more detail.');
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyOutput = async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Copy failed. Please copy manually.');
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10">
      <section className="w-full rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-card backdrop-blur md:p-8">
        <div className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">Phase-1 MVP</p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">AI Social Media Post Generator</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300 md:text-base">
            Turn a rough idea into a polished social post in seconds. Pick your platform and tone,
            then let Gemini draft your post.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <FormField label="Topic / Idea" hint="Tip: Add context like audience or key takeaway for better results.">
              <textarea
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                rows={5}
                placeholder="e.g. Launching my first online fitness challenge for busy professionals"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none"
              />
            </FormField>

            <FormField label="Platform">
              <select
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
              >
                {platforms.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Tone">
              <select
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
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
                onClick={generatePost}
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Generating...' : output ? 'Regenerate' : 'Generate'}
              </button>

              {isLoading ? <p className="self-center text-sm text-slate-300">Crafting your post with Gemini...</p> : null}
            </div>

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          </div>

          <OutputCard output={output} onCopy={copyOutput} copied={copied} />
        </div>
      </section>
    </main>
  );
}

export default App;
