import React from 'react';
import Logo from '../assets/logo.png';
import { ArrowLeft } from 'lucide-react';
import useAuthForm from '../hooks/useAuthForm';
import LoginForm from './form/LoginForm';
import SignupForm from './form/SignupForm';
import ForgotPasswordForm from './form/ForgotPasswordForm';
import FormButton from './form/FormButton';
import Notification from './Notification';

const AuthForm = () => {
  const {
    mode,
    loading,
    message,
    formData,
    errors,
    switchMode,
    handleInputChange,
    handleSubmit,
    clearMessage,
  } = useAuthForm();

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome Back';
      case 'signup': return 'Create Account';
      case 'forgot': return 'Reset Password';
      default: return 'Welcome';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return 'Sign in to your account';
      case 'signup': return 'Sign up for a new account';
      case 'forgot': return 'Enter your email to receive a reset link';
      default: return '';
    }
  };

  const getButtonText = () => {
    if (loading) {
      switch (mode) {
        case 'login': return 'Signing In...';
        case 'signup': return 'Creating Account...';
        case 'forgot': return 'Sending Reset Link...';
      }
    }
    switch (mode) {
      case 'login': return 'Sign In';
      case 'signup': return 'Create Account';
      case 'forgot': return 'Send Reset Link';
    }
  };

  const isLogin = mode === 'login';

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black opacity-20"></div>
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-8 -right-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Main form container */}
      <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-4 sm:p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          {mode === 'forgot' && (
            <button
              onClick={() => switchMode('login')}
              className="absolute top-6 left-6 text-white/70 hover:text-white transition duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          
          <img src={Logo} alt="Logo" className="mx-auto mb-4 w-34 h-34 object-contain pr-4" />
          
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{getTitle()}</h2>
          <p className="text-white/70">{getSubtitle()}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'login' && <LoginForm formData={formData} handleInputChange={handleInputChange} errors={errors} />}
          {mode === 'signup' && <SignupForm formData={formData} handleInputChange={handleInputChange} errors={errors} />}
          {mode === 'forgot' && <ForgotPasswordForm formData={formData} handleInputChange={handleInputChange} errors={errors} />}

          <FormButton
            type="submit"
            loading={loading}
            text={getButtonText()}
          />
        </form>

        {/* Social Login */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300/30"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-white/70">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <a
                href="http://localhost:8000/api/auth/google"
                className="w-full inline-flex justify-center py-2 px-4 border border-white/20 rounded-md shadow-sm bg-white/10 text-sm font-medium text-white hover:bg-white/20 transition duration-200"
              >
                <span className="sr-only">Sign in with Google</span>
                <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 0.507 5.387 0 12s5.36 12 12 12c3.6 0 6.32-1.173 8.507-3.467 2.24-2.24 2.933-5.48 2.933-8.133 0-.8-.067-1.453-.187-2.08H12.48z" />
                </svg>
              </a>

              <a
                href="http://localhost:8000/api/auth/facebook"
                className="w-full inline-flex justify-center py-2 px-4 border border-white/20 rounded-md shadow-sm bg-white/10 text-sm font-medium text-white hover:bg-white/20 transition duration-200"
              >
                <span className="sr-only">Sign in with Facebook</span>
                <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 space-y-4">
          {mode === 'login' && (
            <>
              <div className="text-center">
                <button
                  onClick={() => switchMode('forgot')}
                  className="text-white/70 hover:text-white text-sm transition duration-200"
                >
                  Forgot your password?
                </button>
              </div>
              <div className="text-center">
                <p className="text-white/70">
                  Don't have an account?
                  <button
                    onClick={() => switchMode('signup')}
                    className="ml-2 text-indigo-300 hover:text-indigo-200 font-medium transition duration-200"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <div className="text-center">
              <p className="text-white/70">
                Already have an account?
                <button
                  onClick={() => switchMode('login')}
                  className="ml-2 text-indigo-300 hover:text-indigo-200 font-medium transition duration-200"
                >
                  Sign In
                </button>
              </p>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="text-center">
              <p className="text-white/70">
                Remember your password?
                <button
                  onClick={() => switchMode('login')}
                  className="ml-2 text-indigo-300 hover:text-indigo-200 font-medium transition duration-200"
                >
                  Sign In
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
      <Notification message={message.text} type={message.type} onClose={clearMessage} />
    </div>
  );
};

export default AuthForm;