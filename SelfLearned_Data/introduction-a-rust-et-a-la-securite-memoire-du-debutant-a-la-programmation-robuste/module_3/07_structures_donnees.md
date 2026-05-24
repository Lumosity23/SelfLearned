# Structures (Structs) : Organiser ses données proprement

Dans les modules précédents, nous avons exploré les types de données primitifs (comme les entiers et les booléens) ainsi que les types composés de base (comme les tuples et les tableaux). Bien que ces outils soient indispensables, ils montrent rapidement leurs limites lorsqu'il s'agit de modéliser des concepts complexes du monde réel. 

Ce module est dédié aux **structures** (`structs`), le mécanisme fondamental en Rust pour créer des types de données personnalisés, encapsuler des états cohérents et associer du comportement à ces données.

---

## 1. Introduction Conceptuelle : Le "Pourquoi" avant le "Comment"

Jusqu'à présent, pour représenter un point dans un espace bidimensionnel, vous auriez pu utiliser un tuple :

```rust
let point: (i32, i32) = (10, 20);
```

Cette approche pose plusieurs problèmes majeurs :
1. **Perte de sémantique** : Rien n'indique que la première valeur représente l'abscisse ($x$) et la seconde l'ordonnée ($y$), si ce n'est une convention arbitraire décidée par le développeur.
2. **Absence de typage fort** : Un tuple `(i32, i32)` représentant une coordonnée géographique pourrait accidentellement être passé à une fonction qui attend un tuple `(i32, i32)` représentant une fraction (numérateur, dénominateur). Le compilateur ne verrait aucune erreur, ce qui ouvre la porte à des bugs logiques subtils.
3. **Évolutivité fastidieuse** : Si vous décidez d'ajouter une troisième dimension ($z$), vous devez modifier la signature de toutes les fonctions manipulant ce tuple.

Les **structures** résolvent ces problèmes en permettant de nommer non seulement le type global, mais aussi chacun de ses composants (appelés **champs** ou *fields*). Elles permettent de regrouper des données hétérogènes sous une même entité logique, garantissant ainsi la cohérence et la clarté du code.

---

## 2. Fondations Théoriques

Rust propose trois grandes catégories de structures, chacune répondant à un besoin architectural précis.

### A. Les trois types de structures

#### 1. Les structures classiques (à champs nommés)
C'est la forme la plus courante. Chaque donnée possède un nom explicite et un type défini.

```rust
struct Utilisateur {
    pseudo: String,
    email: String,
    nombre_de_connexions: u64,
    actif: bool,
}
```

#### 2. Les structures tuples (*Tuple Structs*)
Elles sont utiles lorsque vous souhaitez donner un nom global à un tuple pour renforcer la sécurité du typage, mais que le nommage individuel des champs n'apporte aucune valeur ajoutée.

```rust
struct Point3D(f64, f64, f64);
struct Couleur(u8, u8, u8);
```
Ici, `Point3D` et `Couleur` sont deux types distincts pour le compilateur, bien qu'ils contiennent tous deux trois valeurs numériques. Impossible de les confondre par inadvertance.

#### 3. Les structures unitaires (*Unit-Like Structs*)
Ces structures ne contiennent aucun champ. Elles se comportent de manière similaire au type unitaire `()`. 

```rust
struct ValidateurDeDonnees;
```
*Note : Elles sont principalement utilisées pour implémenter des comportements (via les traits, qui seront étudiés dans le Module 5) sur des types qui n'ont pas besoin de stocker d'état interne.*

### B. Représentation en mémoire, alignement et optimisation

Contrairement à d'autres langages de bas niveau comme le C, Rust ne garantit pas par défaut que les champs d'une structure seront disposés en mémoire dans leur ordre de déclaration. 

Le compilateur Rust optimise la disposition des données en mémoire (*struct layout*) afin de minimiser le **remplissage** (*padding*) requis par les contraintes d'alignement du processeur.

#### Exemple d'optimisation de layout :
Considérons la structure suivante :

```rust
struct Exemple {
    a: u8,   // 1 octet
    b: u32,  // 4 octets (doit être aligné sur une adresse multiple de 4)
    c: u8,   // 1 octet
}
```

* **En C (sans optimisation)** : La structure occuperait 12 octets en mémoire à cause du rembourrage inséré pour aligner `b` et préserver l'alignement global.
* **En Rust** : Le compilateur peut réordonner les champs en interne (par exemple : `b` puis `a` puis `c`) pour que la structure ne prenne que 8 octets en mémoire.

```
[ Représentation optimisée par Rust ]
+-------------------+---------+---------+-------------------+
|      b (u32)      | a (u8)  | c (u8)  | Padding (2 octets)|
|      4 octets     | 1 octet | 1 octet |     Inutilisé     |
+-------------------+---------+---------+-------------------+
Total = 8 octets (au lieu de 12)
```

### C. Propriété (Ownership) et Mutabilité des structures

Les règles d'or de l'ownership (étudiées dans le Module 2) s'appliquent rigoureusement aux structures :

1. **Propriété des champs** : Une structure est propriétaire de ses champs. Si un champ contient un type qui n'implémente pas le trait `Copy` (comme `String`), la structure devient l'unique propriétaire de cette donnée.
2. **Mutabilité globale** : En Rust, la mutabilité est une propriété de la *liaison de variable* (la variable déclarée avec `let mut`), et non de la structure elle-même. Il est impossible de déclarer certains champs mutables et d'autres immuables au sein de la même définition de structure.

```rust
struct Compteur {
    valeur: u32,
}

let mut c1 = Compteur { valeur: 0 };
c1.valeur = 5; // Autorisé car c1 est déclarée avec 'let mut'

let c2 = Compteur { valeur: 0 };
// c2.valeur = 5; // ERREUR de compilation : c2 est immuable
```

---

## 3. Implémentation Pratique Pas-à-Pas

### Étape 1 : Déclaration et Instanciation de base

Déclarons une structure représentant un livre dans une bibliothèque.

```rust
struct Livre {
    titre: String,
    auteur: String,
    pages: u32,
    disponible: bool,
}

fn main() {
    // Instanciation d'une structure immuable
    let mon_livre = Livre {
        titre: String::from("Le Petit Prince"),
        auteur: String::from("Antoine de Saint-Exupéry"),
        pages: 96,
        disponible: true,
    };

    // Accès aux champs via la notation pointée
    println!("Livre : '{}' par {}", mon_livre.titre, mon_livre.auteur);
}
```

### Étape 2 : Raccourci d'initialisation des champs (*Field Init Shorthand*)

Lorsque les variables locales portent exactement le même nom que les champs de la structure, Rust permet de simplifier l'écriture :

```rust
fn creer_livre(titre: String, auteur: String, pages: u32) -> Livre {
    // Au lieu de 'titre: titre', on écrit simplement 'titre'
    Livre {
        titre,
        auteur,
        pages,
        disponible: true,
    }
}
```

### Étape 3 : Syntaxe de mise à jour de structure (*Struct Update Syntax*)

Il est fréquent de vouloir créer une nouvelle instance d'une structure en copiant la majorité des valeurs d'une instance existante. Rust propose l'opérateur `..` pour réaliser cela élégamment.

```rust
fn main() {
    let livre_original = Livre {
        titre: String::from("L'Étranger"),
        auteur: String::from("Albert Camus"),
        pages: 123,
        disponible: true,
    };

    // Création d'une copie avec modification d'un seul champ
    let livre_emprunte = Livre {
        disponible: false,
        ..livre_original // Récupère tous les autres champs de livre_original
    };

    // ATTENTION : livre_original ne peut plus être utilisé entièrement ici !
    // Pourquoi ? Parce que les champs de type String (titre, auteur) n'implémentent pas Copy.
    // Ils ont été DÉPLACÉS (moved) dans livre_emprunte.
    
    // println!("{}", livre_original.titre); // ERREUR de compilation !
    println!("Le livre original n'est plus accessible car ses Strings ont été déplacées.");
}
```

### Étape 4 : Implémentation de méthodes et fonctions associées (`impl`)

Pour associer du comportement à nos structures, nous utilisons le bloc `impl` (implémentation).

* **Fonctions associées** : Elles ne prennent pas `self` en paramètre. Elles sont souvent utilisées comme constructeurs (par convention nommés `new`). On les appelle avec l'opérateur de résolution de portée `::`.
* **Méthodes** : Elles prennent `self`, `&self` ou `&mut self` comme premier paramètre. On les appelle avec la notation pointée `.`.

```rust
struct Rectangle {
    largeur: f64,
    hauteur: f64,
}

impl Rectangle {
    // Fonction associée (Constructeur)
    fn new(largeur: f64, hauteur: f64) -> Rectangle {
        Rectangle { largeur, hauteur }
    }

    // Méthode en lecture seule (emprunt immuable)
    fn calculer_aire(&self) -> f64 {
        self.largeur * self.hauteur
    }

    // Méthode en écriture (emprunt mutable)
    fn redimensionner(&mut self, nouvelle_largeur: f64, nouvelle_hauteur: f64) {
        self.largeur = nouvelle_largeur;
        self.hauteur = nouvelle_hauteur;
    }
}

fn main() {
    // Appel de la fonction associée
    let mut rect = Rectangle::new(10.0, 5.0);

    // Appel de la méthode de lecture
    println!("Aire initiale : {} px²", rect.calculer_aire());

    // Appel de la méthode de modification
    rect.redimensionner(20.0, 10.0);
    println!("Nouvelle aire : {} px²", rect.calculer_aire());
}
```

---

## 4. Pièges Fréquents et Bonnes Pratiques

### Piège 1 : Le déplacement partiel (*Partial Move*)
Si vous accédez à un champ non-`Copy` d'une structure et que vous le déplacez hors de la structure, celle-ci devient partiellement détruite. Vous ne pouvez plus utiliser la structure dans son ensemble, sauf si vous réinitialisez le champ déplacé.

```rust
struct Utilisateur {
    pseudo: String,
    actif: bool,
}

fn main() {
    let u = Utilisateur {
        pseudo: String::from("Alice"),
        actif: true,
    };

    let nom = u.pseudo; // Le String est déplacé ici. u.pseudo n'est plus valide.

    // println!("Utilisateur : {:?}", u); // ERREUR : utilisation d'une valeur partiellement déplacée
    println!("Le pseudo extrait est : {}", nom);
}
```

### Piège 2 : Tenter de rendre des champs mutables individuellement
La syntaxe suivante est invalide et rejetée par le compilateur :

```rust
// CODE INCORRECT - NE COMPILE PAS
struct ErreurDeSyntaxe {
    mut champ_mutable: i32, // Syntaxe interdite
    champ_immuable: i32,
}
```
**Solution** : Si vous avez besoin de mutabilité interne fine sans rendre toute la structure mutable, vous devrez utiliser des patterns avancés comme la "mutabilité intérieure" (`RefCell`, `Mutex`), qui seront abordés dans les modules avancés (Module 5). Pour l'instant, considérez que la mutabilité s'applique à l'instance complète.

### Bonne Pratique 1 : Dériver le trait `Debug` pour l'affichage
Par défaut, vous ne pouvez pas afficher une structure avec `println!("{}", ma_struct)`. Pour faciliter le débogage, ajoutez toujours l'attribut `#[derive(Debug)]` au-dessus de vos structures. Cela vous permettra de les inspecter avec le formateur `{:?}` ou `{:#?}` (affichage joli).

```rust
#[derive(Debug)]
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p = Point { x: 1, y: 2 };
    println!("Debug simple : {:?}", p);
    println!("Debug élégant : {:#?}", p);
}
```

---

## 5. Synthèse Pédagogique

| Type de Structure | Syntaxe de Déclaration | Cas d'usage principal | Exemple d'instanciation |
| :--- | :--- | :--- | :--- |
| **Classique** | `struct Nom { f1: T1, f2: T2 }` | Modélisation de concepts complexes avec données nommées. | `let n = Nom { f1: v1, f2: v2 };` |
| **Tuple** | `struct Nom(T1, T2);` | Création de types distincts (*Newtype pattern*) sans surcharge de noms. | `let t = Nom(v1, v2);` |
| **Unitaire** | `struct Nom;` | Implémentation de comportements (traits) sans état interne. | `let u = Nom;` |

### Règles clés à retenir :
1. **Pas de mutabilité partielle** : Une structure est mutable dans son ensemble ou immuable dans son ensemble.
2. **Mise à jour de structure (`..`)** : Attention aux transferts de propriété (*moves*) des champs non-`Copy`.
3. **Méthodes vs Fonctions associées** : Les méthodes prennent `self` (sous forme d'emprunt `&self` ou `&mut self`), les fonctions associées ne le prennent pas.

---

## 6. Exercice Pratique d'Application

### Énoncé : Gestionnaire de Stock de Magasin

Vous devez concevoir un système de gestion de stock simplifié pour un magasin de jeux vidéo.

1. Créez une structure nommée `JeuVideo` contenant les champs suivants :
   * `titre` : un `String`
   * `prix` : un `f64`
   * `quantite_stock` : un `u32`
2. Implémentez un bloc `impl` pour `JeuVideo` contenant :
   * Une fonction associée `nouveau(titre: &str, prix: f64, quantite_stock: u32) -> JeuVideo` servant de constructeur.
   * Une méthode `afficher_details(&self)` qui affiche proprement les informations du jeu.
   * Une méthode `appliquer_remise(&mut self, pourcentage: f64)` qui réduit le prix du jeu du pourcentage indiqué.
   * Une méthode `vendre(&mut self, quantite: u32) -> bool` qui diminue la quantité en stock de la quantité vendue si le stock est suffisant, et retourne `true`. Si le stock est insuffisant, elle ne modifie rien et retourne `false`.

### Indices de résolution
* Pour convertir un `&str` en `String` dans le constructeur, utilisez la méthode `.to_string()` ou `String::from()`.
* Pour appliquer une remise de $20\%$, le nouveau prix est calculé par : $\text{prix} \times (1.0 - (\text{pourcentage} / 100.0))$.

---

### Solution Complète et Commentée

Voici l'implémentation attendue. Prenez le temps de la lire et de comprendre chaque ligne avant de la tester dans votre environnement de développement.

```rust
#[derive(Debug)] // Permet d'afficher la structure pour le débogage
struct JeuVideo {
    titre: String,
    prix: f64,
    quantite_stock: u32,
}

impl JeuVideo {
    // 1. Constructeur (Fonction associée)
    fn nouveau(titre: &str, prix: f64, quantite_stock: u32) -> JeuVideo {
        JeuVideo {
            titre: titre.to_string(), // Conversion de &str en String appartenant à la structure
            prix,
            quantite_stock,
        }
    }

    // 2. Méthode d'affichage (Emprunt immuable car on ne fait que lire)
    fn afficher_details(&self) {
        println!("--- Fiche Produit ---");
        println!("Titre      : {}", self.titre);
        println!("Prix       : {:.2} €", self.prix);
        println!("En Stock   : {} unités", self.quantite_stock);
        println!("---------------------");
    }

    // 3. Méthode de modification du prix (Emprunt mutable)
    fn appliquer_remise(&mut self, pourcentage: f64) {
        if pourcentage > 0.0 && pourcentage <= 100.0 {
            let reduction = self.prix * (pourcentage / 100.0);
            self.prix -= reduction;
            println!("Une remise de {}% a été appliquée sur '{}'.", pourcentage, self.titre);
        } else {
            println!("Erreur : Pourcentage de remise invalide.");
        }
    }

    // 4. Méthode de vente (Emprunt mutable car on modifie la quantité en stock)
    fn vendre(&mut self, quantite: u32) -> bool {
        if self.quantite_stock >= quantite {
            self.quantite_stock -= quantite;
            println!("Vente réussie : {} exemplaire(s) de '{}' vendu(s).", quantite, self.titre);
            true
        } else {
            println!("Vente échouée : Stock insuffisant pour '{}' (Demandé: {}, Disponible: {}).", 
                     self.titre, quantite, self.quantite_stock);
            false
        }
    }
}

fn main() {
    // Initialisation d'un jeu vidéo mutable
    let mut jeu = JeuVideo::nouveau("The Legend of Zelda: Breath of the Wild", 59.99, 10);

    // Affichage initial
    jeu.afficher_details();

    // Tentative de vente réussie
    let vente1 = jeu.vendre(3);
    println!("Statut de la vente : {}", vente1);
    println!("Nouveau stock : {} unités\n", jeu.quantite_stock);

    // Application d'une promotion de 20%
    jeu.appliquer_remise(20.0);
    jeu.afficher_details();

    // Tentative de vente supérieure au stock disponible
    let vente2 = jeu.vendre(15);
    println!("Statut de la vente : {}\n", vente2);

    // Vérification finale de l'état de la structure via le format Debug
    println!("État final de la structure (Debug) :");
    println!("{:#?}", jeu);
}
```