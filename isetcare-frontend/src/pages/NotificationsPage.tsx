import { useEffect, useState } from 'react';
import { Bell, CheckCheck, AlertCircle, CalendarClock,  Info, Check } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { TYPE_NOTIF_LABELS, type AppNotification, type TypeNotification } from '../api/types';
import { formatDateTime } from '../utils/format';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterUnread, setFilterUnread] = useState(false);

  const fetchNotifications = () => {
    setLoading(true);
    api
      .get<AppNotification[]>('/notifications')
      .then((res) => setNotifications(res.data))
      .catch((err) => setError(errorMessage(err, 'Impossible de charger les notifications.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/lue`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lue: true } : n))
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/lues');
      setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const getTypeIcon = (type: TypeNotification) => {
    switch (type) {
      case 'NOUVELLE_RECLAMATION':
        return <AlertCircle size={20} color="#2563eb" />;
      case 'RETARD':
      case 'PANNES_FREQUENTES':
        return <AlertCircle size={20} color="#dc2626" />;
      case 'RAPPEL_MAINTENANCE':
        return <CalendarClock size={20} color="#d97706" />;
      default:
        return <Info size={20} color="#059669" />;
    }
  };

  const displayed = filterUnread
    ? notifications.filter((n) => !n.lue)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.lue).length;

  return (
    <div className="dashboard-container" style={{ maxWidth: '960px' }}>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Notifications</h1>
          <p className="dashboard-subtitle">
            Vous avez <strong>{unreadCount}</strong> notification(s) non lue(s).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            onClick={() => setFilterUnread(!filterUnread)}
          >
            {filterUnread ? 'Afficher toutes' : 'Non lues uniquement'}
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              className="primary"
              onClick={handleMarkAllRead}
            >
              <CheckCheck size={16} /> Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="panel-card">
        {loading ? (
          <div className="empty-state">Chargement des alertes...</div>
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <Bell size={38} className="empty-icon" />
            <h3>Aucune notification</h3>
            <p>Aucune notification non lue.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {displayed.map((n) => (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: n.lue ? '#e2e8f0' : '#93c5fd',
                  backgroundColor: n.lue ? '#ffffff' : '#eff6ff',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem' }}>
                  <div style={{ marginTop: '2px' }}>{getTypeIcon(n.type)}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                        {TYPE_NOTIF_LABELS[n.type]}
                      </span>
                      <span className="sub-text">{formatDateTime(n.dateEnvoi)}</span>
                    </div>
                    <p style={{ margin: 0, fontWeight: n.lue ? 400 : 600, color: '#0f172a', fontSize: '0.94rem' }}>
                      {n.message}
                    </p>
                  </div>
                </div>

                {!n.lue && (
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem', flexShrink: 0 }}
                    onClick={() => handleMarkAsRead(n.id)}
                    title="Marquer comme lu"
                  >
                    <Check size={14} /> Lu
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}