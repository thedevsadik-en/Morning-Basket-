"use client";

import React, { useState } from 'react';
import { verifyCredentials } from './actions';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    setError('');
    setIsPending(true);

    try {
      const result = await verifyCredentials(username.trim(), password);

      if (result.success) {
        // Read return target if present without triggering Next.js Suspense bailout
        const params = new URLSearchParams(window.location.search);
        const destination = params.get('from') || '/admin';

        // Full atomic redirect ensures the newly set auth cookie is sent immediately
        window.location.href = destination;
      } else {
        setError(result.error || 'Invalid username or password.');
        setIsPending(false);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-white w-full max-w-md p-10 rounded-2xl shadow-md border border-neutral-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-gray-800 mb-2">Morning Basket</h1>
          <p className="text-gray-500 text-sm">Sign in to Admin Control Center</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              autoComplete="username"
              disabled={isPending}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#2C5F2D]/30 outline-none transition-all duration-300 placeholder-gray-400 text-gray-800 disabled:opacity-50"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              disabled={isPending}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#2C5F2D]/30 outline-none transition-all duration-300 placeholder-gray-400 text-gray-800 disabled:opacity-50"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center font-medium bg-red-50 py-2 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-[#2C5F2D] hover:bg-[#224A23] text-white font-medium py-3.5 px-4 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md mt-2 disabled:opacity-50 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
          >
            {isPending ? 'Verifying...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}