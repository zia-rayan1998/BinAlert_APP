import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Github, Linkedin, Mail, Menu, Megaphone, Twitter, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Misc';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/services', label: 'Services' },
  { to: '/impact', label: 'Impact' },
  { to: '/contact', label: 'Contact' },
];

export function PublicLayout() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          scrolled ? 'border-ink-200/80 bg-white/85 shadow-card backdrop-blur-lg' : 'border-transparent bg-canvas/60 backdrop-blur'
        }`}
      >
        <div className={`ba-container flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-14' : 'h-[4.5rem]'}`}>
          <Link to="/" aria-label="BinAlert home">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-forest-50 text-forest-800' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2.5 lg:flex">
            {user ? (
              <Link to="/dashboard">
                <Button variant="primary" icon={<Megaphone className="h-4 w-4" />}>
                  Open Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="outline">Sign Up</Button>
                </Link>
              </>
            )}
            <Link to="/report">
              <Button variant="secondary" icon={<Megaphone className="h-4 w-4" />}>
                Report Waste
              </Button>
            </Link>
          </div>

          <button
            className="rounded-lg p-2 text-ink-700 hover:bg-ink-100 lg:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="animate-fade-in border-t border-ink-100 bg-white lg:hidden">
            <nav className="ba-container flex flex-col gap-1 py-4" aria-label="Mobile">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-forest-50 text-forest-800' : 'text-ink-700 hover:bg-ink-50'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ink-100 pt-4">
                {user ? (
                  <Link to="/dashboard" className="col-span-2">
                    <Button variant="primary" className="w-full">Open Dashboard</Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login">
                      <Button variant="outline" className="w-full">Login</Button>
                    </Link>
                    <Link to="/signup">
                      <Button variant="outline" className="w-full">Sign Up</Button>
                    </Link>
                  </>
                )}
                <Link to="/report" className="col-span-2">
                  <Button variant="secondary" className="w-full" icon={<Megaphone className="h-4 w-4" />}>
                    Report Waste
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-forest-800 bg-forest-950 text-forest-100">
        <div className="ba-container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo dark />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-forest-100/70">
              Building cleaner communities with AI-powered waste management.
            </p>
            <div className="mt-6 flex gap-2">
              {[Twitter, Github, Linkedin, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label={['Twitter', 'GitHub', 'LinkedIn', 'Email'][i]}
                  className="rounded-lg bg-forest-900 p-2.5 text-forest-100/80 transition-colors hover:bg-forest-800 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {[
            { title: 'Platform', links: [['AI Classification', '/classify'], ['Waste Reporting', '/report'], ['Live Map', '/map'], ['Analytics', '/municipality/analytics'], ['Forecasting', '/municipality/forecast']] },
            { title: 'Company', links: [['About', '/about'], ['How It Works', '/how-it-works'], ['Services', '/services'], ['Impact', '/impact']] },
            { title: 'Resources', links: [['Contact', '/contact'], ['Help Center', '/contact'], ['Citizen Guide', '/how-it-works'], ['Municipality Kit', '/services']] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(([label, to]) => (
                  <li key={label}>
                    <Link to={to} className="text-sm text-forest-100/70 transition-colors hover:text-emerald2-300">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-forest-900">
          <div className="ba-container flex flex-col items-center justify-between gap-3 py-5 text-xs text-forest-100/50 sm:flex-row">
            <p>© 2026 BinAlert Technologies. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="transition-colors hover:text-emerald2-300">Privacy</a>
              <a href="#" className="transition-colors hover:text-emerald2-300">Terms</a>
              <a href="#" className="transition-colors hover:text-emerald2-300">Accessibility</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
