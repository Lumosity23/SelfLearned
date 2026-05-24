# Exercices d'Application : Variables, types de données et opérateurs

## Exercice 1 : Conversion de devises simplifiée
### Énoncé
Vous travaillez sur une application de voyage. Vous devez convertir un montant en Euros vers une autre devise.
1. Déclarez une variable `montant_euros` avec la valeur `50`.
2. Déclarez une variable `taux_change` avec la valeur `1.08` (pour convertir en Dollars).
3. Calculez le montant en dollars dans une variable nommée `montant_dollars`.
4. Affichez le résultat final.

### Indices
*   Le calcul à effectuer est une multiplication : `montant_euros * taux_change`.
*   N'oubliez pas d'utiliser la fonction `print()` pour afficher votre variable finale.

### Correction Détaillée
```python
# 1. Déclaration des variables
montant_euros = 50
taux_change = 1.08

# 2. Calcul de la conversion
montant_dollars = montant_euros * taux_change

# 3. Affichage du résultat
print("Montant en dollars :", montant_dollars)
```

---

## Exercice 2 : Gestion d'un panier d'achat
### Énoncé
Vous gérez le panier d'un site e-commerce.
1. Déclarez deux variables pour les prix des articles : `prix_article_1 = 12.50` et `prix_article_2 = 8.25`.
2. Calculez le `total_panier` en additionnant les deux prix.
3. Appliquez une remise de 2 euros sur le total (utilisez l'opérateur de soustraction).
4. Vérifiez si le panier est pair ou impair en utilisant le modulo `% 2` sur le prix total (arrondi à l'entier). Affichez le reste de cette opération.

### Indices
*   Pour obtenir la partie entière d'un nombre, vous pouvez utiliser la conversion `int()`. Exemple : `int(15.75)` donne `15`.
*   L'opérateur modulo (`%`) renvoie le reste de la division euclidienne. Si `x % 2` vaut `0`, le nombre est pair.

### Correction Détaillée
```python
# 1. Déclaration des prix
prix_article_1 = 12.50
prix_article_2 = 8.25

# 2. Calcul du total
total_panier = prix_article_1 + prix_article_2

# 3. Application de la remise
total_panier -= 2  # Équivaut à total_panier = total_panier - 2

# 4. Calcul du modulo sur la partie entière
total_entier = int(total_panier)
reste = total_entier % 2

print("Total après remise :", total_panier)
print("Reste de la division par 2 (partie entière) :", reste)
```

---

## Exercice 3 : Analyse de données temporelles
### Énoncé
Vous avez une durée en minutes (ex: `145` minutes) et vous souhaitez la convertir en heures et minutes.
1. Déclarez une variable `duree_totale_minutes = 145`.
2. Calculez le nombre d'heures entières en utilisant la division entière `//`.
3. Calculez le nombre de minutes restantes en utilisant l'opérateur modulo `%`.
4. Affichez le résultat sous la forme : "Cela correspond à X heures et Y minutes".

### Indices
*   La division entière `//` permet d'obtenir le quotient sans la virgule.
*   Le modulo `%` permet d'isoler le reste de la division par 60.

### Correction Détaillée
```python
# 1. Déclaration de la durée
duree_totale_minutes = 145

# 2. Calcul des heures (division entière par 60)
heures = duree_totale_minutes // 60

# 3. Calcul des minutes restantes (modulo 60)
minutes = duree_totale_minutes % 60

# 4. Affichage du résultat
print("Cela correspond à", heures, "heures et", minutes, "minutes.")
```