# Exercices d'Application : Les Collections Standards (Vector, String) et leur gestion dynamique de la mémoire

Ce cahier d'exercices pratiques a pour objectif de consolider vos connaissances sur la gestion de la mémoire dynamique en Rust, en mettant l'accent sur les vecteurs (`Vec<T>`), les chaînes de caractères (`String`), et les règles de sécurité imposées par le *Borrow Checker*.

---

## Exercice 1 : L'Analyseur de Capacité et d'Accès Sécurisé
### Énoncé
Dans cet exercice, vous allez concevoir un système de suivi de métriques pour un capteur de température. L'objectif est de comprendre précisément comment Rust gère la capacité mémoire d'un vecteur sur le Tas et comment accéder aux données de manière hautement sécurisée.

1. Créez un vecteur vide d'entiers (`i32`) nommé `temperatures`.
2. Ajoutez des valeurs de température une par une (par exemple : `21`, `22`, `20`, `24`, `25`). À chaque ajout, affichez :
   * La valeur ajoutée.
   * La longueur (`len`) du vecteur.
   * La capacité (`capacity`) du vecteur.
3. Écrivez une fonction sécurisée `obtenir_temperature(vec: &[i32], index: usize)` qui tente d'accéder à un élément. Si l'index existe, elle affiche la température. S'il n'existe pas, elle affiche un message d'erreur amical au lieu de faire planter (paniquer) le programme.
4. Optimisez la mémoire du vecteur après les insertions en utilisant la méthode appropriée pour libérer la capacité excédentaire, puis affichez la nouvelle capacité.

### Indices
1. Utilisez les méthodes `.len()` et `.capacity()` sur votre vecteur.
2. Pour l'accès sécurisé, n'utilisez pas l'indexation directe `vec[index]` qui peut provoquer un crash (*panic*). Utilisez plutôt la méthode `.get()`, qui renvoie une `Option<&T>`.
3. Pour libérer la mémoire inutilisée (lorsque la capacité est strictement supérieure à la longueur), documentez-vous sur la méthode `.shrink_to_fit()`.

### Correction Détaillée

```rust
fn obtenir_temperature(vec: &[i32], index: usize) {
    // Utilisation de .get() pour un accès sécurisé qui retourne une Option
    match vec.get(index) {
        Some(temp) => println!("Température à l'index {} : {}°C", index, temp),
        None => println!("Erreur : Aucun enregistrement trouvé à l'index {}.", index),
    }
}

fn main() {
    // 1. Création d'un vecteur vide
    let mut temperatures: Vec<i32> = Vec::new();
    println!("--- Phase d'insertion et observation de la mémoire ---");
    println!("Initiale -> Longueur : {}, Capacité : {}\n", temperatures.len(), temperatures.capacity());

    let mesures = vec![21, 22, 20, 24, 25];

    // 2. Ajout dynamique et observation de la stratégie de doublement de capacité
    for temp in mesures {
        temperatures.push(temp);
        println!(
            "Ajout de {}°C -> Longueur : {}, Capacité : {}",
            temp,
            temperatures.len(),
            temperatures.capacity()
        );
    }

    println!("\n--- Accès sécurisé aux données ---");
    // 3. Tests d'accès sécurisé
    obtenir_temperature(&temperatures, 2);  // Index valide
    obtenir_temperature(&temperatures, 10); // Index hors-limites (ne plante pas !)

    println!("\n--- Optimisation de la mémoire ---");
    // 4. Libération de la capacité excédentaire
    println!("Avant shrink -> Longueur : {}, Capacité : {}", temperatures.len(), temperatures.capacity());
    temperatures.shrink_to_fit();
    println!("Après shrink -> Longueur : {}, Capacité : {}", temperatures.len(), temperatures.capacity());
}
```

---

## Exercice 2 : Le Censeur Unicode (Manipulation de `String`)
### Énoncé
En Rust, manipuler des chaînes de caractères nécessite une grande rigueur en raison de l'encodage UTF-8. Cet exercice vous demande de créer un filtre de modération de texte (un "censeur") capable de traiter correctement les caractères multi-octets (comme les émojis ou les lettres accentuées).

1. Écrivez une fonction `analyser_chaine(texte: &str)` qui affiche :
   * Le nombre d'octets occupés par la chaîne en mémoire.
   * Le nombre réel de caractères Unicode.
2. Écrivez une fonction `censurer_caractere(texte: &str, cible: char, remplacement: char) -> String` qui parcourt la chaîne caractère par caractère et remplace chaque occurrence du caractère `cible` par le caractère `remplacement`.
3. Testez votre programme avec une chaîne contenant des caractères spéciaux et des émojis (par exemple : `"Café chaud ! ☕ et Crêpe 🥞"`).

### Indices
1. La méthode `.len()` sur un `&str` ou un `String` renvoie la taille **en octets**, pas en caractères. Pour obtenir le nombre de caractères Unicode, utilisez `.chars().count()`.
2. Pour reconstruire une chaîne de caractères en remplaçant des éléments, vous pouvez initialiser un `String` vide avec `String::new()` (ou `String::with_capacity()`), boucler sur `.chars()`, et utiliser `.push(caractere)`.

### Correction Détaillée

```rust
fn analyser_chaine(texte: &str) {
    let octets = texte.len();
    let caracteres = texte.chars().count();
    
    println!("Analyse de : \"{}\"", texte);
    println!("  - Taille en mémoire : {} octets", octets);
    println!("  - Nombre de caractères Unicode : {}", caracteres);
}

fn censurer_caractere(texte: &str, cible: char, remplacement: char) -> String {
    // Optimisation : On pré-alloue de la mémoire. 
    // Bien que la taille finale en octets puisse varier si les caractères cible/remplacement 
    // n'ont pas la même taille UTF-8, la taille d'origine est une excellente estimation.
    let mut resultat = String::with_capacity(texte.len());

    // Parcours sécurisé des caractères Unicode (et non des octets bruts)
    for c in texte.chars() {
        if c == cible {
            resultat.push(remplacement);
        } else {
            resultat.push(c);
        }
    }

    resultat
}

fn main() {
    let phrase = "Café chaud ! ☕ et Crêpe 🥞";

    println!("--- 1. Analyse de la structure UTF-8 ---");
    analyser_chaine(phrase);
    // Notez que 'é' prend 2 octets, '☕' prend 3 octets et '🥞' prend 4 octets en UTF-8.

    println!("\n--- 2. Censure de caractères ---");
    // Remplacement du 'é' par un 'e' simple
    let phrase_censuree_1 = censurer_caractere(phrase, 'é', 'e');
    println!("Résultat 1 : {}", phrase_censuree_1);

    // Remplacement de l'émoji '☕' par un émoji d'avertissement '⚠️'
    let phrase_censuree_2 = censurer_caractere(phrase, '☕', '⚠️');
    println!("Résultat 2 : {}", phrase_censuree_2);
}
```

---

## Exercice 3 : Le Duplicateur d'Alertes (Résoudre l'Invalidation d'Itérateur)
### Énoncé
Vous travaillez sur un système de monitoring réseau. Vous disposez d'une liste de messages système stockés dans un `Vec<String>`. Vous souhaitez inspecter cette liste et, chaque fois que vous rencontrez un message contenant le mot `"CRITICAL"`, vous devez immédiatement insérer une copie de sécurité de ce message juste après dans le vecteur.

Le code naïf suivant ne compile pas à cause des règles d'Ownership et du problème d'**invalidation d'itérateur** :

```rust
// CE CODE NE COMPILE PAS
fn dupliquer_alertes_naif(alertes: &mut Vec<String>) {
    for alerte in alertes.iter() {
        if alerte.contains("CRITICAL") {
            // Erreur de compilation : impossible de modifier le vecteur
            // pendant qu'on l'emprunte pour l'itérer.
            alertes.push(alerte.clone()); 
        }
    }
}
```

**Votre mission :**
1. Expliquez pourquoi le compilateur refuse ce code (en lien avec la gestion de la mémoire et la réallocation).
2. Proposez une solution propre, compilable et optimisée en termes d'allocations mémoire en créant un nouveau vecteur de sortie.

### Indices
1. **Pourquoi le refus ?** Si Rust autorisait l'ajout d'éléments (`push`) pendant l'itération, le vecteur pourrait dépasser sa capacité actuelle. Cela déclencherait une réallocation sur le Tas (déplacement des données vers une nouvelle adresse mémoire). L'itérateur pointerait alors vers l'ancienne zone mémoire libérée, provoquant un comportement indéfini (*Undefined Behavior*).
2. **Pour la solution :** Au lieu de modifier le vecteur en place pendant son parcours, créez un nouveau vecteur vide. Utilisez `Vec::with_capacity` pour limiter les réallocations mémoire lors du transfert et de la duplication des messages.

### Correction Détaillée

#### 1. Explication théorique
Le compilateur Rust applique strictement la règle : **on ne peut pas modifier une collection (emprunt mutable) pendant qu'on la parcourt (emprunt immuable)**. Si le vecteur `alertes` devait se réallouer en mémoire sur le Tas lors du `push`, l'adresse mémoire de ses éléments changerait. L'itérateur interne, qui conserve un pointeur vers l'ancienne adresse, deviendrait un pointeur ballant (*dangling pointer*). Rust élimine ce risque dès la compilation.

#### 2. Code corrigé et optimisé

```rust
/// Analyse les alertes et duplique celles contenant "CRITICAL" de manière sûre et performante.
fn dupliquer_alertes(alertes_brutes: Vec<String>) -> Vec<String> {
    // Optimisation : On s'attend à ce que le vecteur final soit plus grand.
    // On alloue une capacité initiale légèrement supérieure (ex: 1.5 fois la taille d'origine)
    // pour éviter de multiples réallocations sur le Tas.
    let capacite_estimee = (alertes_brutes.len() as f64 * 1.5) as usize;
    let mut alertes_traitees = Vec::with_capacity(capacite_estimee);

    // Consommation du vecteur d'entrée (parcours par transfert de propriété / ownership)
    for alerte in alertes_brutes {
        // Détection du mot clé
        if alerte.contains("CRITICAL") {
            // On clone l'alerte pour pouvoir l'insérer deux fois
            alertes_traitees.push(alerte.clone());
            alertes_traitees.push(alerte); // Pas besoin de cloner la deuxième fois (on donne la propriété)
        } else {
            alertes_traitees.push(alerte);
        }
    }

    // Libération de la mémoire allouée en trop si le nombre de "CRITICAL" était faible
    alertes_traitees.shrink_to_fit();
    alertes_traitees
}

fn main() {
    let alertes_systeme = vec![
        String::from("[INFO] Système démarré"),
        String::from("[CRITICAL] Température CPU trop élevée !"),
        String::from("[WARNING] Espace disque faible (10%)"),
        String::from("[CRITICAL] Fuite de mémoire détectée dans le service web"),
    ];

    println!("--- Avant traitement ---");
    for alerte in &alertes_systeme {
        println!("{}", alerte);
    }

    // Appel de notre fonction de duplication sécurisée
    let alertes_finales = dupliquer_alertes(alertes_systeme);

    println!("\n--- Après traitement (Duplication des alertes critiques) ---");
    for alerte in &alertes_finales {
        println!("{}", alerte);
    }
    
    println!("\nStatistiques mémoire finales : {} éléments, {} de capacité.", 
             alertes_finales.len(), 
             alertes_finales.capacity()
    );
}
```