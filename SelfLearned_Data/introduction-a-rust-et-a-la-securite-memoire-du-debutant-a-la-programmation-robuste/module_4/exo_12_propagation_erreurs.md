# Exercices d'Application : Propagation propre des erreurs avec l'opérateur '?'

Ce cahier d'exercices a pour objectif de consolider votre maîtrise de l'opérateur `?` en Rust. À travers trois exercices de difficulté progressive, vous apprendrez à convertir des `Option` en `Result`, à manipuler des types d'erreurs multiples et à structurer un programme complet avec un point d'entrée `main` sécurisé.

---

## Exercice 1 : Récupération de Clé d'API (Option vers Result)
*Difficulté : Facile*

### Énoncé
Dans les applications réelles, les configurations sont souvent stockées sous forme de paires clé-valeur. Vous devez concevoir une fonction qui recherche une clé d'API spécifique (`"API_KEY"`) dans une table de hachage (`HashMap`).

Cependant, la méthode `.get()` d'une `HashMap` renvoie une `Option<&V>`. Votre objectif est d'écrire une fonction `recuperer_cle` qui :
1. Cherche la clé `"API_KEY"` dans la configuration fournie.
2. Si la clé est présente, renvoie sa valeur sous forme de `String`.
3. Si la clé est absente, **convertit l'absence en erreur** avec un message explicite (`"Clé d'API manquante dans la configuration"`) et propage cette erreur sous forme de `Result<String, String>`.

### Indices
1. Pour convertir une `Option<T>` en `Result<T, E>`, utilisez la méthode `.ok_or(erreur)`.
2. N'oubliez pas d'utiliser l'opérateur `?` après la conversion pour extraire la valeur ou propager l'erreur immédiatement.
3. La signature de votre fonction devra ressembler à ceci :
   ```rust
   fn recuperer_cle(config: &HashMap<String, String>) -> Result<String, String>
   ```

---

### Correction Détaillée

```rust
use std::collections::HashMap;

/// Recherche la clé "API_KEY" et propage une erreur textuelle si elle est absente.
fn recuperer_cle(config: &HashMap<String, String>) -> Result<String, String> {
    // 1. .get() renvoie Option<&String>
    // 2. .ok_or() convertit l'Option en Result<&String, &str>
    // 3. L'opérateur `?` déballe le &String ou retourne anticipativement l'erreur
    let cle = config
        .get("API_KEY")
        .ok_or("Clé d'API manquante dans la configuration")?;

    // On convertit le &String en String pour correspondre au type de retour
    Ok(cle.clone())
}

fn main() {
    // Cas 1 : La configuration est correcte
    let mut config_valide = HashMap::new();
    config_valide.insert("API_KEY".to_string(), "super-secret-token-123".to_string());

    match recuperer_cle(&config_valide) {
        Ok(cle) => println!("Succès (Cas 1) : Clé trouvée = {}", cle),
        Err(e) => println!("Erreur (Cas 1) : {}", e),
    }

    // Cas 2 : La configuration est vide
    let config_vide = HashMap::new();
    match recuperer_cle(&config_vide) {
        Ok(cle) => println!("Succès (Cas 2) : Clé trouvée = {}", cle),
        Err(e) => println!("Erreur (Cas 2) : {}", e), // Devrait afficher l'erreur
    }
}
```

**Explications :**
* Nous utilisons `.ok_or("...")` pour transformer l'absence de valeur (`None`) en une erreur contenant notre message.
* L'opérateur `?` appliqué juste après permet de sortir immédiatement de la fonction en renvoyant `Err("...")` si la clé n'existe pas. Si elle existe, il extrait le contenu du `Some`.

---

## Exercice 2 : Analyseur de Profil Utilisateur (Types Mixtes)
*Difficulté : Intermédiaire*

### Énoncé
Vous recevez des données brutes sous forme de chaînes de caractères au format CSV simplifié : `"Nom,Age,Identifiant"`. Par exemple : `"Alice,30,1045"`.

Vous devez écrire une fonction `parser_profil` qui prend cette chaîne en paramètre et tente de construire une structure `Utilisateur`. Cette opération peut échouer pour plusieurs raisons :
* Il manque des champs dans la chaîne (ex: `"Alice,30"`).
* L'âge n'est pas un nombre valide (ex: `"Alice,trente,1045"`).
* L'identifiant n'est pas un nombre valide (ex: `"Alice,30,id_invalide"`).

Puisque vous allez manipuler des erreurs de parsing d'entiers (`ParseIntError`) et des erreurs d'éléments manquants (que vous générerez vous-même), vous utiliserez le type de retour dynamique `Result<Utilisateur, Box<dyn std::error::Error>>`.

### Indices
1. Utilisez la méthode `.split(',')` pour découper la chaîne. Cela vous donne un itérateur.
2. Pour récupérer chaque élément de l'itérateur, utilisez `.next()`. Cette méthode renvoie une `Option<&str>`.
3. Convertissez chaque `Option<&str>` en `Result<&str, &str>` avec `.ok_or("Champ manquant")?` pour extraire la valeur textuelle de manière sécurisée.
4. Utilisez `.parse::<u8>()?` et `.parse::<u32>()?` pour convertir l'âge et l'identifiant. L'opérateur `?` se chargera de convertir automatiquement les erreurs de parsing en `Box<dyn Error>`.

---

### Correction Détaillée

```rust
use std::error::Error;

#[derive(Debug)]
struct Utilisateur {
    nom: String,
    age: u8,
    id: u32,
}

/// Parse une ligne CSV pour créer un Utilisateur.
/// Propage n'importe quel type d'erreur via Box<dyn Error>.
fn parser_profil(ligne: &str) -> Result<Utilisateur, Box<dyn Error>> {
    let mut segments = ligne.split(',');

    // Extraction et validation du nom
    let nom = segments
        .next()
        .ok_or("Nom manquant dans les données")?;

    // Extraction et validation de l'âge
    let age_str = segments
        .next()
        .ok_or("Âge manquant dans les données")?;
    // Conversion de l'âge (propage une ParseIntError si invalide)
    let age = age_str.trim().parse::<u8>()?;

    // Extraction et validation de l'identifiant
    let id_str = segments
        .next()
        .ok_or("Identifiant manquant dans les données")?;
    // Conversion de l'identifiant (propage une ParseIntError si invalide)
    let id = id_str.trim().parse::<u32>()?;

    // Tout est correct, on construit et retourne l'utilisateur
    Ok(Utilisateur {
        nom: nom.to_string(),
        age,
        id,
    })
}

fn main() {
    let profils = vec![
        "Alice,30,1045",       // Valide
        "Bob,quarante,2001",   // Âge invalide
        "Charlie,25",          // Identifiant manquant
    ];

    for profil in profils {
        match parser_profil(profil) {
            Ok(u) => println!("Utilisateur créé avec succès : {:?}", u),
            Err(e) => eprintln!("Échec du parsing pour '{}' : {}", profil, e),
        }
    }
}
```

**Explications :**
* **Combinaison des types :** `.next()` renvoie une `Option`. Nous la transformons en `Result` avec `.ok_or()`, puis nous appliquons `?`.
* **Conversion automatique :** Quand nous écrivons `parse::<u8>()?`, le compilateur Rust détecte que la fonction retourne un `Box<dyn Error>`. Il utilise automatiquement le trait `From` pour encapsuler la `ParseIntError` dans la `Box`. Notre code reste parfaitement propre et linéaire.

---

## Exercice 3 : Le Sommet de la Chaîne (Intégration Complète avec `main`)
*Difficulté : Avancée*

### Énoncé
Vous allez concevoir un utilitaire en ligne de commande complet appelé "Calculateur de Somme".
Le programme doit lire un fichier texte (dont le chemin est fixe : `"nombres.txt"`). Ce fichier contient un nombre entier par ligne. Votre programme doit lire le fichier, parser chaque ligne en un entier `i32`, calculer la somme totale, et l'afficher.

Vous devez :
1. Écrire une fonction `calculer_somme_fichier` qui prend le chemin du fichier en paramètre, lit son contenu, fait la somme et la renvoie.
2. Modifier la fonction `main` pour qu'elle retourne elle-même un `Result<(), Box<dyn Error>>` afin de pouvoir utiliser l'opérateur `?` directement à la racine du programme.
3. Gérer proprement le cas où le fichier n'existe pas ou contient des lignes non numériques en affichant l'erreur finale.

### Indices
1. Pour lire l'intégralité d'un fichier dans un `String` en une seule ligne : `std::fs::read_to_string(chemin)?`.
2. Pour parcourir les lignes d'une chaîne : utilisez la méthode `.lines()`.
3. Dans la boucle de calcul, utilisez `?` sur chaque conversion `.parse::<i32>()?` pour interrompre immédiatement le calcul global si une seule ligne est corrompue.

---

### Correction Détaillée

Pour tester ce code localement, créez un fichier nommé `nombres.txt` à la racine de votre projet Cargo avec le contenu suivant :
```text
10
25
-5
30
```

Voici le code complet de l'application :

```rust
use std::fs;
use std::error::Error;

/// Lit un fichier ligne par ligne, convertit chaque ligne en i32 et calcule la somme.
fn calculer_somme_fichier(chemin: &str) -> Result<i32, Box<dyn Error>> {
    // 1. Lecture du fichier. Si le fichier n'existe pas, l'erreur d'E/S est propagée.
    let contenu = fs::read_to_string(chemin)?;
    
    let mut somme = 0;

    // 2. Parcours de chaque ligne du fichier
    for ligne in contenu.lines() {
        // On nettoie les espaces blancs éventuels
        let ligne_nettoyee = ligne.trim();
        
        // On ignore les lignes vides pour éviter des erreurs de parsing inutiles
        if ligne_nettoyee.is_empty() {
            continue;
        }

        // 3. Tentative de conversion de la ligne en entier.
        // Si une ligne est invalide (ex: "abc"), la fonction s'arrête et propage l'erreur.
        let nombre: i32 = ligne_nettoyee.parse()?;
        somme += nombre;
    }

    Ok(somme)
}

// Configuration de la fonction main pour propager les erreurs au système d'exploitation
fn main() -> Result<(), Box<dyn Error>> {
    println!("Démarrage du calculateur de somme...");

    let chemin_fichier = "nombres.txt";

    // Utilisation de l'opérateur ? dans le main
    let total = calculer_somme_fichier(chemin_fichier)?;

    println!("La somme totale des nombres dans '{}' est : {}", chemin_fichier, total);

    // Tout s'est bien passé, on retourne Ok contenant l'unité ()
    Ok(())
}
```

**Explications :**
* **`main` avec `Result`** : En modifiant la signature de `main` pour renvoyer `Result<(), Box<dyn Error>>`, nous pouvons utiliser `?` à la ligne 37. Si `calculer_somme_fichier` échoue, le programme s'arrête proprement et Rust affiche automatiquement une description textuelle de l'erreur sur la console (avec un code de retour système non nul).
* **Robustesse** : Ce programme gère de manière transparente l'absence du fichier, les problèmes de permissions de lecture, ainsi que les erreurs de formatage des données à l'intérieur du fichier, le tout en moins de 40 lignes de code lisibles et structurées.