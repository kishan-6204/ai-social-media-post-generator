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
  const [authMode, setAuthMode] = useState('login');
  const [authModalOpen, setAuthModalOpen] = useState(false);
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
  const [usage, setUsage] = useState({ dailyGenerations: 0, limit: 10, isGuest: true });
  const [cooldown, setCooldown] = useState(0);
  const [guestBlocked, setGuestBlocked] = useState(localStorage.getItem('guestUsed') === '1');
  const [profile, setProfile] = useState({ displayName: '', bio: '', writingStyle: '', targetAudience: '' });
  const [dashboard, setDashboard] = useState(null);

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

  useEffect(() => {
    // Guest → auth flow: main generator is always visible.
    // We only open the auth modal once guest quota is consumed (guestUsed flag).
    if (!user && guestBlocked) setAuthModalOpen(true);
  }, [guestBlocked, user]);

  const fetchAuthedData = async (activeToken) => {
    const [historyData, meData, dashboardData] = await Promise.all([
      apiRequest({ path: '/history', token: activeToken }),
      apiRequest({ path: '/me', token: activeToken }),
      apiRequest({ path: '/dashboard', token: activeToken })
    ]);
    setHistory(historyData.history || []);
    setUsage({ dailyGenerations: meData.user.dailyGenerations, limit: 10, isGuest: false });
    setProfile(meData.user.brandProfile || profile);
    setDashboard(dashboardData);
  };

  useEffect(() => {
    if (token) {
      fetchAuthedData(token).catch(() => {});
      setGuestBlocked(false);
      localStorage.removeItem('guestUsed');
      setAuthModalOpen(false);
    }
  }, [token]);

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setError('');
    setAuthModalOpen(true);
  };

  const handleAuth = async (type, email, password) => {
    setLoading(true);
    setError('');
    try {
      if (type === 'register') await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
      setAuthModalOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      setAuthModalOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const generate = async (refinement = null) => {
    if (topic.trim().length < 3) return setError('Topic must be at least 3 characters.');
    if (cooldown > 0) return;
    if (!user && guestBlocked) {
      setAuthModalOpen(true);
      setError('Sign in to continue after your free guest generation.');
      return;
    }

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

      // Frontend-only rule requested: guests can generate once, then must authenticate.
      if (!token && !refinement) {
        localStorage.setItem('guestUsed', '1');
        setGuestBlocked(true);
      }
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

  const canGenerate = useMemo(
    () => !loading && cooldown === 0 && topic.trim().length > 2 && !(guestBlocked && !user),
    [loading, cooldown, topic, guestBlocked, user]
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-lg font-semibold tracking-tight">Personal AI Social Media Assistant</p>
            <p className="text-sm text-slate-300">Create high-quality social content in seconds.</p>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-sm text-slate-300">Hi, {user.email?.split('@')[0] || 'Creator'}</span>
                <button
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
                  onClick={() => signOut(auth)}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
                  onClick={() => openAuthModal('login')}
                >
                  Login
                </button>
                <button
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-500"
                  onClick={() => openAuthModal('register')}
                >
                  Register
                </button>
              </>
            )}
          </div>
        </header>

        <section className="mx-auto mb-8 max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-5 shadow-card backdrop-blur md:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
            <p>
              Usage today: {usage.dailyGenerations} / {usage.limit}
            </p>
            {cooldown > 0 ? <p className="text-amber-300">Cooldown: {cooldown}s</p> : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <section className="space-y-3">
              <textarea
                className="h-36 w-full rounded-2xl border border-white/10 bg-slate-900/70 p-3 text-sm text-white outline-none ring-brand-500/40 placeholder:text-slate-400 focus:ring"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What do you want to post about?"
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  className="rounded-xl border border-white/10 bg-slate-900/70 p-2 text-sm"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  {platforms.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <select className="rounded-xl border border-white/10 bg-slate-900/70 p-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value)}>
                  {tones.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <select
                  className="rounded-xl border border-white/10 bg-slate-900/70 p-2 text-sm"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {languages.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </div>
              <button
                disabled={!canGenerate}
                onClick={() => generate()}
                className="w-full rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
              <div className="flex flex-wrap gap-2">
                {refinements.map((r) => (
                  <button
                    key={r}
                    className="rounded-lg border border-white/20 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-40"
                    onClick={() => generate(r)}
                    disabled={!output || loading || (guestBlocked && !user)}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {guestBlocked && !user ? <p className="text-sm text-amber-300">Sign in to continue after your free guest generation.</p> : null}
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </section>

            <section className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Generated Post</p>
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{output || 'No post generated yet.'}</pre>
              </div>
              {quality ? (
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm">
                  <p>Hook Score: {quality.hookScore} / 10</p>
                  <p>Clarity Score: {quality.clarityScore} / 10</p>
                  <p>Engagement: {quality.engagementLevel}</p>
                  <ul className="list-disc pl-5">{(quality.suggestions || []).map((s) => <li key={s}>{s}</li>)}</ul>
                </div>
              ) : null}
            </section>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <h2 className="mb-3 font-semibold">Brand Profile</h2>
            {Object.keys(profile).map((key) => (
              <input
                key={key}
                className="mb-2 w-full rounded-xl border border-white/10 bg-slate-900/70 p-2 text-sm"
                placeholder={key}
                value={profile[key]}
                onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                disabled={!user}
              />
            ))}
            <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-40" onClick={saveProfile} disabled={!user}>
              Save Profile
            </button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <h2 className="mb-3 font-semibold">Dashboard</h2>
            {dashboard ? (
              <>
                <p>Total posts: {dashboard.totalPosts}</p>
                <p>Daily usage: {dashboard.dailyUsage} / {dashboard.limit}</p>
                <p>Most used platform: {dashboard.mostUsedPlatform}</p>
                <p>Most used tone: {dashboard.mostUsedTone}</p>
              </>
            ) : (
              <p className="text-sm text-slate-300">Sign in to view your dashboard.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <h2 className="mb-3 font-semibold">History (last 20)</h2>
          {history.length ? (
            <div className="space-y-2">
              {history.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-3 text-sm">
                  <p className="mb-1 text-slate-300">
                    {item.platform} • {item.tone} • {item.createdAt}
                  </p>
                  <p className="line-clamp-2">{item.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-300">No history yet.</p>
          )}
        </section>
      </div>

      {authModalOpen ? (
        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          loading={loading}
          error={error}
          onClose={() => setAuthModalOpen(false)}
          onSubmit={handleAuth}
          onGoogle={handleGoogleSignIn}
          forceOpen={guestBlocked && !user}
        />
      ) : null}
    </main>
  );
}

function AuthModal({ mode, setMode, loading, error, onClose, onSubmit, onGoogle, forceOpen }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-card">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-xl font-semibold">{mode === 'login' ? 'Login' : 'Register'}</h2>
          <button className="text-slate-400 hover:text-white disabled:opacity-30" onClick={onClose} disabled={forceOpen}>
            ✕
          </button>
        </div>
        <AuthForm mode={mode} onSubmit={onSubmit} loading={loading} />
        <button className="mt-3 w-full rounded-xl bg-red-500 px-4 py-2 text-white hover:bg-red-400" onClick={onGoogle} disabled={loading}>
          Continue with Google
        </button>
        <button className="mt-3 text-sm underline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} disabled={loading}>
          {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>
        {forceOpen ? <p className="mt-3 text-sm text-amber-300">Sign in to continue after your free guest generation.</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
      </div>
    </div>
  );
}

function AuthForm({ mode, onSubmit, loading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (e) => {
    e.preventDefault();
    onSubmit(mode, email, password);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-white"
        placeholder="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-white"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button className="w-full rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-500" disabled={loading}>
        {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
      </button>
    </form>
  );
}

export default App;
