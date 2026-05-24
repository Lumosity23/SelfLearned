# Exercices d'Application : L'absence de valeur : Dire adieu au pointeur nul avec le type Option

Ce cahier d'exercices pratiques a pour objectif de consolider votre compréhension du type `Option<T>` en Rust. À travers trois exercices de difficulté progressive, vous passerez de la manipulation de base à l'enchaînement complexe de méthodes (combinateurs), tout en apprenant à éviter les pièges liés à la propriété (*ownership*).

---

## Exercice 1 : Configuration d'un Serveur Web (Difficulté : Facile)

### Énoncé
Dans cet exercice, vous devez concevoir le système de chargement de la configuration d'un serveur web. Souvent, les utilisateurs ne spécifient pas toutes les options dans leur fichier de configuration. Votre programme doit être capable de combler les valeurs manquantes par des valeurs par défaut sécurisées.

#### Objectifs :
1. Définir une structure `ConfigurationServeur` contenant :
   * `hote` : `Option<String>` (ex: `Some("127.0.0.1".to_string())`)
   * `port` : `Option<u16>` (ex: `Some(8080)`)
   * `max_connexions` : `Option<u32>` (ex: `None`)
2. Implémenter une fonction `obtenir_port_effectif(config: &ConfigurationServeur) -> u16` qui retourne le port spécifié, ou la valeur par défaut `80` si aucun port n'est fourni.
3. Implémenter une fonction `afficher_statut(config: &ConfigurationServeur)` qui :
   * Affiche `"Serveur configuré sur l'hôte : [nom_hote]"` si l'hôte est présent.
   * Affiche `"Serveur configuré sur l'hôte par défaut : localhost"` si l'hôte est absent.
   * Utilisez l'expression `if let` pour cette question.

---

### Indices
* Pour `obtenir_port_effectif`, la méthode `.unwrap_or(...)` vue dans le cours est parfaitement adaptée car le port par défaut (`80`) est une valeur simple et immédiate.
* Pour `afficher_statut`, attention à l'ownership ! L'hôte est une `Option<String>`. Si vous faites un `if let Some(h) = config.hote`, Rust va tenter de déplacer la `String` hors de la structure empruntée. Utilisez `.as_ref()` pour obtenir une `Option<&String>`.

---

### Correction Détaillée

```rust
// 1. Définition de la structure
struct ConfigurationServeur {
    hote: Option<String>,
    port: Option<u16>,
    max_connexions: Option<u32>,
}

// 2. Fonction pour obtenir le port avec valeur par défaut
fn obtenir_port_effectif(config: &ConfigurationServeur) -> u16 {
    // On utilise unwrap_or pour fournir la valeur par défaut 80
    // config.port est de type Option<u16>, qui implémente Copy, donc pas de problème de transfert de propriété.
    config.port.unwrap_or(80)
}

// 3. Fonction d'affichage du statut
fn afficher_statut(config: &ConfigurationServeur) {
    // .as_ref() est crucial ici pour ne pas déplacer la String hors de la structure config
    if let Some(hote_present) = config.hote.as_ref() {
        println!("Serveur configuré sur l'hôte : {}", hote_present);
    } else {
        println!("Serveur configuré sur l'hôte par défaut : localhost");
    }
}

fn main() {
    // Test 1 : Configuration partielle
    let config_partielle = ConfigurationServeur {
        hote: None,
        port: Some(3000),
        max_connexions: None,
    };

    println!("--- Test Configuration Partielle ---");
    println!("Port effectif : {}", obtenir_port_effectif(&config_partielle));
    afficher_statut(&config_partielle);

    // Test 2 : Configuration complète
    let config_complete = ConfigurationServeur {
        hote: Some(String::from("192.168.1.1")),
        port: None, // Devrait utiliser 80
        max_connexions: Some(100),
    };

    println!("\n--- Test Configuration Complète ---");
    println!("Port effectif : {}", obtenir_port_effectif(&config_complete));
    afficher_statut(&config_complete);
}
```

---

## Exercice 2 : Système de Codes Promo (Difficulté : Moyenne)

### Énoncé
Vous développez le module de paiement d'un site e-commerce. Les clients peuvent appliquer un code promotionnel à leur panier. 

Certains paniers ont un code promo, d'autres non. De plus, les codes promo saisis par les utilisateurs peuvent être valides (ils donnent droit à une réduction) ou invalides/expirés (ils ne donnent droit à rien).

#### Objectifs :
1. Définir une structure `Panier` contenant un identifiant `id: u32` et un code optionnel `code_promo: Option<String>`.
2. Implémenter une fonction de simulation `recuperer_reduction(code: &str) -> Option<f64>` qui retourne :
   * `Some(15.0)` si le code est `"WINTER15"`
   * `Some(50.0)` si le code est `"BLACKFRIDAY"`
   * `None` pour tout autre code.
3. Implémenter une fonction `calculer_reduction_panier(panier: &Panier) -> Option<f64>` qui extrait le code promo du panier (s'il existe), interroge la fonction `recuperer_reduction` et retourne le pourcentage de réduction trouvé. 
   * **Contrainte** : Vous devez enchaîner les opérations sur l'option sans utiliser de `match` ou de `if let`, en utilisant uniquement les combinateurs d'options (`map`, `and_then`, `as_deref`, etc.).

---

### Indices
* Pour passer d'une `Option<String>` à une `Option<&str>`, la méthode `.as_deref()` est extrêmement utile en Rust. Elle évite d'avoir à gérer des références complexes de `String`.
* La fonction `recuperer_reduction` prend une référence de chaîne de caractères (`&str`) et retourne elle-même une `Option<f64>`. Si vous utilisez `.map(...)` pour l'appeler depuis une `Option<&str>`, vous obtiendrez un type imbriqué : `Option<Option<f64>>`. Quel combinateur permet d'aplatir ce résultat ?

---

### Correction Détaillée

```rust
// 1. Définition de la structure Panier
struct Panier {
    id: u32,
    code_promo: Option<String>,
}

// 2. Fonction de simulation de base de données de codes promo
fn recuperer_reduction(code: &str) -> Option<f64> {
    match code {
        "WINTER15" => Some(15.0),
        "BLACKFRIDAY" => Some(50.0),
        _ => None, // Code inconnu ou expiré
    }
}

// 3. Fonction de calcul de la réduction du panier
fn calculer_reduction_panier(panier: &Panier) -> Option<f64> {
    panier.code_promo
        .as_deref() // Convertit Option<String> en Option<&str> par emprunt
        .and_then(|code| recuperer_reduction(code)) // Applique la fonction et aplatit le Option<Option<f64>> en Option<f64>
}

fn main() {
    let paniers = vec![
        Panier {
            id: 101,
            code_promo: Some(String::from("WINTER15")),
        },
        Panier {
            id: 102,
            code_promo: Some(String::from("CODE_INVALIDE")),
        },
        Panier {
            id: 103,
            code_promo: None,
        },
    ];

    for panier in paniers {
        print!("Panier #{} : ", panier.id);
        match calculer_reduction_panier(&panier) {
            Some(reduction) => println!("Réduction de {}% appliquée !", reduction),
            None => println!("Aucune réduction appliquée."),
        }
    }
}
```

---

## Exercice 3 : Analyseur de Capteurs Thermiques (Difficulté : Difficile)

### Énoncé
Dans l'industrie, les vieux systèmes logiciels utilisent souvent des "valeurs sentinelles" pour indiquer des erreurs. Par exemple, un capteur de température défaillant peut renvoyer la valeur `-999.0` pour signifier qu'il n'a pas pu lire la température. 

Vous devez écrire un module Rust moderne qui nettoie ces données historiques en remplaçant la valeur sentinelle par une `Option<f64>` propre, puis calcule des statistiques de sécurité.

#### Objectifs :
1. Écrire une fonction `assainir_lecture(lecture_brute: f64) -> Option<f64>` qui :
   * Retourne `None` si la lecture est égale à `-999.0`.
   * Retourne `Some(lecture_brute)` sinon.
2. Écrire une fonction `calculer_moyenne(lectures: &[f64]) -> Option<f64>` qui :
   * Convertit chaque température brute en `Option<f64>`.
   * Filtre les valeurs pour ne garder que les mesures valides.
   * Calcule la moyenne de ces mesures valides.
   * Si aucune mesure valide n'est présente (ou si le tableau est vide), la fonction doit retourner `None`.

---

### Indices
* Pour transformer un vecteur de valeurs brutes en valeurs assainies, vous pouvez utiliser `.iter()` combiné à `.map()`.
* Pour filtrer et extraire les valeurs contenues dans des `Option` au sein d'un itérateur, Rust propose la méthode magique `.filter_map(|x| x)` (ou `.flatten()`). Elle élimine automatiquement les `None` et extrait les valeurs des `Some`.
* Attention aux divisions par zéro : si le nombre de mesures valides est égal à `0`, retournez immédiatement `None`.

---

### Correction Détaillée

```rust
// 1. Fonction d'assainissement de la valeur sentinelle
fn assainir_lecture(lecture_brute: f64) -> Option<f64> {
    if lecture_brute == -999.0 {
        None
    } else {
        Some(lecture_brute)
    }
}

// 2. Fonction de calcul de la moyenne des températures valides
fn calculer_moyenne(lectures: &[f64]) -> Option<f64> {
    let mut somme = 0.0;
    let mut compteur = 0;

    // On parcourt les lectures brutes
    for &lecture in lectures {
        // On assainit la lecture courante
        if let Some(temperature_valide) = assainir_lecture(lecture) {
            somme += temperature_valide;
            compteur += 1;
        }
    }

    // Sécurité : éviter la division par zéro et gérer l'absence de données valides
    if compteur == 0 {
        None
    } else {
        Some(somme / (compteur as f64))
    }
}

// Alternative élégante et idiomatique utilisant les itérateurs de la bibliothèque standard :
fn calculer_moyenne_fonctionnel(lectures: &[f64]) -> Option<f64> {
    let lectures_valides: Vec<f64> = lectures.iter()
        .map(|&l| assainir_lecture(l))
        .flatten() // Élimine les None et extrait les valeurs des Some
        .collect();

    if lectures_valides.is_empty() {
        None
    } else {
        let somme: f64 = lectures_valides.iter().sum();
        Some(somme / (lectures_valides.len() as f64))
    }
}

fn main() {
    // Cas 1 : Données mixtes (valides et invalides)
    let donnees_capteur_1 = vec![19.5, 20.0, -999.0, 21.5, -999.0, 19.0];
    
    println!("--- Capteur 1 ---");
    match calculer_moyenne(&donnees_capteur_1) {
        Some(moyenne) => println!("Moyenne des températures valides : {:.2}°C", moyenne),
        None => println!("Erreur : Aucune donnée valide disponible."),
    }

    // Cas 2 : Capteur totalement en panne (uniquement des valeurs sentinelles)
    let donnees_capteur_2 = vec![-999.0, -999.0, -999.0];
    
    println!("\n--- Capteur 2 ---");
    match calculer_moyenne_fonctionnel(&donnees_capteur_2) {
        Some(moyenne) => println!("Moyenne : {:.2}°C", moyenne),
        None => println!("Alerte : Le capteur n'a renvoyé aucune donnée exploitable !"),
    }
}
```