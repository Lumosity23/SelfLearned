# Exercices d'Application : Boucles et itérations (for, while)

## Exercice 1 : Le compte à rebours sécurisé
### Énoncé
Vous travaillez sur un système de lancement de fusée. Vous devez créer un programme qui demande à l'utilisateur de saisir un nombre entier de départ pour le compte à rebours. Le programme doit afficher chaque seconde (le nombre) et terminer par "Décollage !". 

**Contrainte :** Si l'utilisateur saisit un nombre supérieur à 10, le programme doit refuser et redemander une saisie tant que le nombre n'est pas compris entre 1 et 10. Utilisez une boucle `while` pour gérer cette validation.

### Indices
1. Utilisez une boucle `while` pour vérifier si `nombre > 10` ou `nombre < 1`.
2. Une fois le nombre valide, utilisez une seconde boucle (ou une logique de décrémentation) pour afficher les chiffres jusqu'à 0.

### Correction Détaillée
```python
# 1. Validation de la saisie
nombre = int(input("Entrez un nombre de départ (entre 1 et 10) : "))

while nombre < 1 or nombre > 10:
    print("Erreur : Le nombre doit être compris entre 1 et 10.")
    nombre = int(input("Réessayez : "))

# 2. Compte à rebours
while nombre >= 0:
    print(nombre)
    nombre -= 1

print("Décollage !")
```

---

## Exercice 2 : La table de multiplication dynamique
### Énoncé
Créez un programme qui demande à l'utilisateur de saisir un nombre entier. Le programme doit ensuite afficher la table de multiplication de ce nombre, de 1 à 10, en utilisant une boucle `for`. 

*Exemple pour 5 :*
5 x 1 = 5
5 x 2 = 10
...
5 x 10 = 50

### Indices
1. La fonction `range()` doit aller jusqu'à 11 pour inclure le nombre 10 (rappel : `range` s'arrête avant la borne supérieure).
2. Utilisez une f-string pour formater l'affichage : `print(f"{nombre} x {i} = {resultat}")`.

### Correction Détaillée
```python
# Demande du nombre
n = int(input("Entrez un nombre pour afficher sa table de multiplication : "))

# Boucle de 1 à 10
for i in range(1, 11):
    resultat = n * i
    print(f"{n} x {i} = {resultat}")
```

---

## Exercice 3 : Somme des nombres jusqu'à l'arrêt
### Énoncé
Écrivez un programme qui demande continuellement à l'utilisateur de saisir des nombres. Le programme doit additionner ces nombres au fur et à mesure. Si l'utilisateur saisit le nombre `0`, la boucle doit s'arrêter et le programme doit afficher la somme totale de tous les nombres saisis précédemment.

### Indices
1. Initialisez une variable `somme = 0` avant la boucle.
2. Utilisez une boucle `while True` (boucle infinie) et utilisez l'instruction `break` pour sortir de la boucle lorsque la condition `nombre == 0` est rencontrée.

### Correction Détaillée
```python
somme = 0

while True:
    nombre = int(input("Entrez un nombre à additionner (0 pour arrêter) : "))
    
    # Condition de sortie
    if nombre == 0:
        break
    
    # Mise à jour de la somme
    somme += nombre

print(f"La somme totale est : {somme}")
```