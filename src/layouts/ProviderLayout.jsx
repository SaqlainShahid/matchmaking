import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { subscribeToNotifications, markNotificationAsRead, markAllNotificationsAsRead, requestNotificationPermission } from '../services/notificationService';
import { Button } from '../components/ui/button';
import {
  FiHome,
  FiFileText,
  FiClipboard,
  FiBriefcase,
  FiFile,
  FiMessageSquare,
  FiPlus,
  FiSearch,
  FiBell,
  FiSettings,
  FiChevronRight,
  FiLogOut,
  FiMenu,
  FiChevronLeft
} from 'react-icons/fi';

const ProviderLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter(n => !n.read).length;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationsRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close popovers when clicking outside or pressing Escape
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (showNotifications && notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifications, showUserMenu]);

  useEffect(() => {
    // Request notification permission and subscribe to notifications
    let unsubscribe = null;
    const uid = auth.currentUser?.uid;
    if (uid) {
      requestNotificationPermission().catch(() => {});
      unsubscribe = subscribeToNotifications(uid, (list) => setNotifications(list));
      // Load dashboard preferences (e.g., sidebar collapsed default)
      getDoc(doc(db, 'users', uid)).then((snap) => {
        const prefs = snap.data()?.preferences;
        if (prefs && typeof prefs.sidebarCollapsedDefault === 'boolean') {
          setIsCollapsed(!!prefs.sidebarCollapsedDefault);
        }
      }).catch(() => {});
    }
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const navClass = ({ isActive }) =>
    `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
      isActive
        ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-700'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    } ${isCollapsed ? 'px-3 justify-center' : ''}`;

  const menuItems = [
    { path: '/provider/dashboard', icon: FiHome, label: 'Dashboard', end: true },
    { path: '/provider/requests', icon: FiFileText, label: 'Requests' },
    { path: '/provider/quotes', icon: FiClipboard, label: 'Quotes' },
    { path: '/provider/projects', icon: FiBriefcase, label: 'Projects' },
    { path: '/provider/services', icon: FiBriefcase, label: 'Services' },
    { path: '/provider/invoices', icon: FiFile, label: 'Invoices' },
    { path: '/provider/messages', icon: FiMessageSquare, label: 'Messages' },
    { path: '/provider/feedback', icon: FiClipboard, label: 'Feedback' },
  ];

  // Mobile shows full-width drawer; large screens use collapsed widths
  const sidebarWidth = isCollapsed ? 'w-64 lg:w-20' : 'w-64 lg:w-64';
  const mainContentMargin = isCollapsed ? 'ml-0 lg:ml-20' : 'ml-0 lg:ml-64';
  const mobileSidebarTranslate = isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full';

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarWidth} bg-white border-r border-gray-200 flex flex-col flex-shrink-0 fixed top-0 left-0 h-screen transition-transform duration-300 transform ${mobileSidebarTranslate} lg:translate-x-0 z-50`}>
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Brand */}
          <div className="flex-shrink-0 flex items-center justify-between h-16 px-4 border-b border-gray-200 bg-white">
            {!isCollapsed ? (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-base">Matchmaking</h4>
                  <p className="text-xs text-gray-500">Provider</p>
                </div>
              </div>
            ) : (
              <div className="w-8 h-8"></div>
            )}
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            >
              {isCollapsed ? <FiMenu size={16} /> : <FiChevronLeft size={16} />}
            </button>
          </div>

          {/* Nav */}
          <div className="flex-1 overflow-y-auto">
            <nav className="px-3 py-6 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path ||
                  (item.end ? location.pathname === item.path : location.pathname.startsWith(item.path));

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={navClass}
                    title={isCollapsed ? item.label : ''}
                  >
                    <Icon
                      size={18}
                      className={`transition-colors ${
                        isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'
                      } ${isCollapsed ? '' : 'mr-3'}`}
                    />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {isActive && (
                          <FiChevronRight size={16} className="text-blue-700 ml-2" />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex-shrink-0 border-t border-gray-200">
          <div className="p-3 bg-gray-50/50">
            <Button
              onClick={() => navigate('/provider/quotes/new')}
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center ${
                isCollapsed ? 'px-2' : ''
              }`}
              title={isCollapsed ? 'New Quote' : ''}
            >
              <FiPlus size={18} className={isCollapsed ? '' : 'mr-2'} />
              {!isCollapsed && 'New Quote'}
            </Button>
          </div>

          <div className="p-3 bg-white">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} mb-3`}>
              <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {auth.currentUser?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {auth.currentUser?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {auth.currentUser?.email}
                  </p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="flex items-center justify-between text-xs">
                <button
                  onClick={() => navigate('/provider/settings')}
                  className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <FiSettings size={14} className="mr-1" />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center text-gray-500 hover:text-red-600 transition-colors"
                >
                  <FiLogOut size={14} className="mr-1" />
                  Logout
                </button>
              </div>
            )}
            {isCollapsed && (
              <div className="flex flex-col items-center space-y-3 text-xs">
                <button
                  className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100"
                  title="Settings"
                  onClick={() => navigate('/provider/settings')}
                >
                  <FiSettings size={16} />
                </button>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
                  title="Logout"
                >
                  <FiLogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm lg:hidden z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Content */}
      <div className={`flex-1 flex flex-col min-w-0 ${mainContentMargin} transition-all duration-300`}>
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200 h-16 px-6 flex items-center justify-between">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              className="p-2 mr-2 rounded-lg lg:hidden text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              aria-label="Open menu"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <FiMenu size={18} />
            </button>
            <div className="relative w-75">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <FiSearch className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search"
                className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md bg-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const q = headerSearch.trim();
                    if (q.length > 0) {
                      navigate(`/provider/requests?q=${encodeURIComponent(q)}`);
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="flex items-center space-x-4 ml-6">
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(v => !v)}
                className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FiBell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">Notifications</p>
                    <button
                      onClick={async () => {
                        const uid = auth.currentUser?.uid;
                        if (uid) {
                          await markAllNotificationsAsRead(uid);
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Mark all as read
                    </button>
                  </div>
                  <ul className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 && (
                      <li className="px-4 py-6 text-sm text-gray-500 text-center">No notifications</li>
                    )}
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`px-4 py-3 border-b last:border-b-0 ${n.read ? 'bg-white' : 'bg-blue-50'}`}
                      >
                        <button
                          className="w-full text-left"
                          onClick={async () => {
                            await markNotificationAsRead(n.id);
                            setShowNotifications(false);
                            if (n.clickAction) {
                              const href = n.clickAction.startsWith('/') ? n.clickAction : `/${n.clickAction}`;
                              navigate(href);
                            }
                          }}
                        >
                          <p className="text-sm font-medium text-gray-900">{n.title}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{n.body}</p>
                          <p className="text-[11px] text-gray-400 mt-1">{n.createdAt ? n.createdAt.toLocaleString() : ''}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center space-x-3 pl-3 border-l border-gray-200"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-500">{auth.currentUser?.email}</p>
                </div>
                <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-xs">
                    {auth.currentUser?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">
                      {auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{auth.currentUser?.email}</p>
                  </div>
                  <ul className="py-1 text-sm text-gray-700">
                    <li>
                      <button className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { setShowUserMenu(false); navigate('/provider/settings'); }}>Settings</button>
                    </li>
                    <li>
                      <button className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={handleLogout}>Logout</button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 bg-gray-50 overflow-auto">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProviderLayout;