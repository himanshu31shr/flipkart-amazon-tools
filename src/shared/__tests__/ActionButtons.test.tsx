import React from 'react';
import { render, screen } from '@testing-library/react';
import { 
  ViewFlipkartListingButton, 
  ViewAmazonListingButton, 
  ShowProductEditPageButton 
} from '../ActionButtons';

describe('ActionButtons', () => {
  describe('ViewFlipkartListingButton', () => {
    it('should render when flipkartSerialNumber is provided', () => {
      const serialNumber = 'ITME123456';
      render(<ViewFlipkartListingButton flipkartSerialNumber={serialNumber} />);
      
      const link = screen.getByTestId(`view-flipkart-${serialNumber}`);
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', `https://www.flipkart.com/product/p/itme?pid=${serialNumber}`);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('title', 'View Flipkart Listing');
    }) as any;

    it('should not render when flipkartSerialNumber is empty', () => {
      const { container } = render(<ViewFlipkartListingButton flipkartSerialNumber="" />);
      expect(container.firstChild).toBeNull();
    }) as any;

    it('should contain Shop2Outlined icon', () => {
      render(<ViewFlipkartListingButton flipkartSerialNumber="ITME123456" />);
      
      const iconButton = screen.getByRole('button');
      expect(iconButton).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('ViewAmazonListingButton', () => {
    it('should render when amazonSerialNumber is provided', () => {
      const serialNumber = 'B08XYZ123';
      render(<ViewAmazonListingButton amazonSerialNumber={serialNumber} />);
      
      const link = screen.getByTestId(`view-amazon-${serialNumber}`);
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', `https://www.amazon.in/sacred/dp/${serialNumber}`);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('title', 'View Amazon Listing');
    }) as any;

    it('should not render when amazonSerialNumber is empty', () => {
      const { container } = render(<ViewAmazonListingButton amazonSerialNumber="" />);
      expect(container.firstChild).toBeNull();
    }) as any;

    it('should contain Shop2Outlined icon', () => {
      render(<ViewAmazonListingButton amazonSerialNumber="B08XYZ123" />);
      
      const iconButton = screen.getByRole('button');
      expect(iconButton).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('ShowProductEditPageButton', () => {
    it('should render Flipkart edit link when platform is flipkart', () => {
      const sku = 'TEST-SKU-123';
      const platform = 'flipkart';
      
      render(<ShowProductEditPageButton sku={sku} platform={platform} />);
      
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 
        `https://seller.flipkart.com/index.html#dashboard/listings-management?listingState=ACTIVE&listingsSearchQuery=${sku}&partnerContext=ALL`
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('title', 'Show Product Edit Page');
    }) as any;

    it('should render Amazon edit link when platform is not flipkart', () => {
      const sku = 'TEST-SKU-123';
      const platform = 'amazon';
      
      render(<ShowProductEditPageButton sku={sku} platform={platform} />);
      
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 
        `https://sellercentral.amazon.in/myinventory/inventory?fulfilledBy=all&page=1&pageSize=25&searchField=all&searchTerm=${sku}&sort=date_created_desc&status=all&ref_=xx_invmgr_dnav_xx`
      );
    }) as any;

    it('should contain SellOutlined icon', () => {
      render(<ShowProductEditPageButton sku="TEST-SKU" platform="flipkart" />);
      
      const iconButton = screen.getByRole('button');
      expect(iconButton).toBeInTheDocument();
    }) as any;

    it('should handle empty sku', () => {
      render(<ShowProductEditPageButton sku="" platform="flipkart" />);
      
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link.getAttribute('href')).toContain('listingsSearchQuery=');
    }) as any;
  }) as any;
}) as any; 