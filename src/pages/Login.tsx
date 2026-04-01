import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

type Mode = 'signin' | 'signup' | 'forgot';

export default function Login() {
    const navigate = useNavigate();
    const { session } = useAuth();
    const [mode, setMode] = useState<Mode>('signin');
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        if (session) navigate('/dashboard', { replace: true });
    }, [session, navigate]);

    const switchMode = (next: Mode) => {
        setMode(next);
        setError(null);
        setMessage(null);
        setFullName('');
        setPassword('');
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            if (mode === 'signup') {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName } },
                });
                if (error) throw error;
                if (data.session) {
                    navigate('/dashboard', { replace: true });
                } else {
                    setMessage('Check your email for the confirmation link!');
                }
            } else if (mode === 'forgot') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin,
                });
                if (error) throw error;
                setMessage('Password reset link sent — check your email.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const subtitle: Record<Mode, string> = {
        signin: 'Sign in to your account',
        signup: 'Create a new account',
        forgot: 'Reset your password',
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#f6f9fc] px-4">
            <div className="w-full max-w-[400px]">
                {/* Logo */}
                <div className="mb-7 flex justify-center">
                    <img
                        src="/logo.png"
                        alt="Aidevx"
                        className="h-9 w-auto"
                        onError={e => {
                            const el = e.target as HTMLImageElement;
                            el.style.display = 'none';
                            const fallback = el.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'block';
                        }}
                    />
                    <span className="hidden text-2xl font-black tracking-tight text-[#1a1f36]">Aidevx</span>
                </div>

                {/* Card */}
                <div className="rounded-lg border border-[#e3e8ee] bg-white px-10 pb-10 pt-8"
                     style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.06)' }}>

                    <h1 className="mb-1 text-center text-xl font-semibold tracking-tight text-[#1a1f36]">Aidevx</h1>
                    <p className="mb-8 text-center text-[13px] text-[#697386]">{subtitle[mode]}</p>

                    {error && (
                        <div className="mb-5 flex items-center gap-2 rounded-md border border-[#f8d7da] bg-[#fdf2f2] px-3.5 py-2.5 text-[13px] text-[#cd3d64]">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="mb-5 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-700">
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-5">
                        {mode === 'signup' && (
                            <div className="space-y-1.5">
                                <label className="block text-[13px] font-medium text-[#1a1f36]">Full Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    className="w-full rounded-md border border-[#d8dee4] bg-white px-3 py-[9px] text-sm text-[#1a1f36] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow placeholder:text-[#a3acb9] focus:border-[var(--accent-600)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]/20"
                                    placeholder="Jane Smith"
                                    required
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="block text-[13px] font-medium text-[#1a1f36]">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full rounded-md border border-[#d8dee4] bg-white px-3 py-[9px] text-sm text-[#1a1f36] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow placeholder:text-[#a3acb9] focus:border-[var(--accent-600)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]/20"
                                placeholder="you@company.com"
                                required
                            />
                        </div>

                        {mode !== 'forgot' && (
                            <div className="space-y-1.5">
                                <label className="block text-[13px] font-medium text-[#1a1f36]">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full rounded-md border border-[#d8dee4] bg-white px-3 py-[9px] text-sm text-[#1a1f36] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow placeholder:text-[#a3acb9] focus:border-[var(--accent-600)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]/20"
                                    placeholder="••••••••"
                                    required
                                />
                                {mode === 'signin' && (
                                    <button
                                        type="button"
                                        onClick={() => switchMode('forgot')}
                                        className="mt-1 text-[12px] text-[#697386] hover:text-[#1a1f36] focus:outline-none transition-colors"
                                    >
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-md px-4 py-[9px] text-sm font-medium text-white transition-all disabled:opacity-60"
                            style={{
                                background: 'var(--accent-600)',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.9)')}
                            onMouseLeave={e => (e.currentTarget.style.filter = '')}
                        >
                            {loading ? 'Processing…' : mode === 'signup' ? 'Sign Up' : mode === 'forgot' ? 'Send Reset Link' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-[12px] text-[#8792a2]">
                        {mode === 'forgot' ? (
                            <button onClick={() => switchMode('signin')} className="font-medium text-[#1a1f36] hover:underline focus:outline-none">
                                Back to sign in
                            </button>
                        ) : mode === 'signup' ? (
                            <>Already have an account?{' '}
                                <button onClick={() => switchMode('signin')} className="font-medium text-[#1a1f36] hover:underline focus:outline-none">
                                    Sign in
                                </button>
                            </>
                        ) : (
                            <>Don&apos;t have an account?{' '}
                                <button onClick={() => switchMode('signup')} className="font-medium text-[#1a1f36] hover:underline focus:outline-none">
                                    Sign up
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
