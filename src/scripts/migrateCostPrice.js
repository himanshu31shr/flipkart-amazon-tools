import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, where, query } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import process from 'process';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firebase with config from environment variables
const firebaseConfig = {
  projectId: 'sacred-sutra',
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function authenticate() {
  const email = process.env.VITE_FIREBASE_ADMIN_EMAIL;
  const password = process.env.VITE_FIREBASE_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Admin credentials not found in environment variables');
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}

async function migrateCostPrices() {
  try {
    // Authenticate first
    await authenticate();

    // Get all categories
    const categoriesRef = collection(db, 'categories');
    const categoriesSnap = await getDocs(categoriesRef);
    const categories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get all products
    const productsRef = collection(db, 'products');
    const productsSnap = await getDocs(productsRef);
    const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Group products by category
    const productsByCategory = products.reduce((acc, product) => {
      if (product.categoryId) {
        if (!acc[product.categoryId]) {
          acc[product.categoryId] = [];
        }
        acc[product.categoryId].push(product);
      }
      return acc;
    }, {});

    // Process each category
    for (const category of categories) {
      const categoryProducts = productsByCategory[category.id] || [];
      if (categoryProducts.length === 0) {
        continue;
      }

      // Calculate average cost price from products
      const validCostPrices = categoryProducts
        .map(p => p.customCostPrice)
        .filter(price => 
          price !== null && 
          price !== undefined && 
          !isNaN(price) &&
          typeof price === 'number'
        );

      if (validCostPrices.length > 0) {
        const avgCostPrice = validCostPrices.reduce((a, b) => a + b) / validCostPrices.length;
        
        // Update category with average cost price
        const categoryRef = doc(db, 'categories', category.id);
        await updateDoc(categoryRef, { costPrice: avgCostPrice });

        // Update products to use null cost price (inherit from category)
        await Promise.all(
          categoryProducts.map(product => {
            const productRef = doc(db, 'products', product.id);
            return updateDoc(productRef, { customCostPrice: null });
          })
        );
      }
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

async function rollbackMigration() {
  try {
    // Authenticate first
    await authenticate();

    // Get all categories with cost price
    const categoriesRef = collection(db, 'categories');
    const categoriesWithCostQuery = query(categoriesRef, where('costPrice', '!=', null));
    const categoriesSnap = await getDocs(categoriesWithCostQuery);
    const categories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Process each category
    for (const category of categories) {
      // Remove cost price from category
      const categoryRef = doc(db, 'categories', category.id);
      await updateDoc(categoryRef, { costPrice: null });

      // Get all products in this category
      const productsRef = collection(db, 'products');
      const categoryProductsQuery = query(productsRef, where('categoryId', '==', category.id));
      const productsSnap = await getDocs(categoryProductsQuery);
      const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Restore original cost prices to products
      await Promise.all(
        products.map(product => {
          const productRef = doc(db, 'products', product.id);
          return updateDoc(productRef, { customCostPrice: product.customCostPrice || 0 });
        })
      );
    }
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'rollback') {
      await rollbackMigration();
    } else {
      await migrateCostPrices();
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main(); 