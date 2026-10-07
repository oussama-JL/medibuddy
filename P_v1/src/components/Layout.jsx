import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ChevronDown, ArrowRight, Menu as MenuIcon, LogOut, X } from 'lucide-react';
import { useLogout } from '../lib/auth';
import { displayName, navFor, NAV, roleLabel } from '../lib/permissions';
import Avatar from './Avatar';

// Sidebar + header shared by every role. Below 1024px the sidebar is a drawer.
export default function Layout() {
  const user = useSelector((state) => state.auth.isAuthenticated.authen);
  const role = user && user.role;
  const logout = useLogout();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false); // desktop: icons only
  const [drawerOpen, setDrawerOpen] = useState(false); // mobile: slide-in menu
  const [profileOpen, setProfileOpen] = useState(false);

  const items = navFor(role);
  const current = NAV.find((item) => location.pathname.startsWith(`/app/${item.path}`));

  // close the drawer and the profile menu whenever the page changes
  useEffect(() => {
    setDrawerOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!profileOpen) return undefined;
    const onDown = (event) => {
      if (!event.target.closest('#profile-area')) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [profileOpen]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const name = displayName(user);
  const labelsVisible = drawerOpen || !collapsed;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {drawerOpen ? (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      ) : null}

      <aside
        aria-label="Navigation principale"
        className={`fixed left-0 top-0 z-40 h-full w-64 transform bg-gradient-to-b from-blue-700 to-indigo-800 text-white shadow-xl transition-all duration-300 ease-in-out
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className="relative flex h-20 items-center border-b border-blue-600/30 px-5">
          <div className="flex items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
              <i className="bx bx-plus-medical bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-2xl text-transparent"></i>
            </div>
            {labelsVisible ? (
              <span className="ml-3 whitespace-nowrap text-xl font-bold tracking-wide">
                MEDI<span className="font-light">Buddy</span>
              </span>
            ) : null}
          </div>

          <button
            type="button"
            className="absolute right-0 top-1/2 -mr-3 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-indigo-600 shadow-md transition-all hover:bg-indigo-500 lg:flex"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Déplier le menu' : 'Replier le menu'}
          >
            {collapsed ? <MenuIcon className="h-3 w-3 text-white" /> : <ArrowRight className="h-3 w-3 text-white" />}
          </button>
          <button
            type="button"
            className="ml-auto rounded-lg p-2 text-white/80 hover:bg-white/10 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-4 py-6">
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={`/app/${item.path}`}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    `flex w-full items-center rounded-xl px-4 py-3.5 transition-all duration-200 ${
                      isActive ? 'bg-white/10 text-white shadow-lg backdrop-blur-sm' : 'text-indigo-100 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <i className={`${item.icon} text-xl`}></i>
                      {labelsVisible ? (
                        <span className="ml-3.5 flex flex-1 items-center justify-between whitespace-nowrap">
                          <span className="text-sm font-medium">{item.label}</span>
                          {isActive ? <span className="flex h-2 w-2 rounded-full bg-white"></span> : null}
                        </span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {labelsVisible ? (
          <div className="absolute bottom-0 left-0 right-0 border-t border-blue-600/30 p-4">
            <div className="flex items-center space-x-3">
              <Avatar user={user} className="h-10 w-10 text-sm ring-2 ring-white/30" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{name}</p>
                <p className="truncate text-xs text-blue-200">{roleLabel(role)}</p>
              </div>
            </div>
          </div>
        ) : null}
      </aside>

      <div className={`min-w-0 flex-1 transition-all duration-300 ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <header className="sticky top-0 z-20 bg-white shadow-sm">
          <div className="flex h-20 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
                onClick={() => setDrawerOpen(true)}
                aria-label="Ouvrir le menu"
              >
                <MenuIcon className="h-6 w-6" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-gray-800">{current ? current.title : ''}</h1>
                <p className="hidden truncate text-sm text-gray-500 sm:block">{current ? current.subtitle : ''}</p>
              </div>
            </div>

            <div className="relative" id="profile-area">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                className={`flex items-center space-x-2 rounded-xl px-3 py-2 transition-all ${profileOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <Avatar user={user} className="h-10 w-10 text-sm shadow-sm" />
                <div className="hidden text-left md:block">
                  <div className="text-sm font-semibold">{name}</div>
                  <div className="text-xs text-gray-500">{roleLabel(role)}</div>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen ? (
                <div role="menu" className="absolute right-0 mt-3 w-72 max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
                  <div className="flex items-center space-x-4 p-5">
                    <Avatar user={user} className="h-14 w-14 text-lg ring-4 ring-blue-100" />
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-gray-900">{name}</h3>
                      <p className="text-sm text-gray-500">{roleLabel(role)}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 p-3">
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center rounded-lg px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                      onClick={logout}
                    >
                      <LogOut className="mr-3 h-5 w-5 text-red-500" />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <div className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
