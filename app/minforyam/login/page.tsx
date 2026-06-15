'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        // On successful authentication, redirect to dashboard
        router.push('/minforyam');
      } else {
        setError(data.error || 'Login failed. Please check your password.');
        setLoading(false);
      }
    } catch {
      setError('A network error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-[#FAFAFA]">
      <div className="w-full max-w-[400px] py-12 px-8 bg-white border border-[#E5E5E5] rounded-2xl shadow-sm">
        <header className="mb-8 text-center">
          <h1 className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase text-[#1A1A1A] mb-2">
            Priyam Sameer
          </h1>
          <h2 className="text-xl font-bold tracking-tight text-[#1A1A1A] font-sans">
            Control Panel Login
          </h2>
        </header>

        <form onSubmit={handleSubmit} method="POST" className="space-y-6">
          {error && (
            <div
              className="p-3 text-sm rounded-lg bg-red-50 border border-red-200 text-red-600 font-medium"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-xs font-bold font-mono tracking-wider uppercase text-[#525252]"
            >
              Security Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full min-h-[48px] px-4 pr-12 text-base bg-white border border-[#CCCCCC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#8C8C8C] hover:text-[#1A1A1A] focus:outline-none"
              >
                <span className="material-symbols-rounded block text-lg select-none">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] flex items-center justify-center bg-[#1A1A1A] text-white hover:bg-black font-semibold rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
}
