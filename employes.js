/* =============================================================================
   HK TERRASSEMENT — Configuration de l'application feuille d'heures
   -----------------------------------------------------------------------------
   ⚙️  SEUL FICHIER À MODIFIER :
       1. Collez l'URL du webhook (Apps Script ou Make) dans HK_CONFIG.webhookUrl
       2. (Optionnel) Renseignez la liste HK_EMPLOYES avec vos vrais employés.
          → Sinon, chaque salarié saisit son nom UNE fois dans l'appli et
            c'est mémorisé sur son téléphone.
   ============================================================================= */

window.HK_CONFIG = {
  // 🔗 URL du webhook (Apps Script /exec  OU  webhook Make.com). À coller ici.
  webhookUrl: "https://hook.eu2.make.com/REMPLACEZ_PAR_VOTRE_WEBHOOK",

  timezone: "Europe/Paris",

  // Heures de TRAVAIL attendues (matinée + après-midi) par jour.
  heuresAttendues: {
    lundi: 8, mardi: 8, mercredi: 8, jeudi: 8,
    vendredi: 7, samedi: 0, dimanche: 0
  },

  // Heures payées contractuelles par mois (cellule "Heures payées + HS" de l'Excel).
  heuresPayeesMois: 169,

  // Journée standard (bouton de pré-remplissage) — colle au modèle Excel.
  journeeStandard: {
    // Lundi → Jeudi : 8 h (matin 08:00-12:00, aprem 13:00-17:00)
    semaine:  { matineeDebut:"08:00", matineeFin:"12:00", apremDebut:"13:00", apremFin:"17:00" },
    // Vendredi : 7 h (matin 08:00-12:00, aprem 13:00-16:00)
    vendredi: { matineeDebut:"08:00", matineeFin:"12:00", apremDebut:"13:00", apremFin:"16:00" }
  }
};

/* Liste OPTIONNELLE des employés (id unique, nom, rôle chantier/chauffeur).
   Laissez vide [] pour laisser chacun saisir son nom lui-même la 1re fois,
   ou remplissez-la pour proposer les noms dans un menu déroulant. */
window.HK_EMPLOYES = [
  // { id: "jean-dupont", nom: "Jean Dupont", role: "chantier" },
  // { id: "paul-martin", nom: "Paul Martin", role: "chauffeur" },
];
