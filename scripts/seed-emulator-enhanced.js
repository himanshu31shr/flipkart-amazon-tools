#!/usr/bin/env node
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  getFirestore, 
  connectFirestoreEmulator, 
  collection, 
  doc, 
  setDoc, 
  addDoc,
  Timestamp 
} from 'firebase/firestore';

// Firebase configuration for emulator
const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-project.firebaseapp.com',
  projectId: 'demo-project',
  storageBucket: 'demo-project.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef123456',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Connect to emulators
try {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  console.log('🔥 Connected to Firebase emulators');
} catch (error) {
  console.warn('⚠️  Emulators already connected or connection failed:', error.message);
}

// Demo user credentials
const DEMO_USER = {
  email: 'demo@sacredsutra.com',
  password: 'demo123456',
  displayName: 'Demo User',
  role: 'admin'
};// Enhanced seed data
const CATEGORIES_SEED_DATA = [
  {
    id: 'electronics',
    name: 'Electronics',
    description: 'Electronic devices and gadgets',
    tags: ['tech', 'gadgets', 'devices'],
    totalQuantity: 150,
    lowStockThreshold: 20,
    productCount: 3,
    lastUpdated: new Date(),
    isActive: true
  },
  {
    id: 'books',
    name: 'Books',
    description: 'Books and literature',
    tags: ['reading', 'education', 'literature'],
    totalQuantity: 200,
    lowStockThreshold: 30,
    productCount: 3,
    lastUpdated: new Date(),
    isActive: true
  },
  {
    id: 'clothing',
    name: 'Clothing',
    description: 'Apparel and fashion items',
    tags: ['fashion', 'apparel', 'style'],
    totalQuantity: 100,
    lowStockThreshold: 25,
    productCount: 2,
    lastUpdated: new Date(),
    isActive: true
  }
];

const PRODUCTS_SEED_DATA = [
  // Electronics
  {
    id: 'smartphone-001',
    name: 'Smartphone Pro Max',
    categoryId: 'electronics',
    description: 'Latest smartphone with advanced features',
    tags: ['mobile', 'communication', 'tech'],
    flipkartPrice: 45000,
    amazonPrice: 44500,
    costPrice: 35000,
    suggestedSellingPrice: 42000,
    isActive: true,
    isHidden: false,
    sku: 'SPM-001',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'laptop-001',
    name: 'Gaming Laptop Ultra',
    categoryId: 'electronics',
    description: 'High-performance gaming laptop',
    tags: ['laptop', 'gaming', 'computer'],
    flipkartPrice: 85000,
    amazonPrice: 83000,
    costPrice: 65000,
    suggestedSellingPrice: 80000,
    isActive: true,
    isHidden: false,
    sku: 'LAP-001',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'headphones-001',
    name: 'Wireless Headphones Pro',
    categoryId: 'electronics',
    description: 'Premium noise-cancelling headphones',
    tags: ['audio', 'wireless', 'music'],
    flipkartPrice: 15000,
    amazonPrice: 14500,
    costPrice: 10000,
    suggestedSellingPrice: 13500,
    isActive: true,
    isHidden: false,
    sku: 'HEAD-001',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Books
  {
    id: 'novel-001',
    name: 'The Great Adventure',
    categoryId: 'books',
    description: 'An exciting adventure novel',
    tags: ['fiction', 'adventure', 'bestseller'],
    flipkartPrice: 450,
    amazonPrice: 420,
    costPrice: 250,
    suggestedSellingPrice: 380,
    isActive: true,
    isHidden: false,
    sku: 'NOV-001',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'textbook-001',
    name: 'Advanced Mathematics',
    categoryId: 'books',
    description: 'Comprehensive mathematics textbook',
    tags: ['education', 'mathematics', 'textbook'],
    flipkartPrice: 1200,
    amazonPrice: 1150,
    costPrice: 800,
    suggestedSellingPrice: 1100,
    isActive: true,
    isHidden: false,
    sku: 'TEXT-001',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'cookbook-001',
    name: 'Master Chef Recipes',
    categoryId: 'books',
    description: 'Professional cooking recipes and techniques',
    tags: ['cooking', 'recipes', 'food'],
    flipkartPrice: 800,
    amazonPrice: 750,
    costPrice: 500,
    suggestedSellingPrice: 720,
    isActive: true,
    isHidden: false,
    sku: 'COOK-001',
    createdAt: new Date(),
    updatedAt: new Date()
  }  // Clothing
  {
    id: 'tshirt-001',
    name: 'Premium Cotton T-Shirt',
    categoryId: 'clothing',
    description: 'Comfortable premium cotton t-shirt',
    tags: ['casual', 'cotton', 'comfortable'],
    flipkartPrice: 800,
    amazonPrice: 750,
    costPrice: 400,
    suggestedSellingPrice: 650,
    isActive: true,
    isHidden: false,
    sku: 'TSHIRT-001',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'jeans-001',
    name: 'Designer Denim Jeans',
    categoryId: 'clothing',
    description: 'Stylish designer denim jeans',
    tags: ['denim', 'fashion', 'casual'],
    flipkartPrice: 2500,
    amazonPrice: 2300,
    costPrice: 1500,
    suggestedSellingPrice: 2200,
    isActive: true,
    isHidden: false,
    sku: 'JEANS-001',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Orders seed data
const ORDERS_SEED_DATA = [
  {
    id: 'order-001',
    orderNumber: 'ORD-2025-001',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    items: [
      { sku: 'SPM-001', name: 'Smartphone Pro Max', quantity: 1, price: 42000 },
      { sku: 'HEAD-001', name: 'Wireless Headphones Pro', quantity: 1, price: 13500 }
    ],
    totalAmount: 55500,
    status: 'completed',
    platform: 'flipkart',
    orderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    deliveryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'order-002',
    orderNumber: 'ORD-2025-002',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    items: [
      { sku: 'NOV-001', name: 'The Great Adventure', quantity: 2, price: 380 },
      { sku: 'COOK-001', name: 'Master Chef Recipes', quantity: 1, price: 720 }
    ],
    totalAmount: 1480,
    status: 'completed',
    platform: 'amazon',
    orderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    deliveryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  }  {
    id: 'order-003',
    orderNumber: 'ORD-2025-003',
    customerName: 'Mike Johnson',
    customerEmail: 'mike@example.com',
    items: [
      { sku: 'LAP-001', name: 'Gaming Laptop Ultra', quantity: 1, price: 80000 }
    ],
    totalAmount: 80000,
    status: 'processing',
    platform: 'flipkart',
    orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    deliveryDate: null,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  }
];

// Active orders (today's orders)
const ACTIVE_ORDERS_SEED_DATA = [
  {
    id: 'active-001',
    orderNumber: 'ORD-2025-004',
    customerName: 'Sarah Wilson',
    customerEmail: 'sarah@example.com',
    sku: 'TSHIRT-001',
    name: 'Premium Cotton T-Shirt',
    quantity: 3,
    platform: 'amazon',
    status: 'pending',
    orderDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'active-002',
    orderNumber: 'ORD-2025-005',
    customerName: 'David Brown',
    customerEmail: 'david@example.com',
    sku: 'TEXT-001',
    name: 'Advanced Mathematics',
    quantity: 1,
    platform: 'flipkart',
    status: 'confirmed',
    orderDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Transactions seed data
const TRANSACTIONS_SEED_DATA = [
  {
    id: 'txn-001',
    transactionId: 'TXN-2025-001',
    orderId: 'order-001',
    amount: 55500,
    type: 'sale',
    platform: 'flipkart',
    status: 'completed',
    paymentMethod: 'upi',
    transactionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'txn-002',
    transactionId: 'TXN-2025-002',
    orderId: 'order-002',
    amount: 1480,
    type: 'sale',
    platform: 'amazon',
    status: 'completed',
    paymentMethod: 'card',
    transactionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  }
];// Seeding functions
async function createDemoUser() {
  try {
    console.log('👤 Creating demo user...');
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      DEMO_USER.email, 
      DEMO_USER.password
    );
    
    // Add user document to Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: DEMO_USER.email,
      displayName: DEMO_USER.displayName,
      role: DEMO_USER.role,
      createdAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
      isActive: true
    });
    
    console.log('✅ Demo user created successfully');
    return userCredential.user;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('✅ Demo user already exists');
      return null;
    }
    console.error('❌ Error creating demo user:', error);
    throw error;
  }
}

async function seedCategories() {
  try {
    console.log('📦 Seeding categories...');
    
    for (const category of CATEGORIES_SEED_DATA) {
      await setDoc(doc(db, 'categories', category.id), {
        ...category,
        lastUpdated: Timestamp.fromDate(category.lastUpdated)
      });
    }
    
    console.log(`✅ Seeded ${CATEGORIES_SEED_DATA.length} categories`);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  }
}

async function seedProducts() {
  try {
    console.log('🛍️ Seeding products...');
    
    for (const product of PRODUCTS_SEED_DATA) {
      await setDoc(doc(db, 'products', product.id), {
        ...product,
        createdAt: Timestamp.fromDate(product.createdAt),
        updatedAt: Timestamp.fromDate(product.updatedAt)
      });
    }
    
    console.log(`✅ Seeded ${PRODUCTS_SEED_DATA.length} products`);
  } catch (error) {
    console.error('❌ Error seeding products:', error);
    throw error;
  }
}async function seedOrders() {
  try {
    console.log('📋 Seeding orders...');
    
    for (const order of ORDERS_SEED_DATA) {
      await setDoc(doc(db, 'orders', order.id), {
        ...order,
        orderDate: Timestamp.fromDate(order.orderDate),
        deliveryDate: order.deliveryDate ? Timestamp.fromDate(order.deliveryDate) : null,
        createdAt: Timestamp.fromDate(order.createdAt),
        updatedAt: Timestamp.fromDate(order.updatedAt)
      });
    }
    
    console.log(`✅ Seeded ${ORDERS_SEED_DATA.length} orders`);
  } catch (error) {
    console.error('❌ Error seeding orders:', error);
    throw error;
  }
}

async function seedActiveOrders() {
  try {
    console.log('📋 Seeding active orders...');
    
    for (const order of ACTIVE_ORDERS_SEED_DATA) {
      await setDoc(doc(db, 'activeOrders', order.id), {
        ...order,
        orderDate: Timestamp.fromDate(order.orderDate),
        createdAt: Timestamp.fromDate(order.createdAt),
        updatedAt: Timestamp.fromDate(order.updatedAt)
      });
    }
    
    console.log(`✅ Seeded ${ACTIVE_ORDERS_SEED_DATA.length} active orders`);
  } catch (error) {
    console.error('❌ Error seeding active orders:', error);
    throw error;
  }
}

async function seedTransactions() {
  try {
    console.log('💳 Seeding transactions...');
    
    for (const transaction of TRANSACTIONS_SEED_DATA) {
      await setDoc(doc(db, 'transactions', transaction.id), {
        ...transaction,
        transactionDate: Timestamp.fromDate(transaction.transactionDate),
        createdAt: Timestamp.fromDate(transaction.createdAt),
        updatedAt: Timestamp.fromDate(transaction.updatedAt)
      });
    }
    
    console.log(`✅ Seeded ${TRANSACTIONS_SEED_DATA.length} transactions`);
  } catch (error) {
    console.error('❌ Error seeding transactions:', error);
    throw error;
  }
}// Main seeding function
async function seedEmulatorData() {
  try {
    console.log('🌱 Starting enhanced Firebase emulator seeding...');
    
    // Create demo user
    await createDemoUser();
    
    // Seed categories
    await seedCategories();
    
    // Seed products
    await seedProducts();
    
    // Seed orders
    await seedOrders();
    
    // Seed active orders
    await seedActiveOrders();
    
    // Seed transactions
    await seedTransactions();
    
    console.log('🎉 Enhanced Firebase emulator seeding completed successfully!');
    console.log('');
    console.log('📊 Seeded Data Summary:');
    console.log(`📧 Demo User: ${DEMO_USER.email}`);
    console.log(`🔑 Password: ${DEMO_USER.password}`);
    console.log(`📦 Categories: ${CATEGORIES_SEED_DATA.length}`);
    console.log(`🛍️ Products: ${PRODUCTS_SEED_DATA.length}`);
    console.log(`📋 Orders: ${ORDERS_SEED_DATA.length}`);
    console.log(`⚡ Active Orders: ${ACTIVE_ORDERS_SEED_DATA.length}`);
    console.log(`💳 Transactions: ${TRANSACTIONS_SEED_DATA.length}`);
    console.log('');
    console.log('🔥 Emulator UI: http://localhost:4000');
    console.log('🌐 App URL: http://localhost:5173/');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Enhanced seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding when script is executed directly
if (process.argv[1].includes('seed-emulator-enhanced.js')) {
  seedEmulatorData();
}

export { seedEmulatorData, DEMO_USER };