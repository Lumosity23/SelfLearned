# Module 1.2 : Variables, types de données et opérateurs

## 1. Introduction Conceptuelle

En programmation, un ordinateur n'est pas seulement une calculatrice ; c'est une machine capable de manipuler des informations. Pour traiter ces informations, nous devons être capables de les stocker en mémoire de manière temporaire. C'est ici qu'interviennent les **variables**.

Imaginez une variable comme une boîte étiquetée :
*   **L'étiquette** est le nom de la variable (ex: `score`).
*   **Le contenu** est la valeur stockée (ex: `100`).
*   **Le type** définit la nature de ce que contient la boîte (est-ce un nombre ? du texte ?).

Comprendre comment manipuler ces boîtes et comment effectuer des calculs ou des transformations sur leur contenu est le socle fondamental de tout langage de programmation.

## 2. Fondations Théoriques

### Les Variables
En Python, une variable est une référence vers un objet en mémoire. Contrairement à d'autres langages, vous n'avez pas besoin de déclarer le type de la variable à l'avance (typage dynamique).

### Les Types de Données Fondamentaux
Python gère nativement plusieurs types :
*   **`int` (Entier) :** Nombres sans virgule (`5`, `-10`, `42`).
*   **`float` (Flottant) :** Nombres avec une partie décimale (`3.14`, `-0.01`).
*   **`str` (Chaîne de caractères) :** Texte entouré de guillemets (`"Bonjour"`, `'Python'`).
*   **`bool` (Booléen) :** Valeurs logiques (`True` ou `False`).

### Les Opérateurs
Ils permettent de manipuler les données :
*   **Arithmétiques :** `+`, `-`, `*`, `/` (division réelle), `//` (division entière), `%` (modulo/reste), `**` (puissance).
*   **Assignation :** `=` (affectation), `+=`, `-=` (raccourcis).

## 3. Implémentation Pratique Pas-à-Pas

### Étape 1 : Préparation de l'environnement
Avant de coder, créez un dossier nommé `cours_python` sur votre ordinateur. À l'intérieur, créez un fichier nommé `variables.py`. Utilisez un éditeur de texte propre (VS Code ou PyCharm).

### Étape 2 : Déclaration et typage
Ouvrez votre fichier et commencez par définir des variables. Suivez la convention de nommage `snake_case` (minuscules et underscores).

```python
# Définition de variables
age = 25              # int
taille = 1.75         # float
nom = "Alice"         # str
est_etudiant = True   # bool
```

### Étape 3 : Opérations arithmétiques
Ajoutez ces lignes pour manipuler vos nombres. Remarquez comment nous utilisons des commentaires pour documenter le code.

```python
# Calculs simples
annee_prochaine = age + 1
double_taille = taille * 2
reste = 10 % 3  # Le modulo donne le reste de la division (ici 1)
```

### Étape 4 : Affichage
Pour vérifier vos résultats, utilisez la fonction `print()`.

```python
print("Nom :", nom)
print("Âge l'an prochain :", annee_prochaine)
```

## 4. Pièges Fréquents et Bonnes Pratiques

1.  **Noms de variables explicites :** Préférez `nombre_de_vies` à `n`. Le code doit être lisible par un humain.
2.  **Attention à la casse :** `Age` et `age` sont deux variables différentes. Python est sensible à la casse.
3.  **Concaténation de types :** Vous ne pouvez pas additionner un `str` et un `int` directement. Vous devrez convertir le type (ceci sera approfondi dans les modules de gestion de données).
4.  **Mots réservés :** N'utilisez jamais de mots-clés Python comme noms de variables (ex: `print`, `if`, `while`).

## 5. Synthèse Pédagogique

*   Une variable est un conteneur nommé.
*   Python détecte automatiquement le type de donnée.
*   Les opérateurs permettent de transformer les données.
*   Le respect des conventions de nommage (`snake_case`) est crucial pour la maintenance de votre code.

## 6. Exercice Pratique d'Application

### Énoncé
Créez un programme qui calcule l'aire d'un rectangle.
1. Déclarez deux variables : `longueur` (10) et `largeur` (5).
2. Calculez l'aire dans une nouvelle variable `aire`.
3. Affichez le résultat sous la forme : "L'aire du rectangle est de : XX".

### Indices
*   L'aire d'un rectangle est `longueur * largeur`.
*   La fonction `print()` peut accepter plusieurs arguments séparés par une virgule.

### Correction
```python
# Déclaration des variables
longueur = 10
largeur = 5

# Calcul
aire = longueur * largeur

# Affichage
print("L'aire du rectangle est de :", aire)
```

*Note : Dans le prochain module, nous verrons comment interagir avec l'utilisateur pour ne plus avoir à définir les valeurs directement dans le code.*