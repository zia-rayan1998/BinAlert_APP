import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { PublicLayout } from './components/layout/PublicLayout';
import { ADMIN_NAV, AppShell, CITIZEN_NAV, MUNICIPALITY_NAV } from './components/layout/AppShell';
import { Button } from './components/ui/Button';
import { useAuth } from './context/AuthContext';
import { homeFor } from './pages/auth/Login';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { Home } from './pages/public/Home';
import { About } from './pages/public/About';
import { HowItWorks } from './pages/public/HowItWorks';
import { Services } from './pages/public/Services';
import { Impact } from './pages/public/Impact';
import { Contact } from './pages/public/Contact';
import { Dashboard } from './pages/citizen/Dashboard';
import { Classify } from './pages/citizen/Classify';
import { Report } from './pages/citizen/Report';
import { Reports } from './pages/citizen/Reports';
import { MapPage } from './pages/citizen/MapPage';
import { CitizenAnalytics } from './pages/citizen/CitizenAnalytics';
import { EcoPoints } from './pages/citizen/EcoPoints';
import { Profile } from './pages/citizen/Profile';
import { Notifications } from './pages/citizen/Notifications';
import { MunicipalityOverview } from './pages/municipality/Overview';
import { MunicipalityReports } from './pages/municipality/Reports';
import { MunicipalityBins } from './pages/municipality/Bins';
import { MunicipalityCollections } from './pages/municipality/Collections';
import { MunicipalityRoutes } from './pages/municipality/Routes';
import { MunicipalityAnalytics } from './pages/municipality/Analytics';
import { MunicipalityForecast } from './pages/municipality/Forecast';
import { MunicipalityCitizens } from './pages/municipality/Citizens';
import { MunicipalityRecycling } from './pages/municipality/Recycling';
import { MunicipalitySettings } from './pages/municipality/Settings';
import { AdminOverview } from './pages/admin/Overview';
import { AdminUsers } from './pages/admin/Users';
import { AdminMunicipalities } from './pages/admin/Municipalities';
import { AdminCategories } from './pages/admin/Categories';
import { AdminAiModel } from './pages/admin/AiModel';
import { AdminAudit } from './pages/admin/Audit';
import type { Role } from './types';

export function AccessDenied() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 rounded-2xl bg-red-50 p-4 text-red-600 ring-1 ring-red-100">
        <ShieldAlert className="h-8 w-8" aria-hidden />
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-950">Access denied</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-500">
        Your role{user ? ` (${user.role})` : ''} does not have permission to view this workspace.
        Sign in with an account that matches the area you need, or return to your own dashboard.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <a href={user ? homeFor(user.role) : '/login'}>
          <Button variant="primary">{user ? 'Back to my dashboard' : 'Sign in'}</Button>
        </a>
        <a href="/">
          <Button variant="outline">Go to homepage</Button>
        </a>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="ba-num text-6xl font-extrabold text-forest-800">404</p>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-950">Page not found</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-500">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-6">
        <a href="/">
          <Button variant="primary">Back to BinAlert</Button>
        </a>
      </div>
    </div>
  );
}

function FullPage({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-canvas">{children}</div>;
}

function RequireAuth({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-forest-200 border-t-forest-700" aria-hidden />
          <p className="mt-4 text-sm font-semibold text-ink-500">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) return <AccessDenied />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public marketing site */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/services" element={<Services />} />
        <Route path="/impact" element={<Impact />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="/access-denied" element={<AccessDenied />} />
      </Route>

      {/* Authentication */}
      <Route
        path="/login"
        element={<RedirectIfAuthed><FullPage><Login /></FullPage></RedirectIfAuthed>}
      />
      <Route
        path="/signup"
        element={<RedirectIfAuthed><FullPage><Signup /></FullPage></RedirectIfAuthed>}
      />
      <Route
        path="/forgot-password"
        element={<RedirectIfAuthed><FullPage><ForgotPassword /></FullPage></RedirectIfAuthed>}
      />
      <Route
        path="/reset-password"
        element={<RedirectIfAuthed><FullPage><ResetPassword /></FullPage></RedirectIfAuthed>}
      />

      {/* Citizen + worker workspace */}
      <Route
        element={
          <RequireAuth roles={['citizen', 'worker']}>
            <AppShell nav={CITIZEN_NAV} />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/classify" element={<Classify />} />
        <Route path="/report" element={<Report />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/analytics" element={<CitizenAnalytics />} />
        <Route path="/eco-points" element={<EcoPoints />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
      </Route>

      {/* Municipality console */}
      <Route
        element={
          <RequireAuth roles={['municipality', 'admin']}>
            <AppShell nav={MUNICIPALITY_NAV} />
          </RequireAuth>
        }
      >
        <Route path="/municipality" element={<MunicipalityOverview />} />
        <Route path="/municipality/reports" element={<MunicipalityReports />} />
        <Route path="/municipality/bins" element={<MunicipalityBins />} />
        <Route path="/municipality/collections" element={<MunicipalityCollections />} />
        <Route path="/municipality/routes" element={<MunicipalityRoutes />} />
        <Route path="/municipality/analytics" element={<MunicipalityAnalytics />} />
        <Route path="/municipality/forecast" element={<MunicipalityForecast />} />
        <Route path="/municipality/citizens" element={<MunicipalityCitizens />} />
        <Route path="/municipality/recycling" element={<MunicipalityRecycling />} />
        <Route path="/municipality/settings" element={<MunicipalitySettings />} />
      </Route>

      {/* System administration */}
      <Route
        element={
          <RequireAuth roles={['admin']}>
            <AppShell nav={ADMIN_NAV} accent="ink" />
          </RequireAuth>
        }
      >
        <Route path="/admin" element={<AdminOverview />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/municipalities" element={<AdminMunicipalities />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/ai" element={<AdminAiModel />} />
        <Route path="/admin/audit" element={<AdminAudit />} />
      </Route>

      <Route path="*" element={<PublicLayout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
