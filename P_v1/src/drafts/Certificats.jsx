import React, { useState } from "react";
import { DotsVerticalIcon, DocumentTextIcon, DownloadIcon } from '@heroicons/react/outline';

const CertificatsEtCourriers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(null);
  
  // Liste des certificats
  const certificats = [
    { id: 1, nom: "Attestation de consultation", fichier: "Attestation_de_consultation.docx" },
    { id: 2, nom: "Coups et blessures", fichier: "Certificat_coups_et_blessures.docx" },
    { id: 3, nom: "Arrêt de travail", fichier: "Arret_de_travail.docx" },
    { id: 4, nom: "Inaptitude activité physique", fichier: "Inaptitude_activite_physique.docx" },
    { id: 5, nom: "De bonne santé", fichier: "De_bonne_sante.docx" },
    { id: 6, nom: "Congé de maternité certificat médical", fichier: "Conge_de_maternite_certificat_medical.docx" },
    { id: 7, nom: "Post natal", fichier: "Certificat_medical_post_natal.docx" },
    { id: 8, nom: "Certificat Enfant malade", fichier: "Certificat_medical_enfant_malade.docx" },
  ];

  // Filtrer les certificats en fonction du terme de recherche
  const filteredCertificats = searchTerm 
    ? certificats.filter(cert => cert.nom.toLowerCase().includes(searchTerm.toLowerCase()))
    : certificats;

  // Gérer l'ouverture du menu d'actions
  const toggleDropdown = (id) => {
    setDropdownOpen(dropdownOpen === id ? null : id);
  };

  // Télécharger un certificat
  const downloadCertificat = (fichier) => {
    // Logique de téléchargement à implémenter
    console.log(`Téléchargement de ${fichier}`);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center text-gray-600">
          <span className="text-gray-400">Clinic</span>
          <span className="mx-2">/</span>
          <span className="font-medium text-gray-700">Certificat et courrier</span>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-md shadow-sm overflow-hidden">
          <div className="p-6">
            <h1 className="text-xl font-medium text-gray-800 mb-6">La liste des certificats et courriers</h1>
            
            {/* Barre de recherche */}
            <div className="flex items-center mb-6">
              <div className="w-64">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Rechercher..."
                />
              </div>
              <button
                type="button"
                className="ml-4 mt-5 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Filtrer
              </button>
            </div>
            
            {/* Tableau des certificats */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fichier
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCertificats.map((certificat) => (
                    <tr key={certificat.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                        {certificat.nom}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                          {certificat.fichier}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 relative">
                        <button
                          onClick={() => toggleDropdown(certificat.id)}
                          className="text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          <DotsVerticalIcon className="h-5 w-5" />
                        </button>
                        
                        {dropdownOpen === certificat.id && (
                          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1" role="menu" aria-orientation="vertical">
                              <button
                                onClick={() => downloadCertificat(certificat.fichier)}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                role="menuitem"
                              >
                                <DownloadIcon className="mr-3 h-5 w-5 text-gray-500" />
                                Télécharger
                              </button>
                              <button
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                role="menuitem"
                              >
                                <svg className="mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Modifier
                              </button>
                              <button
                                className="flex items-center px-4 py-2 text-sm text-red-700 hover:bg-gray-100 w-full text-left"
                                role="menuitem"
                              >
                                <svg className="mr-3 h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Supprimer
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificatsEtCourriers;