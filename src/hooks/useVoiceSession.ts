import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

interface VoiceSession {
  voiceToken: string;
  expiresIn: number;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

interface VoiceSessionHook {
  voiceToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  createVoiceSession: () => Promise<VoiceSession | null>;
  refreshVoiceSession: () => void;
  clearVoiceSession: () => void;
  revokeVoiceSession: () => Promise<boolean>;
}

export const useVoiceSession = (): VoiceSessionHook => {
  const [voiceToken, setVoiceToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createVoiceSession = useCallback(async (): Promise<VoiceSession | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post<{ success: boolean; data: VoiceSession }>(
        '/voice-assistant/session/create'
      );
      
      if (response.data.success) {
        const sessionData = response.data.data;
        setVoiceToken(sessionData.voiceToken);
        setIsAuthenticated(true);
        
        // Store in sessionStorage for persistence
        sessionStorage.setItem('voiceToken', sessionData.voiceToken);
        sessionStorage.setItem('voiceTokenExpiry', 
          String(Date.now() + (sessionData.expiresIn * 1000))
        );
        
        return sessionData;
      }
      
      throw new Error('Failed to create voice session');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create voice session';
      setError(errorMessage);
      setIsAuthenticated(false);
      console.error('Voice session creation error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshVoiceSession = useCallback(() => {
    const stored = sessionStorage.getItem('voiceToken');
    const expiry = sessionStorage.getItem('voiceTokenExpiry');
    
    if (stored && expiry) {
      const expiryTime = parseInt(expiry, 10);
      
      // Check if token is expired
      if (Date.now() < expiryTime) {
        setVoiceToken(stored);
        setIsAuthenticated(true);
      } else {
        // Token expired, clear it
        clearVoiceSession();
        setError('Voice session expired');
      }
    }
  }, []);

  const clearVoiceSession = useCallback(() => {
    setVoiceToken(null);
    setIsAuthenticated(false);
    setError(null);
    sessionStorage.removeItem('voiceToken');
    sessionStorage.removeItem('voiceTokenExpiry');
  }, []);

  const revokeVoiceSession = useCallback(async (): Promise<boolean> => {
    if (!voiceToken) return false;
    
    try {
      const response = await api.delete<{ success: boolean }>(
        '/voice-assistant/session/revoke',
        { data: { voiceToken } }
      );
      
      if (response.data.success) {
        clearVoiceSession();
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Failed to revoke voice session:', err);
      return false;
    }
  }, [voiceToken, clearVoiceSession]);

  // Auto-refresh on mount
  useEffect(() => {
    refreshVoiceSession();
  }, [refreshVoiceSession]);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!isAuthenticated) return;

    const expiryStr = sessionStorage.getItem('voiceTokenExpiry');
    if (!expiryStr) return;

    const expiryTime = parseInt(expiryStr, 10);
    const timeUntilExpiry = expiryTime - Date.now();
    
    // Refresh 5 minutes before expiry
    const refreshTime = timeUntilExpiry - (5 * 60 * 1000);

    if (refreshTime > 0) {
      const timer = setTimeout(() => {
        createVoiceSession();
      }, refreshTime);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, createVoiceSession]);

  return {
    voiceToken,
    isLoading,
    isAuthenticated,
    error,
    createVoiceSession,
    refreshVoiceSession,
    clearVoiceSession,
    revokeVoiceSession
  };
};
