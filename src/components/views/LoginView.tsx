import React, { useState } from 'react';
import { User } from '../../types';
import { ApiError, fetchCurrentUser, login, mapMeResponseToUser } from '../../api/client';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await login(email, password);
      const me = await fetchCurrentUser();
      onLoginSuccess(mapMeResponseToUser(me));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="w-full flex h-screen min-h-screen bg-surface font-sans text-on-surface selection:bg-surface-container-high selection:text-primary overflow-hidden">
      {/* Left Section: Form */}
      <div className="flex-1 flex flex-col justify-between px-6 sm:px-12 md:px-16 lg:px-20 lg:flex-none lg:w-1/2 xl:w-5/12 bg-white z-10 shadow-ambient overflow-y-auto py-10 border-r border-outline-variant">
        <div className="w-full max-w-md mx-auto my-auto">
          {/* Brand Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-md bg-surface-container-high flex items-center justify-center text-primary">
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  dataset
                </span>
              </div>
              <h1 className="font-editorial text-3xl font-bold text-primary tracking-tight">
                DataCraft
              </h1>
            </div>
            <p className="text-sm text-on-surface-variant font-sans">
              Trust your data. Empower your business.
            </p>
          </div>

          {/* Login Form */}
          <div className="w-full">
            <h2 className="font-editorial text-2xl font-bold text-on-surface mb-6">
              Welcome back
            </h2>

            <form onSubmit={handleLogin} className="space-y-5">
              {errorMessage && (
                <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3.5 py-2.5 text-xs text-error">
                  <span className="material-symbols-outlined text-base shrink-0">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label
                  className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider"
                  htmlFor="email"
                >
                  Email address
                </label>
                <div className="relative rounded">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                    <span className="material-symbols-outlined text-xl">mail</span>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="block w-full pl-11 pr-3.5 py-3 border border-outline-variant rounded-md bg-surface text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider"
                  htmlFor="password"
                >
                  Password
                </label>
                <div className="relative rounded">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                    <span className="material-symbols-outlined text-xl">lock</span>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-11 pr-3.5 py-3 border border-outline-variant rounded-md bg-surface text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-outline-variant rounded bg-white cursor-pointer accent-primary"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-xs text-on-surface-variant cursor-pointer"
                  >
                    Remember me
                  </label>
                </div>
                <div>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Password reset link sent to registered email.');
                    }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-md shadow-sm text-xs font-semibold text-white bg-primary hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 cursor-pointer active:scale-[0.99] disabled:opacity-75"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing In...</span>
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>

        {/* Footer Links */}
        <div className="pt-6 flex items-center justify-center gap-4 text-center text-xs text-outline">
          <a href="#privacy" className="hover:text-primary transition-colors">
            Privacy Policy
          </a>
          <span className="text-outline-variant">•</span>
          <a href="#terms" className="hover:text-primary transition-colors">
            Terms of Service
          </a>
        </div>
      </div>

      {/* Right Section: Visual & Testimonial */}
      <div className="hidden lg:block lg:flex-1 relative bg-surface-container-low overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 w-full h-full">
          <div
            className="w-full h-full bg-cover bg-center opacity-85 mix-blend-multiply transition-transform duration-10000 hover:scale-105"
            style={{
              backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDY6ingrbPJ9AVTkS61oMHOsNE14Mob4iVf19is-AaPS9psK_tueLbKbOgEJut7gUMZYfCwsJLm4lUr17Jt4aCEBVNqzNdtEuUDdjtN3JDrQVemt-QjwMZnC6agHgntwAgZ3ZbP5vubx5fZ3MQLDYqG1VBYzMmIHayF79ULseiHzjQagM__CWmXIJaQ-qKX7NITt-XdCO9IExFV13itSJ86fBLMHt9Isk9TqMDoiG0V3ZAyDvaQUw7q')`,
            }}
          />
        </div>

        {/* Overlay Gradient for legibility */}
        <div className="absolute inset-0 bg-gradient-to-tr from-surface-container-low/90 via-surface-container-low/30 to-transparent" />

        {/* Floating Testimonial Card */}
        <div className="absolute bottom-12 left-12 right-12">
          <div className="bg-surface/95 backdrop-blur-md p-6 rounded-lg max-w-lg shadow-xl border border-outline-variant animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start gap-4">
              <span
                className="material-symbols-outlined text-primary text-4xl shrink-0 mt-0.5"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                format_quote
              </span>
              <div>
                <p className="text-base text-on-surface leading-relaxed mb-4 font-editorial italic">
                  "DataCraft transformed our approach to data quality. The
                  interface is not only powerful, but surprisingly intuitive and
                  calm to work with every day."
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-sm shadow-xs">
                    SJ
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">
                      Sarah Jenkins
                    </p>
                    <p className="text-xs text-outline">
                      Director of Data, TechFlow
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
