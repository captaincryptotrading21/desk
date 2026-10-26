# Captain Trading · Desk

Un terminal de trading crypto et macro, gratuit, dans ton navigateur : sessions et annonces de la journée, signaux, carte des liquidations, screener, carnet d'ordres agrégé, news et tweets à la minute traduits en français (Trump sur Truth Social, comptes qui pistent les baleines…), et **un agent IA qui lit le marché toutes les 30 min** avec ses niveaux et son bilan.

## 👉 [Ouvrir le Desk](https://captaincryptotrading21.github.io/desk)

Gratuit · sans inscription · sur ordinateur et téléphone.
Le guide complet, le fichier à télécharger et les tutos vidéo : **[captain-trading.com/ia-trading](https://captain-trading.com/ia-trading)**

---

## Copie le Desk et fais-en le tien, sans savoir coder

Tu peux transformer le Desk comme tu veux (couleurs, cryptos, blocs, nouvelles fonctions) en le demandant simplement à une IA.

**1. Installe [Claude Code](https://claude.com/claude-code)**
L'assistant de Claude qui travaille directement sur ton ordinateur. Il faut un abonnement Claude (à partir de Pro).

**2. Ouvre-le dans un dossier vide**
Par exemple un dossier `mon-desk` sur ton bureau.

**3. Colle ce texte**

```
Récupère le projet https://github.com/captaincryptotrading21/desk dans ce dossier. Lis le fichier CLAUDE.md pour comprendre comment il est construit, puis ouvre index.html dans mon navigateur pour que je voie mon Desk. Si un outil manque sur mon ordinateur (Git ou Node.js), installe-le ou explique-moi simplement comment faire. Ensuite, demande-moi ce que je veux changer, fais les modifications une par une et montre-moi le résultat à chaque fois.
```

Ensuite, demande ce que tu veux : « Passe toute l'interface en violet », « Ajoute AVAX et LINK en haut », « Ajoute un bloc avec le prix de l'or »…

---

## Pourquoi tu peux lui faire confiance

- **Gratuit, sans inscription**, et ça le restera.
- **Rien à connecter** : le Desk ne touche jamais à ton compte d'échange, ne demande aucune clé ni mot de passe.
- **Tout est visible** : le code est ici, lisible par n'importe qui. Les données viennent directement des plateformes (OKX, Binance, Bybit, Deribit…).

<details>
<summary>Pour les curieux : comment c'est organisé</summary>

| Élément | Rôle |
|---|---|
| `index.html` | Le Desk, prêt à l'emploi (fichier généré) |
| `page.html`, `*.js`, `*.css`, `config.js` | Le code source : c'est ce qu'on modifie |
| `build.mjs` | Reconstruit `index.html` : `node build.mjs` |
| `serve.mjs` | Aperçu local : `node serve.mjs` puis http://localhost:5173 |
| `robot.mjs` | Le robot (toutes les 10 min) : agenda, news crypto traduites, copie de FinancialJuice |
| `desk-news-worker.js` | Le relais Cloudflare : l'agent IA et les news Telegram (pour avoir ton propre agent, voir `CLAUDE.md`) |
| `niveaux-captain.pine` | L'indicateur TradingView « Niveaux Captain » (aussi copiable depuis le Desk) |
| `CLAUDE.md` | Le guide du projet pour l'IA |

**Mettre ta version en ligne :** crée un dépôt public sur ton GitHub, **Settings → Pages → Source : GitHub Actions**, dépose tous les fichiers (**Add file → Upload files**), puis crée le robot avec **Add file → Create new file**, nom `.github/workflows/desk.yml`, en collant le contenu du fichier du même nom. Ton Desk sera sur `https://TON-PSEUDO.github.io/NOM-DU-DEPOT`.
</details>

---

⚠️ Outil d'information, pas un conseil en investissement. Les données viennent de sources publiques et peuvent être incomplètes ou en retard. Le trading comporte un risque de perte en capital.

Créé par Captain Trading · [Licence](LICENSE.md) : usage personnel libre, revente interdite.
