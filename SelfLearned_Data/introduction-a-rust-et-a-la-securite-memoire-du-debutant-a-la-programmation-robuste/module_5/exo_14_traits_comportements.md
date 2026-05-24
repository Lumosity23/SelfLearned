# Exercices d'Application : Introduction aux Traits

Ce cahier d'exercices pratiques a pour objectif de consolider vos compétences sur la définition, l'implémentation et l'utilisation des **Traits** en Rust. À travers trois cas concrets, vous pratiquerez l'utilisation des méthodes par défaut, le contournement de la règle de l'orphelin (motif *Newtype*) et la manipulation de collections hétérogènes via le dispatch dynamique.

---

## Exercice 1 : Système de Journalisation Flexible (Logger)

### Énoncé
Dans le cadre du développement d'une application serveur, vous devez concevoir un système de journalisation (*logging*) capable d'envoyer des messages vers différentes destinations (la console ou un tampon mémoire pour les tests).

#### Objectifs :
1. Définir un trait `Log` qui exige la méthode suivante :
   * `fn ecrire(&mut self, message: &str);`
2. Ajouter deux méthodes par défaut au trait `Log` :
   * `fn log_info(&mut self, message: &str)` qui formate le message sous la forme `"[INFO] : [message]"` et l'envoie à `ecrire`.
   * `fn log_erreur(&mut self, message: &str)` qui formate le message sous la forme `"[ERREUR] : [message]"` et l'envoie à `ecrire`.
3. Créer une structure `ConsoleLogger` (sans champ) et implémenter le trait `Log` pour qu'elle affiche le message directement sur la sortie standard (`println!`).
4. Créer une structure `MemoryLogger` contenant un champ `historique: Vec<String>` et implémenter le trait `Log` pour qu'elle stocke les messages reçus dans son historique.
5. Écrire une fonction générique `enregistrer_evenements<T: Log>(logger: &mut T)` qui utilise le dispatch statique pour envoyer un message d'information et un message d'erreur.

### Indices
* Pour formater une chaîne sans l'afficher directement, utilisez la macro `format!`.
* La signature des méthodes par défaut doit utiliser `&mut self` pour pouvoir appeler `ecrire(&mut self, ...)`.
* Dans `MemoryLogger`, pour ajouter un `&str` sous forme de `String` dans un `Vec<String>`, utilisez la méthode `.to_string()` ou `String::from()`.

### Correction Détaillée

```rust
// 1. Définition du Trait Log avec méthodes par défaut
pub trait Log {
    // Méthode obligatoire à implémenter
    fn ecrire(&mut self, message: &str);

    // 2. Méthodes par défaut
    fn log_info(&mut self, message: &str) {
        let message_formate = format!("[INFO] : {}", message);
        self.ecrire(&message_formate);
    }

    fn log_erreur(&mut self, message: &str) {
        let message_formate = format!("[ERREUR] : {}", message);
        self.ecrire(&message_formate);
    }
}

// 3. Implémentation de ConsoleLogger
pub struct ConsoleLogger;

impl Log for ConsoleLogger {
    fn ecrire(&mut self, message: &str) {
        println!("{}", message);
    }
}

// 4. Implémentation de MemoryLogger
pub struct MemoryLogger {
    pub historique: Vec<String>,
}

impl Log for MemoryLogger {
    fn ecrire(&mut self, message: &str) {
        self.historique.push(message.to_string());
    }
}

// 5. Fonction générique avec Dispatch Statique (Trait Bound)
pub fn enregistrer_evenements<T: Log>(logger: &mut T) {
    logger.log_info("Démarrage de l'application.");
    logger.log_erreur("Échec de connexion à la base de données.");
}

fn main() {
    println!("--- Test du ConsoleLogger ---");
    let mut console = ConsoleLogger;
    enregistrer_evenements(&mut console);

    println!("\n--- Test du MemoryLogger ---");
    let mut memoire = MemoryLogger { historique: Vec::new() };
    enregistrer_evenements(&mut memoire);

    // Vérification du contenu du MemoryLogger
    println!("Contenu de l'historique en mémoire :");
    for (i, log) in memoire.historique.iter().enumerate() {
        println!("{}: {}", i + 1, log);
    }

    assert_eq!(memoire.historique.len(), 2);
    assert_eq!(memoire.historique[0], "[INFO] : Démarrage de l'application.");
}
```

---

## Exercice 2 : Contourner la Règle de l'Orphelin (Le Motif Newtype)

### Énoncé
Vous travaillez sur une application météorologique. Vous souhaitez afficher directement une liste de températures (représentée par un `Vec<f64>`) sur la console à l'aide de la macro `println!("{}", liste)`. 

Cependant, vous vous heurtez à la **règle de l'orphelin** : vous ne pouvez pas implémenter le trait standard `std::fmt::Display` directement sur le type standard `Vec<T>`.

#### Objectifs :
1. Créer une structure locale nommée `Temperatures` en utilisant le motif **Newtype** pour envelopper un `Vec<f64>`.
2. Implémenter le trait standard `std::fmt::Display` pour votre structure `Temperatures`. Le format de sortie doit afficher chaque température séparée par une barre verticale (`|`) et suffixée par `°C`. Exemple attendu : `12.5°C | 18.0°C | 22.3°C`.
3. Tester votre implémentation dans la fonction `main` en instanciant `Temperatures` et en l'affichant avec `println!`.

### Indices
* La syntaxe du motif Newtype est une structure de tuple à un seul élément : `struct MonType(TypeExistant);`.
* Pour accéder aux données internes du Newtype à l'intérieur de l'implémentation, utilisez `self.0`.
* Pour implémenter `Display`, importez `std::fmt` et respectez la signature : `fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result`.
* Vous pouvez utiliser la méthode `.iter().enumerate()` pour savoir si vous devez ajouter le séparateur `|` entre les éléments.

### Correction Détaillée

```rust
use std::fmt;

// 1. Définition du Newtype enveloppant un Vec<f64>
struct Temperatures(Vec<f64>);

// 2. Implémentation du trait Display pour le Newtype
impl fmt::Display for Temperatures {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // Accès au vecteur interne via self.0
        for (index, temp) in self.0.iter().enumerate() {
            if index > 0 {
                // Ajout du séparateur entre les éléments
                write!(f, " | ")?;
            }
            // Écriture de la température formatée
            write!(f, "{:.1}°C", temp)?;
        }
        Ok(())
    }
}

fn main() {
    // 3. Instanciation et affichage
    let releves = Temperatures(vec![14.2, 18.5, 22.0, 9.8]);

    println!("Relevés de la journée :");
    // Grâce à l'implémentation de Display, nous pouvons utiliser {}
    println!("{}", releves);

    // Validation du formatage attendu
    let chaine_formatee = format!("{}", releves);
    assert_eq!(chaine_formatee, "14.2°C | 18.5°C | 22.0°C | 9.8°C");
    println!("\nValidation du formatage réussie !");
}
```

---

## Exercice 3 : Panier d'Achat Multi-Produits (Dispatch Dynamique)

### Énoncé
Vous devez concevoir le moteur de calcul de facturation pour une plateforme d'e-commerce. Cette plateforme vend trois types d'articles :
*   Des **produits physiques** (soumis à une TVA de 20% et à des frais de port basés sur le poids).
*   Des **produits numériques** (soumis à une TVA de 5.5%, sans frais de port).
*   Des **services/abonnements** (facturés au taux horaire, soumis à une TVA de 20%, sans frais de port).

Puisque le panier d'un client peut contenir un mélange de ces trois types d'articles, vous devez utiliser le **dispatch dynamique** pour calculer le montant total.

#### Objectifs :
1. Définir un trait `Article` contenant trois méthodes :
   * `fn nom(&self) -> &str;`
   * `fn prix_hors_taxe(&self) -> f64;`
   * `fn calculer_tva(&self) -> f64;`
   * Une méthode avec implémentation par défaut : `fn prix_ttc(&self) -> f64` qui retourne la somme du prix hors taxe et de la TVA.
2. Créer les structures suivantes :
   * `ProduitPhysique` (champs : `nom: String`, `prix: f64`, `poids_kg: f64`). La TVA est de 20%. Les frais de port s'élèvent à 2.0 € par kilogramme (à rajouter au prix TTC final).
   * `ProduitNumerique` (champs : `nom: String`, `prix: f64`). La TVA est de 5.5%.
   * `Service` (champs : `nom: String`, `taux_horaire: f64`, `heures: f64`). Le prix hors taxe est égal au `taux_horaire * heures`. La TVA est de 20%.
3. Implémenter le trait `Article` pour ces trois structures. *Note : Pour `ProduitPhysique`, surchargez la méthode `prix_ttc` pour y inclure les frais de port.*
4. Créer une structure `Panier` contenant un vecteur d'objets de trait : `Vec<Box<dyn Article>>`.
5. Implémenter une méthode `calculer_total(&self) -> f64` sur `Panier` qui retourne la somme totale TTC de tous les articles du panier.

### Indices
* Pour surcharger une méthode de trait (comme `prix_ttc` pour `ProduitPhysique`), il suffit de redéfinir la fonction dans le bloc `impl Article for ProduitPhysique`. Vous pouvez appeler les autres méthodes du trait (comme `self.prix_hors_taxe()`) à l'intérieur.
* N'oubliez pas que pour manipuler des objets de trait dans un vecteur, la syntaxe est `Vec<Box<dyn Article>>`.

### Correction Détaillée

```rust
// 1. Définition du Trait Article
pub trait Article {
    fn nom(&self) -> &str;
    fn prix_hors_taxe(&self) -> f64;
    fn calculer_tva(&self) -> f64;

    // Méthode par défaut
    fn prix_ttc(&self) -> f64 {
        self.prix_hors_taxe() + self.calculer_tva()
    }
}

// 2. Définition des structures de données
pub struct ProduitPhysique {
    pub nom: String,
    pub prix: f64,
    pub poids_kg: f64,
}

pub struct ProduitNumerique {
    pub nom: String,
    pub prix: f64,
}

pub struct Service {
    pub nom: String,
    pub taux_horaire: f64,
    pub heures: f64,
}

// 3. Implémentation du Trait Article pour ProduitPhysique
impl Article for ProduitPhysique {
    fn nom(&self) -> &str {
        &self.nom
    }

    fn prix_hors_taxe(&self) -> f64 {
        self.prix
    }

    fn calculer_tva(&self) -> f64 {
        self.prix * 0.20 // TVA 20%
    }

    // Surcharge de la méthode par défaut pour inclure les frais de port
    fn prix_ttc(&self) -> f64 {
        let prix_base_ttc = self.prix_hors_taxe() + self.calculer_tva();
        let frais_port = self.poids_kg * 2.0;
        prix_base_ttc + frais_port
    }
}

// Implémentation pour ProduitNumerique
impl Article for ProduitNumerique {
    fn nom(&self) -> &str {
        &self.nom
    }

    fn prix_hors_taxe(&self) -> f64 {
        self.prix
    }

    fn calculer_tva(&self) -> f64 {
        self.prix * 0.055 // TVA 5.5%
    }
}

// Implémentation pour Service
impl Article for Service {
    fn nom(&self) -> &str {
        &self.nom
    }

    fn prix_hors_taxe(&self) -> f64 {
        self.taux_horaire * self.heures
    }

    fn fn_calculer_tva(&self) -> f64 { // Note: alignement avec le trait
        self.prix_hors_taxe() * 0.20 // TVA 20%
    }
}

// Correction de la coquille de nommage pour Service
impl Article for Service {
    fn nom(&self) -> &str {
        &self.nom
    }

    fn prix_hors_taxe(&self) -> f64 {
        self.taux_horaire * self.heures
    }

    fn calculer_tva(&self) -> f64 {
        self.prix_hors_taxe() * 0.20 // TVA 20%
    }
}

// 4. Définition de la structure Panier (Dispatch Dynamique)
pub struct Panier {
    pub articles: Vec<Box<dyn Article>>,
}

impl Panier {
    // 5. Calcul du total TTC cumulé
    pub fn calculer_total(&self) -> f64 {
        let mut total = 0.0;
        for article in &self.articles {
            // L'appel à prix_ttc() est résolu dynamiquement à l'exécution
            total += article.prix_ttc();
        }
        total
    }
}

fn main() {
    // Instanciation de différents articles
    let livre = ProduitPhysique {
        nom: String::from("Livre de Rust en images"),
        prix: 30.0,      // TTC (20%) = 36.0 | Frais de port (1.5kg * 2) = 3.0 | Total = 39.0
        poids_kg: 1.5,
    };

    let ebook = ProduitNumerique {
        nom: String::from("Ebook Rust Avancé"),
        prix: 10.0,      // TTC (5.5%) = 10.55 | Total = 10.55
    };

    let formation = Service {
        nom: String::from("Consulting Rust"),
        taux_horaire: 100.0,
        heures: 2.0,     // HT = 200.0 | TTC (20%) = 240.0 | Total = 240.0
    };

    // Remplissage du panier hétérogène
    let mon_panier = Panier {
        articles: vec![
            Box::new(livre),
            Box::new(ebook),
            Box::new(formation),
        ],
    };

    // Affichage du détail des articles pour vérification
    println!("--- Détail du Panier ---");
    for art in &mon_panier.articles {
        println!(
            "- {} : HT = {:.2} € | TTC = {:.2} €",
            art.nom(),
            art.prix_hors_taxe(),
            art.prix_ttc()
        );
    }

    // Calcul du total
    let total_panier = mon_panier.calculer_total();
    println!("\nTotal Général du Panier : {:.2} €", total_panier);

    // Validation : 39.0 + 10.55 + 240.0 = 289.55
    assert!((total_panier - 289.55).abs() < 0.001);
    println!("Validation du calcul du panier réussie !");
}
```