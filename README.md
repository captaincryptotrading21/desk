# Captain Trading · Desk

Un terminal de trading crypto et macro, gratuit, dans ton navigateur. Sessions et annonces de la journée, signaux, carte des liquidations, screener, carnet d'ordres agrégé, news à la minute traduites en français. Plus de 15 sources en direct, sans inscription ni clé API.

**👉 L'utiliser tout de suite : https://captaincryptotrading21.github.io/desk**

Ça marche sur ordinateur et sur téléphone.

---

## Le personnaliser avec une IA (sans savoir coder)

Tu peux transformer le Desk comme tu veux : changer les couleurs, déplacer les blocs, ajouter tes cryptos, créer un nouveau bloc… en le demandant simplement à une IA.

**Ce qu'il te faut**
- [Claude Code](https://claude.com/claude-code) (abonnement Claude payant, à partir de Pro). La version gratuite de Claude dans le navigateur ne peut pas modifier un projet de cette taille.
- [Node.js](https://nodejs.org) (gratuit, version 18 ou plus) pour reconstruire le fichier après chaque modification.

**Les étapes**
1. En haut de cette page : bouton vert **Code** → **Download ZIP**. Décompresse le dossier.
2. Ouvre ce dossier dans Claude Code.
3. Demande ce que tu veux, avec tes mots. Exemples :
   - « Passe toute l'interface en violet. »
   - « Dans l'espace Liquidations, mets le carnet d'ordres en pleine largeur sous la carte. »
   - « Ajoute AVAX et LINK dans la barre du haut. »
   - « Ajoute un bloc qui affiche le prix de l'or. »
4. Claude lit le fichier `CLAUDE.md` (le guide du projet), fait la modification et reconstruit `index.html`.
5. Ouvre `index.html` dans ton navigateur : c'est ta version.

## Le mettre en ligne (optionnel)

Pour avoir ta version sur ton propre lien :
1. Crée un dépôt public sur ton compte GitHub.
2. **Settings → Pages → Source : GitHub Actions.**
3. **Add file → Upload files** : glisse tous les fichiers du dossier.
4. L'envoi par le site ignore le dossier `.github` : crée le robot à la main avec **Add file → Create new file**, nom `.github/workflows/desk.yml`, et colle le contenu du fichier du même nom.
5. Ton Desk sera en ligne sur `https://TON-PSEUDO.github.io/NOM-DU-DEPOT` après le premier passage du robot (onglet **Actions**, coche verte).

Le robot (`robot.mjs`) tournera alors aussi chez toi. Pour que ta version utilise tes propres données, remplace l'adresse `data` dans `config.js` par celle de ton site (voir `CLAUDE.md`).

## Ce qu'il y a dans le dossier

| Élément | Rôle |
|---|---|
| `index.html` | Le Desk, prêt à l'emploi (fichier généré) |
| `page.html`, `*.js`, `*.css`, `config.js` | Le code source, découpé par bloc : c'est ce qu'on modifie |
| `build.mjs` | Reconstruit `index.html` à partir du code source : `node build.mjs` |
| `serve.mjs` | Aperçu local : `node serve.mjs` puis http://localhost:5173 |
| `robot.mjs` | Le robot : agenda, news crypto traduites, copie de FinancialJuice |
| `CLAUDE.md` | Le guide du projet pour l'IA |

---

⚠️ Outil d'information, pas un conseil en investissement. Les données viennent de sources publiques et peuvent être incomplètes ou en retard. Le trading comporte un risque de perte en capital.

Créé par [Captain Trading](https://captaincryptotrading21.github.io/desk).
