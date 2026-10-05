import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Form';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { ServiceError } from '../../services/storage';

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (confirm !== password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      toast('success', 'Password updated', 'Sign in with your new password.');
      navigate('/login');
    } catch (err) {
      setErrors({ form: err instanceof ServiceError ? err.message : 'Unable to reset the password right now.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Pick something strong you haven't used before.">
      <form onSubmit={onSubmit} noValidate className="ba-card space-y-5 p-6 sm:p-7">
        {errors.form && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errors.form}
          </div>
        )}
        <Field label="New password" htmlFor="rp-password" required error={errors.password} hint="At least 8 characters.">
          <Input id="rp-password" type="password" autoComplete="new-password" value={password} invalid={!!errors.password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirm new password" htmlFor="rp-confirm" required error={errors.confirm}>
          <Input id="rp-confirm" type="password" autoComplete="new-password" value={confirm} invalid={!!errors.confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={loading} icon={<LockKeyhole className="h-4 w-4" />}>
          Update password
        </Button>
        <p className="text-center text-sm text-ink-500">
          <Link to="/login" className="font-bold text-emerald2-600 hover:text-forest-700">Back to sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
