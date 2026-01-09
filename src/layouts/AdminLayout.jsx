import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { Button } from '../components/ui/button';
import { FiHome, FiUsers, FiClipboard, FiFileText, FiFile, FiBell, FiBarChart2, FiMessageSquare, FiSettings, FiChevronRight, FiMenu, FiChevronLeft, FiLogOut } from 'react-icons/fi';
import { t } from '../lib/i18n';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Default collapsed preference could be loaded from user doc if needed
  }, []);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const openMobileMenu = () => setIsMobileMenuOpen(true);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const handleLogout = async () => { try { await signOut(auth); navigate('/login'); } catch (e) { console.error(e); } };
  const navClass = ({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${isCollapsed ? 'px-3 justify-center' : ''}`;

  const items = [
    { path: '/admin/dashboard', icon: FiHome, label: t('Dashboard'), end: true },
    { path: '/admin/users', icon: FiUsers, label: t('Users') },
    { path: '/admin/providers', icon: FiClipboard, label: t('Providers') },
    { path: '/admin/requests', icon: FiFileText, label: t('Requests') },
    { path: '/admin/quotes', icon: FiClipboard, label: t('Quotes') },
    { path: '/admin/payments', icon: FiFile, label: t('Payments') },
    { path: '/admin/revenue', icon: FiBarChart2, label: t('Revenue') },
    { path: '/admin/notifications', icon: FiBell, label: t('Notifications') },
    { path: '/admin/messages', icon: FiMessageSquare, label: t('Messages') },
    { path: '/admin/feedback', icon: FiClipboard, label: t('Feedback') },
    { path: '/admin/analytics', icon: FiBarChart2, label: t('Analytics') },
    { path: '/admin/disputes', icon: FiMessageSquare, label: t('Disputes') },
    { path: '/admin/config', icon: FiSettings, label: t('Config') }
  ];

  const sidebarWidth = isCollapsed ? 'lg:w-20 w-64' : 'w-64';

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Mobile Topbar */}
      <div className="h-14 bg-white border-b flex items-center justify-between px-4 lg:hidden">
        <button onClick={openMobileMenu} className="p-2 rounded-lg hover:bg-gray-100">
          <FiMenu size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">M</span></div>
          <div>
            <h4 className="font-semibold text-gray-900 text-base leading-5">Matchmaking</h4>
            <p className="text-xs text-gray-500">{t('Admin')}</p>
          </div>
        </div>
        <div className="w-10" />
      </div>

      {/* Backdrop for mobile menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={closeMobileMenu} />
      )}

      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${sidebarWidth} flex flex-col fixed inset-y-0 left-0 h-screen bg-white transition-transform duration-300 z-40 border-r border-gray-200 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="header flex items-center justify-between px-4 bg-white">
          {!isCollapsed ? (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">M</span></div>
              <div>
                <h4 className="font-semibold text-gray-900 text-base">Matchmaking</h4>
                <p className="text-xs text-gray-500">{t('Admin')}</p>
              </div>
            </div>
          ) : (<div className="w-8 h-8" />)}
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700">{isCollapsed ? <FiMenu size={16} /> : <FiChevronLeft size={16} />}</button>
        </div>
        <nav className="px-3 py-4 space-y-1 overflow-y-auto">
          {items.map(item => {
            const Icon = item.icon; const isActive = location.pathname === item.path || (item.end ? location.pathname === item.path : location.pathname.startsWith(item.path));
            return (
              <NavLink key={item.path} to={item.path} end={item.end} className={navClass} title={isCollapsed ? item.label : ''} onClick={closeMobileMenu}>
                <Icon size={18} className={`transition-colors ${isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'} ${isCollapsed ? 'text-2xl' : 'text-xl mr-3'}`} />
                {!isCollapsed && (<><span className="flex-1">{item.label}</span>{isActive && (<FiChevronRight size={16} className="text-blue-700 ml-2" />)}</>)}
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-gray-200 p-3 bg-white">
          {!isCollapsed && (
            <div className="flex items-center justify-between text-xs">
              <button onClick={() => navigate('/admin/config')} className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"><FiSettings size={14} className="mr-1" />{t('Settings')}</button>
              <button onClick={handleLogout} className="flex items-center text-gray-500 hover:text-red-600 transition-colors"><FiLogOut size={14} className="mr-1" />{t('Logout')}</button>
            </div>
          )}
        </div>
      </aside>
      <main className={`${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'} min-h-screen`}>
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;