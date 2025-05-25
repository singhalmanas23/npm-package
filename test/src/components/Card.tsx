import React from 'react';
import { motion } from 'framer-motion'; // Unused import
import { useTheme } from '../hooks/useTheme'; // Unused import
import { CardProps } from '../types';

// Unused export
export const CardVariants = {
  elevated: 'shadow-lg',
  outlined: 'border border-gray-200',
  flat: 'bg-gray-50'
};

// Unused export
export const getCardPadding = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm': return 'p-2';
    case 'md': return 'p-4';
    case 'lg': return 'p-6';
  }
};

export const Card: React.FC<CardProps> = ({ children, variant = 'elevated' }) => {
  return (
    <div className={`rounded-lg ${variant === 'elevated' ? 'shadow-lg' : 'border border-gray-200'}`}>
      {children}
    </div>
  );
}; 