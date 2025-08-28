import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  CommandLineIcon as Terminal,
  LockClosedIcon as Lock, 
  UserIcon as User, 
  EyeIcon as Eye, 
  EyeSlashIcon as EyeOff, 
  ShieldCheckIcon as Shield, 
  SparklesIcon as Sparkles 
} from '@heroicons/react/24/outline';

export function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const floatingElements = Array.from({ length: 6 }, (_, i) => (
    <div
      key={i}
      className={`absolute opacity-20 animate-float-${(i % 3) + 1}`}
      style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${i * 0.5}s`,
      }}
    >
      <div className="w-2 h-2 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm" />
    </div>
  ));

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 via-base-200 to-base-300 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingElements}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main login container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Glassmorphism card */}
        <div className="backdrop-blur-xl bg-base-100/80 border border-base-300/50 rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="relative inline-flex items-center justify-center w-16 h-16 mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl blur-sm opacity-60 animate-pulse" />
              <div className="relative bg-base-100 rounded-xl p-3 shadow-lg">
                <Terminal className="w-8 h-8 text-primary" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Claude Code
              </h1>
              <p className="text-base-content/70 text-sm flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" />
                Shell User Authentication
              </p>
            </div>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username field */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Username
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input input-bordered w-full pl-12 bg-base-100/50 border-base-300/50 focus:border-primary/50 focus:bg-base-100/70 transition-all duration-300"
                  placeholder="Enter your shell username"
                  disabled={isSubmitting || isLoading}
                />
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
              </div>
            </div>

            {/* Password field */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input input-bordered w-full pl-12 pr-12 bg-base-100/50 border-base-300/50 focus:border-primary/50 focus:bg-base-100/70 transition-all duration-300"
                  placeholder="Enter your shell password"
                  disabled={isSubmitting || isLoading}
                />
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content transition-colors"
                  disabled={isSubmitting || isLoading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="alert alert-error bg-error/10 border-error/20 text-error-content">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting || isLoading || !username.trim() || !password.trim()}
              className="btn btn-primary w-full relative overflow-hidden group disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center justify-center gap-2">
                {(isSubmitting || isLoading) ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </div>
            </button>
          </form>

          {/* Footer */}
          <div className="text-center text-xs text-base-content/50 space-y-2">
            <p>Secure shell user authentication</p>
            <div className="flex items-center justify-center gap-4 text-base-content/30">
              <span>Multi-user support</span>
              <span>•</span>
              <span>Project isolation</span>
              <span>•</span>
              <span>Ultra secure</span>
            </div>
          </div>
        </div>

        {/* Additional security info */}
        <div className="mt-4 text-center text-xs text-base-content/40">
          <p>Your credentials are verified against system users</p>
        </div>
      </div>

      {/* Floating animation styles */}
      <style>{`
        @keyframes float-1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(-180deg); }
        }
        @keyframes float-3 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(360deg); }
        }
        .animate-float-1 { animation: float-1 6s ease-in-out infinite; }
        .animate-float-2 { animation: float-2 8s ease-in-out infinite; }
        .animate-float-3 { animation: float-3 7s ease-in-out infinite; }
      `}</style>
    </div>
  );
}