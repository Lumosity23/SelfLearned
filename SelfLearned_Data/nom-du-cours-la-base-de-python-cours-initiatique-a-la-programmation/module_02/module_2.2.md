# Module 2.2 : Boucles et itérations (for, while)

## 1. Introduction Conceptuelle

Dans le module précédent, nous avons appris à diriger le flux d'exécution d'un programme selon des conditions logiques. Cependant, la puissance réelle de l'informatique réside dans sa capacité à répéter des tâches fastidieuses sans erreur humaine. 

Imaginez que vous deviez traiter les notes de 1 000 étudiants. Écrire 1 000 fois la même instruction serait inefficace et sujet à erreur. Les **boucles** sont les structures de contrôle qui permettent d'exécuter un bloc de code plusieurs fois tant qu'une condition est vraie ou sur une séquence d'éléments. C'est le pilier fondamental de l'automatisation.

## 2. Fondations Théoriques

Il existe deux types de boucles en Python, chacune répondant à un besoin spécifique :

*   **La boucle `while` (Tant que) :** Elle est utilisée lorsque le nombre d'itérations n'est pas connu à l'avance. Elle continue de s'exécuter tant qu'une condition booléenne reste vraie.
*   **La boucle `for` (Pour chaque) :** Elle est utilisée pour parcourir une séquence (comme une liste, une chaîne de caractères ou une plage de nombres). Elle est idéale lorsque vous connaissez le nombre d'itérations ou que vous devez itérer sur une collection de données.

**Attention :** Une mauvaise gestion de la condition de sortie dans une boucle `while` peut mener à une "boucle infinie", où le programme ne s'arrête jamais, consommant toutes les ressources système.

## 3. Implémentation Pratique Pas-à-Pas

### Préparation de la zone de travail
Avant de coder, créez un nouveau fichier nommé `boucles.py`. Assurez-vous que votre éditeur est configuré pour utiliser 4 espaces pour l'indentation, une convention stricte en Python pour définir les blocs de code.

### La boucle `while`
Pour construire une boucle `while`, nous avons besoin de trois éléments :
1. Une variable d'initialisation.
2. Une condition de test.
3. Une instruction de mise à jour (pour éviter la boucle infinie).

*Exemple :*
```python
compteur = 1
while compteur <= 5:
    print(f"Itération numéro {compteur}")
    compteur += 1  # Mise à jour cruciale
```

### La boucle `for`
La boucle `for` est plus concise. Elle utilise souvent la fonction `range()` pour générer une séquence de nombres.

*Exemple :*
```python
for i in range(1, 6):
    print(f"Valeur de i : {i}")
```

## 4. Pièges Fréquents et Bonnes Pratiques

1.  **L'oubli de l'incrémentation :** Dans un `while`, si vous oubliez de modifier la variable de contrôle, la boucle ne s'arrêtera jamais.
2.  **Indentation incorrecte :** Tout code faisant partie de la boucle doit être décalé vers la droite. Si une ligne n'est pas indentée, elle sera exécutée *après* la fin de la boucle.
3.  **Utilisation de `range()` :** Rappelez-vous que `range(start, stop)` s'arrête *avant* la valeur `stop`. `range(0, 5)` génère les nombres 0, 1, 2, 3, 4.
4.  **Lisibilité :** Utilisez des noms de variables explicites (ex: `etudiant` plutôt que `e`) pour rendre votre code auto-documenté.

## 5. Synthèse Pédagogique

*   Utilisez `for` lorsque vous parcourez une collection ou un nombre défini d'étapes.
*   Utilisez `while` lorsque la condition d'arrêt dépend d'un événement externe ou d'un calcul dynamique.
*   L'indentation est la syntaxe qui définit le bloc répétitif.
*   La gestion des boucles est le premier pas vers l'optimisation algorithmique.

*Note : La manipulation avancée des listes avec des boucles sera approfondie dans le Module 3.1.*

## 6. Exercice Pratique d'Application

### Énoncé
Écrivez un programme qui demande à l'utilisateur de saisir un nombre entier positif. Le programme doit ensuite afficher tous les nombres pairs de 0 jusqu'à ce nombre inclus, en utilisant une boucle `for`.

### Indices
1. Utilisez `input()` pour récupérer la saisie (n'oubliez pas de convertir en `int`).
2. La fonction `range()` possède un troisième argument optionnel : le "pas" (step). `range(0, n + 1, 2)` permet de sauter de 2 en 2.

### Correction
```python
# Demande de saisie
nombre = int(input("Entrez un nombre entier positif : "))

# Vérification simple (optionnel mais recommandé)
if nombre < 0:
    print("Veuillez entrer un nombre positif.")
else:
    # Boucle pour afficher les pairs
    for i in range(0, nombre + 1, 2):
        print(i)
```