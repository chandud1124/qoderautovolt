import React, { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * IP Address Input Component
 * Automatically formats IPv4 addresses as user types
 * Format: XXX.XXX.XXX.XXX
 */

export interface IpAddressInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onValidChange?: (value: string, isValid: boolean) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  name?: string;
  id?: string;
  allowIncomplete?: boolean; // Allow incomplete IPs during typing
}

/**
 * Format IP address with dots
 */
const formatIpAddress = (value: string): string => {
  // Remove all non-numeric characters except dots
  const cleaned = value.replace(/[^\d.]/g, '');
  
  // Split by dots and process each octet
  const parts = cleaned.split('.');
  const formatted: string[] = [];
  
  for (let i = 0; i < Math.min(parts.length, 4); i++) {
    const part = parts[i];
    
    // Limit each octet to 3 digits
    const limited = part.slice(0, 3);
    
    // Ensure value doesn't exceed 255
    const num = parseInt(limited, 10);
    if (!isNaN(num)) {
      formatted.push(Math.min(num, 255).toString());
    } else if (limited === '') {
      formatted.push('');
    }
  }
  
  return formatted.join('.');
};

/**
 * Validate IP address format
 */
const isValidIpAddress = (value: string, allowIncomplete: boolean = false): boolean => {
  const parts = value.split('.');
  
  // Check if we have 4 octets
  if (!allowIncomplete && parts.length !== 4) {
    return false;
  }
  
  if (allowIncomplete && parts.length > 4) {
    return false;
  }
  
  // Validate each octet
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    // Empty parts are invalid (unless incomplete is allowed and it's the last part)
    if (part === '') {
      if (allowIncomplete && i === parts.length - 1) {
        continue;
      }
      return false;
    }
    
    // Check if it's a number between 0 and 255
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) {
      return false;
    }
    
    // Check for leading zeros (except for "0" itself)
    if (part.length > 1 && part[0] === '0') {
      return false;
    }
  }
  
  return true;
};

/**
 * Auto-add dots when typing
 */
const shouldAutoAddDot = (value: string): boolean => {
  const parts = value.split('.');
  const lastPart = parts[parts.length - 1];
  
  // Add dot after 3 digits or after reaching 255
  if (lastPart.length === 3) {
    const num = parseInt(lastPart, 10);
    return !isNaN(num) && parts.length < 4;
  }
  
  // Add dot immediately if value >= 256
  if (lastPart.length >= 2) {
    const num = parseInt(lastPart, 10);
    if (!isNaN(num) && num >= 256) {
      return parts.length < 4;
    }
  }
  
  return false;
};

export const IpAddressInput: React.FC<IpAddressInputProps> = ({
  value = '',
  onChange,
  onValidChange,
  placeholder = '192.168.1.1',
  className,
  disabled = false,
  required = false,
  autoFocus = false,
  name,
  id,
  allowIncomplete = true,
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isValid, setIsValid] = useState(false);

  /**
   * Handle input change
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    // Format the value
    let formatted = formatIpAddress(inputValue);
    
    // Auto-add dot if needed
    if (shouldAutoAddDot(formatted) && !formatted.endsWith('.')) {
      formatted += '.';
    }
    
    // Update state
    setInternalValue(formatted);
    onChange?.(formatted);
    
    // Validate
    const valid = isValidIpAddress(formatted, allowIncomplete);
    setIsValid(valid);
    onValidChange?.(formatted, valid);
    
    // Restore cursor position
    setTimeout(() => {
      if (inputRef.current) {
        let newPosition = cursorPosition;
        
        // Adjust cursor if a dot was auto-added
        if (formatted.length > inputValue.length) {
          newPosition = formatted.length;
        }
        
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  /**
   * Handle paste event
   */
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const formatted = formatIpAddress(pastedText);
    
    setInternalValue(formatted);
    onChange?.(formatted);
    
    const valid = isValidIpAddress(formatted, allowIncomplete);
    setIsValid(valid);
    onValidChange?.(formatted, valid);
  };

  /**
   * Handle keydown for special keys
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const parts = internalValue.split('.');
    
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].includes(e.keyCode)) {
      return;
    }
    
    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) {
      return;
    }
    
    // Allow: home, end, left, right
    if (e.keyCode >= 35 && e.keyCode <= 39) {
      return;
    }
    
    // Allow dot (period) to move to next octet
    if (e.key === '.') {
      // Don't allow more than 4 octets
      if (parts.length >= 4) {
        e.preventDefault();
        return;
      }
      // Don't allow consecutive dots
      if (internalValue.endsWith('.')) {
        e.preventDefault();
        return;
      }
      return;
    }
    
    // Ensure it's a digit
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    
    // Check if adding this digit would exceed 255 in current octet
    const currentOctetStart = internalValue.lastIndexOf('.', cursorPosition - 1) + 1;
    const currentOctet = internalValue.slice(currentOctetStart, cursorPosition);
    const newValue = currentOctet + e.key;
    const num = parseInt(newValue, 10);
    
    if (!isNaN(num) && num > 255) {
      e.preventDefault();
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={internalValue}
        onChange={handleChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'font-mono',
          isValid && internalValue && 'border-green-500 focus-visible:ring-green-500',
          !isValid && internalValue && internalValue.length > 0 && 'border-red-500 focus-visible:ring-red-500',
          className
        )}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        name={name}
        id={id}
        maxLength={15} // XXX.XXX.XXX.XXX max length
        autoComplete="off"
        inputMode="decimal"
      />
      
      {/* Validation indicator */}
      {internalValue && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isValid ? (
            <svg
              className="h-4 w-4 text-green-500"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg
              className="h-4 w-4 text-red-500"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
      )}
      
      {/* Helper text */}
      {internalValue && !isValid && (
        <p className="text-xs text-red-500 mt-1">
          {internalValue.split('.').length < 4 && allowIncomplete
            ? 'Continue typing...'
            : 'Invalid IP address format'}
        </p>
      )}
    </div>
  );
};

export default IpAddressInput;
