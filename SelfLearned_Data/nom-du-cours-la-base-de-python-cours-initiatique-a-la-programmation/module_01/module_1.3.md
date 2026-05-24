# Module 1.3 : Entrées et sorties standards

## 1. Introduction Conceptuelle
Jusqu'à présent, nous avons appris à manipuler des données stockées directement dans notre code. Cependant, un programme informatique n'est réellement utile que lorsqu'il interagit avec l'utilisateur ou son environnement. 

Les "entrées et sorties standards" (souvent abrégées en **I/O** pour *Input/Output*) constituent le pont entre votre algorithme et le monde extérieur. L'entrée standard permet à l'utilisateur de fournir des informations au programme, tandis que la sortie standard permet au programme de communiquer ses résultats. Comprendre ces mécanismes est la première étape pour transformer un script statique en une application interactive.

## 2. Fondations Théoriques
En Python, l'interaction avec l'utilisateur repose sur deux fonctions natives essentielles :

*   **La sortie standard (`print`)** : Elle permet d'afficher des données dans la console. Par défaut, elle envoie le texte vers le flux `stdout`.
*   **L'entrée standard (`input`)** : Elle met le programme en pause et attend que l'utilisateur saisisse du texte au clavier, validé par la touche "Entrée". Elle lit le flux `stdin`.

**Point crucial :** La fonction `input()` renvoie *toujours* une chaîne de caractères (`str`), quel que soit ce que l'utilisateur tape. Si vous attendez un nombre pour effectuer un calcul, vous devrez convertir explicitement cette donnée (ce que nous verrons dans la section pratique).

## 3. Implémentation Pratique Pas-à-Pas

### Préparation de votre zone de travail
Avant de coder, créez un dossier dédié à ce module. Ouvrez votre éditeur de texte (ou IDE) et créez un fichier nommé `interaction.py`. La propreté de votre environnement est le premier signe d'un bon développeur.

### Étape 1 : Afficher des informations
La fonction `print()` peut prendre plusieurs arguments. Pour afficher plusieurs éléments, séparez-les par une virgule.

*Essayez d'écrire ceci dans votre fichier :*
```python
nom = "Étudiant"
print("Bonjour", nom, "bienvenue dans ce cours.")
```

### Étape 2 : Récupérer une saisie utilisateur
Pour demander une information, utilisez `input()` avec un message explicatif en argument.

*Ajoutez cette ligne :*
```python
age = input("Quel est votre âge ? ")
```

### Étape 3 : Conversion de type (Casting)
Puisque `age` est une chaîne de caractères, vous ne pouvez pas faire `age + 1`. Vous devez transformer cette valeur en entier (`int`).

*Complétez votre code :*
```python
age_int = int(age)
print("Dans un an, vous aurez", age_int + 1, "ans.")
```

## 4. Pièges Fréquents et Bonnes Pratiques

1.  **Le piège du type :** Oublier de convertir une entrée numérique. Si vous essayez d'additionner une chaîne de caractères avec un nombre, Python lèvera une `TypeError`.
2.  **La gestion des espaces :** La fonction `print()` ajoute automatiquement un espace entre les arguments séparés par des virgules. Si vous ne voulez pas cet espace, utilisez la concaténation avec `+` (en convertissant tout en `str` au préalable).
3.  **Clarté des messages :** Un bon programme doit toujours guider l'utilisateur. Un `input()` sans message explicatif ("?") est une mauvaise pratique car l'utilisateur ne sait pas qu'il doit taper quelque chose.

## 5. Synthèse Pédagogique
*   `print()` est votre fenêtre de sortie : elle communique l'état du programme.
*   `input()` est votre porte d'entrée : elle capture l'intention de l'utilisateur.
*   Le typage est dynamique, mais la conversion (le *casting*) est manuelle : `int()`, `float()`, `str()`.
*   *Note :* La manipulation de fichiers (lecture/écriture persistante) sera abordée dans le **Module 4.3**.

## 6. Exercice Pratique d'Application

### Énoncé
Écrivez un programme qui demande à l'utilisateur deux nombres, calcule leur somme, puis affiche le résultat sous la forme : "La somme de X et Y est égale à Z".

### Indices
1. Utilisez deux fois la fonction `input()`.
2. N'oubliez pas de convertir les deux saisies en `float` (pour accepter les nombres à virgule).
3. Utilisez la fonction `print()` en passant plusieurs arguments pour construire votre phrase.

### Correction
```python
# 1. Récupération des données
nombre1 = input("Entrez le premier nombre : ")
nombre2 = input("Entrez le second nombre : ")

# 2. Conversion et calcul
somme = float(nombre1) + float(nombre2)

# 3. Affichage du résultat
print("La somme de", nombre1, "et", nombre2, "est égale à", somme)
```