import { useState, useRef, useCallback, useEffect } from 'react';
import Quagga, { QuaggaJSResultObject } from 'quagga';

type CameraState = 'idle' | 'initializing' | 'active' | 'error' | 'denied';

interface CameraError {
  type: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'ABORT' | 'INITIALIZATION' | 'UNKNOWN';
  message: string;
  originalError?: Error;
}

interface UseEnhancedCameraOptions {
  /** Target element for camera stream */
  targetRef: React.RefObject<HTMLDivElement | null>;
  /** Camera timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Whether to automatically retry on failure (default: true) */
  autoRetry?: boolean;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Whether to use environment camera on mobile (default: true) */
  useEnvironmentCamera?: boolean;
}

interface UseEnhancedCameraReturn {
  /** Current camera state */
  cameraState: CameraState;
  /** Camera error if any */
  cameraError: CameraError | null;
  /** Whether camera is currently active */
  isActive: boolean;
  /** Whether camera permission was granted */
  hasPermission: boolean;
  /** Initialize and start camera */
  startCamera: () => Promise<void>;
  /** Stop camera and cleanup */
  stopCamera: () => Promise<void>;
  /** Restart camera (stop + start) */
  restartCamera: () => Promise<void>;
  /** Set barcode detection callback */
  setOnDetected: (callback: (result: QuaggaJSResultObject) => void) => void;
  /** Remove barcode detection callback */
  removeOnDetected: () => void;
  /** Get current retry count */
  getRetryCount: () => number;
  /** Reset retry count */
  resetRetryCount: () => void;
}

/**
 * Enhanced camera hook with improved stability and error handling
 * Provides robust camera management with automatic retry and comprehensive error handling
 */
export const useEnhancedCamera = (
  options: UseEnhancedCameraOptions
): UseEnhancedCameraReturn => {
  const {
    targetRef,
    timeout = 30000,
    autoRetry = true,
    maxRetries = 3,
    retryDelay = 1000,
    useEnvironmentCamera = true
  } = options;

  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  
  const isInitializedRef = useRef(false);
  const retryCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onDetectedCallbackRef = useRef<((result: QuaggaJSResultObject) => void) | null>(null);

  const isActive = cameraState === 'active';

  /**
   * Clear initialization timeout
   */
  const clearInitTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Create camera error object
   */
  const createCameraError = useCallback((
    type: CameraError['type'],
    message: string,
    originalError?: Error
  ): CameraError => {
    return { type, message, originalError };
  }, []);

  /**
   * Handle camera initialization error
   */
  const handleCameraError = useCallback((error: Error) => {
    let cameraError: CameraError;
    
    if (error.name === 'NotAllowedError') {
      cameraError = createCameraError(
        'PERMISSION_DENIED',
        'Camera permission denied. Please enable camera access.',
        error
      );
      setHasPermission(false);
      setCameraState('denied');
    } else if (error.name === 'NotFoundError') {
      cameraError = createCameraError(
        'NOT_FOUND',
        'No camera found. Please ensure camera is connected.',
        error
      );
      setCameraState('error');
    } else if (error.name === 'AbortError') {
      cameraError = createCameraError(
        'ABORT',
        'Camera access was interrupted. Please try again.',
        error
      );
      setCameraState('error');
    } else {
      cameraError = createCameraError(
        'INITIALIZATION',
        error.message || 'Failed to initialize camera',
        error
      );
      setCameraState('error');
    }
    
    setCameraError(cameraError);
  }, [createCameraError]);

  /**
   * Stop camera and cleanup Quagga
   */
  const stopCamera = useCallback(async (): Promise<void> => {
    clearInitTimeout();
    
    if (isInitializedRef.current) {
      try {
        // First remove callbacks to prevent any lingering events
        if (onDetectedCallbackRef.current) {
          Quagga.offDetected();
          onDetectedCallbackRef.current = null;
        }
        
        // Stop the camera stream
        Quagga.stop();
        
        // Additional cleanup: Stop any active media streams
        if (targetRef.current) {
          const videoElement = targetRef.current.querySelector('video');
          if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            if (stream) {
              stream.getTracks().forEach(track => {
                track.stop();
              });
              videoElement.srcObject = null;
            }
          }
          // Clear the target element to prevent DOM issues
          targetRef.current.innerHTML = '';
        }
      } catch (error) {
        console.warn('useEnhancedCamera: Error stopping camera:', error);
      }
      isInitializedRef.current = false;
    }
    
    setCameraState('idle');
  }, [clearInitTimeout, targetRef]);

  /**
   * Initialize and start camera
   */
  const startCamera = useCallback(async (): Promise<void> => {
    if (!targetRef.current) {
      const error = createCameraError(
        'INITIALIZATION',
        'Target element not available for camera initialization'
      );
      setCameraError(error);
      setCameraState('error');
      return;
    }

    // Prevent multiple simultaneous initializations
    if (cameraState === 'initializing') {
      return;
    }

    // If camera is already active and initialized, don't restart
    if (isInitializedRef.current && cameraState === 'active') {
      return;
    }

    // Stop any existing camera first only if we need to reinitialize
    if (isInitializedRef.current) {
      await stopCamera();
    }

    // Ensure target element is clean before initialization
    if (targetRef.current) {
      targetRef.current.innerHTML = '';
    }

    setCameraState('initializing');
    setCameraError(null);

    // Set initialization timeout
    timeoutRef.current = setTimeout(() => {
      const error = createCameraError(
        'INITIALIZATION',
        `Camera initialization timed out after ${timeout}ms`
      );
      setCameraError(error);
      setCameraState('error');
    }, timeout);

    try {
      await new Promise<void>((resolve, reject) => {
        Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: targetRef.current!,
            constraints: {
              width: { min: 320, ideal: 640, max: 800 },
              height: { min: 240, ideal: 300, max: 400 },
              facingMode: useEnvironmentCamera ? "environment" : "user",
              aspectRatio: { min: 1.2, max: 2.0 }
            }
          },
          locator: {
            patchSize: "medium",
            halfSample: true
          },
          numOfWorkers: navigator.hardwareConcurrency || 2,
          decoder: {
            readers: [
              "code_128_reader",
              "ean_reader",
              "ean_8_reader",
              "code_39_reader",
              "code_39_vin_reader",
              "codabar_reader",
              "upc_reader",
              "upc_e_reader",
              "i2of5_reader"
            ]
          },
          locate: true
        }, (err: Error | null) => {
          clearInitTimeout();
          
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Set up detection callback if available
      if (onDetectedCallbackRef.current) {
        try {
          Quagga.onDetected(onDetectedCallbackRef.current);
        } catch (callbackError) {
          console.warn('Failed to register Quagga onDetected callback:', callbackError);
        }
      }

      // Start scanning
      Quagga.start();
      isInitializedRef.current = true;
      setHasPermission(true);
      setCameraState('active');
      retryCountRef.current = 0; // Reset retry count on success

    } catch (error) {
      clearInitTimeout();
      handleCameraError(error as Error);
      
      // Auto-retry logic
      if (autoRetry && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        
        setTimeout(() => {
          startCamera();
        }, retryDelay);
      }
    }
  }, [
    targetRef,
    timeout,
    useEnvironmentCamera,
    autoRetry,
    maxRetries,
    retryDelay,
    stopCamera,
    clearInitTimeout,
    createCameraError,
    handleCameraError
  ]);

  /**
   * Restart camera (stop + start)
   */
  const restartCamera = useCallback(async (): Promise<void> => {
    await stopCamera();
    await startCamera();
  }, [stopCamera, startCamera]);

  /**
   * Set barcode detection callback
   */
  const setOnDetected = useCallback((callback: (result: QuaggaJSResultObject) => void) => {
    // Only update if callback is different
    if (onDetectedCallbackRef.current === callback) {
      return;
    }
    
    onDetectedCallbackRef.current = callback;
    
    // If camera is already active, set the callback immediately
    if (isInitializedRef.current && cameraState === 'active') {
      try {
        Quagga.onDetected(callback);
      } catch (error) {
        console.warn('Failed to set Quagga onDetected callback:', error);
      }
    }
  }, [cameraState]);

  /**
   * Remove barcode detection callback
   */
  const removeOnDetected = useCallback(() => {
    if (onDetectedCallbackRef.current && isInitializedRef.current) {
      Quagga.offDetected();
    }
    onDetectedCallbackRef.current = null;
  }, []);

  /**
   * Get current retry count
   */
  const getRetryCount = useCallback((): number => {
    return retryCountRef.current;
  }, []);

  /**
   * Reset retry count
   */
  const resetRetryCount = useCallback((): void => {
    retryCountRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    cameraState,
    cameraError,
    isActive,
    hasPermission,
    startCamera,
    stopCamera,
    restartCamera,
    setOnDetected,
    removeOnDetected,
    getRetryCount,
    resetRetryCount
  };
};