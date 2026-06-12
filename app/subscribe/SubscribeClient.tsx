'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Razorpay checkout.js types
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: any) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Razorpay) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Razorpay script failed to load'));
    document.head.appendChild(s);
  });
}

export function SubscribeClient({
  userEmail,
  userName,
}: {
  userEmail: string;
  userName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStartTrial() {
    setLoading(true);
    setError(null);

    try {
      // 1. Create subscription on server
      const res = await fetch('/api/subscription/create', { method: 'POST' });
      const body = (await res.json()) as { subscriptionId?: string; keyId?: string; error?: string };
      if (!res.ok || !body.subscriptionId) {
        throw new Error(body.error ?? 'Failed to create subscription');
      }

      // 2. Load Razorpay checkout.js
      await loadRazorpayScript();

      // 3. Open Razorpay checkout for subscription authorization
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: body.keyId,
          subscription_id: body.subscriptionId,
          name: 'Examina',
          description: '3-day free trial, then ₹999/month',
          prefill: { name: userName, email: userEmail },
          theme: { color: '#4F46E5' },
          handler: async (response: {
            razorpay_subscription_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              // 4. Verify payment signature server-side
              const verifyRes = await fetch('/api/subscription/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(response),
              });
              if (!verifyRes.ok) throw new Error('Verification failed');
              resolve();
              router.push('/dashboard');
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => reject(new Error('dismissed')),
          },
        });
        rzp.open();
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'dismissed') {
        setLoading(false);
        return;
      }
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-xl text-center">
      {/* Header */}
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-3xl">
        🎓
      </div>
      <h1 className="font-display text-3xl text-ink">Start learning today</h1>
      <p className="mt-2 text-sm text-inkMuted">
        AI-powered tutoring for Class 12 Physics &amp; Maths — taught by Aryan Sir
      </p>

      {/* Trial offer card */}
      <div className="mt-6 rounded-xl border-2 border-accent bg-accentMuted px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          3-Day Free Trial
        </p>
        <p className="mt-1.5 text-4xl font-bold text-ink">
          ₹0{' '}
          <span className="text-base font-normal text-inkMuted">for 3 days</span>
        </p>
        <p className="mt-1 text-sm text-inkMuted">then ₹999 / month — cancel any time</p>
      </div>

      {/* Feature list */}
      <ul className="mt-6 space-y-2 text-left text-sm text-ink">
        {[
          'Live AI whiteboard lessons with Aryan Sir',
          'Full NCERT Class 12 Physics & Mathematics',
          'Practice questions with instant diagnosis',
          'Spaced-repetition flashcards',
          'Cheat sheets, deep dives & mock exams',
        ].map((feat) => (
          <li key={feat} className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-green-500">✓</span>
            <span>{feat}</span>
          </li>
        ))}
      </ul>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleStartTrial()}
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-accent py-3.5 text-sm font-bold text-white shadow-md hover:bg-accentHover disabled:opacity-60 transition-colors"
      >
        {loading ? 'Setting up your trial…' : 'Start 3-day free trial →'}
      </button>

      <p className="mt-3 text-xs text-inkMuted">
        No charge during trial. Cancel before 3 days to pay nothing.
      </p>
    </div>
  );
}
