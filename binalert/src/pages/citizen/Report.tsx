import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Crosshair, ImagePlus, MapPin, Send } from 'lucide-react';
import { PageHeader, Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../components/ui/Form';
import { StatusPill } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { reportsService } from '../../services/reportsService';
import { notificationsService } from '../../services/notificationsService';
import { ServiceError } from '../../services/storage';
import { REPORT_TYPE_META, ZONES } from '../../utils/labels';
import type { Priority, ReportType, WasteReport } from '../../types';

export function Report() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    type: 'overflowing-bin' as ReportType,
    description: '',
    locationName: '',
    zone: ZONES[0],
    lat: '',
    lng: '',
    priority: 'medium' as Priority,
    notes: '',
  });
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitted, setSubmitted] = useState<WasteReport | null>(null);

  function onPhoto(file: File) {
    if (!file.type.startsWith('image/')) {
      setErrors((e) => ({ ...e, photo: 'Unsupported format — upload a PNG or JPG image.' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors((e) => ({ ...e, photo: 'Image exceeds the 10 MB limit.' }));
      return;
    }
    setErrors((e) => ({ ...e, photo: '' }));
    setPhoto({ file, url: URL.createObjectURL(file) });
  }

  function useGps() {
    if (!navigator.geolocation) {
      setErrors((e) => ({ ...e, gps: 'Geolocation is not available on this device.' }));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) }));
        setLocating(false);
        setErrors((e) => ({ ...e, gps: '' }));
        toast('info', 'GPS location captured', 'Coordinates attached to your report.');
      },
      () => {
        setLocating(false);
        setErrors((e) => ({ ...e, gps: 'We couldn\'t access your location. Enter coordinates or a landmark instead.' }));
      },
      { timeout: 8000 },
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const next: Record<string, string> = {};
    if (form.description.trim().length < 10) next.description = 'Describe the issue in at least 10 characters.';
    if (form.locationName.trim().length < 3) next.locationName = 'Add a landmark or address so crews can find it.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const report = await reportsService.create({
        userId: user.id,
        userName: user.name,
        type: form.type,
        description: form.description.trim(),
        location: {
          name: form.locationName.trim(),
          lat: form.lat ? parseFloat(form.lat) : 17.385 + Math.random() * 0.02,
          lng: form.lng ? parseFloat(form.lng) : 78.487 + Math.random() * 0.02,
          zone: form.zone,
        },
        priority: form.priority,
        notes: form.notes.trim(),
        imageUrl: photo?.url,
      });
      notificationsService.push({
        type: 'report-submitted',
        title: `Report ${report.id} submitted`,
        body: 'Thanks for keeping your zone clean. Track progress anytime in My Reports.',
      });
      setSubmitted(report);
      toast('success', `Report ${report.id} submitted`, 'The municipal team has been notified.');
    } catch (err) {
      toast('error', 'Submission failed', err instanceof ServiceError ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <>
        <PageHeader breadcrumb="Waste reporting" title="Report submitted" subtitle="Your report is now in the municipal queue." />
        <Card className="mx-auto max-w-2xl animate-scale-in text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <h2 className="ba-num mt-5 text-2xl font-extrabold text-ink-950">Report #{submitted.id}</h2>
          <div className="mt-3 flex justify-center"><StatusPill status={submitted.status} /></div>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-500">
            {REPORT_TYPE_META[submitted.type].label} at {submitted.location.name}. You'll be notified when it is
            assigned, work begins and it is resolved.
          </p>
          <div className="mt-6 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100">
            <p className="ba-label mb-3">What happens next</p>
            <ol className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-ink-600">
              {['Submitted', 'Assigned', 'In Progress', 'Resolved'].map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1.5 ${i === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-ink-400 ring-1 ring-ink-200'}`}>{s}</span>
                  {i < 3 && <span className="text-ink-300" aria-hidden>→</span>}
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/reports"><Button variant="primary" icon={<ClipboardList className="h-4 w-4" />}>Track this report</Button></Link>
            <Link to="/map"><Button variant="outline" icon={<MapPin className="h-4 w-4" />}>View on map</Button></Link>
            <Button variant="ghost" onClick={() => { setSubmitted(null); setPhoto(null); setForm({ type: 'overflowing-bin', description: '', locationName: '', zone: ZONES[0], lat: '', lng: '', priority: 'medium', notes: '' }); }}>
              File another report
            </Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumb="Waste reporting"
        title="Report Waste"
        subtitle="Tell us what's wrong, where it is and how urgent — crews get everything they need in one ticket."
      />

      <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Issue details" subtitle="What should the collection team know?" />
          <div className="space-y-5">
            <Field label="Waste type" htmlFor="r-type" required>
              <Select id="r-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ReportType }))}>
                {(Object.keys(REPORT_TYPE_META) as ReportType[]).map((t) => (
                  <option key={t} value={t}>{REPORT_TYPE_META[t].label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Description" htmlFor="r-desc" required error={errors.description}>
              <Textarea id="r-desc" value={form.description} invalid={!!errors.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. Bin at the park gate is overflowing onto the footpath since yesterday evening…" />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Location (landmark / address)" htmlFor="r-loc" required error={errors.locationName}>
                <Input id="r-loc" value={form.locationName} invalid={!!errors.locationName} onChange={(e) => setForm((f) => ({ ...f, locationName: e.target.value }))} placeholder="Riverside Promenade, Gate 3" />
              </Field>
              <Field label="Municipal zone" htmlFor="r-zone">
                <Select id="r-zone" value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}>
                  {ZONES.map((z) => <option key={z}>{z}</option>)}
                </Select>
              </Field>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink-800">GPS location</p>
              <div className="flex flex-wrap items-center gap-2">
                <Input className="max-w-[9rem]" inputMode="decimal" placeholder="Latitude" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} aria-label="Latitude" />
                <Input className="max-w-[9rem]" inputMode="decimal" placeholder="Longitude" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} aria-label="Longitude" />
                <Button type="button" variant="outline" size="md" loading={locating} icon={<Crosshair className="h-4 w-4" />} onClick={useGps}>
                  Use my location
                </Button>
              </div>
              {errors.gps && <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">{errors.gps}</p>}
            </div>

            <Field label="Priority" htmlFor="r-priority" hint="Critical issues page the on-call crew immediately.">
              <Select id="r-priority" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Priority }))}>
                <option value="low">Low — cosmetic litter</option>
                <option value="medium">Medium — needs pickup soon</option>
                <option value="high">High — blocking public space</option>
                <option value="critical">Critical — health / hazard risk</option>
              </Select>
            </Field>

            <Field label="Optional notes" htmlFor="r-notes">
              <Textarea id="r-notes" className="min-h-[70px]" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Access details, repeat occurrences, hazards…" />
            </Field>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Upload Photo" subtitle="PNG or JPG, up to 10 MB" />
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
            {photo ? (
              <div className="space-y-3">
                <img src={photo.url} alt="Report attachment preview" className="h-44 w-full rounded-xl object-cover ring-1 ring-ink-200" />
                <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ''; }}>
                  Remove photo
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 rounded-xl2 border-2 border-dashed border-ink-200 bg-ink-50/50 px-4 py-10 text-center transition-colors hover:border-emerald2-400 hover:bg-emerald-50/40"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-forest-800 text-white"><ImagePlus className="h-5 w-5" /></span>
                <span className="text-sm font-bold text-ink-800">Add a photo</span>
                <span className="text-xs text-ink-400">Reports with photos resolve ~2× faster</span>
              </button>
            )}
            {errors.photo && <p className="mt-2 text-xs font-medium text-red-600" role="alert">{errors.photo}</p>}
          </Card>

          <Card className="bg-forest-950 !border-forest-900">
            <p className="ba-label text-forest-100/50">Ready to submit?</p>
            <p className="mt-2 text-sm leading-relaxed text-forest-100/80">
              You'll receive a report ID (e.g. BA-2026-00142) and can follow every status change from Submitted to
              Resolved.
            </p>
            <Button type="submit" variant="secondary" className="mt-4 w-full" loading={submitting} icon={<Send className="h-4 w-4" />}>
              Submit Report
            </Button>
            <button type="button" className="mt-3 w-full text-center text-xs font-semibold text-forest-100/50 hover:text-white" onClick={() => navigate('/reports')}>
              View my existing reports
            </button>
          </Card>
        </div>
      </form>
    </>
  );
}
