# Lecture et écriture de fichiers

## 1. Introduction Conceptuelle

Dans ce module, nous allons explorer comment Python permet la lecture et l'écriture de fichiers. La manipulation de fichiers est une compétence essentielle pour tout programmeur, car elle permet de stocker et de récupérer des données de manière persistante. Nous allons voir comment ouvrir un fichier, lire son contenu, écrire dedans, et gérer les erreurs qui peuvent survenir lors de ces opérations.

## 2. Fondations Théoriques

### 2.1. Types de Fichiers
Les fichiers peuvent être de différents types, mais les plus courants sont les fichiers texte (`.txt`) et les fichiers binaires. Les fichiers texte contiennent des caractères lisibles, tandis que les fichiers binaires contiennent des données non lisibles directement par un humain.

### 2.2. Modes d'Ouverture
Lors de l'ouverture d'un fichier, il est important de spécifier le mode d'ouverture. Les modes les plus couramment utilisés sont :
- `'r'` : Lecture (default). Le fichier doit exister.
- `'w'` : Écriture. Le fichier est créé s'il n'existe pas, sinon son contenu est écrasé.
- `'a'` : Ajout. Les données sont ajoutées à la fin du fichier. Le fichier est créé s'il n'existe pas.
- `'b'` : Mode binaire. Peut être combiné avec les modes ci-dessus (par exemple, `'rb'` pour la lecture en mode binaire).

## 3. Implémentation Pratique Pas-à-Pas

### 3.1. Ouverture d'un Fichier
Pour ouvrir un fichier, nous utilisons la fonction intégrée `open()`. Voici un exemple de lecture d'un fichier texte :

```python
with open('example.txt', 'r') as file:
    content = file.read()
    print(content)
```

### 3.2. Écriture dans un Fichier
Pour écrire dans un fichier, nous ouvrons le fichier en mode écriture (`'w'`) ou ajout (`'a'`). Voici un exemple d'écriture dans un fichier :

```python
with open('example.txt', 'w') as file:
    file.write("Hello, World!")
```

### 3.3. Lecture Ligne par Ligne
Pour lire un fichier ligne par ligne, nous pouvons utiliser une boucle `for` :

```python
with open('example.txt', 'r') as file:
    for line in file:
        print(line, end='')  # end='' pour éviter les doublons de sauts de ligne
```

### 3.4. Utilisation de `readlines()`
La méthode `readlines()` lit toutes les lignes d'un fichier et les retourne sous forme de liste :

```python
with open('example.txt', 'r') as file:
    lines = file.readlines()
    for line in lines:
        print(line, end='')
```

## 4. Pièges Fréquents et Bonnes Pratiques

### 4.1. Gestion des Erreurs
Il est important de gérer les erreurs qui peuvent survenir lors de la manipulation de fichiers. Par exemple, le fichier peut ne pas exister, ou vous n'avez pas les permissions nécessaires pour le lire ou l'écrire. Utilisez des blocs `try-except` pour gérer ces situations :

```python
try:
    with open('non_existent_file.txt', 'r') as file:
        content = file.read()
except FileNotFoundError:
    print("Le fichier n'existe pas.")
```

### 4.2. Fermeture du Fichier
Bien que l'utilisation de `with` garantisse la fermeture du fichier, il est bon de savoir que vous pouvez fermer manuellement un fichier en appelant la méthode `close()` :

```python
file = open('example.txt', 'r')
content = file.read()
file.close()
```

## 5. Synthèse Pédagogique

La manipulation de fichiers en Python est une tâche courante et essentielle. En utilisant les fonctions `open()`, `read()`, `write()`, et en gérant correctement les erreurs, vous pouvez lire et écrire dans des fichiers de manière efficace et sécurisée. Rappelez-vous d'utiliser le gestionnaire de contexte `with` pour vous assurer que les fichiers sont correctement fermés après leur utilisation.

## 6. Exercice Pratique d'Application

### Énoncé
Créez un programme Python qui fait les tâches suivantes :
1. Ouvre un fichier texte nommé `data.txt`.
2. Lit le contenu du fichier ligne par ligne et imprime chaque ligne.
3. Écrit une nouvelle ligne à la fin du fichier.

### Indices
- Utilisez la fonction `open()` avec le mode `'r'` pour la lecture et `'a'` pour l'ajout.
- Utilisez une boucle `for` pour lire le fichier ligne par ligne.
- Utilisez la méthode `write()` pour ajouter une nouvelle ligne.

### Correction

```python
# Étape 1: Lire le fichier ligne par ligne
try:
    with open('data.txt', 'r') as file:
        for line in file:
            print(line, end='')
except FileNotFoundError:
    print("Le fichier data.txt n'existe pas.")

# Étape 2: Écrire une nouvelle ligne dans le fichier
with open('data.txt', 'a') as file:
    file.write("\nNouvelle ligne ajoutée.")
```