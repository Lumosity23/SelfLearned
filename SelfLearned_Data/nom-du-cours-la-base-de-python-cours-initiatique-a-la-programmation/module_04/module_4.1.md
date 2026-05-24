# Définition et appel de fonctions

## 1. Introduction Conceptuelle

Les fonctions sont des blocs de code réutilisables qui effectuent une tâche spécifique. Elles permettent de diviser un programme en sections plus petites et plus gérables, facilitant ainsi la maintenance et la réutilisation du code. Dans ce module, nous allons explorer comment définir et appeler des fonctions en Python.

## 2. Fondations Théoriques

### 2.1 Qu'est-ce qu'une fonction?

Une fonction est un ensemble d'instructions regroupées sous un nom spécifique. Lorsqu'on appelle cette fonction, le code à l'intérieur est exécuté. Les fonctions peuvent accepter des entrées (paramètres) et renvoyer des sorties (valeurs de retour).

### 2.2 Syntaxe de base d'une fonction

La syntaxe pour définir une fonction en Python est la suivante :

```python
def nom_de_la_fonction(parametres):
    # Corps de la fonction
    return valeur_de_retour
```

## 3. Implémentation Pratique Pas-à-Pas

### 3.1 Définir une fonction simple

Voici un exemple de fonction simple qui additionne deux nombres :

```python
def addition(a, b):
    return a + b
```

### 3.2 Appeler une fonction

Pour appeler la fonction `addition`, vous pouvez utiliser le code suivant :

```python
resultat = addition(3, 5)
print(resultat)  # Affiche 8
```

### 3.3 Fonctions avec plusieurs paramètres

Vous pouvez définir des fonctions avec plusieurs paramètres. Par exemple, une fonction qui calcule le périmètre d'un rectangle :

```python
def perimetre_rectangle(longueur, largeur):
    return 2 * (longueur + largeur)
```

Appel de la fonction :

```python
perimetre = perimetre_rectangle(10, 5)
print(perimetre)  # Affiche 30
```

### 3.4 Fonctions sans paramètres

Vous pouvez également définir des fonctions sans paramètres. Par exemple, une fonction qui affiche un message :

```python
def afficher_message():
    print("Bonjour, bienvenue dans le cours de Python!")
```

Appel de la fonction :

```python
afficher_message()  # Affiche "Bonjour, bienvenue dans le cours de Python!"
```

## 4. Pièges Fréquents et Bonnes Pratiques

### 4.1 Oublier le mot-clé `return`

Une erreur courante est d'oublier le mot-clé `return` dans une fonction qui devrait renvoyer une valeur.

### 4.2 Noms de fonctions descriptifs

Choisissez des noms de fonctions qui décrivent clairement ce qu'elles font. Évitez les noms génériques comme `f` ou `func`.

### 4.3 Documenter vos fonctions

Utilisez des commentaires pour documenter ce que fait votre fonction, quels sont ses paramètres et ce qu'elle renvoie.

## 5. Synthèse Pédagogique

Les fonctions sont un élément essentiel de la programmation en Python. Elles permettent de rendre le code plus modularisé, réutilisable et facile à maintenir. En définissant et en appelant des fonctions, vous pouvez diviser vos programmes en tâches plus petites et plus gérables.

## 6. Exercice Pratique d'Application

### Énoncé

Écrivez une fonction `soustraction` qui prend deux paramètres `a` et `b` et renvoie leur différence. Ensuite, écrivez une fonction `calculer_aire_cercle` qui prend un paramètre `rayon` et renvoie l'aire du cercle (utilisez `3.14` comme valeur de π).

### Indices

- Pour la soustraction, utilisez l'opérateur `-`.
- Pour l'aire du cercle, utilisez la formule `aire = π * rayon^2`.

### Correction

```python
def soustraction(a, b):
    return a - b

def calculer_aire_cercle(rayon):
    return 3.14 * (rayon ** 2)

# Appel des fonctions
difference = soustraction(10, 4)
print(difference)  # Affiche 6

aire = calculer_aire_cercle(7)
print(aire)  # Affiche environ 153.86
```