import type { Session } from '@supabase/supabase-js';
import { Factory, LoaderCircle, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

import WorkspacePage from '@/app/workspace/page';
import AuthForm from '@/components/AuthForm';
import { getSupabase } from '@/lib/supabase';
import { getSupabaseConfig, isTestMode } from '@/lib/supabase/config';

type AppRoute = '/' | '/auth/callback' | '/workspace';

const TEST_MODE = isTestMode();
const SUPABASE_CONFIG = getSupabaseConfig();
const CONFIG_ERROR =
  !TEST_MODE && !SUPABASE_CONFIG
    ? 'Authentication is not configured. Add the Vite Supabase environment variables and restart the app.'
    : '';

function currentRoute(): AppRoute {
  if (window.location.pathname.startsWith('/auth/callback')) return '/auth/callback';
  if (window.location.pathname.startsWith('/workspace')) return '/workspace';
  return '/';
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(currentRoute);
  const [session, setSession] = useState<Session | null>(null);
  const [isBooting, setIsBooting] = useState(!TEST_MODE && Boolean(SUPABASE_CONFIG));
  const [authError, setAuthError] = useState(CONFIG_ERROR);

  useEffect(() => {
    const onPopState = () => setRoute(currentRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (TEST_MODE || !SUPABASE_CONFIG) return;

    const supabase = getSupabase();
    let isActive = true;

    const restoreSession = async () => {
      if (currentRoute() === '/auth/callback') {
        const code = new URLSearchParams(window.location.search).get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          window.history.replaceState({}, '', '/workspace');
          setRoute('/workspace');
        }
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (isActive) setSession(data.session);

      if (currentRoute() === '/auth/callback') {
        if (!data.session) throw new Error('The invitation link is invalid or has expired.');
        window.history.replaceState({}, '', '/workspace');
        setRoute('/workspace');
      }
    };

    void restoreSession()
      .catch((error: unknown) => {
        if (!isActive) return;
        setAuthError(error instanceof Error ? error.message : 'Sign-in could not be completed.');
        window.history.replaceState({}, '', '/?reason=invalid_invitation');
        setRoute('/');
      })
      .finally(() => {
        if (isActive) setIsBooting(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isActive) setSession(nextSession);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  function navigate(path: AppRoute): void {
    window.history.replaceState({}, '', path);
    setRoute(path);
  }

  if (isBooting || (route === '/auth/callback' && !TEST_MODE && !authError)) {
    return <LoadingScreen />;
  }

  if (route === '/workspace' && (session || TEST_MODE)) {
    return <WorkspacePage onSignedOut={() => navigate('/')} />;
  }

  const reason =
    route === '/workspace'
      ? 'session_expired'
      : new URLSearchParams(window.location.search).get('reason') || undefined;
  return (
    <>
      {authError ? (
        <div className="configuration-alert" role="alert">
          <ShieldAlert aria-hidden="true" size={18} />
          <span>{authError}</span>
        </div>
      ) : null}
      <AuthForm reason={reason} onAuthenticated={() => navigate('/workspace')} />
    </>
  );
}

function LoadingScreen() {
  return (
    <main className="boot-screen" aria-live="polite">
      <div className="boot-brand">
        <span className="brand-mark" aria-hidden="true">
          <Factory size={24} />
        </span>
        <strong>MIOS</strong>
      </div>
      <LoaderCircle className="boot-spinner" aria-hidden="true" />
      <p>Securing your manufacturing workspace…</p>
    </main>
  );
}
