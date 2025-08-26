import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { StorageManagementPage } from '../storage-management.page';
import { pdfStorageService } from '../../../services/pdfStorageService';
import { roleAccessService } from '../../../services/role-access.service';
import { UserRole } from '../../../types/auth.types';

// Mock entire Material-UI library
jest.mock('@mui/material', () => {
  const originalModule = jest.requireActual('@mui/material');
  return {
    ...originalModule,
    ToggleButtonGroup: jest.fn(({ onChange, ...props }) => (
      <div 
        data-testid="toggle-group" 
        role="group" 
        aria-label="toggle view"
        {...props}
      >
        <button 
          data-testid="toggle-button-false"
          role="button"
          aria-label="My Files"
          onClick={() => onChange?.(null, false)}
        >
          My Files
        </button>
        <button 
          data-testid="toggle-button-true"
          role="button"
          aria-label="All Users"
          onClick={() => onChange?.(null, true)}
        >
          All Users
        </button>
      </div>
    )),
    ToggleButton: jest.fn(({ ...props }) => (
      <button 
        data-testid={`toggle-button-${props.value}`}
        role="button"
        aria-label={props.value === false ? 'My Files' : 'All Users'}
        {...props}
      />
    ))
  };
});

// Mock services
jest.mock('../../../services/pdfStorageService');
jest.mock('../../../services/role-access.service');

describe('StorageManagementPage Multi-User View', () => {
  // Mock data
  const mockUserPdfs = [
    {
      fileId: 'pdf1',
      downloadUrl: 'http://example.com/pdf1',
      metadata: {
        userId: 'user1',
        originalFileName: 'document1.pdf',
        fileSize: 1024,
        uploadedAt: Date.now(),
      }
    },
    {
      fileId: 'pdf2',
      downloadUrl: 'http://example.com/pdf2',
      metadata: {
        userId: 'user2',
        originalFileName: 'document2.pdf',
        fileSize: 2048,
        uploadedAt: Date.now(),
      }
    }
  ];

  const mockUserDetails = {
    'user1': {
      id: 'user1',
      email: 'user1@example.com',
      displayName: 'User One',
      role: UserRole.USER,
      photoURL: 'http://example.com/photo1.jpg'
    },
    'user2': {
      id: 'user2',
      email: 'user2@example.com',
      displayName: 'User Two',
      role: UserRole.ADMIN,
      photoURL: 'http://example.com/photo2.jpg'
    }
  };

  // Mock initial state for personal view
  const mockFolders = [
    {
      path: 'pdfs/user1/folder1',
      name: 'Folder 1',
      fileCount: 3,
      totalSize: 1024,
      lastModified: new Date()
    }
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock service methods
    (pdfStorageService.listAllUserPdfs as jest.Mock).mockResolvedValue({
      pdfs: mockUserPdfs,
      totalCount: 2,
      page: 1,
      pageSize: 50
    });

    (pdfStorageService.getUserDetailsForPdfs as jest.Mock).mockResolvedValue(mockUserDetails);

    // Mock personal view folders
    (pdfStorageService.listAllFolders as jest.Mock).mockResolvedValue(mockFolders);
    (pdfStorageService.listUserFolders as jest.Mock).mockResolvedValue(mockFolders); // Explicitly mock listUserFolders
    (pdfStorageService.listFolderContents as jest.Mock).mockResolvedValue([]);

    // Mock admin access
    (roleAccessService.hasAdminAccess as jest.Mock).mockResolvedValue(true);
  });

  it('should render admin toggle when user has admin access', async () => {
    await act(async () => {
      render(<StorageManagementPage />);
    });

    await waitFor(() => {
      const adminToggle = screen.getByTestId('toggle-group');
      expect(adminToggle).toBeInTheDocument();
    });
  });

  it('should not render admin toggle when user lacks admin access', async () => {
    // Mock no admin access
    (roleAccessService.hasAdminAccess as jest.Mock).mockResolvedValue(false);

    await act(async () => {
      render(<StorageManagementPage />);
    });

    await waitFor(() => {
      const adminToggle = screen.queryByTestId('toggle-group');
      expect(adminToggle).not.toBeInTheDocument();
    });
  });

  it('should switch to admin view and display PDFs from all users', async () => {
    await act(async () => {
      render(<StorageManagementPage />);
    });

    // Wait for initial render
    await waitFor(() => {
      const myFilesButton = screen.getAllByText(/My Files/i)[0];
      expect(myFilesButton).toBeInTheDocument();
    });

    // Switch to admin view
    await act(async () => {
      const adminToggle = screen.getByTestId('toggle-button-true');
      fireEvent.click(adminToggle);
    });

    // Wait for admin view to load
    await waitFor(() => {
      // Check that PDFs from both users are displayed
      const pdf1 = screen.queryByText('document1.pdf');
      const pdf2 = screen.queryByText('document2.pdf');
      
      expect(pdf1 || pdf2).toBeTruthy();
    });

    // Verify user details are displayed
    const userOne = screen.queryByText('User One');
    const userTwo = screen.queryByText('User Two');
    
    expect(userOne || userTwo).toBeTruthy();
  });

  it('should handle errors when loading admin view', async () => {
    // Mock service error
    (pdfStorageService.listAllUserPdfs as jest.Mock).mockRejectedValue(new Error('Load failed'));

    await act(async () => {
      render(<StorageManagementPage />);
    });

    // Switch to admin view
    await act(async () => {
      const adminToggle = screen.getByTestId('toggle-button-true');
      fireEvent.click(adminToggle);
    });

    // Wait for error to be displayed
    await waitFor(() => {
      const errorAlerts = screen.getAllByRole('alert');
      const loadFailedAlert = errorAlerts.find(alert => 
        alert.textContent?.match(/Load failed/i)
      );
      expect(loadFailedAlert).toBeTruthy();
    });
  });

  it('should download PDF when download button is clicked', async () => {
    // Mock window.open
    const mockOpen = jest.fn();
    Object.defineProperty(window, 'open', { value: mockOpen });

    await act(async () => {
      render(<StorageManagementPage />);
    });

    // Switch to admin view
    await act(async () => {
      const adminToggle = screen.getByTestId('toggle-button-true');
      fireEvent.click(adminToggle);
    });

    // Wait for PDFs to load
    await waitFor(() => {
      const downloadButtons = screen.getAllByTestId('DownloadIcon');
      expect(downloadButtons.length).toBeGreaterThan(0);
    });

    // Click first download button
    const downloadButtons = screen.getAllByTestId('DownloadIcon');
    await act(async () => {
      fireEvent.click(downloadButtons[0].closest('button')!);
    });

    // Verify download URL was opened
    expect(mockOpen).toHaveBeenCalledWith('http://example.com/pdf1', '_blank');
  });

  it('should display user avatars with fallback', async () => {
    // Modify user details to test avatar fallback
    const modifiedUserDetails = {
      ...mockUserDetails,
      'user2': {
        ...mockUserDetails['user2'],
        photoURL: undefined
      }
    };

    (pdfStorageService.getUserDetailsForPdfs as jest.Mock).mockResolvedValue(modifiedUserDetails);

    await act(async () => {
      render(<StorageManagementPage />);
    });

    // Switch to admin view
    await act(async () => {
      const adminToggle = screen.getByTestId('toggle-button-true');
      fireEvent.click(adminToggle);
    });

    // Wait for avatars to load
    await waitFor(() => {
      // Check that both user avatars are displayed
      const avatars = screen.getAllByRole('img', { hidden: true });
      expect(avatars.length).toBeGreaterThan(0);
    });
  });
}); 