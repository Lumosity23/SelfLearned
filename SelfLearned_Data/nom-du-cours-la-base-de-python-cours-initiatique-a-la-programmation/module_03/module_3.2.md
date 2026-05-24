# Dictionnaires et ensembles

## ## 1. Introduction Conceptuelle

Les structures de données sont essentielles pour organiser et manipuler des informations de manière efficace. Dans ce module, nous allons explorer deux structures de données puissantes en Python : les dictionnaires et les ensembles. Les dictionnaires nous permettent de stocker des paires clé-valeur, tandis que les ensembles nous offrent un moyen de stocker des collections non ordonnées d'éléments uniques.

## ## 2. Fondations Théoriques

### Dictionnaires

Un dictionnaire en Python est une collection non ordonnée de paires clé-valeur. Chaque clé est unique et est utilisée pour accéder à sa valeur correspondante.

**Caractéristiques principales :**
- Les clés doivent être immuables (par exemple, des chaînes, des nombres ou des tuples).
- Les valeurs peuvent être de n'importe quel type de données.
- Les dictionnaires sont mutables.

### Ensembles

Un ensemble en Python est une collection non ordonnée d'éléments uniques. Les ensembles sont utiles pour éliminer les doublons et pour effectuer des opérations mathématiques sur les ensembles, comme les unions, les intersections et les différences.

**Caractéristiques principales :**
- Les éléments d'un ensemble doivent être immuables.
- Les ensembles sont mutables.
- Les ensembles ne conservent pas l'ordre des éléments.

## ## 3. Implémentation Pratique Pas-à-Pas

### Création et manipulation de dictionnaires

```python
# Création d'un dictionnaire
mon_dictionnaire = {"nom": "Alice", "age": 30, "ville": "Paris"}

# Accès à une valeur
print(mon_dictionnaire["nom"])  # Sortie: Alice

# Ajout d'une nouvelle paire clé-valeur
mon_dictionnaire["email"] = "alice@example.com"

# Modification d'une valeur
mon_dictionnaire["age"] = 31

# Suppression d'une paire clé-valeur
del mon_dictionnaire["ville"]

# Itération sur les clés
for cle in mon_dictionnaire:
    print(cle)  # Sortie: nom, age, email

# Itération sur les valeurs
for valeur in mon_dictionnaire.values():
    print(valeur)  # Sortie: Alice, 31, alice@example.com

# Itération sur les paires clé-valeur
for cle, valeur in mon_dictionnaire.items():
    print(f"{cle}: {valeur}")  # Sortie: nom: Alice, age: 31, email: alice@example.com
```

### Création et manipulation d'ensembles

```python
# Création d'un ensemble
mon_ensemble = {1, 2, 3, 4, 5}

# Ajout d'un élément
mon_ensemble.add(6)

# Suppression d'un élément
mon_ensemble.remove(3)

# Vérification de l'appartenance
print(2 in mon_ensemble)  # Sortie: True

# Union de deux ensembles
ensemble1 = {1, 2, 3}
ensemble2 = {3, 4, 5}
union = ensemble1.union(ensemble2)
print(union)  # Sortie: {1, 2, 3, 4, 5}

# Intersection de deux ensembles
intersection = ensemble1.intersection(ensemble2)
print(intersection)  # Sortie: {3}

# Différence entre deux ensembles
difference = ensemble1.difference(ensemble2)
print(difference)  # Sortie: {1, 2}
```

## ## 4. Pièges Fréquents et Bonnes Pratiques

### Pièges Fréquents

- **Utilisation de clés mutables dans les dictionnaires** : Les clés doivent être immuables. Utiliser des listes comme clés provoquera une erreur.
- **Modification d'un dictionnaire pendant l'itération** : Il est déconseillé de modifier un dictionnaire pendant que vous itérez sur ses clés ou ses valeurs, car cela peut conduire à un comportement imprévisible.
- **Doublons dans les ensembles** : Les ensembles ne conservent pas les doublons. Si vous ajoutez un élément déjà présent, il ne sera pas ajouté une seconde fois.

### Bonnes Pratiques

- **Utilisation de la méthode `get` pour accéder aux valeurs dans un dictionnaire** : Cela évite les erreurs si la clé n'existe pas.
  ```python
  valeur = mon_dictionnaire.get("cle_inexistante", "valeur_par_defaut")
  ```
- **Vérification de l'existence d'une clé avant de l'utiliser** : Utilisez l'opérateur `in` pour vérifier si une clé existe dans un dictionnaire.
  ```python
  if "cle" in mon_dictionnaire:
      print(mon_dictionnaire["cle"])
  ```
- **Utilisation de compréhensions de dictionnaires et d'ensembles** : Pour créer des dictionnaires et des ensembles de manière concise et lisible.
  ```python
  carres = {x: x**2 for x in range(1, 6)}  # {1: 1, 2: 4, 3: 9, 4: 16, 5: 25}
  nombres_pairs = {x for x in range(10) if x % 2 == 0}  # {0, 2, 4, 6, 8}
  ```

## ## 5. Synthèse Pédagogique

Dans ce module, nous avons exploré les dictionnaires et les ensembles, deux structures de données puissantes en Python. Les dictionnaires nous permettent de stocker et de manipuler des paires clé-valeur, tandis que les ensembles nous offrent un moyen de stocker des collections d'éléments uniques. Nous avons vu comment créer et manipuler ces structures, ainsi que les pièges à éviter et les bonnes pratiques à suivre.

## ## 6. Exercice Pratique d'Application

### Énoncé

Créez un dictionnaire pour stocker les informations de plusieurs étudiants. Chaque étudiant doit avoir les clés suivantes : "nom", "age", "cours". Ajoutez au moins trois étudiants au dictionnaire. Ensuite, créez un ensemble pour stocker les cours uniques suivis par les étudiants.

### Indices

- Utilisez une boucle pour ajouter les étudiants au dictionnaire.
- Utilisez la méthode `add` pour ajouter des éléments à l'ensemble.

### Correction

```python
# Dictionnaire pour stocker les informations des étudiants
etudiants = {
    "etudiant1": {"nom": "Alice", "age": 20, "cours": "Mathématiques"},
    "etudiant2": {"nom": "Bob", "age": 22, "cours": "Informatique"},
    "etudiant3": {"nom": "Charlie", "age": 21, "cours": "Physique"}
}

# Ensemble pour stocker les cours uniques
cours_uniques = set()

# Ajout des étudiants et des cours à l'ensemble
for etudiant in etudiants.values():
    cours_uniques.add(etudiant["cours"])

print(etudiants)
print(cours_uniques)  # Sortie: {'Mathématiques', 'Informatique', 'Physique'}
```