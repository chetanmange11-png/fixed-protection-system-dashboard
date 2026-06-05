import * as React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppLayout } from './components/layout/AppLayout';
import Login from './pages/Login';
import SystemCategories from './pages/SystemCategories';
import SubSystems from './pages/SubSystems';
import PlantSelection from './pages/PlantSelection';
import Dashboard from './pages/Dashboard';
import PlantSchedule from './pages/PlantSchedule';
import OtherUnsatisfactory from './pages/OtherUnsatisfactory';
import IsolationReports from './pages/IsolationReports';
import EquipmentIssues from './pages/EquipmentIssues';
import OthersHub from './pages/OthersHub';
import LocationRecordView from './pages/LocationRecordView';
import RecycleBin from './pages/RecycleBin';
import MasterAssetManager from './pages/MasterAssetManager';
import UserManagement from './pages/UserManagement';

import SystemAnalysisPage from './pages/SystemAnalysisPage';

export default function App() {
  React.useEffect(() => {
    const handleAuthChange = () => {
      // Just keep storage listener alive if something depends on it globally
    };
    window.addEventListener('storage', handleAuthChange);
    const interval = setInterval(handleAuthChange, 1000); 
    return () => {
      window.removeEventListener('storage', handleAuthChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route path="/analysis" element={<SystemAnalysisPage />} />
          <Route path="/" element={<PlantSchedule />} />
          <Route path="/categories" element={<SystemCategories />} />
          <Route path="/categories/:categoryId" element={<SubSystems />} />
          <Route path="/categories/:categoryId/:subSystemId" element={<PlantSelection />} />
          <Route path="/categories/:categoryId/:subSystemId/:plantId" element={<Dashboard />} />
          <Route path="/location/:categoryId/:systemId/:frequencyId/:locationId" element={<LocationRecordView />} />
          <Route path="/schedule" element={<PlantSchedule />} />
          <Route path="/others" element={<OthersHub />} />
          <Route path="/others/isolation" element={<IsolationReports />} />
          <Route path="/others/issues" element={<EquipmentIssues />} />
          <Route path="/others/unsatisfactory" element={<OtherUnsatisfactory />} />
          <Route path="/others/master-assets" element={<MasterAssetManager />} />
          <Route path="/others/recycle-bin" element={<RecycleBin />} />
          <Route path="/manage-users" element={<UserManagement />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
