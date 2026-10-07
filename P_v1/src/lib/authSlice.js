import { createSlice } from '@reduxjs/toolkit';

// L'état initial
const initialState = {
  isAuthenticated: {
    admin:[],
    autres:[],
    authen:""
  },
  user: 0,
  loading: false,
  error: null,
};

// Création du slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state,action) => {
      
      state.user = action.payload;
    },
    clearUser: () => initialState,
    utilisateur:(state,action)=>{
      if(action.payload.admin==="admin"){
        state.isAuthenticated.admin.push(action.payload)
        state.isAuthenticated.authen=action.payload

      }
      else{
        state.isAuthenticated.autres.push(action.payload)
        state.isAuthenticated.authen=action.payload
      }
    }
  },
});

// Export des actions
export const { loginStart, utilisateur, clearUser } = authSlice.actions;

// Export du reducer pour l'utiliser dans le store
export default authSlice.reducer;
