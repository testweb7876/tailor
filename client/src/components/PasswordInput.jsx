import { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/* Reusable password input with a show/hide toggle.
   Works both as a controlled input (value/onChange) and with react-hook-form's
   register() spread (forwardRef passes the ref through). */
const PasswordInput = forwardRef(function PasswordInput({ className = '', ...props }, ref) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        ref={ref}
        type={show ? 'text' : 'password'}
        className={`input pr-10 ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink"
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
});

export default PasswordInput;