import React, { useState, useEffect, useRef } from 'react';

const Grossesse = () => {
  const [filterText, setFilterText] = useState('');
  const [allRows, setAllRows] = useState([
    { id: 1, name: 'John Doe', ddr: '2023-10-01', status: 'Active' },
    { id: 2, name: 'Jane Smith', ddr: '2023-09-15', status: 'Inactive' },
    { id: 3, name: 'Alice Johnson', ddr: '2023-08-20', status: 'Active' },
    // Add more rows as needed
  ]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    patient: '',
    ddr: '',
    status: '',
    note: '',
  });

  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAddGrossesse = () => {
    setShowForm(true);
    setFormData({ id: null, patient: '', ddr: '', status: '', note: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSave = () => {
    if (formData.id !== null) {
      // Update existing row
      const updatedRows = allRows.map((row) =>
        row.id === formData.id
          ? {
              ...row,
              name: formData.patient,
              ddr: formData.ddr,
              status: formData.status,
              note: formData.note,
            }
          : row
      );
      setAllRows(updatedRows);
    } else {
      // Add new row
      const newRow = {
        id: allRows.length + 1,
        name: formData.patient,
        ddr: formData.ddr,
        status: formData.status,
        note: formData.note,
      };
      setAllRows([...allRows, newRow]);
    }
    setShowForm(false);
    setFormData({ id: null, patient: '', ddr: '', status: '', note: '' });
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({ id: null, patient: '', ddr: '', status: '', note: '' });
  };

  const handleDelete = (id) => {
    const updatedRows = allRows.filter((row) => row.id !== id);
    setAllRows(updatedRows);
  };

  const handleEdit = (row) => {
    setFormData({
      id: row.id,
      patient: row.name,
      ddr: row.ddr,
      status: row.status,
      note: row.note || '',
    });
    setShowForm(true);
  };

  const toggleDropdown = (id) => {
    setOpenDropdownId(openDropdownId === id ? null : id);
  };

  const filteredRows = allRows.filter((row) =>
    row.name.toLowerCase().includes(filterText.toLowerCase())
  );

  // Status badge component
  const StatusBadge = ({ status }) => {
    let badgeClasses = "px-2 py-1 rounded-full text-xs font-medium";
    
    switch(status.toLowerCase()) {
      case 'active':
        badgeClasses += " bg-green-100 text-green-800";
        break;
      case 'inactive':
        badgeClasses += " bg-red-100 text-red-800";
        break;
      default:
        badgeClasses += " bg-gray-100 text-gray-800";
    }
    
    return <span className={badgeClasses}>{status}</span>;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg relative">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
        <span className="bg-blue-100 text-blue-700 p-2 rounded-lg mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </span>
        Suivi de Grossesse
      </h2>

      {/* Filter and Add buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="relative w-full md:w-auto">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Filtrer par nom et prénom"
            className="pl-10 pr-4 py-2 w-full md:w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center w-full md:w-auto justify-center"
          onClick={handleAddGrossesse}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Ajouter Grossesse
        </button>
      </div>

      {/* Overlay and Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md mx-4 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {formData.id !== null ? 'Modifier un cas' : 'Ajouter un cas'}
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient*</label>
                <input
                  type="text"
                  name="patient"
                  value={formData.patient}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  placeholder="Nom et prénom du patient"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DDR*</label>
                <input
                  type="date"
                  name="ddr"
                  value={formData.ddr}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="">Sélectionner un statut</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  rows="3"
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  placeholder="Ajouter des notes supplémentaires ici..."
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center"
                  onClick={handleSave}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {formData.id !== null ? 'Modifier' : 'Enregistrer'}
                </button>
                <button
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center"
                  onClick={handleCancel}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredRows.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-gray-500">Aucun enregistrement trouvé</p>
          {filterText && (
            <button 
              className="mt-3 text-blue-600 hover:text-blue-800 transition-colors duration-200 font-medium"
              onClick={() => setFilterText('')}
            >
              Effacer le filtre
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {filteredRows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom et Prénom</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DDR</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-all duration-150">
                  <td className="py-3 px-4 text-sm font-medium text-gray-800">{row.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{row.ddr}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="py-3 px-4 relative">
                    <button
                      className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-full hover:bg-gray-100 transition-all duration-150"
                      onClick={() => toggleDropdown(row.id)}
                      aria-label="Options"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>

                    {/* Dropdown menu */}
                    {openDropdownId === row.id && (
                      <div
                        ref={dropdownRef}
                        className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10 border border-gray-200 py-1 overflow-hidden"
                      >
                        <button
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-150"
                          onClick={() => {
                            handleEdit(row);
                            setOpenDropdownId(null);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          Modifier
                        </button>
                        <button
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-all duration-150"
                          onClick={() => {
                            handleDelete(row.id);
                            setOpenDropdownId(null);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Supprimer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {filteredRows.length > 0 && (
        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <span>Affichage de {filteredRows.length} enregistrement{filteredRows.length > 1 ? 's' : ''}</span>
          <div className="flex items-center space-x-1">
            <button className="px-2 py-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-50" disabled>
              &laquo; Précédent
            </button>
            <button className="px-2 py-1 rounded bg-blue-600 text-white">1</button>
            <button className="px-2 py-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-50" disabled>
              Suivant &raquo;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Grossesse;