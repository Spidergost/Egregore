# Egregore

Outils et ressources **génériques** pour le jeu de rôle, côté joueur comme côté maître du jeu. Compatible avec n'importe quel système, sans compte, sans serveur : tout tourne dans le navigateur et se publie tel quel sur GitHub Pages.

## Ce qu'il y a dedans

| Dossier | Contenu |
|---|---|
| `player/` | Concept de personnage aléatoire, fiche générique (sauvegarde locale, import/export, impression), dés |
| `game-master/` | **Session de jeu** (charge les fiches des joueurs, suit jauges, bonus/malus, butin, journal, puis rend les fiches à jour), **Atelier de MJ** (dés, générateurs, noms, butin, tables perso, combat, carnet) et tirages rapides |
| `commun/` | Explorateur de tables aléatoires, glossaire, conseils de table |
| `templates/` | Modèles Markdown : fiche, PNJ, lieu, faction, scénario, préparation et compte rendu de session |
| `data/` | Les tables aléatoires, un fichier JSON par table (voir [`data/README.md`](data/README.md)) |
| `assets/` | Moteur commun (`js/egregore.js`) et feuille de style (`css/egregore.css`) |

## Fiches joueur ⇄ session MJ

1. Le joueur remplit sa fiche (`player/`, onglet **Fiche**) et clique sur **Exporter** : il obtient un fichier `.json`.
2. Le MJ ouvre `game-master/session.html` et **charge** les fichiers de tous ses joueurs.
3. Pendant la partie, le MJ modifie les jauges, applique des bonus/malus (avec durée en tours), distribue du butin ; tout est tracé dans le journal.
4. En fin de session, **Rendre toutes les fiches** télécharge une fiche à jour par joueur (inventaire, jauges, effets et journal de session inclus). Le joueur la **réimporte** dans son onglet Fiche.

Chaque fiche a un identifiant (`id`) stable : recharger une fiche déjà présente la met à jour au lieu de créer un doublon. Format : `{ "format": "egregore-fiche", "version": 1, … }`.

## L'aléatoire à graine

Chaque tirage dépend d'une **graine** (ex. `k4m9xq`). Même graine, même résultat, pour tout le monde :

```
https://spidergost.github.io/Egregore/commun/tables.html?t=fiche-pnj&seed=k4m9xq
```

Un MJ peut donc envoyer un lien à ses joueurs, ou retrouver un tirage plus tard.

## Publier avec GitHub Pages

1. **Settings → Pages**
2. *Source* : **Deploy from a branch**, branche `main`, dossier `/ (root)`
3. Le site est disponible sur `https://<utilisateur>.github.io/Egregore/`

Le fichier `.nojekyll` à la racine désactive Jekyll : les fichiers sont servis tels quels.

## Tester en local

Les tables sont chargées avec `fetch`, ce qui ne marche pas en ouvrant un fichier par double-clic. Lancez un petit serveur :

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

## Contribuer

- **Ajouter une table** : un fichier JSON dans `data/` et une ligne dans `data/index.json`.
- **Ajouter un template** : un fichier `.md` dans `templates/` et une entrée dans `templates/templates.json`.
- **Ajouter un terme au glossaire** : une entrée dans `commun/glossaire.json`.

Détails dans [`CONTRIBUTING.md`](CONTRIBUTING.md).
