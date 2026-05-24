# Module 1.1 : Installation et premier programme

## 1. Introduction Conceptuelle

La programmation est l'art de donner des instructions à une machine pour qu'elle exécute des tâches complexes. Python, notre langage de choix, est un langage interprété : cela signifie qu'un logiciel appelé "interpréteur" lit votre code ligne par ligne et le traduit en actions compréhensibles par votre processeur.

Avant de coder, nous devons préparer notre "atelier". Un développeur rigoureux ne travaille pas dans le désordre. Nous allons installer l'interpréteur Python et configurer un éditeur de texte adapté, qui nous aidera à éviter les erreurs de syntaxe grâce à la coloration syntaxique.

## 2. Fondations Théoriques

Pour commencer, trois piliers sont nécessaires :
1. **L'Interpréteur Python** : C'est le moteur. Sans lui, votre ordinateur ne sait pas ce qu'est le code Python.
2. **L'Éditeur (IDE/Éditeur de texte)** : C'est votre interface de travail. Pour débuter, nous utiliserons un éditeur simple comme *VS Code* ou *PyCharm*, qui permettent de structurer vos fichiers proprement.
3. **Le Terminal (ou Console)** : C'est l'interface textuelle qui permet de communiquer directement avec le système d'exploitation pour lancer vos scripts.

**La règle d'or du développeur** : Un projet commence toujours par la création d'un dossier dédié. Ne mélangez jamais vos scripts de cours avec vos documents personnels.

## 3. Implémentation Pratique Pas-à-Pas

### Étape 1 : Préparation de l'espace de travail
Créez un dossier sur votre ordinateur nommé `Apprentissage_Python`. À l'intérieur, créez un sous-dossier nommé `Module_01`. C'est ici que nous stockerons nos premiers fichiers.

### Étape 2 : Vérification de l'installation
Ouvrez votre terminal (Invite de commande sous Windows, Terminal sous macOS/Linux) et tapez la commande suivante :
```bash
python --version
```
Si le système vous répond avec un numéro de version (ex: `Python 3.10.x`), vous êtes prêt. Sinon, téléchargez la dernière version sur [python.org](https://www.python.org/).

### Étape 3 : Création du premier script
1. Ouvrez votre éditeur de texte.
2. Créez un nouveau fichier nommé `hello.py`. L'extension `.py` est impérative pour que l'ordinateur reconnaisse le fichier comme du code Python.
3. Avant d'écrire, réfléchissez : nous voulons afficher un texte à l'écran. En Python, la fonction pour "sortir" une information vers la console est `print()`.

### Étape 4 : Écriture du code
Dans votre fichier `hello.py`, écrivez la ligne suivante :
```python
print("Bonjour, monde !")
```
*Note : Les guillemets sont obligatoires pour délimiter le texte (chaîne de caractères).*

### Étape 5 : Exécution
Retournez dans votre terminal, placez-vous dans le dossier `Module_01` avec la commande `cd` (Change Directory), puis exécutez :
```bash
python hello.py
```

## 4. Pièges Fréquents et Bonnes Pratiques

*   **L'extension de fichier** : Oublier le `.py` empêche l'exécution. Vérifiez toujours que votre éditeur n'a pas ajouté une extension cachée `.txt`.
*   **La casse (Majuscules/Minuscules)** : Python est sensible à la casse. `Print()` ne fonctionnera pas, seul `print()` est reconnu.
*   **Les guillemets** : Utilisez toujours des guillemets appariés (soit deux doubles `"`, soit deux simples `'`). Ne mélangez pas les deux.
*   **Bonne pratique** : Nommez toujours vos fichiers sans espaces ni caractères spéciaux (préférez `mon_programme.py` à `Mon Programme.py`).

## 5. Synthèse Pédagogique

*   Python est un langage interprété nécessitant l'installation de l'interpréteur.
*   Le terminal est l'outil indispensable pour lancer vos programmes.
*   La fonction `print()` est votre premier outil de communication avec l'utilisateur.
*   La rigueur dans l'organisation des dossiers est la première compétence d'un développeur professionnel.

## 6. Exercice Pratique d'Application

### Énoncé
Créez un nouveau fichier nommé `presentation.py` dans votre dossier `Module_01`. Votre programme doit afficher trois lignes distinctes dans la console :
1. Votre prénom.
2. Votre objectif en apprenant Python.
3. Le nom de ce cours.

### Indices
*   Vous aurez besoin d'utiliser la fonction `print()` trois fois.
*   Chaque appel à `print()` ajoute automatiquement un saut de ligne.

### Correction
```python
# Fichier presentation.py
print("Jean")
print("Devenir développeur web")
print("La base de Python")
```

*Ce module est désormais acquis. Dans le prochain module (1.2), nous apprendrons à stocker des informations dynamiques grâce aux variables.*