import React from 'react';

export const BaseTextarea = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  error,
  helperText,
  disabled = false,
  readOnly = false,
  required = false,
  fullWidth = true,
  className = '',
  id,
  name,
  ...props
}) => {
  return (
    <div className={`${fullWidth ? 'w-full' : 'inline-block'} ${className}`}>
      {label && (
        <label htmlFor={id || name} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        id={id || name}
        name={name}
        rows={rows}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        className={`block w-full rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 shadow-sm transition-colors duration-150 outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 p-3 text-sm disabled:opacity-50 ${error ? 'border-red-500' : ''}`}
        {...props}
      />
      {(error || helperText) && (
        <p className={`mt-1 text-xs ${error ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
          {typeof error === 'string' ? error : helperText}
        </p>
      )}
    </div>
  );
};

export default BaseTextarea;
