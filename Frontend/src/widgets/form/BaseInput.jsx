import React from 'react';

export const BaseInput = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helperText,
  disabled = false,
  readOnly = false,
  required = false,
  fullWidth = true,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  id,
  name,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  }[size] || 'px-3.5 py-2 text-sm';

  const variantClasses = {
    primary: 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
    outline: 'border-slate-400 focus:border-slate-600 dark:border-slate-600',
    danger: 'border-red-400 focus:border-red-500 focus:ring-red-500 text-red-900 dark:text-red-200',
  }[error ? 'danger' : variant] || '';

  return (
    <div className={`${fullWidth ? 'w-full' : 'inline-block'} ${className}`}>
      {label && (
        <label htmlFor={id || name} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id || name}
          name={name}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled || loading}
          readOnly={readOnly}
          required={required}
          className={`block w-full rounded-md border shadow-sm transition-colors duration-150 outline-none focus:ring-1 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 ${sizeClasses} ${variantClasses}`}
          {...props}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      {(error || helperText) && (
        <p className={`mt-1 text-xs ${error ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
          {typeof error === 'string' ? error : helperText}
        </p>
      )}
    </div>
  );
};

export default BaseInput;
