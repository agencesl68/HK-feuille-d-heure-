# HK Terrassement — Feuille d'heures

Application mobile où chaque salarié saisit ses heures. Les données remplissent
automatiquement un Google Sheet, puis **votre feuille mensuelle Excel** (modèle
`Modèle`) est régénérée aux bonnes cellules. Charte HK (orange + noir).

## Ce que fait l'appli

- **1 appli par salarié** : il saisit son nom **une seule fois**, c'est mémorisé
  sur son téléphone (ou lien perso `?id=`).
- Calquée sur votre Excel : **Chantier**, **Trajet aller** (départ/arrivée),
  **Matinée** (début/fin), **Après-midi** (début/fin), **Trajet retour**.
- **Chauffeurs** : trajets aller/retour retirés automatiquement.
- Pause de midi = écart matin/après-midi (calculée), totaux journée & trajet auto.
- Lun→Jeu **8 h**, Ven **7 h** ; bouton « Journée standard ».
- Congé / absence / repos / vacances / maladie → **ligne rouge, bien visible**.
- **1 seul envoi par jour**, blocage si incomplet, **heure d'envoi enregistrée**.
- **Rappel e-mail si oubli** + **remplissage 8 h** automatique.

---

## 1. Configurer (fichier `config/employes.js`)

1. Collez l'URL du webhook dans `HK_CONFIG.webhookUrl` (voir §3).
2. `HK_EMPLOYES` est **optionnel** :
   - laissé vide `[]` → chaque salarié saisit son nom lui-même (mémorisé) ;
   - rempli → les noms apparaissent dans un menu déroulant.

---

## 2. Publier l'appli (GitHub Pages)

*Settings › Pages › branche `main` / dossier `/root`.* Puis :

- URL unique pour tous : `https://<compte>.github.io/<repo>/app.html`
- (option) lien perso : `…/app.html?id=jean-dupont`

Chaque salarié ouvre l'appli, saisit son nom **une fois**, puis
**« Ajouter à l'écran d'accueil »** → il a son appli.

---

## 3. Backend : Google Apps Script (recommandé, gratuit, tout-en-un)

Le script est **lié à votre classeur Excel** (celui qui contient l'onglet `Modèle`),
importé dans Google Sheets.

1. Importez votre `.xlsx` dans Google Drive → ouvrir avec Google Sheets.
2. **Extensions › Apps Script**, collez `google/Code.gs`, réglez `CONFIG`/`EMPLOYES`.
3. Lancez **`initialiser()`** (crée l'onglet `Pointages`, le rouge auto, les rappels).
4. **Déployer › Application Web** (exécuter *en tant que moi*, accès *tout le monde*).
5. Copiez l'URL `…/exec` → `HK_CONFIG.webhookUrl`.

**Régénérer une feuille mensuelle** : menu **HK Terrassement › Générer la feuille
du mois…** (ou fonction `genererFeuilleMois("Jean Dupont","2026-07")`). Le script
duplique `Modèle` et reporte chaque pointage dans la bonne case (matinée,
après-midi, trajets) ; vos formules de totaux se recalculent seules.

> Alternative **Make.com** (forfait Core) : voir `make/scenario-reception.blueprint.json`.
> Le webhook écrit dans `Pointages` (mise en rouge = mise en forme conditionnelle
> sur la colonne *Statut*). Idéal pour ajouter des notifs **SMS/WhatsApp**.

---

## 4. Onglet `Pointages` (base de données)

Date · Jour · Employé · Rôle · Statut · Chantier · Trajet aller Départ/Arrivée ·
Matinée Début/Fin · Après-midi Début/Fin · Trajet retour Départ/Arrivée ·
Pause midi · Heures journée · Heures trajet · Heures attendues · Heures supp. ·
Commentaire · Envoyé le · Source.

Une ligne = un salarié pour un jour. C'est la source qui alimente la feuille
mensuelle `Modèle`. Détails : `docs/tableur.md`.

---

## Structure du projet

```
index.html          Accueil / liste des salariés
app.html            Feuille d'heures (onboarding mémorisé, ?id= optionnel)
config/employes.js  ← à configurer (webhook + employés optionnels)
assets/             logo.svg, logo-hk.png (votre logo), styles.css, app.js
google/Code.gs      Backend Apps Script (réception + rouge + rappels + génération mensuelle)
make/…blueprint.json Scénario Make.com (option)
docs/tableur.md     Détails du report vers le modèle mensuel
```

> **Logo** : déposez votre vrai logo dans `assets/logo-hk.png` — l'appli l'utilise
> automatiquement (repli sur `assets/logo.svg` si absent).
