import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import UsersPage from './pages/UsersPage';
import EquipementsPage from './pages/EquipementsPage';
import EquipementDetailPage from './pages/EquipementDetailPage';
import SallesPage from './pages/SallesPage';
import TypesPage from './pages/TypesPage';
import ReclamationsPage from './pages/ReclamationsPage';
import ReclamationNewPage from './pages/ReclamationNewPage';
import ReclamationDetailPage from './pages/ReclamationDetailPage';
import MaintenancesPage from './pages/MaintenancesPage';
import NotificationsPage from './pages/NotificationsPage';
import InterventionsPage from './pages/InterventionsPage';
import StatistiquesPage from './pages/StatistiquesPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/inscription" element={<RegisterPage />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="/utilisateurs" element={<ProtectedRoute roles={['ADMINISTRATEUR']}><UsersPage /></ProtectedRoute>} />
        <Route path="/equipements" element={<EquipementsPage />} />
        <Route path="/equipements/:id" element={<EquipementDetailPage />} />
        <Route path="/salles" element={<ProtectedRoute roles={['ADMINISTRATEUR']}><SallesPage /></ProtectedRoute>} />
        <Route path="/types" element={<ProtectedRoute roles={['ADMINISTRATEUR']}><TypesPage /></ProtectedRoute>} />
        <Route path="/reclamations" element={<ReclamationsPage />} />
        <Route path="/reclamations/nouvelle" element={<ProtectedRoute roles={['DECLARANT']}><ReclamationNewPage /></ProtectedRoute>} />
        <Route path="/reclamations/:id" element={<ReclamationDetailPage />} />
        <Route path="/maintenances" element={<ProtectedRoute roles={['ADMINISTRATEUR', 'TECHNICIEN']}><MaintenancesPage /></ProtectedRoute>} />
        <Route path="/interventions" element={<ProtectedRoute roles={['ADMINISTRATEUR', 'TECHNICIEN']}><InterventionsPage /></ProtectedRoute>} />
        <Route path="/statistiques" element={<ProtectedRoute roles={['ADMINISTRATEUR']}><StatistiquesPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
} 
