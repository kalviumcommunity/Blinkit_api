'use client';

import { useState } from 'react';
import Link from 'next/link';
import { request } from '../lib/api';

export default function AuthForm({ signup = false }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (signup && values.password !== values.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await request(signup ? '/auth/signup' : '/auth/login', { method: 'POST', body: JSON.stringify(values) });
      window.location.replace('/dashboard');
    } catch (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return <main className="auth-page">
    <section className="auth-intro">
      <Link href="/login" className="auth-logo">blink<span>it</span><small>INVENTORY MANAGER</small></Link>
      <div><span className="auth-eyebrow">A LITTLE MORE ORGANIZED.</span><h1>Your inventory.<br />Under control.</h1><p>Keep stock up to date, track every change, and make room for a smoother day.</p><div className="auth-features"><span>Live stock counts</span><span>Clear activity history</span><span>One shared workspace</span></div></div>
      <p className="auth-footnote">Less counting. More confidence.</p>
    </section>
    <section className="auth-form-side"><div className="auth-card">
      <span className="auth-eyebrow">LET’S GET STARTED</span>
      <h2>{signup ? 'Create your account' : 'Welcome back'}</h2>
      <p>{signup ? 'Join your team’s inventory workspace.' : 'Log in to keep things moving.'}</p>
      <form onSubmit={submit}>
        {signup && <label htmlFor="name">Full name<input id="name" name="name" autoComplete="name" placeholder="Your name" required maxLength={100} disabled={busy} /></label>}
        <label htmlFor="email">Email address<input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} disabled={busy} /></label>
        <label htmlFor="password">Password<div className="auth-password"><input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} placeholder={signup ? 'At least 8 characters' : 'Enter your password'} required minLength={signup ? 8 : 1} maxLength={128} disabled={busy} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? 'Hide' : 'Show'}</button></div></label>
        {signup && <label htmlFor="confirmPassword">Confirm password<input id="confirmPassword" name="confirmPassword" type={visible ? 'text' : 'password'} autoComplete="new-password" placeholder="Repeat your password" required maxLength={128} disabled={busy} /></label>}
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="auth-submit" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Log in'}<span aria-hidden="true"> →</span></button>
      </form>
      <p className="auth-switch">{signup ? 'Already have an account?' : 'New here?'} <Link href={signup ? '/login' : '/signup'}>{signup ? 'Log in' : 'Create an account'}</Link></p>
      <p className="auth-note">{signup ? 'Your account will have access to the shared inventory.' : 'Your workspace is just one login away.'}</p>
    </div></section>
  </main>;
}
