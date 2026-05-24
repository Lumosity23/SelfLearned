# Exercices d'Application : Variables, mutabilité et types de données de base

## Exercice 1 : Le Convertisseur de Devises Sécurisé (Difficulté : Facile)

### Énoncé
Vous devez concevoir un petit module pour une application financière. Ce module doit gérer le solde d'un utilisateur, appliquer un bonus de fidélité, puis convertir ce solde dans une autre devise (le Yen japonais, JPY) sous forme d'un entier arrondi, car le Yen n'utilise pas de centimes.

1. Déclarez une constante globale `TAUX_EUR_TO_JPY` de type `f64` égale à `162.45`.
2. Dans la fonction `main` :
   * Déclarez un solde initial immuable `solde_initial` de `120.50` euros.
   * Déclarez un bonus de fidélité immuable `bonus` de `15.00` euros.
   * Déclarez une variable mutable `solde_courant` initialisée avec la valeur de `solde_initial`.
   * Ajoutez le `bonus` au `solde_courant`.
   * Calculez la valeur convertie en Yen (multiplication du `solde_courant` par le taux de conversion).
   * Utilisez le **masquage (shadowing)** pour convertir cette valeur en Yen (qui est un `f64`) en un entier non signé de 32 bits (`u32`) afin d'obtenir une valeur arrondie (tronquée).
3. Affichez le solde final en Euros et le solde converti en Yen avec leurs symboles respectifs (`€` et `¥`).

### Indices
* Pour ajouter le bonus, utilisez l'opérateur d'assignation combiné `+=`.
* Pour convertir un type en un autre (par exemple de `f64` à `u32`), utilisez le mot-clé `as` : `let variable_entiere = variable_flottante as u32;`.
* Le symbole du Yen `¥` et de l'Euro `€` peuvent être affichés directement dans vos chaînes de caractères de formatage `println!()`.

### Correction Détaillée

```rust
// 1. Déclaration de la constante globale pour le taux de change
const TAX_EUR_TO_JPY: f64 = 162.45;

fn main() {
    // 2. Déclaration des variables de base
    let solde_initial: f64 = 120.50;
    let bonus: f64 = 15.00;

    // Utilisation de 'mut' car le solde va être modifié par le bonus
    let mut solde_courant = solde_initial;
    solde_courant += bonus;

    // Calcul de la conversion en JPY (le résultat est temporairement un f64)
    let solde_jpy = solde_courant * TAX_EUR_TO_JPY;

    // Masquage (Shadowing) : on réutilise le nom 'solde_jpy' pour changer son type en u32
    let solde_jpy: u32 = solde_jpy as u32;

    // 3. Affichage des résultats
    println!("--- Relevé de Compte ---");
    println!("Solde initial : {:.2} €", solde_initial);
    println!("Bonus appliqué : {:.2} €", bonus);
    println!("Nouveau solde : {:.2} €", solde_courant);
    println!("Solde converti : {} ¥", solde_jpy);
}
```

---

## Exercice 2 : Analyseur de Données d'une Station Météo (Difficulté : Moyenne)

### Énoncé
Une station météo locale enregistre les températures d'une ville sur une semaine (7 jours). Vous devez écrire un programme qui stocke ces données, extrait des mesures spécifiques, calcule la variation de température et produit un rapport résumé sous forme de tuple.

1. Déclarez une constante `VILLE` contenant le nom de la ville étudiée (ex: `"Strasbourg"`).
2. Créez un tableau contenant les températures (de type `f32`) relevées du lundi au dimanche : `14.2`, `15.5`, `13.8`, `12.0`, `11.5`, `14.8`, `16.2`.
3. Calculez la température moyenne de la semaine. (Puisque nous n'avons pas encore vu les boucles, faites la somme manuellement en accédant aux index du tableau).
4. Calculez la différence de température (delta) entre le jour le plus chaud (dimanche) et le jour le plus froid (vendredi) en accédant directement aux éléments du tableau par leur index.
5. Stockez les résultats dans un tuple nommé `rapport` contenant :
   * Le nom de la ville (`&str`)
   * La température moyenne (`f32`)
   * Le delta de température (`f32`)
6. Affichez les informations du rapport en utilisant la **déstructuration de tuple**, puis en utilisant l'**accès direct par point** (`.`).

### Indices
* Les index d'un tableau de taille 7 vont de `0` à `6`. Le vendredi correspond à l'index `4` et le dimanche à l'index `6`.
* La déstructuration d'un tuple se fait ainsi : `let (a, b, c) = mon_tuple;`.
* L'accès direct par point se fait ainsi : `mon_tuple.0` pour le premier élément.

### Correction Détaillée

```rust
const VILLE: &str = "Strasbourg";

fn main() {
    // 1. Tableau des températures de la semaine (taille fixe de 7)
    let temperatures: [f32; 7] = [14.2, 15.5, 13.8, 12.0, 11.5, 14.8, 16.2];

    // 2. Calcul manuel de la moyenne
    let somme = temperatures[0]
        + temperatures[1]
        + temperatures[2]
        + temperatures[3]
        + temperatures[4]
        + temperatures[5]
        + temperatures[6];
    let moyenne = somme / 7.0;

    // 3. Calcul du delta entre le dimanche (index 6) et le vendredi (index 4)
    let temp_max = temperatures[6]; // 16.2
    let temp_min = temperatures[4]; // 11.5
    let delta = temp_max - temp_min;

    // 4. Création du tuple de rapport
    let rapport = (VILLE, moyenne, delta);

    // 5. Affichage via la déstructuration de tuple
    let (ville_nom, temp_moyenne, temp_delta) = rapport;
    println!("--- Rapport Météo (Déstructuration) ---");
    println!("Ville : {}", ville_nom);
    println!("Température moyenne : {:.1} °C", temp_moyenne);
    println!("Amplitude thermique : {:.1} °C", temp_delta);

    // 6. Affichage via l'accès direct par point (pour démonstration)
    println!("\n--- Rapport Météo (Accès direct) ---");
    println!("Ville cible : {}", rapport.0);
    println!("Moyenne calculée : {:.1} °C", rapport.1);
}
```

---

## Exercice 3 : Gestionnaire d'Expérience de Jeu Rétro (Difficulté : Avancée)

### Énoncé
Dans les consoles de jeux vidéo rétro (comme la NES), la mémoire était très limitée. Les concepteurs utilisaient souvent des entiers non signés de 8 bits (`u8`) pour stocker les statistiques comme les points d'expérience (XP). Un `u8` ne peut pas dépasser la valeur `255`. 

Vous devez concevoir un système de gestion d'XP qui simule un gain de points et gère de manière sécurisée le risque de dépassement de capacité (*integer overflow*), afin d'éviter que le jeu ne plante (panic) ou que l'XP du joueur ne retombe à zéro de façon injuste.

1. Déclarez une variable mutable `xp_actuelle` de type `u8` initialisée à `245`.
2. Déclarez une variable `xp_gagne` de type `u8` égale à `20`.
3. Si vous tentez de faire `xp_actuelle + xp_gagne` directement en mode Debug, le programme va planter. Pour éviter cela, utilisez la méthode de la bibliothèque standard `overflowing_add`.
4. La méthode `overflowing_add` renvoie un tuple contenant deux valeurs : `(resultat_calcule, a_depasse)`. Le premier élément est le résultat de l'addition (avec bouclage si dépassement), le second est un booléen valant `true` s'il y a eu dépassement.
5. Récupérez ce tuple en le déstructurant.
6. Affichez le résultat. Si un dépassement a eu lieu, affichez un message indiquant que le joueur a atteint le niveau maximum et forcez manuellement sa valeur d'XP à `255` (le maximum pour un `u8`).

### Indices
* La syntaxe pour appeler la méthode de dépassement sur un entier est : `let (nouveau_score, a_depasse) = xp_actuelle.overflowing_add(xp_gagne);`.
* Bien que nous n'ayons pas formellement étudié les structures conditionnelles `if` dans ce module, elles s'utilisent comme dans la plupart des langages : `if condition { ... } else { ... }`. Utilisez-les pour plafonner l'XP à `255` si `a_depasse` est vrai.

### Correction Détaillée

```rust
fn main() {
    // 1. Initialisation de l'XP proche de la limite d'un u8 (max 255)
    let mut xp_actuelle: u8 = 245;
    let xp_gagne: u8 = 20;

    println!("XP Actuelle : {} / 255", xp_actuelle);
    println!("Points d'XP gagnés : {}", xp_gagne);

    // 2. Utilisation de overflowing_add pour éviter le crash (panic) du programme
    // Cette méthode retourne un tuple : (valeur_bouclee, bool_depassement)
    let (resultat, a_depasse) = xp_actuelle.overflowing_add(xp_gagne);

    // 3. Traitement du dépassement de capacité
    if a_depasse {
        println!("\n[ATTENTION] Dépassement de capacité détecté ! (Calcul brut bouclé à : {})", resultat);
        println!("Félicitations, vous avez atteint le niveau maximum !");
        // On plafonne manuellement l'XP à la valeur maximale autorisée par le type u8
        xp_actuelle = 255;
    } else {
        println!("\nGain d'XP validé sans dépassement.");
        xp_actuelle = resultat;
    }

    // 4. Affichage du statut final du joueur
    println!("Statut final - XP du joueur : {} / 255", xp_actuelle);
}
```