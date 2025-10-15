import { renderHook } from '@testing-library/react';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';
import { useBackButton, useBackButtonWithCustomExit, exitApp, forceExitApp } from '../useBackButton';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import React from 'react';

// Mock Capacitor
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(),
    getPlatform: jest.fn(),
  },
}));

jest.mock('@capacitor/app', () => ({
  App: {
    addListener: jest.fn(),
    exitApp: jest.fn(),
  },
}));

// Mock React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
}));

// Mock window.confirm
const mockConfirm = jest.spyOn(window, 'confirm');
const mockConsoleWarn = jest.spyOn(console, 'warn');

describe('useBackButton', () => {
  const mockNavigate = jest.fn();
  const mockRemove = jest.fn();
  let backButtonListener: ((event: { canGoBack: boolean }) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockImplementation(() => true);
    mockConsoleWarn.mockImplementation(() => {});

    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useLocation as jest.Mock).mockReturnValue({ pathname: '/flipkart-amazon-tools/' });

    (CapacitorApp.addListener as jest.Mock).mockImplementation((event, callback) => {
      if (event === 'backButton') {
        backButtonListener = callback;
      }
      return Promise.resolve({ remove: mockRemove });
    });
  });

  afterEach(() => {
    backButtonListener = null;
  });

  describe('Platform Detection', () => {
    it('should not register listener on web platform', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);

      renderHook(() => useBackButton(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      expect(CapacitorApp.addListener).not.toHaveBeenCalled();
    });

    it('should not register listener on iOS platform', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');

      renderHook(() => useBackButton(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      expect(CapacitorApp.addListener).not.toHaveBeenCalled();
    });

    it('should register listener only on Android platform', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');

      renderHook(() => useBackButton(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      expect(CapacitorApp.addListener).toHaveBeenCalledWith('backButton', expect.any(Function));
    });
  });

  describe('Navigation Behavior (Android)', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');
    });

    it('should navigate back when not at root route', async () => {
      (useLocation as jest.Mock).mockReturnValue({ pathname: '/products' });

      renderHook(() => useBackButton(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      // Wait for async listener setup
      await new Promise(resolve => setTimeout(resolve, 0));

      // Simulate back button press with canGoBack=true
      backButtonListener?.({ canGoBack: true });

      expect(mockNavigate).toHaveBeenCalledWith(-1);
      expect(CapacitorApp.exitApp).not.toHaveBeenCalled();
    });

    it('should show exit confirmation at root route', async () => {
      (useLocation as jest.Mock).mockReturnValue({ pathname: '/' });
      mockConfirm.mockReturnValue(true);

      renderHook(() => useBackButton(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      // Wait for async listener setup
      await new Promise(resolve => setTimeout(resolve, 0));

      backButtonListener?.({ canGoBack: false });

      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to exit Sacred Sutra Tools?');
      expect(CapacitorApp.exitApp).toHaveBeenCalled();
    });

    it('should not exit if user cancels confirmation', async () => {
      (useLocation as jest.Mock).mockReturnValue({ pathname: '/' });
      mockConfirm.mockReturnValue(false);

      renderHook(() => useBackButton(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      // Wait for async listener setup
      await new Promise(resolve => setTimeout(resolve, 0));

      backButtonListener?.({ canGoBack: false });

      expect(mockConfirm).toHaveBeenCalled();
      expect(CapacitorApp.exitApp).not.toHaveBeenCalled();
    });

    it('should handle root route', async () => {
      // useBackButton only treats '/' as root (not /flipkart-amazon-tools/)
      mockConfirm.mockReturnValue(true);
      (useLocation as jest.Mock).mockReturnValue({ pathname: '/' });

      renderHook(() => useBackButton(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      // Wait for async listener setup
      await new Promise(resolve => setTimeout(resolve, 0));

      backButtonListener?.({ canGoBack: false });

      expect(mockConfirm).toHaveBeenCalled();
      expect(CapacitorApp.exitApp).toHaveBeenCalled();
    });

    it('should navigate to root if canGoBack is false but not at root', async () => {
      (useLocation as jest.Mock).mockReturnValue({ pathname: '/products' });

      renderHook(() => useBackButton(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      // Wait for async listener setup
      await new Promise(resolve => setTimeout(resolve, 0));

      backButtonListener?.({ canGoBack: false });

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Cleanup', () => {
    it('should remove listener on unmount', async () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');

      const { unmount } = renderHook(() => useBackButton(), {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      // Wait for async listener setup
      await new Promise(resolve => setTimeout(resolve, 0));

      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });
  });
});

describe('useBackButtonWithCustomExit', () => {
  const mockNavigate = jest.fn();
  const mockOnExit = jest.fn();
  const mockRemove = jest.fn();
  let backButtonListener: ((event: { canGoBack: boolean }) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useLocation as jest.Mock).mockReturnValue({ pathname: '/flipkart-amazon-tools/' });
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
    (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');

    (CapacitorApp.addListener as jest.Mock).mockImplementation((event, callback) => {
      if (event === 'backButton') {
        backButtonListener = callback;
      }
      return Promise.resolve({ remove: mockRemove });
    });
  });

  it('should call custom exit handler at root route', async () => {
    renderHook(() => useBackButtonWithCustomExit(mockOnExit), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });

    // Wait for async listener setup
    await new Promise(resolve => setTimeout(resolve, 0));

    backButtonListener?.({ canGoBack: false });

    expect(mockOnExit).toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('should navigate back when not at root', async () => {
    (useLocation as jest.Mock).mockReturnValue({ pathname: '/flipkart-amazon-tools/products' });

    renderHook(() => useBackButtonWithCustomExit(mockOnExit), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });

    // Wait for async listener setup
    await new Promise(resolve => setTimeout(resolve, 0));

    backButtonListener?.({ canGoBack: true });

    expect(mockNavigate).toHaveBeenCalledWith(-1);
    expect(mockOnExit).not.toHaveBeenCalled();
  });
});

describe('exitApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockImplementation(() => true);
  });

  it('should exit app with confirmation on native platform', () => {
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
    mockConfirm.mockReturnValue(true);

    exitApp();

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to exit Sacred Sutra Tools?');
    expect(CapacitorApp.exitApp).toHaveBeenCalled();
  });

  it('should not exit if confirmation is cancelled', () => {
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
    mockConfirm.mockReturnValue(false);

    exitApp();

    expect(mockConfirm).toHaveBeenCalled();
    expect(CapacitorApp.exitApp).not.toHaveBeenCalled();
  });

  it('should warn on web platform', () => {
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);

    exitApp();

    expect(mockConsoleWarn).toHaveBeenCalledWith('exitApp() only works on native platforms');
    expect(CapacitorApp.exitApp).not.toHaveBeenCalled();
  });
});

describe('forceExitApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should exit app without confirmation on native platform', () => {
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);

    forceExitApp();

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(CapacitorApp.exitApp).toHaveBeenCalled();
  });

  it('should warn on web platform', () => {
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);

    forceExitApp();

    expect(mockConsoleWarn).toHaveBeenCalledWith('forceExitApp() only works on native platforms');
    expect(CapacitorApp.exitApp).not.toHaveBeenCalled();
  });
});
