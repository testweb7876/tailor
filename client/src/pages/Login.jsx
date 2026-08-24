import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { msg } from '../services/api';
import { Scissors } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async ({ email, password }) => {
    setError(''); setBusy(true);
    try { await login(email, password); nav('/'); }
    catch (e) { setError(msg(e, 'Invalid email or password')); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden flex-col justify-between bg-ink p-10 text-white md:flex">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brass text-ink font-bold">T</div>
          <span className="font-semibold">TailorHub</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold leading-tight">Run the whole shop<br />from one screen.</h1>
          <p className="mt-3 max-w-sm text-gray-400">Customers, measurements, orders, payments and invoices — measured to fit.</p>
        </div>
        <div className="text-sm text-gray-500">Single-shop management system</div>
      </div>

      {/* Form panel */}
      <div className="grid place-items-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <Scissors className="text-brass" /> <span className="text-lg font-semibold">TailorHub</span>
          </div>
          <h2 className="text-xl font-semibold">Sign in</h2>
          <p className="mb-6 text-sm text-gray-500">Enter your credentials to continue.</p>

          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="admin@tailorshop.com"
                {...register('email', { required: 'Email is required' })} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="••••••••"
                {...register('password', { required: 'Password is required' })} />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
