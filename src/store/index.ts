import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { productsReducer } from './slices/productsSlice';
import { ordersReducer } from './slices/ordersSlice';
import { transactionsReducer } from './slices/transactionsSlice';
import { authReducer } from './slices/authSlice';
import { pdfMergerReducer } from './slices/pdfMergerSlice';
import orderHistoryReducer from './slices/orderHistorySlice';
import categoriesReducer from './slices/categoriesSlice';
import orderAnalyticsReducer from './slices/orderAnalyticsSlice';
import allOrdersForAnalyticsReducer from './slices/allOrdersForAnalyticsSlice';

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: [], // Temporarily disable all persistence
  blacklist: ['auth', 'pdfMerger', 'products', 'orders', 'transactions', 'orderHistory', 'orderAnalytics', 'allOrdersForAnalytics'], // Don't persist these reducers
};

const rootReducer = combineReducers({
  products: productsReducer,
  orders: ordersReducer,
  transactions: transactionsReducer,
  auth: authReducer,
  pdfMerger: pdfMergerReducer,
  orderHistory: orderHistoryReducer,
  categories: categoriesReducer,
  orderAnalytics: orderAnalyticsReducer,
  allOrdersForAnalytics: allOrdersForAnalyticsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable for Firebase Timestamp objects
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export * from './hooks'; 