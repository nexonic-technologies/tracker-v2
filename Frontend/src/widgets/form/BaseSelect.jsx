import React from 'react';

export const BaseSelect = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select an option...',
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
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  }[size] || 'px-3 py-2 text-sm';

  return (
    <div className={`${fullWidth ? 'w-full' : 'inline-block'} ${className}`}>
      {label && (
        <label htmlFor={id || name} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={id || name}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled || loading || readOnly}
        required={required}
        className={`block w-full rounded-md border shadow-sm transition-colors duration-150 outline-none focus:ring-1 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-50 ${sizeClasses} ${error ? 'border-red-500' : ''}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt, index) => {
          const optValue = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={optValue ?? index} value={optValue}>
              {optLabel}
            </option>
          );
        })}
      </select>
      {(error || helperText) && (
        <p className={`mt-1 text-xs ${error ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
          {typeof error === 'string' ? error : helperText}
        </p>
      )}
    </div>
  );
};

export default BaseSelect;
