# Propagation propre des erreurs avec l'opérateur '?'

## 1. Introduction Conceptuelle

Dans les chapitres précédents, nous avons découvert comment Rust modélise l'absence de valeur avec le type `Option<T>` (étudié dans le Module 4.2) et les erreurs récupérables avec le type `Result<T, E>` (étudié dans le Module 4.1). Nous avons appris à extraire les données de ces enums en utilisant le filtrage par motif (*pattern matching*) via l'instruction `match`.

Cependant, une question cruciale se pose rapidement lors de l'écriture de programmes réels : **que faire lorsque l'on ne souhaite pas ou que l'on ne peut pas gérer l'erreur immédiatement au sein de la fonction courante ?**

Bien souvent, la fonction qui rencontre une erreur n'a pas le contexte nécessaire pour décider de la marche à suivre (afficher un message à l'utilisateur, tenter une nouvelle fois, utiliser une valeur par défaut, ou arrêter proprement le programme). La responsabilité de la décision doit alors être déléguée à la fonction appelante. C'est ce que l'on appelle la **propagation d'erreur**.

### Le problème de la verbosité (La "taxe" du boilerplate)
Si nous utilisons uniquement le filtrage par motif traditionnel pour propager chaque erreur, notre code devient rapidement illisible. Imaginez une séquence de trois opérations dépendantes, chacune pouvant échouer (par exemple : ouvrir un fichier, lire son contenu, puis analyser ce contenu pour le convertir en nombre). 

Sans outil adapté, nous ferions face à une cascade de blocs `match` imbriqués, provoquant une dérive du code vers la droite (*rightward drift*) et noyant la logique métier sous une montagne de code de gestion d'erreur répétitif (*boilerplate*).

### La solution : L'opérateur point d'interrogation (`?`)
Pour résoudre ce problème sans sacrifier la sécurité ni l'explicité, Rust propose un opérateur unique : l'opérateur `?`. 

Positionné immédiatement après une expression retournant un `Result` ou une `Option`, l'opérateur `?` réduit drastiquement la verbosité. Il permet d'écrire un code linéaire, fluide et lisible, presque identique à celui des langages utilisant des exceptions traditionnelles (comme Java ou Python), tout en conservant la rigueur du typage statique de Rust et l'absence totale de levée d'exceptions invisibles à l'exécution.

---

## 2. Fondations Théoriques

Pour comprendre l'opérateur `?`, il faut démystifier ce qu'il fait sous le capot. Il ne s'agit pas de magie noire, mais d'un sucre syntaxique extrêmement puissant.

### Le mécanisme de déballage et de retour anticipé

Lorsque vous écrivez :

```rust
let valeur = une_fonction_qui_peut_echouer()?;
```

Le compilateur Rust traduit cette ligne par une structure équivalente à celle-ci :

```rust
let valeur = match une_fonction_qui_peut_echouer() {
    Ok(val) => val,
    Err(err) => return Err(err), // Retour anticipé immédiat de la fonction parente
};
```

#### Analyse de ce comportement :
1. **Cas de succès (`Ok(val)`)** : L'erreur n'a pas eu lieu. L'opérateur `?` "déballe" la valeur contenue dans le variant `Ok` et l'assigne à la variable `valeur`. Le programme continue son exécution normalement sur la ligne suivante.
2. **Cas d'échec (`Err(err)`)** : L'erreur s'est produite. L'opérateur `?` interrompt immédiatement l'exécution de la fonction courante et effectue un **retour anticipé** (*early return*) en renvoyant l'erreur `Err` enveloppée à la fonction appelante.

### La contrainte de signature
Ce mécanisme de retour anticipé impose une règle absolue : **vous ne pouvez utiliser l'opérateur `?` que dans une fonction dont le type de retour est compatible avec la valeur propagée.**

* Si vous utilisez `?` sur un `Result<T, E>`, la fonction parente doit impérativement retourner un `Result<U, F>`, où le type d'erreur `E` peut être converti en `F`.
* Si vous utilisez `?` sur une `Option<T>`, la fonction parente doit impérativement retourner une `Option<U>`.

> **Attention :** Vous ne pouvez pas, par défaut, mélanger l'utilisation de `?` sur une `Option` et un `Result` au sein de la même fonction sans conversion préalable.

### La conversion automatique de types avec le trait `From`

Une des fonctionnalités les plus élégantes de l'opérateur `?` est sa capacité à convertir automatiquement le type d'erreur retourné.

La véritable expansion macroscopique de l'opérateur `?` sur un `Result` est en réalité la suivante :

```rust
let valeur = match une_fonction_qui_peut_echouer() {
    Ok(val) => val,
    Err(err) => return Err(std::convert::From::from(err)),
};
```

L'appel à `From::from(err)` permet de convertir automatiquement l'erreur interceptée vers le type d'erreur attendu par la fonction parente. 

*(Note : Le concept de Trait sera étudié en profondeur dans le Module 5.2. Pour l'instant, retenez simplement que le trait `From` définit comment transformer un type A en un type B).*

Grâce à cela, si une fonction interne renvoie une erreur de type `std::io::Error`, mais que votre fonction globale renvoie une erreur personnalisée de type `MonErreurApplication`, l'opérateur `?` effectuera la conversion de manière totalement transparente, à condition que vous ayez défini comment convertir l'une en l'autre.

---

## 3. Implémentation Pratique Pas-à-Pas

Pour illustrer la transition d'une gestion manuelle à une gestion moderne et élégante avec `?`, nous allons concevoir un programme qui lit le premier mot d'un fichier texte.

### Étape 1 : L'approche manuelle verbeuse (sans `?`)

Voici comment nous devrions écrire cette fonction en utilisant uniquement des structures `match`.

```rust
use std::fs::File;
use std::io::{self, Read};

fn lire_premier_mot_manuel() -> Result<String, io::Error> {
    // 1. Tentative d'ouverture du fichier
    let mut fichier_result = File::open("pseudo_config.txt");
    
    let mut fichier = match fichier_result {
        Ok(f) => f,
        Err(e) => return Err(e), // Propagation manuelle
    };

    // 2. Tentative de lecture du contenu
    let mut contenu = String::new();
    match fichier.read_to_string(&mut contenu) {
        Ok(_) => {},
        Err(e) => return Err(e), // Propagation manuelle
    };

    // 3. Extraction du premier mot
    let premier_mot = match contenu.split_whitespace().next() {
        Some(mot) => mot.to_string(),
        None => String::new(), // Si vide, on retourne une chaîne vide
    };

    Ok(premier_mot)
}
```

Ce code fonctionne parfaitement, mais il est lourd. Nous répétons le motif de retour anticipé `Err(e) => return Err(e)` à chaque étape risquée.

### Étape 2 : Simplification radicale avec l'opérateur `?`

Remplaçons maintenant ces blocs `match` par l'opérateur `?`.

```rust
use std::fs::File;
use std::io::{self, Read};

fn lire_premier_mot_elegant() -> Result<String, io::Error> {
    // Si File::open échoue, l'erreur io::Error est immédiatement retournée.
    let mut fichier = File::open("pseudo_config.txt")?;
    
    let mut contenu = String::new();
    // Si read_to_string échoue, l'erreur io::Error est immédiatement retournée.
    fichier.read_to_string(&mut contenu)?;

    // Extraction du premier mot (utilisation de Option)
    let premier_mot = contenu
        .split_whitespace()
        .next()
        .unwrap_or("")
        .to_string();

    Ok(premier_mot)
}
```

**Gain immédiat :** Le code est passé de 25 lignes à seulement quelques lignes claires. La logique métier (ouvrir, lire, extraire) est immédiatement visible, débarrassée du bruit visuel de la gestion d'erreur.

### Étape 3 : Le chaînage de méthodes

Puisque l'opérateur `?` renvoie la valeur déballée en cas de succès, il est possible de chaîner les appels de fonctions de manière extrêmement concise :

```rust
use std::fs::File;
use std::io::{self, Read};

fn lire_et_recuperer_tout() -> Result<String, io::Error> {
    let mut contenu = String::new();
    // Chaînage direct de l'ouverture et de la lecture
    File::open("pseudo_config.txt")?.read_to_string(&mut contenu)?;
    Ok(contenu)
}
```

### Étape 4 : Propagation avec des types d'erreurs multiples

Que se passe-t-il si une fonction peut générer plusieurs types d'erreurs différents ? 

Imaginons que nous lisons une chaîne dans un fichier, puis que nous voulons la convertir en entier (`u32`).
* `File::open` et `read_to_string` renvoient une `std::io::Error`.
* `str::parse::<u32>` renvoie une `std::num::ParseIntError`.

Si nous essayons d'utiliser `?` sur les deux, quel doit être le type de retour de la fonction ?

#### Solution : Utiliser un objet de trait d'erreur dynamique (`Box<dyn std::error::Error>`)
Pour les fonctions générales ou les prototypes rapides, nous pouvons utiliser un pointeur intelligent `Box` (étudié dans le cadre des collections et de l'allocation sur le tas au Module 1.3 et 3.3) contenant n'importe quel type implémentant le trait standard `Error`.

```rust
use std::fs::File;
use std::io::Read;
use std::error::Error;

// Le type de retour accepte désormais n'importe quel type d'erreur standard
fn lire_nombre_depuis_fichier() -> Result<u32, Box<dyn Error>> {
    let mut contenu = String::new();
    
    // Propage une std::io::Error, convertie automatiquement en Box<dyn Error>
    File::open("nombre.txt")?.read_to_string(&mut contenu)?;
    
    // Propage une ParseIntError, convertie automatiquement en Box<dyn Error>
    let nombre: u32 = contenu.trim().parse()?;
    
    Ok(nombre)
}
```

---

## 4. Pièges Fréquents et Bonnes Pratiques

### Piège 1 : Utiliser `?` dans la fonction `main` sans modifier son type de retour

Par défaut, la fonction `main` générée par Cargo a la signature suivante :
```rust
fn main() {
    // ...
}
```
Son type de retour implicite est le type unité `()`. Si vous tentez d'utiliser l'opérateur `?` à l'intérieur, le compilateur lèvera une erreur explicite :

```text
error[E0277]: the `?` operator can only be used in a function that returns `Result` or `Option`
```

#### Résolution :
Rust autorise la fonction `main` à retourner un type `Result`. Vous devez modifier sa signature :

```rust
use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    let nombre = lire_nombre_depuis_fichier()?;
    println!("Le nombre lu est : {}", nombre);
    
    // Tout s'est bien passé, on retourne Ok contenant l'unité
    Ok(())
}
```

### Piège 2 : Mélanger `Option` et `Result` sans conversion

Si vous tentez d'utiliser `?` sur une `Option` dans une fonction qui retourne un `Result`, le compilateur refusera de compiler.

```rust
// CODE ERRONÉ - NE COMPILE PAS
fn recuperer_donnee() -> Result<String, String> {
    let liste = vec!["Rust", "C++", "Zig"];
    // .get() retourne une Option, mais la fonction attend un Result
    let element = liste.get(5)?; 
    Ok(element.to_string())
}
```

#### Résolution :
Vous devez explicitement convertir l'un vers l'autre.
* Pour convertir une `Option<T>` en `Result<T, E>`, utilisez `.ok_or(erreur)` ou `.ok_or_else(|| erreur)` :

```rust
fn recuperer_donnee_valide() -> Result<String, String> {
    let liste = vec!["Rust", "C++", "Zig"];
    
    // Conversion de l'Option en Result avec un message d'erreur personnalisé
    let element = liste.get(5).ok_or("Index hors limites !")?;
    
    Ok(element.to_string())
}
```

### Piège 3 : Abuser de `unwrap()` au lieu de propager avec `?`

Il est tentant d'utiliser `.unwrap()` ou `.expect()` pour aller plus vite. Cependant, ces méthodes provoquent un arrêt brutal du programme (*panic*) en cas d'erreur. 

* **Règle d'or :** Utilisez `?` pour propager les erreurs qui sont hors du contrôle direct de votre programme (fichiers manquants, entrées utilisateur invalides, défaillances réseau). Réservez `unwrap()` uniquement pour les cas où vous avez la certitude mathématique que l'erreur ne peut pas se produire, ou dans les tests unitaires.

---

## 5. Synthèse Pédagogique

| Approche | Syntaxe | Comportement en cas d'erreur | Recommandation d'usage |
| :--- | :--- | :--- | :--- |
| **Filtrage par motif (`match`)** | `match resultat { ... }` | Permet de gérer localement l'erreur ou de la propager manuellement. | Idéal pour la gestion finale de l'erreur ou si un traitement spécifique est requis. |
| **Panique forcée (`unwrap`)** | `resultat.unwrap()` | Fait planter le programme immédiatement (*panic!*). | À proscrire en production, sauf certitude absolue ou prototypage rapide. |
| **Propagation propre (`?`)** | `resultat?` | Retourne immédiatement l'erreur à la fonction appelante. | **Standard de l'industrie** pour écrire du code propre, robuste et lisible. |

### Points clés à retenir :
1. L'opérateur `?` est un **sucre syntaxique** pour un retour anticipé (`return Err(...)`).
2. Il ne peut être utilisé que dans des fonctions qui retournent un type compatible (`Result` ou `Option`).
3. Il réalise des **conversions de types d'erreurs automatiques** grâce au trait standard `From`.
4. La fonction `main` peut retourner un `Result<(), Box<dyn Error>>` pour permettre l'usage de `?` au niveau global du programme.

---

## 6. Exercice Pratique d'Application

### Énoncé : "Le Configulateur Sécurisé"

Vous devez concevoir un module de chargement de configuration pour un serveur réseau.
Le programme doit lire un fichier nommé `port.txt` qui contient uniquement le numéro de port sur lequel le serveur doit démarrer (par exemple, la chaîne `"8080"`).

Votre objectif est d'écrire une fonction `charger_port` qui :
1. Ouvre le fichier `port.txt`.
2. Lit son contenu sous forme de chaîne de caractères.
3. Nettoie les espaces ou retours à la ligne superflus (avec `.trim()`).
4. Convertit (parse) cette chaîne en un entier de type `u16`.
5. Gère proprement toutes les erreurs possibles en les propageant à l'aide de l'opérateur `?`.

Puisque cette fonction peut échouer à cause d'une erreur d'entrée/sortie (fichier absent) ou d'une erreur de parsing (le fichier contient "abc" au lieu d'un nombre), vous utiliserez le type de retour `Result<u16, Box<dyn std::error::Error>>`.

### Indices utiles :
* Pour ouvrir un fichier : `std::fs::File::open("port.txt")` (renvoie un `Result<File, std::io::Error>`).
* Pour lire le contenu : créez une chaîne vide `let mut contenu = String::new();` puis utilisez `fichier.read_to_string(&mut contenu)` (renvoie un `Result<usize, std::io::Error>`).
* Pour nettoyer la chaîne : `contenu.trim()`.
* Pour convertir en entier : `contenu.trim().parse::<u16>()` (renvoie un `Result<u16, ParseIntError>`).
* N'oubliez pas d'importer les modules nécessaires : `std::fs::File`, `std::io::Read` et `std::error::Error`.

---

### Correction Complète et Commentée

Voici l'implémentation attendue. Vous pouvez copier ce code dans votre fichier `src/main.rs` pour l'exécuter.

```rust
use std::fs::File;
use std::io::Read;
use std::error::Error;

/// Tente de charger et de parser le port depuis le fichier "port.txt".
/// Propage proprement toutes les erreurs via l'opérateur `?`.
fn charger_port() -> Result<u16, Box<dyn Error>> {
    // 1. Ouverture du fichier. Si le fichier n'existe pas, l'erreur est propagée immédiatement.
    let mut fichier = File::open("port.txt")?;

    // 2. Lecture du contenu du fichier dans une chaîne de caractères.
    let mut contenu = String::new();
    fichier.read_to_string(&mut contenu)?;

    // 3. Nettoyage des espaces/retours à la ligne et tentative de conversion en u16.
    // L'opérateur `?` convertira automatiquement une ParseIntError en Box<dyn Error>.
    let port: u16 = contenu.trim().parse()?;

    // 4. Tout s'est bien passé, on retourne le port enveloppé dans Ok.
    Ok(port)
}

fn main() {
    // Simulation de l'exécution
    println!("Tentative de chargement de la configuration...");

    match charger_port() {
        Ok(port) => {
            println!("Configuration chargée avec succès !");
            println!("Le serveur va démarrer sur le port : {}", port);
        }
        Err(erreur) => {
            // Ici, nous interceptons l'erreur finale et l'affichons proprement à l'utilisateur
            eprintln!("Erreur critique lors du chargement de la configuration : {}", erreur);
            eprintln!("Détails : Veuillez vérifier que le fichier 'port.txt' existe et contient un nombre valide (0 - 65535).");
        }
    }
}
```

### Explications de la correction :
* **Ligne 9** : `File::open("port.txt")?` -> Si le fichier `port.txt` est manquant, la fonction s'arrête immédiatement ici et renvoie l'erreur `std::io::Error` encapsulée dans le `Box` de retour.
* **Ligne 13** : `fichier.read_to_string(&mut contenu)?` -> Si le fichier est verrouillé ou illisible, l'erreur de lecture est propagée de la même façon.
* **Ligne 17** : `contenu.trim().parse()?` -> Si le fichier contenait `"8080\n"`, `.trim()` le transforme en `"8080"`. Si le fichier contenait `"texte_invalide"`, `.parse()` échoue et renvoie une `ParseIntError`, qui est immédiatement convertie et propagée.
* **Ligne 26** : Dans le `main`, nous utilisons un `match` pour traiter le résultat final. C'est la bonne pratique : **on propage avec `?` tout au long de la chaîne d'appels, et on gère l'erreur à la toute fin (ici, dans le point d'entrée du programme)**.