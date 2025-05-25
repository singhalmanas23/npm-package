import { format } from 'date-fns'; // Unused import
import { z } from 'zod'; // Unused import

// Unused export
export const formatDate = (date: Date) => {
  return format(date, 'yyyy-MM-dd');
};

// Unused export
export const validateEmail = (email: string) => {
  const emailSchema = z.string().email();
  return emailSchema.safeParse(email).success;
};

// Used export
export const add = (a: number, b: number): number => {
  return a + b;
}; 