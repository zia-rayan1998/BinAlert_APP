import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Form';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ServiceError } from '../../services/storage';
import { ROLE_META } from '../../utils/labels';
import type { Role } from '../../types';
import { homeFor } from './Login';

export function Signup() {
  const { signup } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'citizen' as Role });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (form.password.length < 8) next.password = 'Password must be at least 8 characters.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const user = await signup(form.name, form.email, form.password, form.role);
      toast('success', `Welcome to BinAlert, ${user.name.split(' ')[0]}!`, 'Your account is ready. Start classifying waste.');
      navigate(homeFor(user.role));
    } catch (err) {
      setErrors({ form: err instanceof ServiceError ? err.message : 'Unable to create your account right now.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Get started" subtitle="Create your BinAlert account and join your city's clean-up.">
      <form onSubmit={onSubmit} noValidate className="ba-card space-y-5 p-6 sm:p-7">
        {errors.form && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errors.form}
          </div>
        )}
        <Field label="Full name" htmlFor="su-name" required error={errors.name}>
          <Input id="su-name" autoComplete="name" value={form.name} invalid={!!errors.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your full name" />
        </Field>
        <Field label="Email" htmlFor="su-email" required error={errors.email}>
          <Input id="su-email" type="email" autoComplete="email" value={form.email} invalid={!!errors.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@example.com" />
        </Field>
        <Field label="Password" htmlFor="su-password" required error={errors.password} hint="At least 8 characters.">
          <Input id="su-password" type="password" autoComplete="new-password" value={form.password} invalid={!!errors.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
        </Field>
        <Field label="Role" htmlFor="su-role" hint="Determines your workspace and permissions.">
          <Select id="su-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
            {(Object.keys(ROLE_META) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_META[r].label} — {ROLE_META[r].description}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={loading} icon={<UserPlus className="h-4 w-4" />}>
          Create Account
        </Button>
        <p className="text-center text-sm text-ink-500">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-emerald2-600 hover:text-forest-700">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
