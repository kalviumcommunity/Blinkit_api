'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { request } from '../lib/api';

export default function AuthShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [checkedPath, setCheckedPath] = useState(null);
  const publicPage = pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    let active = true;
    request('/auth/me').then(({ user }) => {
      if (!active) return;
      setUser(user);
      setError('');
      setCheckedPath(pathname);
      if (publicPage) router.replace('/dashboard');
    }).catch(error => {
      if (!active) return;
      setUser(null);
      setCheckedPath(pathname);
      setError(error.status === 401 ? '' : error.message);
      if (error.status === 401 && !publicPage) router.replace('/login');
    });
    return () => { active = false; };
  }, [pathname, publicPage, router]);

  if (publicPage) return children;
  if (error) return <main className="auth-status"><h1>Unable to connect</h1><p role="alert">{error}</p><button onClick={() => window.location.reload()}>Try again</button></main>;
  if (!user || checkedPath !== pathname) return <main className="auth-status">Checking your session…</main>;
  return <div className="app-layout"><Sidebar user={user} /><div className="main-content">{children}</div></div>;
}
