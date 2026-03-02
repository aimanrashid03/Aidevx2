import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

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
        if (session) {
            navigate('/dashboard', { replace: true });
        }
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
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <div className="text-center mb-8 flex flex-col items-center">
                    <img src="/logo.png" alt="Aidevx Logo" className="h-[4.5rem] w-auto object-contain mb-3" />
                    <p className="text-slate-500">{subtitle[mode]}</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-100">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded border border-green-100">
                        {message}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    {mode === 'signup' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                placeholder="Jane Smith"
                                required
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                            placeholder="you@company.com"
                            required
                        />
                    </div>
                    {mode !== 'forgot' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                placeholder="••••••••"
                                required
                            />
                            {mode === 'signin' && (
                                <button
                                    type="button"
                                    onClick={() => switchMode('forgot')}
                                    className="mt-1.5 text-xs text-slate-500 hover:text-slate-900 hover:underline focus:outline-none"
                                >
                                    Forgot password?
                                </button>
                            )}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : mode === 'signup' ? 'Sign Up' : mode === 'forgot' ? 'Send Reset Link' : 'Sign In'}
                    </button>
                </form>

                <div className="text-center mt-6 text-sm text-slate-500">
                    {mode === 'forgot' ? (
                        <button onClick={() => switchMode('signin')} className="text-slate-900 font-medium hover:underline focus:outline-none">
                            Back to sign in
                        </button>
                    ) : mode === 'signup' ? (
                        <>Already have an account?{' '}
                            <button onClick={() => switchMode('signin')} className="text-slate-900 font-medium hover:underline focus:outline-none">
                                Sign in
                            </button>
                        </>
                    ) : (
                        <>Don&apos;t have an account?{' '}
                            <button onClick={() => switchMode('signup')} className="text-slate-900 font-medium hover:underline focus:outline-none">
                                Sign up
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
