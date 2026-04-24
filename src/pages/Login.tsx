import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { AppInput } from '../components/ui/AppInput';
import { dbApi } from '../db/storage';

export default function Login() {
  const navigate = useNavigate();
  const [userId, setUserId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // For safety, initialize the DB
    await dbApi.init();
    
    const settings = await dbApi.getSettings();
    const adminId = settings.adminId || 'admin';
    const adminPass = settings.adminPassword || 'admin';

    if (userId === adminId && password === adminPass) {
      localStorage.setItem('fps_current_user', JSON.stringify({
        id: 'admin-id',
        name: 'Administrator',
        role: 'Admin'
      }));
      navigate('/');
    } else {
      setError('Invalid ID or Password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
          <div className="inline-flex p-4 bg-white/10 rounded-2xl mb-4">
            <ShieldCheck className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">FIXED PROTECTION SYSTEM</h1>
          <p className="text-blue-100 text-sm mt-1">Authorized Personnel Access Only</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <User className="absolute left-3 top-[34px] h-5 w-5 text-gray-400" />
              <AppInput
                label="Manager ID"
                placeholder="Enter your ID"
                className="pl-10"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-[34px] h-5 w-5 text-gray-400" />
              <AppInput
                label="Security Password"
                type="password"
                placeholder="Enter password"
                className="pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-lg">
              Secure Login
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center text-xs text-gray-400 space-y-2">
            <span>Corporate Fire Security Management v2.0</span>
            <div className="flex space-x-4">
              <span>GDPR Compliant</span>
              <span>•</span>
              <span>AES-256 Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
