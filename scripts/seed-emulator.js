#!/usr/bin/env node
/* eslint-disable no-undef */
import { format } from "date-fns";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  doc,
  getFirestore,
  setDoc,
  Timestamp,
} from "firebase/firestore";
dotenv.config({
  path: ".env.local",
});

// Firebase configuration for emulator
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain:
    process.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket:
    process.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId:
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Connect to emulators
try {
  const authEmulatorUrl = `http://${process.env.VITE_FIREBASE_AUTH_EMULATOR_HOST}:${process.env.VITE_FIREBASE_AUTH_EMULATOR_PORT}`;
  connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
  connectFirestoreEmulator(
    db,
    process.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST,
    process.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT
  );
  console.log("🔥 Connected to Firebase emulators");
} catch (error) {
  console.warn(
    "⚠️  Emulators already connected or connection failed:",
    error.message
  );
}

// Demo user credentials
const DEMO_USER = {
  email: "demo@sacredsutra.com",
  password: "demo123456",
  displayName: "Demo User",
  role: "admin",
}; // Category Groups seed data
const CATEGORY_GROUPS_SEED_DATA = [
  {
    id: "tech-group",
    name: "Technology Products",
    description: "All technology and electronic items",
    color: "#2196F3",
    currentInventory: 100,
    inventoryUnit: "pcs",
    inventoryType: "qty",
    minimumThreshold: 10,
    lastInventoryUpdate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "lifestyle-group", 
    name: "Lifestyle Products",
    description: "Books, clothing and lifestyle items",
    color: "#4CAF50",
    currentInventory: 50,
    inventoryUnit: "pcs", 
    inventoryType: "qty",
    minimumThreshold: 5,
    lastInventoryUpdate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Seed data
const CATEGORIES_SEED_DATA = [
  {
    id: "electronics",
    name: "Electronics",
    description: "Electronic devices and gadgets",
    tag: "tech",
    categoryGroupId: "tech-group",
    inventoryUnit: "pcs",
    inventoryDeductionQuantity: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "books",
    name: "Books", 
    description: "Books and literature",
    tag: "education",
    categoryGroupId: "lifestyle-group",
    inventoryUnit: "pcs",
    inventoryDeductionQuantity: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "clothing",
    name: "Clothing",
    description: "Apparel and fashion items", 
    tag: "fashion",
    categoryGroupId: "lifestyle-group",
    inventoryUnit: "pcs", 
    inventoryDeductionQuantity: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const PRODUCTS_SEED_DATA = [
  {
    sku: "SPM-001",
    name: "Smartphone Pro Max",
    description: "Latest smartphone with advanced features",
    costPrice: 35000,
    platform: "amazon",
    visibility: "visible",
    sellingPrice: 42000,
    categoryId: "electronics",
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      listingStatus: "active",
      moq: "1",
      amazonSerialNumber: "B123456789",
      existsOnSellerPage: true,
    },
    existsOnSellerPage: true,
  },
  {
    sku: "NOV-001",
    name: "The Great Adventure",
    description: "An exciting adventure novel",
    costPrice: 250,
    platform: "flipkart",
    visibility: "visible",
    sellingPrice: 380,
    categoryId: "books",
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      listingStatus: "active",
      moq: "1",
      flipkartSerialNumber: "FK123456789",
      existsOnSellerPage: true,
    },
    existsOnSellerPage: true,
  },
  {
    sku: "LAP-001",
    name: "Gaming Laptop Ultra",
    description: "High-performance gaming laptop",
    costPrice: 65000,
    platform: "amazon",
    visibility: "visible",
    sellingPrice: 80000,
    categoryId: "electronics",
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      listingStatus: "active",
      moq: "1",
      amazonSerialNumber: "B987654321",
      existsOnSellerPage: true,
    },
    existsOnSellerPage: true,
  },
  {
    sku: "TSHIRT-001",
    name: "Premium Cotton T-Shirt",
    description: "Comfortable premium cotton t-shirt",
    costPrice: 400,
    platform: "flipkart",
    visibility: "visible",
    sellingPrice: 650,
    categoryId: "clothing",
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      listingStatus: "active",
      moq: "1",
      flipkartSerialNumber: "FK987654321",
      existsOnSellerPage: true,
    },
    existsOnSellerPage: true,
  },
]; // Seeding functions
async function createDemoUser() {
  try {
    console.log("👤 Creating demo user...");
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      DEMO_USER.email,
      DEMO_USER.password
    );

    // Add user document to Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: DEMO_USER.email,
      displayName: DEMO_USER.displayName,
      role: DEMO_USER.role,
      createdAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
      isActive: true,
    });

    console.log("✅ Demo user created successfully");
    return userCredential.user;
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      console.log("✅ Demo user already exists");
      return null;
    }
    console.error("❌ Error creating demo user:", error);
    throw error;
  }
}

async function seedCategoryGroups() {
  try {
    console.log("🏷️ Seeding category groups...");

    for (const group of CATEGORY_GROUPS_SEED_DATA) {
      const groupData = {
        ...group,
        lastInventoryUpdate: Timestamp.fromDate(group.lastInventoryUpdate),
        createdAt: Timestamp.fromDate(group.createdAt),
        updatedAt: Timestamp.fromDate(group.updatedAt),
      };

      await setDoc(doc(db, "categoryGroups", group.id), groupData);
    }

    console.log(`✅ Seeded ${CATEGORY_GROUPS_SEED_DATA.length} category groups`);
  } catch (error) {
    console.error("❌ Error seeding category groups:", error);
    throw error;
  }
}

async function seedCategories() {
  try {
    console.log("📦 Seeding categories...");

    for (const category of CATEGORIES_SEED_DATA) {
      const categoryData = {
        ...category,
        createdAt: Timestamp.fromDate(category.createdAt),
        updatedAt: Timestamp.fromDate(category.updatedAt),
      };

      await setDoc(doc(db, "categories", category.id), categoryData);
    }

    console.log(`✅ Seeded ${CATEGORIES_SEED_DATA.length} categories`);
  } catch (error) {
    console.error("❌ Error seeding categories:", error);
    throw error;
  }
}

async function seedProducts() {
  try {
    console.log("🛍️ Seeding products...");

    for (const product of PRODUCTS_SEED_DATA) {
      const productData = {
        ...product,
        metadata: {
          ...product.metadata,
          createdAt: Timestamp.fromDate(product.metadata.createdAt),
          updatedAt: Timestamp.fromDate(product.metadata.updatedAt),
        },
      };

      await setDoc(doc(db, "products", product.sku), productData);
    }

    console.log(`✅ Seeded ${PRODUCTS_SEED_DATA.length} products`);
  } catch (error) {
    console.error("❌ Error seeding products:", error);
    throw error;
  }
} // Orders seed data
const ORDERS_SEED_DATA = [
  {
    id: "order-001",
    orderNumber: "ORD-2025-001",
    customerName: "John Doe",
    items: [
      { sku: "SPM-001", name: "Smartphone Pro Max", quantity: 1, price: 42000 },
    ],
    totalAmount: 42000,
    status: "completed",
    platform: "flipkart",
    orderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: "order-002",
    orderNumber: "ORD-2025-002",
    customerName: "Jane Smith",
    items: [
      { sku: "NOV-001", name: "The Great Adventure", quantity: 2, price: 380 },
    ],
    totalAmount: 760,
    status: "completed",
    platform: "amazon",
    orderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
];

// Active orders seed data
const ACTIVE_ORDERS_SEED_DATA = [{
  id: format(new Date(), "yyyy-MM-dd"),
  date: format(new Date(), "yyyy-MM-dd"),
  createdAt: new Date(),
  orderDate: new Date(),
  orders: [
    {
      SKU: "TSHIRT-001",
      type: "flipkart",
      quantity: 2,
      product: null, // Will be populated by the service
    },
  ],
}];

async function seedOrders() {
  try {
    console.log("📋 Seeding orders...");
    for (const order of ORDERS_SEED_DATA) {
      await setDoc(doc(db, "orders", order.id), {
        ...order,
        orderDate: Timestamp.fromDate(order.orderDate),
        createdAt: Timestamp.fromDate(order.createdAt),
      });
    }
    console.log(`✅ Seeded ${ORDERS_SEED_DATA.length} orders`);
  } catch (error) {
    console.error("❌ Error seeding orders:", error);
  }
}

async function seedActiveOrders() {
  try {
    console.log("⚡ Seeding active orders...");
    for (const order of ACTIVE_ORDERS_SEED_DATA) {
      const orderData = {
        ...order,
        orderDate: Timestamp.fromDate(order.orderDate),
        createdAt: Timestamp.fromDate(order.createdAt)
      };
      await setDoc(doc(db, "activeOrders", order.id), orderData);
    }
    console.log(`✅ Seeded ${ACTIVE_ORDERS_SEED_DATA.length} active orders`);
  } catch (error) {
    console.error("❌ Error seeding active orders:", error);
  }
}

// Main seeding function
async function seedEmulatorData() {
  try {
    console.log("🌱 Starting Firebase emulator seeding...");

    // Create demo user first
    const user = await createDemoUser();

    // If user was created, sign in to get authentication context
    if (user || DEMO_USER.email) {
      try {
        console.log("🔐 Signing in for seeding operations...");
        await auth.signInWithEmailAndPassword(
          DEMO_USER.email,
          DEMO_USER.password
        );
        console.log("✅ Authenticated for seeding");
      } catch {
        console.log("ℹ️  Using existing authentication context");
      }
    }

    // Seed category groups first
    await seedCategoryGroups();

    // Seed categories  
    await seedCategories();

    // Seed products
    await seedProducts();

    // Seed orders
    await seedOrders();

    // Seed active orders
    await seedActiveOrders();

    console.log("🎉 Firebase emulator seeding completed successfully!");
    console.log(`📧 Demo User: ${DEMO_USER.email}`);
    console.log(`🔑 Password: ${DEMO_USER.password}`);
    console.log(`🏷️ Category Groups: ${CATEGORY_GROUPS_SEED_DATA.length}`);
    console.log(`📦 Categories: ${CATEGORIES_SEED_DATA.length}`);
    console.log(`🛍️ Products: ${PRODUCTS_SEED_DATA.length}`);
    console.log(`📋 Orders: ${ORDERS_SEED_DATA.length}`);
    console.log(`⚡ Active Orders: ${ACTIVE_ORDERS_SEED_DATA.length}`);
    console.log("🔥 Emulator UI: http://localhost:4000");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run seeding when script is executed directly
// Check if this script is being run directly (not imported)
if (process.argv[1].includes("seed-emulator.js")) {
  seedEmulatorData();
}

export { DEMO_USER, seedEmulatorData };
