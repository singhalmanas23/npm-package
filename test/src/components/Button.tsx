import React from 'react';
import { motion } from 'framer-motion'; // Unused import
import { useTheme } from '../hooks/useTheme'; // Unused import
import { ButtonProps } from '../types';

// Unused export
export const ButtonStyles = {
  primary: 'bg-blue-500',
  secondary: 'bg-gray-500'
};

// Unused export
export const getButtonSize = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm': return 'px-2 py-1';
    case 'md': return 'px-4 py-2';
    case 'lg': return 'px-6 py-3';
  }
};

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary' }) => {
  return (
    <button className={`px-4 py-2 rounded ${variant === 'primary' ? 'bg-blue-500' : 'bg-gray-500'}`}>
      {children}
    </button>
  );
}; 