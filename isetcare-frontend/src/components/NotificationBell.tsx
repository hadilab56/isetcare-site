import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NOTIFICATIONS_CHANGED, countUnread } from '../api/notifications';

/** rafraîchi toutes les 30 secondes. */
export default function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      countUnread().then((n) => { if (!cancelled) setCount(n); }).catch(() => undefined);
    };
    load();
    const timer = setInterval(load, 30_000);
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_CHANGED, load);
    };
  }, []);

  return (
    <Link to="/notifications" className="bell" aria-label={`Notifications (${count} non lue(s))`} title="Notifications">
      <span aria-hidden="true">🔔</span>
      {count > 0 && <span className="bell-count">{count > 99 ? '99+' : count}</span>}
    </Link>
  );
}
