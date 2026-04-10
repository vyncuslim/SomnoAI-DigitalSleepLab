import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface PinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  mask?: boolean;
  autoFocus?: boolean;
}

export const PinInput: React.FC<PinInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  mask = true,
  autoFocus = false
}) => {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    let val = e.target.value;
    
    // Convert full-width digits to half-width
    val = val.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
    
    // Remove any non-digit characters
    val = val.replace(/\D/g, '');

    if (!val && e.target.value) {
      return;
    }

    if (val.length > 1) {
      if (val.length === 2) {
        // Typed over a single character
        val = val.slice(-1);
      } else {
        // Autofill or IME multi-character
        const newValueArray = value.split('');
        while (newValueArray.length < length) newValueArray.push(' ');
        for (let i = 0; i < val.length && index + i < length; i++) {
          newValueArray[index + i] = val[i];
        }
        const updatedValue = newValueArray.join('');
        onChange(updatedValue);
        
        const nextIndex = Math.min(index + val.length, length - 1);
        inputRefs.current[nextIndex]?.focus();
        return;
      }
    }

    const newValue = value.split('');
    while (newValue.length < length) newValue.push(' ');
    newValue[index] = val || ' ';
    const updatedValue = newValue.join('');
    onChange(updatedValue);

    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    const isEmpty = !value[index] || value[index] === ' ';
    if (e.key === 'Backspace' && isEmpty && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, length);
    if (!/^\d+$/.test(pastedData)) return;
    onChange(pastedData);
  };

  return (
    <div className="flex justify-between gap-2 sm:gap-4" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => (
        <div key={index} className="relative flex-1 aspect-square max-w-[60px]">
          <input
            ref={(el) => { inputRefs.current[index] = el; }}
            type={mask ? "password" : "text"}
            inputMode="numeric"
            pattern="\d*"
            value={value[index] === ' ' ? '' : (value[index] || '')}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onFocus={(e) => {
              setFocusedIndex(index);
              e.target.select();
            }}
            onBlur={() => setFocusedIndex(null)}
            disabled={disabled}
            className={`
              w-full h-full text-center text-xl sm:text-2xl font-black italic rounded-xl border transition-all duration-300
              ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-800/50 border-white/5' : 'bg-black/40'}
              ${error ? 'border-red-500/50 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 
                focusedIndex === index ? 'border-indigo-500 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 
                'border-white/10 text-white hover:border-white/20'}
              focus:outline-none
            `}
          />
          {focusedIndex === index && (
            <motion.div
              layoutId="pin-focus"
              className="absolute inset-0 rounded-xl border-2 border-indigo-500/50 pointer-events-none"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </div>
      ))}
    </div>
  );
};
