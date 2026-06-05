import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { AppInput } from '../components/ui/AppInput';
import { dbApi } from '../db/storage';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGlobalStore } from '../store/useGlobalStore';

export default function Login() {
  const navigate = useNavigate();
  const [userId, setUserId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const setCurrentUser = useGlobalStore((state) => state.setCurrentUser);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // For safety, initialize the DB
    await dbApi.init();
    
    const settings = await dbApi.getSettings();
    const adminId = settings.adminId || 'admin';
    const adminPass = settings.adminPassword || 'admin';

    // Check if it's the master admin 
    if (userId === adminId && password === adminPass) {
      const adminUser = {
        id: 'admin-id',
        name: 'Administrator',
        role: 'Admin'
      };
      localStorage.setItem('fps_current_user', JSON.stringify(adminUser));
      setCurrentUser(adminUser);
      navigate('/');
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      // check employee ID FIRST
      const q1 = query(usersRef, where('employeeId', '==', userId), where('password', '==', password));
      let querySnapshot = await getDocs(q1);
      
      if (querySnapshot.empty) {
        // Fallback: Check if they are trying to login with their exact Name instead
        const q2 = query(usersRef, where('name', '==', userId), where('password', '==', password));
        querySnapshot = await getDocs(q2);
      }

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        const fUser = { 
          id: doc.id,
          name: data.name || data.displayName || data.email?.split('@')[0],
          email: data.email,
          role: data.role || 'Officer',
          employeeId: data.employeeId || '',
          avatar: data.photoURL || null
        };
        localStorage.setItem('fps_current_user', JSON.stringify(fUser));
        setCurrentUser(fUser);
        navigate('/');
        return;
      }
    } catch (err) {
      console.error('Firestore login check failed:', err);
    }

    // Otherwise, check regular old local IndexedDB users fallback
    const users = await dbApi.getUsers();
    const user = users.find(u => u.name === userId || u.id === userId);
    
    if (user && password === 'fps123') {
      localStorage.setItem('fps_current_user', JSON.stringify(user));
      setCurrentUser(user);
      navigate('/');
      return;
    }

    setError('Invalid ID or Password. Please try again.');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-[#C09532] p-10 text-center flex flex-col items-center">
          <h1 className="text-2xl font-black text-white tracking-widest uppercase">RIL-HMD-FIRE</h1>
          <p className="text-white/80 font-bold text-[10px] uppercase tracking-widest mt-2">HMD Unit - Authorized Personnel Only</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <User className="absolute left-3 top-[34px] h-5 w-5 text-gray-400" />
              <AppInput
                label="MANAGER ID / USERNAME"
                placeholder="Enter ID"
                className="pl-10 h-12 rounded-xl focus:border-[#C09532]"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-[34px] h-5 w-5 text-gray-400" />
              <AppInput
                label="SECURITY PASSWORD"
                type="password"
                placeholder="••••••••"
                className="pl-10 h-12 rounded-xl focus:border-[#C09532]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 font-bold text-center">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-md font-black bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-lg">
              SECURE LOGIN
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] space-y-2">
            <span>Corporate Fire Security Management v2.0</span>
            <div className="flex space-x-4">
              <span>HMD COMPLIANT</span>
              <span>•</span>
              <span>AES-256</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
