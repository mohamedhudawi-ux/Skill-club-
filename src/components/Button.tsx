import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseClasses = "rounded-xl font-bold transition-all duration-200";
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    secondary: "bg-stone-100 text-stone-800 hover:bg-stone-200",
    danger: "bg-red-100 text-red-700 hover:bg-red-200",
    ghost: "bg-transparent text-stone-600 hover:bg-stone-100",
    outline: "bg-transparent border border-stone-200 text-stone-600 hover:bg-stone-50",
  };

  return (
    <button className={`${baseClasses} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
