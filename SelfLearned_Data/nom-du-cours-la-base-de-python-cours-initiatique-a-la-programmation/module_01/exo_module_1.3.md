# Exercices d'Application : Entrées et sorties standards

Ce cahier d'exercices a pour but de consolider vos acquis sur l'interaction utilisateur via la console en Python.

---

## Exercice 1 : Le convertisseur de distance
### Énoncé
Créez un programme qui demande à l'utilisateur une distance en **miles** (sous forme de nombre décimal). Le programme doit ensuite convertir cette distance en **kilomètres** sachant qu'un mile équivaut à 1,60934 kilomètres. Le résultat doit être affiché avec un message clair.

### Indices
1. La saisie utilisateur doit être convertie en `float` pour permettre les calculs mathématiques.
2. N'oubliez pas de définir votre facteur de conversion (1.60934) dans une variable pour rendre votre code plus lisible.

### Correction Détaillée
```python
# 1. Demander la distance à l'utilisateur
miles_str = input("Entrez la distance en miles : ")

# 2. Conversion de la saisie en nombre décimal (float)
miles = float(miles_str)

# 3. Calcul de la conversion
facteur_conversion = 1.60934
kilometres = miles * facteur_conversion

# 4. Affichage du résultat
print(miles, "miles correspondent à", kilometres, "kilomètres.")
```

---

## Exercice 2 : La carte d'identité numérique
### Énoncé
Écrivez un script qui demande successivement : le prénom, le nom et l'année de naissance de l'utilisateur. Le programme doit ensuite afficher une "fiche" récapitulative formatée comme suit :
*   "Utilisateur : [NOM] [Prénom]"
*   "Âge approximatif : [Âge calculé]"
*(Note : Pour l'âge, considérez que nous sommes en 2024).*

### Indices
1. Pour le nom et le prénom, aucune conversion n'est nécessaire car `input()` renvoie déjà une chaîne de caractères.
2. Pour l'âge, soustrayez l'année saisie de 2024. Attention, vous devrez convertir l'année saisie en `int`.

### Correction Détaillée
```python
# 1. Collecte des informations
prenom = input("Entrez votre prénom : ")
nom = input("Entrez votre nom : ")
annee_naissance = input("Entrez votre année de naissance : ")

# 2. Calcul de l'âge
annee_actuelle = 2024
age = annee_actuelle - int(annee_naissance)

# 3. Affichage formaté
print("--- Fiche Utilisateur ---")
print("Utilisateur :", nom.upper(), prenom) # .upper() met le nom en majuscules
print("Âge approximatif :", age, "ans")
```

---

## Exercice 3 : Le calcul de moyenne pondérée
### Énoncé
Créez un programme qui demande à l'utilisateur deux notes (sur 20) et leurs coefficients respectifs. Le programme doit calculer la moyenne pondérée et afficher le résultat. 
*Formule : `((note1 * coeff1) + (note2 * coeff2)) / (coeff1 + coeff2)`*

### Indices
1. Vous aurez besoin de 4 appels à la fonction `input()`.
2. Soyez vigilant avec les parenthèses lors du calcul de la moyenne pour respecter les priorités opératoires.

### Correction Détaillée
```python
# 1. Saisie des données
note1 = float(input("Note 1 : "))
coeff1 = float(input("Coefficient 1 : "))
note2 = float(input("Note 2 : "))
coeff2 = float(input("Coefficient 2 : "))

# 2. Calcul de la moyenne pondérée
# On utilise des parenthèses pour isoler le numérateur et le dénominateur
moyenne = ((note1 * coeff1) + (note2 * coeff2)) / (coeff1 + coeff2)

# 3. Affichage
print("La moyenne pondérée est de :", moyenne)
```