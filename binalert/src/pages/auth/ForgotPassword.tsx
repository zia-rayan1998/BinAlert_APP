import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, Send } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Form';
import { authService } from '../../services/authService';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    const res = await authService.requestPasswordReset(email);
    setMessage(res.message);
    setLoading(false);
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a secure link to choose a new password.">
      {message ? (
        <div className="ba-card p-6 text-center sm:p-8">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
            <MailCheck className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink-950">Check your inbox</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{message}</p>
          <p className="mt-4 rounded-lg bg-ink-50 px-4 py-3 text-xs text-ink-500">
            Demo environment: no email is sent. Continue to the{' '}
            <Link to="/reset-password?token=demo-reset-token" className="font-bold text-emerald2-600 hover:text-forest-700">
              reset page
            </Link>{' '}
            to try the flow.
          </p>
          <Link to="/login" className="mt-5 inline-block text-sm font-bold text-emerald2-600 hover:text-forest-700">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="ba-card space-y-5 p-6 sm:p-7">
          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
          <Field label="Email" htmlFor="fp-email" required>
            <Input id="fp-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@binalert.io" />
          </Field>
          <Button type="submit" className="w-full" size="lg" loading={loading} icon={<Send className="h-4 w-4" />}>
            Send reset link
          </Button>
          <p className="text-center text-sm text-ink-500">
            Remembered it?{' '}
            <Link to="/login" className="font-bold text-emerald2-600 hover:text-forest-700">Sign in</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
