import { useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, Mail, MessageCircleQuestion, Phone, Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, SectionHeading } from '../../components/ui/Card';
import { Field, Input, Select, Textarea } from '../../components/ui/Form';
import { useToast } from '../../context/ToastContext';
import { latency } from '../../services/storage';

const FAQS = [
  {
    q: 'Do I need an account to report waste?',
    a: 'You can file a report as a guest, but signing in lets you track status, receive notifications and earn eco points.',
  },
  {
    q: 'How accurate is the AI classification?',
    a: 'The production model targets 94%+ top-1 accuracy on validation sets. In demo mode, predictions are simulated and clearly labelled so you can explore the full UX.',
  },
  {
    q: 'Can my municipality get its own zone setup?',
    a: 'Yes. Municipal onboarding configures zones, bins, routes, crews and roles. Contact us for a deployment plan.',
  },
  {
    q: 'What happens to my photos?',
    a: 'Uploads are validated for type and size, stored securely, and used only for report handling and (optionally) improving classification quality.',
  },
];

const CHANNELS = [
  { icon: Mail, label: 'Email', value: 'hello@binalert.io', sub: 'Replies within 1 business day' },
  { icon: Phone, label: 'Support', value: '+91 40 5550 1188', sub: 'Mon–Sat, 8:00–20:00 IST' },
  { icon: Building2, label: 'Office', value: '4th Floor, GreenWorks Hub, HITEC City, Hyderabad', sub: 'By appointment' },
  { icon: Phone, label: 'Emergency hotline', value: '1800-266-9111', sub: 'Hazardous waste spills, 24×7' },
];

export function Contact() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: 'Partnership', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (form.message.trim().length < 15) next.message = 'Message should be at least 15 characters.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSending(true);
    await latency(700, 1100);
    setSending(false);
    setForm({ name: '', email: '', phone: '', subject: 'Partnership', message: '' });
    toast('success', 'Message sent', 'Our team will get back to you within one business day.');
  }

  return (
    <section className="ba-container py-20 lg:py-24">
      <SectionHeading
        eyebrow="Contact"
        title="Talk to the BinAlert team"
        subtitle="Partnerships, municipal deployments, research collaborations or press — we read everything."
      />

      <div className="grid gap-8 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Send us a message" subtitle="Fields marked * are required." />
          <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" htmlFor="c-name" required error={errors.name}>
              <Input id="c-name" value={form.name} onChange={set('name')} invalid={!!errors.name} placeholder="Your full name" autoComplete="name" />
            </Field>
            <Field label="Email" htmlFor="c-email" required error={errors.email}>
              <Input id="c-email" type="email" value={form.email} onChange={set('email')} invalid={!!errors.email} placeholder="you@organization.org" autoComplete="email" />
            </Field>
            <Field label="Phone" htmlFor="c-phone" hint="Optional">
              <Input id="c-phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 …" autoComplete="tel" />
            </Field>
            <Field label="Subject" htmlFor="c-subject">
              <Select id="c-subject" value={form.subject} onChange={set('subject')}>
                {['Partnership', 'Municipal deployment', 'Research', 'Support', 'Press'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Message" htmlFor="c-message" required error={errors.message}>
                <Textarea id="c-message" value={form.message} onChange={set('message')} invalid={!!errors.message} placeholder="Tell us about your city, organization or question…" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" loading={sending} icon={<Send className="h-4 w-4" />}>
                Submit message
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {CHANNELS.map((c) => (
            <div key={c.label} className="flex items-start gap-4 rounded-xl2 border border-ink-100 bg-white p-5 shadow-card transition-shadow hover:shadow-lift">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700 ring-1 ring-forest-100">
                <c.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="ba-label">{c.label}</p>
                <p className="mt-1 text-sm font-bold text-ink-900">{c.value}</p>
                <p className="text-xs text-ink-400">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <h2 className="mb-6 flex items-center gap-2 text-xl font-extrabold text-ink-950">
          <MessageCircleQuestion className="h-5 w-5 text-emerald2-600" /> Frequently asked
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-xl2 border border-ink-100 bg-white p-5 shadow-card open:shadow-lift">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-ink-900">
                {f.q}
                <span className="text-ink-300 transition-transform group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-500">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
