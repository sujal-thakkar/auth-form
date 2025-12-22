import React, { useState } from 'react';
import { User, Mail, Lock, Phone } from 'lucide-react';
import FormInput from './FormInput';
import PasswordStrength from './PasswordStrength';

const SignupForm = ({ formData, handleInputChange, errors }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="space-y-6">
      <FormInput
        label="Full Name *"
        icon={User}
        type="text"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        placeholder="Enter your full name"
        error={errors.name}
      />
      <FormInput
        label="Email Address *"
        icon={Mail}
        type="email"
        name="email"
        value={formData.email}
        onChange={handleInputChange}
        placeholder="Enter your email"
        error={errors.email}
      />
      <FormInput
        label="Phone Number *"
        icon={Phone}
        type="tel"
        name="phone"
        value={formData.phone}
        onChange={handleInputChange}
        placeholder="Enter your phone number"
        error={errors.phone}
      />
      <FormInput
        label="Password *"
        icon={Lock}
        type={showPassword ? 'text' : 'password'}
        name="password"
        value={formData.password}
        onChange={handleInputChange}
        placeholder="Create a strong password"
        error={errors.password}
        toggleVisibility={{
          show: showPassword,
          onClick: () => setShowPassword(!showPassword),
        }}
      />
      <PasswordStrength password={formData.password} />
      <FormInput
        label="Confirm Password *"
        icon={Lock}
        type={showConfirmPassword ? 'text' : 'password'}
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleInputChange}
        placeholder="Confirm your password"
        error={errors.confirmPassword}
        toggleVisibility={{
          show: showConfirmPassword,
          onClick: () => setShowConfirmPassword(!showConfirmPassword),
        }}
      />
    </div>
  );
};

export default SignupForm;
