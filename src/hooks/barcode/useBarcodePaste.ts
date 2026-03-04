import { useEffect, useRef } from 'react';
import { playErrorSound } from '@/utils/sounds';
import constants from '@/utils/constants';

interface UseBarcodeBackgroundPasteProps {
  onBarcodePaste: (barcode: string) => void;
  onKeystroke?: (key: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  enabled?: boolean;
}

const useBarcodeBackgroundPaste = ({ 
  onBarcodePaste, 
  onKeystroke,
  inputRef,
  enabled = true 
}: UseBarcodeBackgroundPasteProps) => {
  const onBarcodePasteRef = useRef(onBarcodePaste);
  const onKeystrokeRef = useRef(onKeystroke);
  const enabledRef = useRef(enabled);
  const lastProcessedBarcodeRef = useRef<string>('');
  const lastProcessedTimeRef = useRef<number>(0);
  
  const barcodeBufferRef = useRef<string>('');
  const lastKeystrokeTimeRef = useRef<number>(0);
  
  onBarcodePasteRef.current = onBarcodePaste;
  onKeystrokeRef.current = onKeystroke;
  enabledRef.current = enabled;

  // Prevent scanning duplication
  const processBarcode = (barcode: string) => {
    const now = Date.now();
    const timeDiff = now - lastProcessedTimeRef.current;
    
    if (lastProcessedBarcodeRef.current === barcode && timeDiff < 500) {
      return;
    }
    
    lastProcessedBarcodeRef.current = barcode;
    lastProcessedTimeRef.current = now;
    onBarcodePasteRef.current(barcode);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabledRef.current) return;
      
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        return;
      }

      const currentTime = Date.now();
      const target = event.target as HTMLElement;
      
      const isTypingInInput = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.contentEditable === 'true'
      );

      // If not typing in input and we have a keystroke handler, forward regular typing
      if (!isTypingInInput && onKeystrokeRef.current) {
        // Handle regular typing (letters, numbers, space, backspace) - forward to input
        if (/^[a-zA-Z0-9 ]$/.test(event.key) || event.key === 'Backspace') {
          // Focus the input and let it handle the keystroke
          if (inputRef?.current) {
            inputRef.current.focus();
            return;
          } else {
            // Fallback: call the keystroke handler
            onKeystrokeRef.current(event.key);
            return;
          }
        }
      }

      // Scanner barcode detection (only when not typing in input)
      if (!isTypingInInput) {
        // Reset buffer if too much time has passed (not scanner speed)
        if (currentTime - lastKeystrokeTimeRef.current > 100) {
          barcodeBufferRef.current = '';
        }

        // Accumulate digits for barcode scanning
        if (/^\d$/.test(event.key)) {
          barcodeBufferRef.current += event.key;
          lastKeystrokeTimeRef.current = currentTime;

          // Check if we have a valid barcode length
          if (constants.CHECKOUT_CONFIG.BARCODE_VALIDATION_PATTERN.test(barcodeBufferRef.current)) {
            processBarcode(barcodeBufferRef.current);
            barcodeBufferRef.current = '';
          }
        }
        // Process on Enter key if we have accumulated digits
        else if (event.key === 'Enter' && barcodeBufferRef.current.length > 0) {
          if (constants.CHECKOUT_CONFIG.BARCODE_VALIDATION_PATTERN.test(barcodeBufferRef.current)) {
            processBarcode(barcodeBufferRef.current);
            barcodeBufferRef.current = '';
          } else {
            barcodeBufferRef.current = '';
          }
        }
        // Reset buffer on non-digit, non-Enter keys (except regular typing which we handled above)
        else if (event.key !== 'Enter' && event.key !== 'Control' && event.key !== 'Shift' && event.key !== 'Alt' && !/^[a-zA-Z0-9 ]$/.test(event.key) && event.key !== 'Backspace') {
          barcodeBufferRef.current = '';
        }
      }
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (!enabledRef.current) return;
      
      const clipboardData = event.clipboardData?.getData('text') || '';
      
      if (clipboardData.trim()) {
        const trimmedText = clipboardData.trim();
        
        if (constants.CHECKOUT_CONFIG.BARCODE_VALIDATION_PATTERN.test(trimmedText)) {
          event.preventDefault();
          processBarcode(trimmedText);
        } else {
          playErrorSound();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('paste', handlePaste);
    };
  }, [inputRef]);
};

export { useBarcodeBackgroundPaste };