import { useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth, googleProvider } from './lib/firebase';
import { apiRequest } from './lib/api';

const platforms = ['Instagram', 'LinkedIn', 'Twitter/X'];
const tones = ['Professional', 'Casual', 'Motivational'];
const languages = ['English', 'Hindi'];
const refinements = ['Stronger Hook', 'More Emotional', 'Make Shorter', 'More Professional'];

function App() {
  const [mode, setMode] = useState('login');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState(platforms[0]);
  const [tone, setTone] = useState(tones[0]);
  const [language, setLanguage] = useState(languages[0]);
  const [output, setOutput] = useState('');
  const [quality, setQuality] = useState(null);
  const [history, setHistory] = useState([]);
  const [usage, setUsage] = useState({ dailyGenerations: 0, limit: 10, isGuest: false });
  const [cooldown, setCooldown] = useState(0);
  const [guestBlocked, setGuestBlocked] = useState(localStorage.getItem('guestUsed') === '1');
  const [profile, setProfile] = useState({ displayName: '', bio: '', writingStyle: '', targetAudience: '' });
  const [dashboard, setDashboard] = useState(null);
  const [themeDark, setThemeDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeDark);
  }, [themeDark]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        const idToken = await nextUser.getIdToken();
        localStorage.setItem('token', idToken);
        setToken(idToken);
      } else {
        localStorage.removeItem('token');
        setToken('');
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const fetchAuthedData = async (activeToken) => {
    const [historyData, meData, dashboardData] = await Promise.all([
      apiRequest({ path: '/history', token: activeToken }),
      apiRequest({ path: '/me', token: activeToken }),
      apiRequest({ path: '/dashboard', token: activeToken })
    ]);
    setHistory(historyData.history || []);
    setUsage({ dailyGenerations: meData.user.dailyGenerations, limit: 10 });
    setProfile(meData.user.brandProfile || profile);
    setDashboard(dashboardData);
  };

  useEffect(() => {
    if (token) {
      fetchAuthedData(token).catch(() => {});
      setGuestBlocked(false);
      localStorage.removeItem('guestUsed');
    }
  }, [token]);

  const handleAuth = async (type, email, password) => {
    setLoading(true);
    setError('');
    try {
      if (type === 'register') await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const generate = async (refinement = null) => {
    if (topic.trim().length < 3) return setError('Topic must be at least 3 characters.');
    if (cooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      const path = refinement ? '/refine' : '/generate';
      const data = await apiRequest({
        path,
        method: 'POST',
        token: token || undefined,
        body: { topic, platform, tone, language, refinement }
      });
      setOutput(data.text);
      setQuality(data.quality);
      if (data.usage) setUsage(data.usage);
      setCooldown(10);
      if (data.requiresLogin) {
        localStorage.setItem('guestUsed', '1');
        setGuestBlocked(true);
      }
      if (token) fetchAuthedData(token).catch(() => {});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      await apiRequest({ path: '/profile', method: 'POST', token, body: profile });
    } catch (e) {
      setError(e.message);
    }
  };

  const canGenerate = useMemo(() => !loading && cooldown === 0 && topic.trim().length > 2, [loading, cooldown, topic]);

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow dark:bg-slate-900">
          <h1 className="mb-4 text-2xl font-bold">{mode === 'login' ? 'Login' : 'Register'}</h1>
          <AuthForm mode={mode} onSubmit={handleAuth} loading={loading} />
          <button className="mt-3 w-full rounded bg-red-500 px-4 py-2 text-white" onClick={() => signInWithPopup(auth, googleProvider)}>
            Continue with Google
          </button>
          <button className="mt-3 text-sm underline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
          </button>
          {guestBlocked ? <p className="mt-4 text-amber-500">Sign in to continue after your free guest generation.</p> : null}
          {error ? <p className="mt-2 text-rose-500">{error}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-6xl space-y-4 rounded-2xl bg-white p-4 shadow dark:bg-slate-900">
        <div className="flex flex-wrap justify-between gap-2">
          <h1 className="text-xl font-bold">Phase-3 AI Social Media SaaS</h1>
          <div className="flex gap-2">
            <button className="rounded border px-3 py-1" onClick={() => setThemeDark((v) => !v)}>{themeDark ? 'Light' : 'Dark'}</button>
            <button className="rounded border px-3 py-1" onClick={() => signOut(auth)}>Logout</button>
          </div>
        </div>

        <p className="text-sm">Usage today: {usage.dailyGenerations} / {usage.limit}</p>
        {cooldown > 0 ? <p className="text-sm text-amber-500">Cooldown: {cooldown}s</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-2">
            <textarea className="w-full rounded border p-2 text-black" rows={4} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic" />
            <div className="grid grid-cols-3 gap-2">
              <select className="rounded border p-2 text-black" value={platform} onChange={(e) => setPlatform(e.target.value)}>{platforms.map((p) => <option key={p}>{p}</option>)}</select>
              <select className="rounded border p-2 text-black" value={tone} onChange={(e) => setTone(e.target.value)}>{tones.map((t) => <option key={t}>{t}</option>)}</select>
              <select className="rounded border p-2 text-black" value={language} onChange={(e) => setLanguage(e.target.value)}>{languages.map((l) => <option key={l}>{l}</option>)}</select>
            </div>
            <button disabled={!canGenerate} onClick={() => generate()} className="rounded bg-brand-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Generate</button>
            <div className="flex flex-wrap gap-2">
              {refinements.map((r) => (
                <button key={r} className="rounded border px-2 py-1 text-xs" onClick={() => generate(r)} disabled={!output || loading}>{r}</button>
              ))}
            </div>
            {error ? <p className="text-rose-500">{error}</p> : null}
          </section>

          <section className="space-y-3">
            <div className="rounded border p-3">
              <p className="mb-2 text-xs uppercase">Generated Post</p>
              <pre className="whitespace-pre-wrap text-sm">{loading ? 'Generating...' : output || 'No post yet.'}</pre>
            </div>
            {quality ? (
              <div className="rounded border p-3 text-sm">
                <p>Hook Score: {quality.hookScore} / 10</p>
                <p>Clarity Score: {quality.clarityScore} / 10</p>
                <p>Engagement: {quality.engagementLevel}</p>
                <ul className="list-disc pl-5">{(quality.suggestions || []).map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            ) : null}
          </section>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded border p-3">
            <h2 className="mb-2 font-semibold">Brand Profile</h2>
            {Object.keys(profile).map((key) => (
              <input key={key} className="mb-2 w-full rounded border p-2 text-black" placeholder={key} value={profile[key]} onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} />
            ))}
            <button className="rounded bg-emerald-600 px-3 py-1 text-white" onClick={saveProfile}>Save Profile</button>
          </div>
          <div className="rounded border p-3">
            <h2 className="font-semibold">Dashboard</h2>
            {dashboard ? (
              <>
                <p>Total posts: {dashboard.totalPosts}</p>
                <p>Daily usage: {dashboard.dailyUsage} / {dashboard.limit}</p>
                <p>Most used platform: {dashboard.mostUsedPlatform}</p>
                <p>Most used tone: {dashboard.mostUsedTone}</p>
              </>
            ) : (
              <p className="text-sm">No data yet.</p>
            )}
          </div>
        </section>

        <section className="rounded border p-3">
          <h2 className="mb-2 font-semibold">History (last 20)</h2>
          {history.length ? (
            <div className="space-y-2">
              {history.map((item) => (
                <div key={item.id} className="rounded border p-2 text-sm">
                  <p>{item.platform} • {item.tone} • {item.createdAt}</p>
                  <p className="line-clamp-2">{item.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm">No history yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function AuthForm({ mode, onSubmit, loading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(mode, email, password);
      }}
    >
      <input type="email" required className="w-full rounded border p-2 text-black" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" required minLength={6} className="w-full rounded border p-2 text-black" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button disabled={loading} className="w-full rounded bg-brand-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
        {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
      </button>
    </form>
  );
}

export default App;
