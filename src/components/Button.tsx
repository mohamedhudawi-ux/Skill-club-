import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  children: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseClasses = "px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200";
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    secondary: "bg-stone-100 text-stone-800 hover:bg-stone-200",
    danger: "bg-red-100 text-red-700 hover:bg-red-200",
    ghost: "bg-transparent text-stone-600 hover:bg-stone-100",
    outline: "bg-transparent border border-stone-200 text-stone-600 hover:bg-stone-50",
  };

  return (
    <button className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
