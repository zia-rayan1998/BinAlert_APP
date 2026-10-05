import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, LogIn } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Form';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ServiceError } from '../../services/storage';
import { ROLE_META } from '../../utils/labels';
import type { Role } from '../../types';

const DEMO_ACCOUNTS: { role: Role; email: string }[] = [
  { role: 'citizen', email: 'citizen@binalert.io' },
  { role: 'worker', email: 'worker@binalert.io' },
  { role: 'municipality', email: 'municipality@binalert.io' },
  { role: 'admin', email: 'admin@binalert.io' },
];

export function homeFor(role: Role): string {
  if (role === 'municipality') return '/municipality';
  if (role === 'admin') return '/admin';
  return '/dashboard';
}

export function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      toast('success', `Welcome back, ${user.name.split(' ')[0]}`, 'Signed in successfully.');
      navigate(homeFor(user.role));
    } catch (err) {
      setError(err instanceof ServiceError ? err.message : 'Unable to sign in right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(account: { role: Role; email: string }) {
    setEmail(account.email);
    setPassword('demo1234');
    setError('');
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue your sustainability journey.">
      <form onSubmit={onSubmit} noValidate className="ba-card space-y-5 p-6 sm:p-7">
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        <Field label="Email" htmlFor="login-email" required>
          <Input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@binalert.io" />
        </Field>
        <Field label="Password" htmlFor="login-password" required>
          <Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <div className="flex items-center justify-between">
          <Link to="/forgot-password" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald2-600 hover:text-forest-700">
            <KeyRound className="h-3.5 w-3.5" /> Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" size="lg" loading={loading} icon={<LogIn className="h-4 w-4" />}>
          Sign In
        </Button>
        <p className="text-center text-sm text-ink-500">
          Don't have an account?{' '}
          <Link to="/signup" className="font-bold text-emerald2-600 hover:text-forest-700">Sign up</Link>
        </p>
      </form>

      <div className="mt-6 rounded-xl2 border border-forest-200 bg-forest-50/70 p-5">
        <p className="ba-label text-forest-800">Demo accounts · password demo1234</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.role}
              type="button"
              onClick={() => fillDemo(a)}
              className="rounded-lg border border-forest-200 bg-white px-3 py-2 text-left text-xs font-bold text-forest-800 transition-all hover:-translate-y-0.5 hover:border-forest-400 hover:shadow-card"
            >
              {ROLE_META[a.role].label}
              <span className="mt-0.5 block truncate font-medium text-ink-400">{a.email}</span>
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
