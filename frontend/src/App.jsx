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
import ToastContainer from './components/ToastContainer';
import SkeletonLoader from './components/SkeletonLoader';

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
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [toasts, setToasts] = useState([]);

  const pushToast = (type, message) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, type, message }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3200);
  };

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
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    // Keep the generator visible for guests and only open auth UI as a modal after free usage.
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
      pushToast('success', 'Welcome back! You are now logged in.');
    } catch (e) {
      setError(e.message);
      pushToast('error', e.message);
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
      pushToast('success', 'Logged in with Google successfully.');
    } catch (e) {
      setError(e.message);
      pushToast('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const autoGrow = (event) => {
    const area = event.target;
    area.style.height = 'auto';
    area.style.height = `${area.scrollHeight}px`;
  };

  const generate = async (refinement = null) => {
    if (topic.trim().length < 3) {
      setError('Topic must be at least 3 characters.');
      pushToast('error', 'Topic must be at least 3 characters.');
      return;
    }
    if (cooldown > 0) {
      pushToast('cooldown', `Please wait ${cooldown}s before generating again.`);
      return;
    }
    if (!user && guestBlocked) {
      setAuthModalOpen(true);
      const message = 'You have used your free generation — please login to continue.';
      setError(message);
      pushToast('limit', message);
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
      pushToast('success', refinement ? 'Post refined successfully.' : 'Post generated successfully.');

      if (!token && !refinement) {
        localStorage.setItem('guestUsed', '1');
        setGuestBlocked(true);
        pushToast('limit', 'You have used your free generation — please login to continue.');
      }
      if (data.requiresLogin) {
        localStorage.setItem('guestUsed', '1');
        setGuestBlocked(true);
        pushToast('limit', 'Daily guest limit reached — please login to continue.');
      }
      if (token) fetchAuthedData(token).catch(() => {});
    } catch (e) {
      setError(e.message);
      const lower = e.message.toLowerCase();
      if (lower.includes('limit')) pushToast('limit', e.message);
      else if (lower.includes('cooldown')) pushToast('cooldown', e.message);
      else pushToast('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      await apiRequest({ path: '/profile', method: 'POST', token, body: profile });
      pushToast('success', 'Brand profile saved.');
    } catch (e) {
      setError(e.message);
      pushToast('error', e.message);
    }
  };

  const canGenerate = useMemo(() => !loading && topic.trim().length > 2 && !(guestBlocked && !user), [loading, topic, guestBlocked, user]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 transition dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <div className="container mx-auto p-6">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-300/70 bg-white/90 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="mx-auto text-center lg:mx-0 lg:text-left">
            <p className="text-2xl font-semibold tracking-tight">Personal AI Social Media Assistant</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">Create high-quality social content in seconds.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10"
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
            {user ? (
              <>
                <span className="text-sm text-slate-600 dark:text-slate-300">Hi, {user.email?.split('@')[0] || 'Creator'}</span>
                <button
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10"
                  onClick={() => signOut(auth)}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10"
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

        {/* Main page layout with generator as primary full-width card */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <section className="lg:col-span-2 mx-auto w-full max-w-5xl rounded-3xl border border-slate-300/70 bg-white/90 p-6 shadow-card backdrop-blur xl:max-w-6xl dark:border-white/10 dark:bg-white/5 md:p-8">
            <div className="grid gap-6 md:grid-cols-2">
              <section className="space-y-3">
                <label className="text-lg font-medium">Topic</label>
                <textarea
                  className="w-full resize-none overflow-hidden rounded-2xl border border-slate-300 bg-white/80 p-3 text-sm outline-none ring-brand-500/40 placeholder:text-slate-500 focus:ring dark:border-white/10 dark:bg-slate-900/70 dark:text-white dark:placeholder:text-slate-400"
                  value={topic}
                  onInput={autoGrow}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What do you want to post about?"
                  rows={5}
                />
                <p className="text-sm text-slate-500 dark:text-slate-400">Example: "Launching my first AI project on LinkedIn"</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <select
                    className="rounded-xl border border-slate-300 bg-white/80 p-2 text-sm dark:border-white/10 dark:bg-slate-900/70"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                  >
                    {platforms.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                  <select
                    className="rounded-xl border border-slate-300 bg-white/80 p-2 text-sm dark:border-white/10 dark:bg-slate-900/70"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                  >
                    {tones.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <select
                    className="rounded-xl border border-slate-300 bg-white/80 p-2 text-sm dark:border-white/10 dark:bg-slate-900/70"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {languages.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Usage today: {usage.dailyGenerations} / {usage.limit}
                  </p>
                  <button
                    disabled={!canGenerate}
                    onClick={() => generate()}
                    className="rounded-xl bg-brand-600 px-6 py-2.5 font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Generate'}
                  </button>
                </div>
                {cooldown > 0 ? <p className="text-sm text-amber-500 dark:text-amber-300">Cooldown: {cooldown}s</p> : null}
                <div className="flex flex-wrap gap-2">
                  {refinements.map((r) => (
                    <button
                      key={r}
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-white/20 dark:text-slate-200 dark:hover:bg-white/10"
                      onClick={() => generate(r)}
                      disabled={!output || loading || (guestBlocked && !user)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {error ? <p className="text-sm text-rose-500 dark:text-rose-300">{error}</p> : null}
              </section>

              <section className="space-y-3">
                <div className="rounded-2xl border border-slate-300 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Generated Post</p>
                  {loading ? (
                    <SkeletonLoader />
                  ) : (
                    <div className="whitespace-pre-wrap break-words min-h-[150px] rounded bg-white bg-opacity-5 p-4 text-sm leading-relaxed text-slate-800 animate-fadeIn dark:text-slate-100">
                      {output || 'No post generated yet.'}
                    </div>
                  )}
                </div>
                {quality ? (
                  <div className="rounded-2xl border border-slate-300 bg-white/80 p-4 text-sm dark:border-white/10 dark:bg-slate-900/70">
                    <p>Hook Score: {quality.hookScore} / 10</p>
                    <p>Clarity Score: {quality.clarityScore} / 10</p>
                    <p>Engagement: {quality.engagementLevel}</p>
                    <ul className="list-disc pl-5">{(quality.suggestions || []).map((s) => <li key={s}>{s}</li>)}</ul>
                  </div>
                ) : null}
              </section>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-300/70 bg-white/90 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
            <h2 className="mb-3 text-lg font-semibold">Brand Profile</h2>
            {Object.keys(profile).map((key) => (
              <input
                key={key}
                className="mb-2 w-full rounded-xl border border-slate-300 bg-white/80 p-2 text-sm dark:border-white/10 dark:bg-slate-900/70"
                placeholder={key}
                value={profile[key]}
                onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                disabled={!user}
              />
            ))}
            <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-40" onClick={saveProfile} disabled={!user}>
              Save Profile
            </button>
          </section>

          <section className="rounded-2xl border border-slate-300/70 bg-white/90 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
            <h2 className="mb-3 text-lg font-semibold">Dashboard</h2>
            {dashboard ? (
              <>
                <p>Total posts: {dashboard.totalPosts}</p>
                <p>Daily usage: {dashboard.dailyUsage} / {dashboard.limit}</p>
                <p>Most used platform: {dashboard.mostUsedPlatform}</p>
                <p>Most used tone: {dashboard.mostUsedTone}</p>
              </>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-300">Sign in to view your dashboard.</p>
            )}
          </section>

          <section className="lg:col-span-2 rounded-2xl border border-slate-300/70 bg-white/90 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
            <h2 className="mb-3 text-lg font-semibold">History (last 20)</h2>
            {history.length ? (
              <div className="space-y-2">
                {history.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-300 bg-white/80 p-3 text-sm dark:border-white/10 dark:bg-slate-900/60">
                    <p className="mb-1 text-slate-500 dark:text-slate-300">
                      {item.platform} • {item.tone} • {item.createdAt}
                    </p>
                    <p className="line-clamp-2">{item.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-300">No history yet.</p>
            )}
          </section>
        </div>
      </div>

      <ToastContainer toasts={toasts} />

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
          <h2 className="text-xl font-semibold text-white">{mode === 'login' ? 'Login' : 'Register'}</h2>
          <button className="text-slate-400 hover:text-white disabled:opacity-30" onClick={onClose} disabled={forceOpen}>
            ✕
          </button>
        </div>
        <AuthForm mode={mode} onSubmit={onSubmit} loading={loading} />
        <button className="mt-3 w-full rounded-xl bg-red-500 px-4 py-2 text-white hover:bg-red-400" onClick={onGoogle} disabled={loading}>
          Continue with Google
        </button>
        <button className="mt-3 text-sm text-slate-100 underline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} disabled={loading}>
          {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>
        {forceOpen ? <p className="mt-3 text-sm text-amber-300">You have used your free generation — please login to continue.</p> : null}
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
