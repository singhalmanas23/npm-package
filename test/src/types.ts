export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'flat';
  size?: 'sm' | 'md' | 'lg';
} 