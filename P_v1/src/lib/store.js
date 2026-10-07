import { configureStore } from '@reduxjs/toolkit';
import authSlice from './authSlice'; // Importer ton slice

const store = configureStore({
  reducer: {
    auth: authSlice, // Ajouter ton slice ici
  },
});

export default store;
