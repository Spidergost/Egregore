# Tables aléatoires

Une table = un fichier JSON dont le nom (sans `.json`) est son identifiant. Aucun code à écrire.

## Table simple

```json
{
  "id": "meteo",
  "titre": "Météo du jour",
  "cat": "commun",
  "desc": "Phrase affichée sous le titre.",
  "entrees": [
    "Brouillard épais",
    { "t": "Ciel dégagé", "w": 3 },
    "{1d4+1} loups affamés suivent la piste"
  ]
}
```

- Une entrée peut être une chaîne, ou `{ "t": "texte", "w": poids }`. Le poids par défaut est 1.
- `{2d6+1}` est remplacé par un jet de dés (`NdF`, `+`, `-`, `kh`/`kl`).
- `{@autre-table}` est remplacé par un tirage dans la table `autre-table` (imbrication jusqu'à 8 niveaux).
- `{^@autre-table}` fait de même en mettant la première lettre en majuscule (début de phrase).

## Fiche

Une fiche tire plusieurs champs d'un coup, chacun pouvant appeler d'autres tables :

```json
{
  "id": "fiche-pnj",
  "titre": "PNJ express",
  "cat": "mj",
  "desc": "...",
  "champs": [
    { "k": "Nom", "t": "{@prenoms} {@noms-famille}" },
    { "k": "Rôle", "t": "{@pnj-metiers}" }
  ]
}
```

## Catégories

`cat` vaut `joueur`, `mj` ou `commun`.

## Déclarer la table dans `index.json`

Ajoutez une ligne à `data/index.json` :

```json
{ "id": "meteo", "titre": "Météo du jour", "cat": "commun", "type": "table", "desc": "...", "brique": false, "n": 8 }
```

- `type` : `table` ou `fiche`.
- `brique` : `true` pour une table « composant » (utilisée par d'autres tables), rangée dans « Briques de base ».
- `n` : nombre d'entrées ou de champs (indicatif).

## Conseils

- Gardez le contenu **générique** : pas de référence à un système ou à un univers sous licence.
- Écrivez les fragments pour qu'ils s'enchaînent bien (articles, infinitifs) quand ils sont appelés dans une phrase.
- Testez votre table dans `commun/tables.html`.
