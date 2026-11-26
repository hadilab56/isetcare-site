import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Laptop,
  AlertCircle,
  PlusCircle,
  Bell,
  User as UserIcon,
  LogOut,
  Wrench,
  CalendarClock,
  Building2,
  Tags,
  Users,
  BarChart3,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import ChatWidget from './ChatWidget';
import { ROLE_LABELS, type AppNotification } from '../api/types';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Récupération du compteur de notifications non lues
  useEffect(() => {
    let mounted = true;
    api
      .get<AppNotification[]>('/notifications')
      .then((res) => {
        if (mounted) {
          setUnreadCount(res.data.filter((n) => !n.lue).length);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  // Navigation adaptée dynamiquement au rôle
  const navItems = [
    {
      to: '/',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
      roles: ['DECLARANT', 'TECHNICIEN', 'ADMINISTRATEUR'],
      end: true,
    },
    {
      to: '/equipements',
      label: 'Parc matériel',
      icon: Laptop,
      roles: ['DECLARANT', 'TECHNICIEN', 'ADMINISTRATEUR'],
    },
    {
      to: '/reclamations',
      label: user.role === 'DECLARANT' ? 'Mes réclamations' : 'Réclamations',
      icon: AlertCircle,
      roles: ['DECLARANT', 'TECHNICIEN', 'ADMINISTRATEUR'],
    },
    {
      to: '/reclamations/nouvelle',
      label: 'Signaler une panne',
      icon: PlusCircle,
      roles: ['DECLARANT'],
    },
    {
      to: '/interventions',
      label: 'Interventions',
      icon: Wrench,
      roles: ['TECHNICIEN', 'ADMINISTRATEUR'],
    },
    {
      to: '/maintenances',
      label: 'Maintenance préventive',
      icon: CalendarClock,
      roles: ['TECHNICIEN', 'ADMINISTRATEUR'],
    },
    {
      to: '/salles',
      label: 'Salles & Bâtiments',
      icon: Building2,
      roles: ['ADMINISTRATEUR'],
    },
    {
      to: '/types',
      label: "Types d'équipement",
      icon: Tags,
      roles: ['ADMINISTRATEUR'],
    },
    {
      to: '/utilisateurs',
      label: 'Utilisateurs',
      icon: Users,
      roles: ['ADMINISTRATEUR'],
    },
    {
      to: '/statistiques',
      label: 'Statistiques',
      icon: BarChart3,
      roles: ['ADMINISTRATEUR'],
    },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: Bell,
      roles: ['DECLARANT', 'TECHNICIEN', 'ADMINISTRATEUR'],
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      to: '/profil',
      label: 'Mon profil',
      icon: UserIcon,
      roles: ['DECLARANT', 'TECHNICIEN', 'ADMINISTRATEUR'],
    },
  ];

  const allowedNav = navItems.filter((item) => item.roles.includes(user.role));
  const initials = `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase();

  return (
    <div className="app-shell">
      {/* Barre supérieure fixe */}
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <NavLink to="/" className="brand-logo">
            <div className="brand-icon">
              <ShieldCheck size={20} />
            </div>
            <span className="brand-name">
              ISET<span className="brand-accent">Care</span>
            </span>
          </NavLink>
        </div>

        <div className="topbar-right">
          <NavLink to="/notifications" className="notif-bell-btn" title="Notifications">
            <Bell size={20} />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </NavLink>

          <div className="user-pill">
            <div className="user-avatar">{initials}</div>
            <div className="user-meta">
              <span className="user-fullname">
                {user.prenom} {user.nom}
              </span>
              <span className="user-role-tag">{ROLE_LABELS[user.role]}</span>
            </div>
          </div>

          <button onClick={handleLogout} className="btn-logout" title="Se déconnecter">
            <LogOut size={16} />
            <span className="logout-text">Déconnexion</span>
          </button>
        </div>
      </header>

      <div className="app-body">
        {/* Menu latéral */}
        <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
          <nav className="sidebar-nav">
            {allowedNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                >
                  <Icon size={18} className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-version">IsetCare v1.0 • GMAO</div>
          </div>
        </aside>

        {/* Contenu principal des pages */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <ChatWidget />
    </div>
  );
}