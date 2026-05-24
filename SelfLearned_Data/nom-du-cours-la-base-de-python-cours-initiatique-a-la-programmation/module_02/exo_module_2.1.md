# Exercices d'Application : Structures conditionnelles (if, elif, else)

## Exercice 1 : Le simulateur de remise commerciale
### Énoncé
Une boutique en ligne souhaite automatiser le calcul de ses remises. Écrivez un programme qui demande à l'utilisateur le montant total de son panier d'achat.
- Si le montant est supérieur ou égal à 100 €, le client bénéficie d'une remise de 10 %.
- Si le montant est inférieur à 100 €, aucune remise n'est appliquée.
Le programme doit afficher le montant final à payer après application de la remise (ou le montant initial si aucune remise n'est appliquée).

### Indices
1. Pour calculer une remise de 10 %, vous pouvez multiplier le montant par `0.9` ou soustraire `montant * 0.10`.
2. N'oubliez pas que `input()` renvoie une chaîne de caractères ; utilisez `float()` pour convertir le montant, car il peut contenir des centimes.

### Correction Détaillée
```python
# Demande du montant à l'utilisateur
montant = float(input("Entrez le montant de votre panier : "))

# Application de la logique conditionnelle
if montant >= 100:
    montant_final = montant * 0.9
    print(f"Remise appliquée ! Votre total est de : {montant_final} €")
else:
    print(f"Aucune remise. Votre total est de : {montant} €")
```

---

## Exercice 2 : Le système de classification des températures
### Énoncé
Vous travaillez sur une station météorologique. Écrivez un programme qui demande une température en degrés Celsius et affiche un message selon les catégories suivantes :
- Si la température est inférieure ou égale à 0 : "Il gèle."
- Si la température est comprise entre 1 et 15 (inclus) : "Il fait frais."
- Si la température est comprise entre 16 et 30 (inclus) : "Il fait bon."
- Si la température est strictement supérieure à 30 : "Il fait chaud."

### Indices
1. L'ordre des conditions est important. Si vous testez d'abord `température <= 30`, vous risquez d'exclure les cas inférieurs. Commencez par les bornes les plus basses ou les plus hautes.
2. Pour les intervalles, utilisez `elif` pour enchaîner les tests logiques.

### Correction Détaillée
```python
temp = float(input("Entrez la température actuelle : "))

if temp <= 0:
    print("Il gèle.")
elif temp <= 15:
    print("Il fait frais.")
elif temp <= 30:
    print("Il fait bon.")
else:
    print("Il fait chaud.")
```
*Note : Dans cette correction, l'ordre des `elif` permet de simplifier les conditions. Par exemple, si le programme arrive au `elif temp <= 15`, on sait déjà que la température est supérieure à 0.*

---

## Exercice 3 : Validateur de mot de passe
### Énoncé
Créez un script qui simule une vérification de mot de passe.
1. Définissez une variable `mot_de_passe_correct` contenant la chaîne `"Python2024"`.
2. Demandez à l'utilisateur de saisir son mot de passe.
3. Si la saisie correspond exactement à la variable, affichez "Accès autorisé".
4. Si la saisie est différente, affichez "Accès refusé".
5. **Bonus** : Si l'utilisateur laisse le champ vide (chaîne vide `""`), affichez "Le champ ne peut pas être vide".

### Indices
1. Utilisez l'opérateur de comparaison `==` pour vérifier l'égalité entre deux chaînes de caractères.
2. Pour le bonus, vous pouvez tester la longueur de la saisie avec `len(saisie) == 0` ou comparer directement `saisie == ""`.

### Correction Détaillée
```python
mot_de_passe_correct = "Python2024"
saisie = input("Veuillez entrer votre mot de passe : ")

# Vérification du champ vide en priorité
if saisie == "":
    print("Le champ ne peut pas être vide")
# Vérification de la validité
elif saisie == mot_de_passe_correct:
    print("Accès autorisé")
else:
    print("Accès refusé")
```