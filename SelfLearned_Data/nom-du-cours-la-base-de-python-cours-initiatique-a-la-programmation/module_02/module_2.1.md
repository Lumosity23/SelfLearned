# Module 2.1 : Structures conditionnelles (if, elif, else)

## 1. Introduction Conceptuelle

Jusqu'à présent, vos programmes Python s'exécutaient de manière linéaire : chaque ligne était lue et exécutée l'une après l'autre, sans déviation. Cependant, la puissance de l'informatique réside dans sa capacité à **prendre des décisions**.

Imaginez un programme qui vérifie si un utilisateur est majeur pour accéder à un contenu, ou qui calcule une remise différente selon le montant d'un panier d'achat. Pour réaliser cela, nous devons introduire des "aiguillages" dans notre code. C'est le rôle des structures conditionnelles : elles permettent d'exécuter des blocs d'instructions spécifiques uniquement si une condition donnée est vraie.

## 2. Fondations Théoriques

En Python, la prise de décision repose sur l'évaluation d'expressions booléennes. Une expression booléenne est une instruction qui ne peut avoir que deux résultats : `True` (Vrai) ou `False` (Faux).

### Les opérateurs de comparaison
Pour construire ces conditions, nous utilisons les opérateurs de comparaison :
* `==` : Égal à
* `!=` : Différent de
* `>` : Strictement supérieur à
* `<` : Strictement inférieur à
* `>=` : Supérieur ou égal à
* `<=` : Inférieur ou égal à

### La logique du bloc
Python utilise l'**indentation** (le décalage vers la droite, généralement 4 espaces) pour définir quels blocs de code appartiennent à quelle condition. C'est une règle syntaxique stricte : sans indentation correcte, votre programme ne s'exécutera pas.

## 3. Implémentation Pratique Pas-à-Pas

Avant de coder, préparez votre environnement : créez un nouveau fichier nommé `conditions.py` dans votre dossier de travail. Assurez-vous d'utiliser un éditeur de texte qui gère l'indentation automatique.

### Étape 1 : La structure simple (`if`)
La structure `if` est la plus basique. Si la condition est vraie, le bloc est exécuté. Sinon, il est ignoré.

```python
age = 20
if age >= 18:
    print("Vous êtes majeur.")
```

### Étape 2 : L'alternative (`else`)
Que faire si la condition est fausse ? Nous utilisons `else`. Il ne prend pas de condition, car il capture tous les cas restants.

```python
age = 15
if age >= 18:
    print("Accès autorisé.")
else:
    print("Accès refusé.")
```

### Étape 3 : La cascade de conditions (`elif`)
Lorsque vous avez plus de deux possibilités, utilisez `elif` (contraction de "else if").

```python
note = 14
if note >= 16:
    print("Mention Très Bien")
elif note >= 14:
    print("Mention Bien")
else:
    print("Mention passable ou échec")
```

## 4. Pièges Fréquents et Bonnes Pratiques

* **L'oubli des deux-points (`:`)** : C'est l'erreur la plus courante. Chaque ligne `if`, `elif` ou `else` doit se terminer par un `:`, sinon Python lèvera une `SyntaxError`.
* **Confusion entre `=` et `==`** : Le signe `=` sert à l'affectation (donner une valeur à une variable), tandis que `==` sert à la comparaison.
* **L'indentation incohérente** : Ne mélangez jamais tabulations et espaces. Utilisez 4 espaces pour chaque niveau d'indentation.
* **Lisibilité** : Évitez les conditions trop complexes. Si vous avez besoin de tester trop de variables, il est préférable de diviser votre logique en plusieurs étapes.

## 5. Synthèse Pédagogique

* Le `if` définit le point d'entrée d'une décision.
* Le `elif` permet d'ajouter des conditions intermédiaires.
* Le `else` sert de filet de sécurité pour tous les cas non traités.
* L'indentation est le langage visuel de Python : elle structure la hiérarchie de votre logique.

*Note : La gestion de conditions multiples complexes avec des opérateurs logiques (`and`, `or`, `not`) sera abordée dans un module ultérieur.*

## 6. Exercice Pratique d'Application

### Énoncé
Écrivez un programme qui demande à l'utilisateur de saisir un nombre entier. Le programme doit afficher :
1. "Le nombre est positif" si le nombre est supérieur à 0.
2. "Le nombre est négatif" si le nombre est inférieur à 0.
3. "Le nombre est nul" si le nombre est exactement 0.

### Indices
1. Utilisez la fonction `input()` pour récupérer la saisie (n'oubliez pas de convertir la valeur en `int()`).
2. Utilisez une structure `if`, `elif`, `else`.

### Correction
```python
# 1. Préparation : récupération de la donnée
nombre = int(input("Entrez un nombre entier : "))

# 2. Logique de décision
if nombre > 0:
    print("Le nombre est positif")
elif nombre < 0:
    print("Le nombre est négatif")
else:
    print("Le nombre est nul")
```