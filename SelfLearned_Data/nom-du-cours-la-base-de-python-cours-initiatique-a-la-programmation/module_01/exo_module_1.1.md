# Exercices d'Application : Installation et premier programme

Ce cahier d'exercices a pour but de valider votre maîtrise de l'environnement de développement et de la syntaxe de base de Python.

---

## Exercice 1 : Diagnostic et Environnement
### Énoncé
Avant de commencer à coder, un développeur doit s'assurer que son environnement est configuré correctement. 
1. Ouvrez votre terminal.
2. Vérifiez que Python est bien installé en tapant la commande appropriée.
3. Créez un dossier nommé `Exercices_Pratiques` dans votre répertoire de travail habituel, puis un sous-dossier `Module_1_1`.
4. Créez un fichier vide nommé `verif.py` à l'intérieur de ce dossier.

### Indices
*   Pour la vérification, rappelez-vous de la commande vue dans le cours qui affiche la version de Python.
*   Si vous êtes sous Windows, la commande pour créer un dossier est `mkdir NomDuDossier`. Sous Linux/macOS, c'est également `mkdir`.

### Correction Détaillée
1. **Vérification :** Tapez `python --version` (ou `python3 --version` sur certains systèmes macOS/Linux). Vous devriez voir s'afficher quelque chose comme `Python 3.x.x`.
2. **Organisation :**
   *   `mkdir Exercices_Pratiques`
   *   `cd Exercices_Pratiques`
   *   `mkdir Module_1_1`
   *   `cd Module_1_1`
3. **Création du fichier :** Ouvrez votre éditeur (VS Code par exemple), faites "Fichier > Nouveau fichier", puis enregistrez-le sous le nom `verif.py` dans le dossier créé.

---

## Exercice 2 : Le programme "Auto-Portrait"
### Énoncé
Dans le fichier `presentation.py` (ou un nouveau fichier nommé `portrait.py`), écrivez un programme qui affiche les informations suivantes en respectant scrupuleusement la casse et la syntaxe :
*   Ligne 1 : "--- Début du programme ---"
*   Ligne 2 : "Je m'appelle [Votre Prénom]"
*   Ligne 3 : "J'apprends Python pour automatiser mes tâches."
*   Ligne 4 : "--- Fin du programme ---"

### Indices
*   N'oubliez pas les guillemets `" "` autour de chaque chaîne de caractères.
*   Chaque ligne nécessite son propre appel à la fonction `print()`.
*   Faites attention à ne pas mettre de majuscule à `print`.

### Correction Détaillée
```python
# Fichier portrait.py

# On utilise print pour chaque ligne de texte
print("--- Début du programme ---")
print("Je m'appelle Alice") # Remplacez Alice par votre prénom
print("J'apprends Python pour automatiser mes tâches.")
print("--- Fin du programme ---")
```
*Note : Pour exécuter ce code, ouvrez le terminal dans le dossier contenant le fichier et tapez `python portrait.py`.*

---

## Exercice 3 : Débogage (Chasse aux erreurs)
### Énoncé
Votre collègue a tenté d'écrire un programme, mais il ne fonctionne pas. Identifiez et corrigez les **trois erreurs** présentes dans le code ci-dessous :

```python
Print("Bienvenue dans mon programme")
print("Ceci est une ligne de test)
print('Fin du programme")
```

### Indices
*   Observez bien la casse du mot-clé `print`.
*   Vérifiez la fermeture des guillemets à la fin de la deuxième ligne.
*   Vérifiez la cohérence des guillemets (simples vs doubles) sur la troisième ligne.

### Correction Détaillée
Voici le code corrigé :
```python
# 1. Correction de la casse : print au lieu de Print
print("Bienvenue dans mon programme") 

# 2. Ajout du guillemet fermant manquant
print("Ceci est une ligne de test") 

# 3. Harmonisation des guillemets (utiliser des doubles partout)
print("Fin du programme") 
```
**Explication des erreurs :**
1. Python est sensible à la casse : `Print` n'existe pas, c'est `print`.
2. Une chaîne de caractères doit être fermée par le même signe qui l'a ouverte.
3. On ne peut pas ouvrir avec un guillemet simple `'` et fermer avec un double `"`.