import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InputField from '../components/input_field';
import Button from '../components/button';

import apiClient from '../services/data/interceptor';
import { ROUTES } from '../services/routes';

interface LoginFormData {
  email: string;
  password: string;  
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;  
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',    
  });
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        email: formData.email,
        password: formData.password
      });

      const { accessToken, refreshToken } = response.data;

      // Store tokens
      apiClient.setTokens({ accessToken, refreshToken });

      // Navigate to dashboard
      navigate(ROUTES.DASHBOARD);
    } catch (error: unknown) {
      console.error('Login failed:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          setGeneralError('Invalid email or password');
        } else if (axiosError.response?.status === 429) {
          setGeneralError('Too many login attempts. Please try again later.');
        } else {
          setGeneralError('Login failed. Please try again.');
        }
      } else {
        setGeneralError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof LoginFormData) => (value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Vehicle Inspection Expert
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {generalError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{generalError}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <InputField
              label="Email"
              type="email"
              value={formData.email}
              onChange={updateFormData('email')}
              error={errors.email}
              required
              autoComplete="email"
              placeholder="Enter your email address"
            />
            
            <InputField
              label="Password"
              type="password"
              value={formData.password}
              onChange={updateFormData('password')}
              error={errors.password}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </div>

          <div className="flex items-center justify-end">
            <a 
              href="#" 
              className="text-sm text-blue-600 hover:text-blue-500"
              onClick={(e) => {
                e.preventDefault();
                // TODO: Implement forgot password functionality
                alert('Forgot password functionality will be implemented');
              }}
            >
              Forgot your password?
            </a>
          </div>

          <div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
              variant="primary"
              size="large"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
