# Module 3.1 : Listes et tuples

## 1. Introduction Conceptuelle

Jusqu'à présent, nous avons manipulé des variables contenant une seule valeur à la fois (un entier, une chaîne de caractères, un booléen). Cependant, la programmation réelle nécessite souvent de regrouper des ensembles de données connexes. Imaginez devoir gérer une liste d'étudiants, les températures relevées sur une semaine, ou les coordonnées d'un point dans l'espace.

C'est ici qu'interviennent les **structures de données séquentielles**. En Python, les deux structures fondamentales pour stocker des collections ordonnées sont les **listes** et les **tuples**. Bien qu'ils se ressemblent, leur usage diffère radicalement par leur mutabilité : la capacité à modifier leur contenu après création.

## 2. Fondations Théoriques

### Les Listes (`list`)
Une liste est une collection **ordonnée** et **mutable** d'éléments. Elle peut contenir des types de données hétérogènes (mélanger des entiers, des chaînes, etc.).
*   **Syntaxe :** On utilise les crochets `[]`.
*   **Mutabilité :** On peut ajouter, supprimer ou modifier des éléments après la création.

### Les Tuples (`tuple`)
Un tuple est une collection **ordonnée** et **immuable**. Une fois défini, il ne peut plus être modifié.
*   **Syntaxe :** On utilise les parenthèses `()`.
*   **Immuabilité :** Garantit l'intégrité des données. Idéal pour des constantes ou des structures de données dont la taille est fixe.

| Caractéristique | Liste | Tuple |
| :--- | :--- | :--- |
| Syntaxe | `[1, 2, 3]` | `(1, 2, 3)` |
| Mutabilité | Oui (Modifiable) | Non (Fixe) |
| Performance | Légèrement plus lent | Plus rapide |
| Usage typique | Données dynamiques | Données immuables |

## 3. Implémentation Pratique Pas-à-Pas

### Étape 1 : Préparation de l'environnement
Avant de coder, assurez-vous d'avoir un fichier propre. Créez un fichier nommé `gestion_donnees.py`. Utilisez des commentaires pour structurer votre code et nommez vos variables de manière explicite (ex: `liste_noms` plutôt que `l`).

### Étape 2 : Création et accès aux éléments
La numérotation en Python commence à **0**. Le premier élément est à l'indice 0, le second à l'indice 1, etc.

```python
# Définition d'une liste
fruits = ["pomme", "banane", "cerise"]

# Accès par index
print(fruits[0])  # Affiche : pomme

# Définition d'un tuple
coordonnees = (10.5, 20.2)
print(coordonnees[1]) # Affiche : 20.2
```

### Étape 3 : Manipulation des listes
Contrairement aux tuples, nous pouvons modifier les listes. Essayez d'ajouter un élément avec `.append()` ou de modifier une valeur directement.

```python
# Modification
fruits[1] = "mangue" 

# Ajout
fruits.append("orange")
```

*Note : Tenter de faire `coordonnees[0] = 15.0` provoquera une `TypeError` car le tuple est immuable.*

## 4. Pièges Fréquents et Bonnes Pratiques

1.  **L'erreur d'indice (IndexError) :** Essayer d'accéder à un élément qui n'existe pas. Si votre liste a 3 éléments, les indices vont de 0 à 2. L'indice 3 n'existe pas.
2.  **Confusion entre parenthèses et crochets :** N'oubliez pas que les parenthèses sont pour les tuples, les crochets pour les listes.
3.  **Le tuple à un seul élément :** Attention, `(5)` est interprété comme un entier entre parenthèses. Pour un tuple d'un seul élément, il faut écrire `(5,)` (avec une virgule).
4.  **Bonne pratique :** Utilisez des listes pour des collections d'objets de même nature et des tuples pour des structures de données fixes (ex: une date de naissance `(jour, mois, an)`).

## 5. Synthèse Pédagogique

*   Les **listes** sont vos outils de travail pour les données qui évoluent (ajout/suppression).
*   Les **tuples** sont vos outils de sécurité pour les données qui doivent rester constantes.
*   L'indexation commence toujours à 0.
*   La mutabilité est la distinction majeure entre ces deux structures.

## 6. Exercice Pratique d'Application

### Énoncé
1. Créez une liste nommée `inventaire` contenant trois articles : "ordinateur", "souris", "clavier".
2. Ajoutez "écran" à cette liste.
3. Modifiez "souris" par "souris sans fil".
4. Créez un tuple `date_achat` contenant trois entiers : le jour, le mois, l'année.
5. Affichez le contenu de la liste et du tuple.

### Indices
*   Pour ajouter, utilisez la méthode `.append()`.
*   Pour modifier, utilisez l'indexation : `liste[index] = nouvelle_valeur`.
*   N'oubliez pas les guillemets pour les chaînes de caractères.

### Correction
```python
# 1. Création
inventaire = ["ordinateur", "souris", "clavier"]

# 2. Ajout
inventaire.append("écran")

# 3. Modification
inventaire[1] = "souris sans fil"

# 4. Tuple
date_achat = (15, 5, 2023)

# 5. Affichage
print("Inventaire :", inventaire)
print("Date d'achat :", date_achat)
```

*(Note : La manipulation avancée des listes via le découpage (slicing) sera étudiée dans le Module 3.2).*