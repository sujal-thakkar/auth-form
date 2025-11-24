import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const useAuthForm = (initialMode = 'login') => {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(null); 

  
  useEffect(() => {
    axios.get('/api/auth/protected', { withCredentials: true })
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false));
  }, []);

  const logout = async () => {
    await axios.post('/api/auth/logout', {}, { withCredentials: true }); // optional logout route
    setIsAuthenticated(false); 
    navigate('/');
  };

  const validateForm = () => {
    const newErrors = {};
    if (mode === 'signup' && !formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (mode === 'signup' && !formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (mode === 'signup' && !/^\+?\d{10,15}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Enter a valid phone number with country code';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (mode !== 'forgot') {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      } else if (mode === 'signup' && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
      }
      if (mode === 'signup' && formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      let response;
      switch (mode) {
        case 'login':
          response = await axios.post('/api/auth/login', {
            email: formData.email,
            password: formData.password
          }, { withCredentials: true }); 
          setIsAuthenticated(true); 
          setMessage({ type: 'success', text: response?.data?.message || 'Login successful! Redirecting...' });
          navigate('/home');
          break;

        case 'signup':
          response = await axios.post('/api/auth/register', {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
            confirmPassword: formData.confirmPassword
          }, { withCredentials: true });
          setMessage({ type: 'success', text: response?.data?.message || 'Account created successfully! Please follow the verification steps.' });
          break;

        case 'forgot':
          response = await axios.post('/api/auth/forgot-password', {
            email: formData.email
          });
          setMessage({ type: 'success', text: response?.data?.message || 'Password reset link sent to your email. Please check your inbox.' });
          setTimeout(() => {
            setMode('login');
            resetForm();
          }, 3000);
          break;

        default:
          break;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
    setErrors({});
    setMessage({ type: '', text: '' });
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    resetForm();
  };

  const clearMessage = () => setMessage({ type: '', text: '' });

  return {
    mode,
    loading,
    message,
    formData,
    errors,
    isAuthenticated,
    switchMode,
    handleInputChange,
    handleSubmit,
    logout,
    clearMessage,
  };
};

export default useAuthForm;
