import { useEffect, useRef, useCallback } from 'react';
import { axiosInstance } from '../lib/axios';

/**
 * Hook to automatically refresh access token before it expires
 * Access token expires in 15 minutes, so we refresh at 14 minutes
 * 
 * @param {boolean} isAuthenticated - Whether user is authenticated
 * @param {Function} onLogout - Callback to trigger logout on repeated failures
 * @param {number} refreshInterval - Interval in ms (default: 14 minutes, configurable for testing)
 */
export const useTokenRefresh = (
    isAuthenticated,
    onLogout = null,
    refreshInterval = 14 * 60 * 1000
) => {
    const refreshIntervalRef = useRef(null);
    const failureCountRef = useRef(0);
    const isRefreshingRef = useRef(false);
    const lastRefreshTimeRef = useRef(Date.now());

    // Memoized refresh function to prevent recreation on every render
    const refreshToken = useCallback(async () => {
        // Prevent concurrent refresh requests
        if (isRefreshingRef.current) {
            console.log('Refresh already in progress, skipping...');
            return;
        }

        try {
            isRefreshingRef.current = true;
            console.log('Refreshing access token...');

            const response = await axiosInstance.post('/auth/refresh-token');

            lastRefreshTimeRef.current = Date.now();
            failureCountRef.current = 0; // Reset failure count on success

            console.log('Token refreshed successfully:', response.data);
        } catch (error) {
            failureCountRef.current += 1;
            console.error(`Token refresh failed (attempt ${failureCountRef.current}):`, error);

            // After 3 consecutive failures, trigger logout if callback provided
            if (failureCountRef.current >= 3) {
                console.error('Multiple token refresh failures detected. Logging out...');
                if (onLogout && typeof onLogout === 'function') {
                    onLogout();
                }
            }
        } finally {
            isRefreshingRef.current = false;
        }
    }, [onLogout]);

    // Handle page visibility changes (tab switching, device wake)
    useEffect(() => {
        if (!isAuthenticated) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const timeSinceLastRefresh = Date.now() - lastRefreshTimeRef.current;
                const shouldRefresh = timeSinceLastRefresh > refreshInterval;

                if (shouldRefresh) {
                    console.log('Tab became visible, refreshing token...');
                    refreshToken();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isAuthenticated, refreshToken, refreshInterval]);

    // Main token refresh interval
    useEffect(() => {
        if (!isAuthenticated) {
            // Clear interval if user is not authenticated
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
            }
            return;
        }

        // Don't perform initial refresh immediately on authentication
        // The access token from login/verification is still fresh
        // Only set up the periodic refresh interval
        
        // Clear any existing interval
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
        }

        // Set up periodic refresh interval
        refreshIntervalRef.current = setInterval(() => {
            console.log('Periodic token refresh triggered');
            refreshToken();
        }, refreshInterval);

        console.log(`Token refresh scheduled every ${refreshInterval / 60000} minutes`);

        // Cleanup on unmount or when authentication status changes
        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
            }
        };
    }, [isAuthenticated, refreshToken, refreshInterval]);

    return null;
};