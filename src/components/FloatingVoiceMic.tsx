import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVoiceSession } from '@/hooks/useVoiceSession';
import { voiceAssistantAPI } from '@/services/api';
import { cn } from '@/lib/utils';

interface FloatingVoiceMicProps {
  onCommandExecuted?: (result: any) => void;
}

export const FloatingVoiceMic: React.FC<FloatingVoiceMicProps> = ({ onCommandExecuted }) => {
  const { toast } = useToast();
  const { voiceToken, isAuthenticated, isLoading: sessionLoading, createVoiceSession } = useVoiceSession();
  
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const buttonRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSpeechSupported(!!SpeechRecognition && !!window.speechSynthesis);
    
    if (window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Initialize voice session on mount
  useEffect(() => {
    if (!isAuthenticated && !sessionLoading && isSpeechSupported) {
      createVoiceSession().catch(err => {
        console.error('Failed to create voice session:', err);
      });
    }
  }, [isAuthenticated, sessionLoading, createVoiceSession, isSpeechSupported]);

  // Initialize speech recognition (lazy initialization - only when needed)
  const initRecognition = () => {
    if (!isSpeechSupported || recognitionRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      toast({
        title: '🎤 Listening...',
        description: 'Speak your command now',
      });
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      processCommand(transcript.trim());
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        let errorMessage = 'Voice recognition error';
        switch(event.error) {
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please enable microphone permissions in your browser settings.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your connection.';
            break;
        }

        toast({
          title: 'Voice Error',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Handle dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Constrain to window bounds
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 80;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Check if it's a right-click or Shift+click for dragging
    if (e.button === 2 || e.shiftKey) {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
        setIsDragging(true);
      }
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleClick = async (e: React.MouseEvent) => {
    if (isDragging) return;
    
    e.stopPropagation();

    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      // Start listening
      if (!isAuthenticated) {
        toast({
          title: 'Creating voice session...',
          description: 'Please wait',
        });
        
        const session = await createVoiceSession();
        if (!session) {
          toast({
            title: 'Authentication Failed',
            description: 'Could not create voice session',
            variant: 'destructive'
          });
          return;
        }
      }

      // Initialize recognition on first use
      if (!recognitionRef.current) {
        initRecognition();
      }

      if (recognitionRef.current && !isListening) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Failed to start recognition:', error);
          toast({
            title: 'Microphone Error',
            description: 'Please allow microphone access and try again',
            variant: 'destructive'
          });
        }
      }
    }
  };

  const processCommand = async (command: string) => {
    if (!voiceToken) {
      toast({
        title: 'Authentication Required',
        description: 'Please wait for voice session',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);

    toast({
      title: '🎤 Processing...',
      description: `"${command}"`,
    });

    try {
      const response = await voiceAssistantAPI.processVoiceCommand({
        command,
        assistant: 'web',
        voiceToken
      });

      if (response.data.success) {
        toast({
          title: '✅ Command Executed',
          description: response.data.message || 'Voice command successful',
        });

        // Text-to-speech response
        if (synthRef.current) {
          const utterance = new SpeechSynthesisUtterance(response.data.message || 'Command executed');
          utterance.rate = 1.0;
          synthRef.current.speak(utterance);
        }

        onCommandExecuted?.(response.data);
      } else {
        toast({
          title: '❌ Command Failed',
          description: response.data.message || 'Could not execute command',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: '❌ Error',
        description: error.response?.data?.message || 'Failed to process command',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isSpeechSupported) {
    return null; // Don't show if not supported
  }

  return (
    <div
      ref={buttonRef}
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right-click
      title="Click to speak | Shift+Click to drag"
    >
      <Button
        onClick={handleClick}
        className={cn(
          "w-16 h-16 rounded-full shadow-2xl transition-all duration-300 relative",
          isListening && "animate-pulse bg-red-500 hover:bg-red-600",
          isProcessing && "animate-pulse bg-blue-600 hover:bg-blue-700",
          isDragging && "cursor-grabbing scale-110",
          !isDragging && "cursor-pointer hover:scale-110"
        )}
        disabled={!isAuthenticated && !sessionLoading}
        size="icon"
      >
        {isProcessing ? (
          <Loader2 className="w-8 h-8 animate-spin" />
        ) : isListening ? (
          <MicOff className="w-8 h-8" />
        ) : (
          <Mic className="w-8 h-8" />
        )}
      </Button>

      {/* Listening indicator ring */}
      {isListening && (
        <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping" />
      )}
    </div>
  );
};
