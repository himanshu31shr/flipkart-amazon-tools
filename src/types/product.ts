export interface Product {
  sku: string;
  name: string;
  description: string;
  categoryId?: string; // Optional to match product.service.ts definition
  platform: "amazon" | "flipkart";
  visibility: "visible" | "hidden";
  sellingPrice: number;
  metadata: {
    createdAt?: Date | { toDate(): Date; toMillis(): number }; // Compatible with both Date and Firestore Timestamp
    updatedAt?: Date | { toDate(): Date; toMillis(): number }; // Compatible with both Date and Firestore Timestamp
    lastImportedFrom?: string;
    listingStatus?: string;
    moq?: string;
    flipkartSerialNumber?: string;
    amazonSerialNumber?: string;
    existsOnSellerPage?: boolean;
  };
  competitionAnalysis?: {
    competitorName: string;
    competitorPrice: string;
    ourPrice: number;
    visibility: string;
    existsOnSellerPage: boolean;
    totalSellers: number;
  };
  existsOnSellerPage?: boolean;
}
