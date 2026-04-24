import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import Login from './pages/Login';
import SystemCategories from './pages/SystemCategories';
import SubSystems from './pages/SubSystems';
import PlantSelection from './pages/PlantSelection';
import Dashboard from './pages/Dashboard';
import PlantManagement from './pages/PlantManagement';
import PlantWiseReports from './pages/PlantWiseReports';
import PlantSchedule from './pages/PlantSchedule';
import ManageUsers from './pages/ManageUsers';
import Settings from './pages/Settings';
import RecycleBin from './pages/RecycleBin';
import OtherUnsatisfactory from './pages/OtherUnsatisfactory';
import IsolationReports from './pages/IsolationReports';
import EquipmentIssues from './pages/EquipmentIssues';
import OthersHub from './pages/OthersHub';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<PlantSchedule />} />
          <Route path="/categories" element={<SystemCategories />} />
          <Route path="/categories/:categoryId" element={<SubSystems />} />
          <Route path="/categories/:categoryId/:subSystemId" element={<PlantSelection />} />
          <Route path="/categories/:categoryId/:subSystemId/:plantId" element={<Dashboard />} />
          <Route path="/schedule" element={<PlantSchedule />} />
          <Route path="/reports" element={<PlantWiseReports />} />
          <Route path="/plants" element={<PlantManagement />} />
          <Route path="/others" element={<OthersHub />} />
          <Route path="/others/isolation" element={<IsolationReports />} />
          <Route path="/others/issues" element={<EquipmentIssues />} />
          <Route path="/others/unsatisfactory" element={<OtherUnsatisfactory />} />
          <Route path="/users" element={<ManageUsers />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/bin" element={<RecycleBin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
