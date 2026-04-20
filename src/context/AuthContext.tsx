import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

export interface UserProfile {
    id: string;
    email: string | null;
    full_name: string | null;
    role: 'admin' | 'user';
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    profileLoading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    profileLoading: true,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        setProfileLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (error) {
                console.error('Error fetching profile:', error);
                setProfile(null);
            } else {
                setProfile(data as UserProfile);
            }
        } catch (err) {
            console.error('Unexpected error fetching profile', err);
            setProfile(null);
        } finally {
            setProfileLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (mounted) {
                    setSession(session);
                    setUser(session?.user ?? null);
                    if (session?.user) {
                        fetchProfile(session.user.id); // DO NOT AWAIT to prevent blocking UI
                    } else {
                        setProfile(null);
                        setProfileLoading(false);
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                if (mounted) {
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initializeAuth();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            setSession(session);
            setUser(session?.user ?? null);
            if (event === 'SIGNED_OUT') {
                setProfile(null);
                setProfileLoading(false);
            } else if (session?.user && event !== 'TOKEN_REFRESHED') {
                // TOKEN_REFRESHED fires on every tab focus — same user, no need to re-fetch profile
                fetchProfile(session.user.id); // DO NOT AWAIT
            }
            if (mounted) setLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Supabase sign out error:', error);
        } finally {
            // Aggressively clear localStorage tokens in case server failed
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    localStorage.removeItem(key);
                }
            }
            // Force application state to clear regardless of server response
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            setProfileLoading(false);
        }
    };

    const value = {
        session,
        user,
        profile,
        loading,
        profileLoading,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    return useContext(AuthContext);
};
