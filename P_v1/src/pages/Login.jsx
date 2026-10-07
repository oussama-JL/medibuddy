import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux"; 
import { loginStart, utilisateur } from "../lib/authSlice";
import { api } from '../lib/api';
import { setToken } from '../lib/auth';
export default function Login() {
  const [formlogin, setFormLogin] = useState({
    login: '',
    password: ''
  });
  const dispatch=useDispatch()
  const [isLoading, setIsLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

  
    api('/login', {
      method: "POST", // Utilisation de POST pour une insertion
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(formlogin), // Envoie de `formlogin`
    })
      .then((response) => response.json())
      .then((data) => {
        if ((data.valeur === 1 || data.valeur === 2) && data.token) {
          setToken(data.token);
        }
        if (data.valeur === 1) {
          dispatch(loginStart(data.valeur))
          dispatch(utilisateur(data.utili))
          navigate("/app");
        } else if (data.valeur === 2) {
          dispatch(loginStart(data.valeur))
          dispatch(utilisateur(data.utili))
          navigate("/app");
        } else {
          setErreur("Nom d'utilisateur ou mot de passe incorrect");
        }
      })
      .catch((err) => {
        setErreur("Erreur de connexion avec le serveur");
        console.error("Erreur:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div 
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 p-4"
    >
      {/* original decoration: blurred shapes and a faint medical-cross pattern (no stock photo) */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-400/30 blur-3xl"></div>
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-20 h-[28rem] w-[28rem] rounded-full bg-purple-400/30 blur-3xl"></div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'%3E%3Cpath d='M32 22h8v10h10v8H40v10h-8V40H22v-8h10z' fill='white'/%3E%3C/svg%3E\")",
          backgroundSize: '72px 72px',
        }}
      ></div>
      <div className="relative z-10 w-full max-w-sm rounded-lg bg-white/95 p-8 text-center shadow-2xl backdrop-blur-sm">
        <h2 className="text-gray-800 text-2xl font-bold mb-6">Bienvenue</h2>
        
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Champ Login */}
          <div className="relative">
            <input
              type="text"
              name="login" 
              className="w-full px-4 py-3 border-b-2 border-gray-200 focus:border-blue-500 transition-colors focus:outline-none rounded-t-md bg-white/80"
              placeholder="Nom d'utilisateur"
              value={formlogin.login} 
              onChange={(e) => setFormLogin({ ...formlogin, [e.target.name]: e.target.value })} 
              required
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute right-3 top-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          
          {/* Champ Mot de passe */}
          <div className="relative">
            <input
              type="password"
              name="password" // Utilisation du nom pour faciliter la gestion de l'état
              className="w-full px-4 py-3 border-b-2 border-gray-200 focus:border-blue-500 transition-colors focus:outline-none rounded-t-md bg-white/80"
              placeholder="Mot de passe"
              value={formlogin.password} // Utilisation de l'état
              onChange={(e) => setFormLogin({ ...formlogin, [e.target.name]: e.target.value })} // Mise à jour de l'état
              required
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute right-3 top-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          
          {/* Bouton de soumission */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium shadow-md hover:shadow-lg transition duration-300 flex items-center justify-center"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : null}
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        
        {erreur && <div className="text-red-500 mt-4">{erreur}</div>}

        
      </div>
    </div>
  );
}
