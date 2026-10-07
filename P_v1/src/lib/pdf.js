// PDF exports (radiology results and treatment plan). Both take a patient record.

export async function pdfRadiologie(patient) {
  if (!patient || !Array.isArray(patient.data) || patient.data.length === 0) return;
  // jsPDF is large: it is only downloaded when a PDF is really generated
  const { jsPDF } = await import("jspdf");
  const latestData = patient.data[patient.data.length - 1];
  
  // Définir des couleurs pour un design cohérent
  const couleurPrimaire = [41, 128, 185]; // Bleu professionnel
  const couleurSecondaire = [44, 62, 80]; // Gris foncé
  const couleurAccent = [26, 188, 156]; // Turquoise médical
  
  // Format de date actuelle
  const aujourdhui = new Date();
  const day = aujourdhui.getDate().toString().padStart(2, '0');
  const month = (aujourdhui.getMonth() + 1).toString().padStart(2, '0');
  const year = aujourdhui.getFullYear();
  
  // Créer le document PDF
  const doc = new jsPDF();
  
  // Ajouter un en-tête avec fond coloré
  doc.setFillColor(couleurPrimaire[0], couleurPrimaire[1], couleurPrimaire[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  // Titre et sous-titre
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text("Résultats Radiologiques", 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text("Clinique Médicale", 105, 30, { align: 'center' });
  
  // Bandeau latéral décoratif
  doc.setFillColor(couleurSecondaire[0], couleurSecondaire[1], couleurSecondaire[2]);
  doc.rect(0, 40, 15, 257, 'F');
  
  // Informations du patient dans un cadre
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(25, 50, 170, 40, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(couleurPrimaire[0], couleurPrimaire[1], couleurPrimaire[2]);
  doc.text("INFORMATION DU PATIENT", 35, 60);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(couleurSecondaire[0], couleurSecondaire[1], couleurSecondaire[2]);
  doc.setFontSize(10);
  
  // Disposition en deux colonnes pour les informations du patient
  doc.text(`Nom et prénom:`, 35, 70);
  doc.text(`${patient.nom} ${patient.prenom}`, 85, 70);
  
  doc.text(`Date d'examen:`, 35, 77);
  doc.text(`${latestData.date}`, 85, 77);
  
  doc.text(`Diagnostic:`, 35, 84);
  doc.text(`${latestData.diagnostique || 'Non spécifié'}`, 85, 84);
  
  // Section résultats avec barre d'accent
  doc.setFillColor(couleurAccent[0], couleurAccent[1], couleurAccent[2]);
  doc.rect(25, 100, 170, 7, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("RÉSULTATS DE L'EXAMEN RADIOLOGIQUE", 30, 105);
  
  // Contenu des résultats dans un cadre léger
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(25, 110, 170, 120, 3, 3, 'F');
  
  // Format et ajout des résultats radiologiques
  const examText = latestData.examen_radiologique || "Aucun résultat radiologique disponible";
  const textLines = doc.splitTextToSize(examText, 160);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(textLines, 30, 120);
  
  // Section situation clinique
  doc.setFillColor(couleurAccent[0], couleurAccent[1], couleurAccent[2]);
  doc.rect(25, 240, 170, 7, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("SITUATION CLINIQUE", 30, 245);
  
  // Contenu de la situation dans un cadre léger
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(25, 250, 170, 25, 3, 3, 'F');
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`${latestData.situation || 'Non spécifié'}`, 30, 260);
  
  // Footer avec ligne séparatrice
  doc.setDrawColor(couleurPrimaire[0], couleurPrimaire[1], couleurPrimaire[2]);
  doc.setLineWidth(0.5);
  doc.line(25, 280, 185, 280);
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Document généré le ${day}/${month}/${year}`, 105, 285, { align: 'center' });
  doc.text("Clinique Médicale - Tous droits réservés", 105, 290, { align: 'center' });
  
  // Ajout d'un QR code (factice) pour la vérification numérique
  doc.addImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==", "PNG", 175, 282, 10, 10);
  
  // Sauvegarde du PDF
  doc.save(`resultats_radiologiques_${patient.nom}_${day}${month}${year}.pdf`);
}
export async function pdfTraitement(patient) {
  if (!patient || !Array.isArray(patient.data) || patient.data.length === 0) return;
  // jsPDF is large: it is only downloaded when a PDF is really generated
  const { jsPDF } = await import("jspdf");
  const latestData = patient.data[patient.data.length - 1];
  
  // Définir des couleurs pour un design cohérent
  const couleurPrimaire = [46, 204, 113]; // Vert médical
  const couleurSecondaire = [52, 73, 94]; // Bleu-gris foncé
  const couleurAccent = [230, 126, 34]; // Orange pour les alertes/importance
  
  // Format de date actuelle
  const aujourdhui = new Date();
  const day = aujourdhui.getDate().toString().padStart(2, '0');
  const month = (aujourdhui.getMonth() + 1).toString().padStart(2, '0');
  const year = aujourdhui.getFullYear();
  
  // Créer le document PDF
  const doc = new jsPDF();
  
  // Ajouter un en-tête avec fond coloré
  doc.setFillColor(couleurPrimaire[0], couleurPrimaire[1], couleurPrimaire[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  // Titre et sous-titre
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text("Plan de Traitement", 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text("Clinique Médicale", 105, 30, { align: 'center' });
  
  // Bandeau latéral décoratif
  doc.setFillColor(couleurSecondaire[0], couleurSecondaire[1], couleurSecondaire[2]);
  doc.rect(0, 40, 15, 257, 'F');
  
  // Informations du patient dans un cadre
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(25, 50, 170, 40, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(couleurPrimaire[0], couleurPrimaire[1], couleurPrimaire[2]);
  doc.text("INFORMATION DU PATIENT", 35, 60);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(couleurSecondaire[0], couleurSecondaire[1], couleurSecondaire[2]);
  doc.setFontSize(10);
  
  // Disposition en deux colonnes pour les informations du patient
  doc.text(`Nom et prénom:`, 35, 70);
  doc.text(`${patient.nom} ${patient.prenom}`, 85, 70);
  
  doc.text(`Date de prescription:`, 35, 77);
  doc.text(`${latestData.date}`, 85, 77);
  
  doc.text(`Diagnostic:`, 35, 84);
  doc.text(`${latestData.diagnostique || 'Non spécifié'}`, 85, 84);
  
  // Section médicaments prescrits
  doc.setFillColor(couleurPrimaire[0], couleurPrimaire[1], couleurPrimaire[2]);
  doc.rect(25, 100, 170, 7, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("MÉDICAMENTS PRESCRITS", 30, 105);
  
  // Table des médicaments
  const startY = 115;
  const cellPadding = 5;
  const colWidths = [70, 50, 50];
  
  // En-têtes de table
  doc.setFillColor(248, 248, 248);
  doc.rect(25, startY, 170, 10, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.1);
  doc.line(25, startY, 195, startY);
  doc.line(25, startY + 10, 195, startY + 10);
  doc.line(25, startY, 25, startY + 10);
  doc.line(25 + colWidths[0], startY, 25 + colWidths[0], startY + 10);
  doc.line(25 + colWidths[0] + colWidths[1], startY, 25 + colWidths[0] + colWidths[1], startY + 10);
  doc.line(195, startY, 195, startY + 10);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(couleurSecondaire[0], couleurSecondaire[1], couleurSecondaire[2]);
  doc.text("Médicament", 25 + cellPadding, startY + 7);
  doc.text("Dosage", 25 + colWidths[0] + cellPadding, startY + 7);
  doc.text("Fréquence", 25 + colWidths[0] + colWidths[1] + cellPadding, startY + 7);
  
  // Simuler une liste de médicaments (à remplacer par les données réelles)
  const medicaments = latestData.medicaments || [
    { nom: "À déterminer par le médecin", dosage: "-", frequence: "-" }
  ];
  
  let currentY = startY + 10;
  medicaments.forEach((med, index) => {
    const rowHeight = 10;
    
    // Remplir les cellules avec couleur alternée
    if (index % 2 === 0) {
      doc.setFillColor(240, 240, 240);
    } else {
      doc.setFillColor(248, 248, 248);
    }
    doc.rect(25, currentY, 170, rowHeight, 'F');
    
    // Tracer les lignes de la grille
    doc.line(25, currentY, 195, currentY);
    doc.line(25, currentY + rowHeight, 195, currentY + rowHeight);
    doc.line(25, currentY, 25, currentY + rowHeight);
    doc.line(25 + colWidths[0], currentY, 25 + colWidths[0], currentY + rowHeight);
    doc.line(25 + colWidths[0] + colWidths[1], currentY, 25 + colWidths[0] + colWidths[1], currentY + rowHeight);
    doc.line(195, currentY, 195, currentY + rowHeight);
    
    // Ajouter le texte
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(med.nom, 25 + cellPadding, currentY + 7);
    doc.text(med.dosage, 25 + colWidths[0] + cellPadding, currentY + 7);
    doc.text(med.frequence, 25 + colWidths[0] + colWidths[1] + cellPadding, currentY + 7);
    
    currentY += rowHeight;
  });
  
  // Section instructions spéciales
  doc.setFillColor(couleurPrimaire[0], couleurPrimaire[1], couleurPrimaire[2]);
  doc.rect(25, currentY + 10, 170, 7, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("INSTRUCTIONS SPÉCIALES", 30, currentY + 15);
  
  // Contenu des instructions dans un cadre léger
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(25, currentY + 20, 170, 50, 3, 3, 'F');
  
  // Ajouter les instructions spéciales
  const instructionsText = latestData.instructions || "Prendre les médicaments selon la prescription. Contacter votre médecin en cas d'effets secondaires importants.";
  const instructionsLines = doc.splitTextToSize(instructionsText, 160);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(instructionsLines, 30, currentY + 30);
  
  // Ajouter précautions si disponibles
  if (latestData.precautions) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(couleurAccent[0], couleurAccent[1], couleurAccent[2]);
    doc.text("PRÉCAUTIONS:", 30, currentY + 55);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const precautionsLines = doc.splitTextToSize(latestData.precautions, 155);
    doc.text(precautionsLines, 30, currentY + 62);
  }
  
  // Section suivi
  doc.setFillColor(couleurPrimaire[0], couleurPrimaire[1], couleurPrimaire[2]);
  doc.rect(25, currentY + 80, 170, 7, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("SUIVI DU TRAITEMENT", 30, currentY + 85);
  
  // Contenu du suivi dans un cadre léger
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(25, currentY + 90, 170, 30, 3, 3, 'F');
  
  // Ajouter les informations de suivi
  const suiviText = latestData.suivi || "Rendez-vous de contrôle à prévoir dans 2 semaines.";
  const suiviLines = doc.splitTextToSize(suiviText, 160);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(suiviLines, 30, currentY + 100);
  
  // Date de prochain rendez-vous si disponible
  if (latestData.prochainRDV) {
    doc.setFont('helvetica', 'bold');
    doc.text("Prochain rendez-vous:", 30, currentY + 115);
    doc.setFont('helvetica', 'normal');
    doc.text(latestData.prochainRDV, 100, currentY + 115);
  }
  
  // Footer avec signature du médecin
  doc.setDrawColor(couleurPrimaire[0], couleurPrimaire[1], couleurPrimaire[2]);
  doc.setLineWidth(0.5);
  doc.line(25, 275, 185, 275);
  
  // Signature du médecin
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(couleurSecondaire[0], couleurSecondaire[1], couleurSecondaire[2]);
  doc.text("Prescrit par:", 130, 285);
  doc.text("Dr. " + (latestData.medecin || "_______________"), 160, 285);
  
  // QR code et numéro d'ordonnance
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`N° Ordonnance: ${latestData.id_ordonnance || generateRandomId()}`, 30, 285);
  doc.text(`Document généré le ${day}/${month}/${year}`, 105, 295, { align: 'center' });
  
  // Ajout d'un QR code (factice) pour la vérification de l'ordonnance
  doc.addImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==", "PNG", 30, 265, 15, 15);
  
  // Fonction pour générer un ID aléatoire si non fourni
  function generateRandomId() {
    return "ORD-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  
  // Sauvegarde du PDF
  doc.save(`plan_traitement_${patient.nom}_${day}${month}${year}.pdf`);
}
