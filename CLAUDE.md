# Captain Trading · Desk — guide pour l'agent IA

Ce fichier explique le projet à un agent IA (Claude Code ou autre) pour qu'il puisse le modifier sans rien casser.
La personne qui te parle ne sait probablement pas coder : réponds en français simple, fais les modifications toi-même, puis vérifie-les.

## Ce qu'est le projet

Un tableau de bord de trading crypto et macro, en **un seul fichier HTML** (`index.html`), sans serveur ni clé API.
Toutes les données sont lues directement depuis le navigateur sur des API publiques (OKX, Binance, Bybit, Bitget, Hyperliquid, Deribit, Coinbase, CoinGecko, TradingView, FinancialJuice, Tree of Alpha…).
Un petit robot GitHub (`robot.mjs`) publie toutes les 10 minutes ce que le navigateur ne peut pas lire lui-même : agenda économique, news crypto traduites, copie de FinancialJuice.

## Règle d'or

- **On modifie les fichiers sources** (`page.html`, les `.js`, les `.css`, `config.js`), jamais `index.html` à la main : il est généré.
- Tous les fichiers sont à la racine du dossier (pas de sous-dossier : l'envoi de fichiers par le site GitHub ne garde pas les dossiers). Garde cette organisation.
- Après chaque modification : `node build.mjs`. Le script assemble `page.html`, les `.js` et les `.css` dans `index.html` et vérifie que le JavaScript est valide. S'il affiche une erreur, corrige-la avant de continuer.
- Pour voir le résultat : `node serve.mjs` puis ouvrir http://localhost:5173 (ou ouvrir `index.html` directement dans le navigateur).
- Après une modification visible, ouvre la page et vérifie qu'il n'y a pas d'erreur dans la console du navigateur.

## Carte des fichiers sources

| Fichier | Rôle |
|---|---|
| `config.js` | Réglages de départ : nom, sous-titre, couleur d'accent, thème, cryptos suivies, blocs affichés, adresse du robot (`data`). |
| `page.html` | Squelette de la page : barre du haut, un `<section class="mod" data-mod="…">` par bloc, fenêtres (Studio, alertes, calculateur…). |
| `style.css` | Style de base. Couleurs du thème sombre dans `:root[data-theme="dark"]`, du thème clair dans `:root[data-theme="light"]`. |
| `worlds.css` | Accueil, espaces, grille des blocs (12 colonnes), responsive, et les retouches récentes (en fin de fichier : ce sont elles qui l'emportent). |
| `core.js` | Le cœur : état partagé `CK.S`, utilitaires `CK.u` (formatage, `esc`, `safeUrl`), réseau (`fetchJSON`, `fetchText`, journal `CK.NET`), prix en direct (WebSocket), signaux (`FDEF`), agenda (`EV_FR` = traductions), news, graphiques TradingView, logo (`LOGO`), démarrage (`CK.boot`). |
| `layout.js` | Les espaces (`VIEWS`) et leurs blocs (`DEFAULTS` : ordre et largeur `w` de 1 à 12 colonnes), noms des blocs (`NAMES`), mode « Disposition ». |
| `worlds.js` | Écran d'accueil et couleur de chaque espace (`W`). |
| `day.js` | Frise « Journée de trading » : sessions, annonces, funding. |
| `signals.js` | Liste des signaux (familles dans `FAM`) et leurs explications. |
| `liqmap.js` | Carte des liquidations. |
| `pos.js` | Dérivés agrégés (open interest, funding, ratios). |
| `extra.js` | Niveaux clés, options Deribit, carnet d'ordres agrégé, alertes flash des news, corrélations. |
| `screener.js` | Screener (préréglages dans `PRESETS`, colonnes dans `COLS`). |
| `ui.js` | Studio, alertes de prix, calculateur de position, palette de commandes (Ctrl+K). |
| `net.js` | Espace « Connexions » : état en direct de chaque source (liste `SRC`). |
| `veille.js` | **Les agents** (espace « Agent ») : réglages par défaut en haut du fichier (`REGLAGES`), mesures du marché, détection Scalp, Analyste, appel à l'IA choisie (`IA` : Gemini, OpenRouter, ChatGPT, Claude, Grok, Perplexity, DeepSeek, Mistral), contrôle des prix cités, consommation de l'IA et affichage. |
| `agent-manuel.md` | **Le cerveau des agents** : la méthode de trader, en français, et les deux contrats JSON (ALERTE SCALP, ANALYSTE). Il est envoyé à l'IA à chaque appel. |
| `sound.js` | Ambiances sonores et sons d'interface. |
| `bg.js` | Fond animé. |

Tout le code partage l'objet global `window.CK`. Chaque fichier est une fonction auto-exécutée qui ajoute son module (`CK.day`, `CK.map`, `CK.layout`…).

## L'agent IA (espace « Agent », touche 6)

L'agent tourne sur un relais Cloudflare commun à tous les utilisateurs (code : `relais/desk-news-worker.js` dans le dépôt de Captain Trading, pas dans ce dossier). Toutes les minutes, il lit le marché (OKX, TradingView, news Telegram et Tree of Alpha, agenda), détecte ce qui compte avec des règles de trader (purges, gros moves, levier, cassures et pièges de niveaux, volume anormal, bougie anormale du dollar, volume EUR/USD, news qui font bouger le prix, annonces), écrit dans son fil, suit ses propres messages (↳) et appelle une IA seulement pour un événement important, le brief de Londres et de New York, et un point par heure.

Le Desk (`veille.js`) affiche :
1. des cartes vivantes BTC, ETH, SOL et dollar, calculées en direct dans le navigateur ;
2. le fil de l'agent, façon chat de desk, avec les réponses de l'IA et les suivis ;
3. les 👍 / 👎 de chaque utilisateur (gardés dans son navigateur), qui règlent ce qui lui remonte et le notifie ;
4. l'onglet « Conso IA » : appels, tokens et état de chaque IA (Gemini, OpenRouter, Workers AI).

Personne n'a de clé à mettre : les clés sont des secrets du relais, jamais dans le code, le Desk ou GitHub.

**Recettes**
- *Changer l'affichage* : `veille.js` (cartes : `card()` et `cardUSD()` ; fil : `line()` ; types de messages : `TYPES`) et le bloc « Agent IA » de `worlds.css`.
- *Changer quand l'agent te notifie* : réglage « Me notifier » dans l'agent, ou `REGLAGES.notifier`.
- *Avoir ton propre agent* (autres règles, autres actifs) : déploie ta copie du relais sur ton compte Cloudflare et mets son adresse dans `TG_URL` (`core.js`).

## Recettes courantes

**Changer les couleurs.** Couleur d'accent : `accent` dans `config.js`. Palette complète : les variables (`--bg`, `--text`, `--up`, `--down`…) dans `style.css`. Couleur d'un espace : `col` dans la liste `W` de `worlds.js`.

**Déplacer, élargir ou retirer un bloc dans un espace.** Modifier `DEFAULTS` dans `layout.js` : l'ordre des blocs suit `y` puis `x`, la largeur est `w` (12 = pleine largeur). Augmenter aussi la constante `LAYV` (ex. "9" → "10") pour que les navigateurs oublient l'ancienne disposition enregistrée.

**Ajouter un bloc.**
1. Dans `page.html`, ajouter une section sur le modèle des autres :
   `<section class="mod" data-mod="monbloc"><header class="mhd"><span class="mno"></span><h2>Titre</h2></header><div class="card"><div id="monbloc"></div></div></section>`
2. Dans `layout.js`, ajouter `monbloc` dans `NAMES`, `MIN` et dans `DEFAULTS` de l'espace voulu.
3. Dans `core.js`, ajouter `monbloc:true` dans `modules` de `DEF`.
4. Écrire le code du bloc dans un fichier existant (ou un nouveau fichier `monbloc.js`, à ajouter dans la liste `JS` de `build.mjs`) et le démarrer depuis `CK.boot` dans `core.js`.

**Ajouter une crypto dans la barre du haut.** `watchlist` dans `config.js` (symboles OKX, ex. "AVAX").

**Ajouter un signal.** Ajouter une entrée dans `FDEF` (`core.js`) sur le modèle des autres, puis sa clé dans `FAM` (`signals.js`) et son explication dans `CTX` (`signals.js`).

**Traduire une annonce de l'agenda.** Ajouter une ligne `[/texte anglais/i,"Texte français"]` au début de `EV_FR` dans `core.js`.

## Règles à respecter

- **Sécurité** : tout texte venu de l'extérieur (news, API) passe par `esc()` avant d'être inséré dans la page, et tout lien externe par `safeUrl()`. Ne jamais insérer une donnée externe brute dans `innerHTML`.
- **Pas de clé API dans le code** : le fichier est public. N'utilise que des sources qui marchent sans clé et qui autorisent les appels depuis un navigateur (en-tête CORS). Si une API refuse (erreur CORS), il faudra passer par le robot GitHub.
- **Pas de `</script>` ni de `</style>`** dans le JavaScript ou le CSS (le script de construction le refuse).
- **Noms de classes CSS** : préfère des noms précis (`monbloc-ligne`) aux noms génériques (`.past`, `.pin`, `.now`) déjà utilisés ailleurs, pour éviter les conflits.
- **Stockage navigateur** : passe par `CK.ls()` / `CK.lsj()` (préfixe commun, erreurs gérées).
- Les textes visibles sont en français.

## Le robot (optionnel)

Par défaut, `data` dans `config.js` pointe vers le robot de Captain Trading : l'agenda et les news fonctionnent tout de suite.
Pour avoir ton propre robot : mets ce dossier sur ton GitHub, active GitHub Pages (Settings → Pages → Source : GitHub Actions), puis remplace `data` par `https://TON-PSEUDO.github.io/NOM-DU-DEPOT`. Le fichier `.github/workflows/desk.yml` fait tourner `robot.mjs` toutes les 10 minutes.
