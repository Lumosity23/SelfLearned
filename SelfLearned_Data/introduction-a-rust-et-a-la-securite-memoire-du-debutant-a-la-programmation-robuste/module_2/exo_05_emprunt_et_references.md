# Exercices d'Application : L'Emprunt (Borrowing) et les Références

Ce cahier d'exercices pratiques a pour but de consolider votre compréhension des concepts d'emprunt immuable (`&T`), d'emprunt mutable (`&mut T`) et des règles de validation du *Borrow Checker* de Rust. Les exercices sont classés par ordre de difficulté progressive.

---

## Exercice 1 : Le Correcteur de Texte (Facile)

### Énoncé
Vous devez concevoir un outil d'analyse et de correction de texte ultra-léger. Pour éviter de copier inutilement des chaînes de caractères en mémoire, vous devez utiliser exclusivement des références.

Implémentez deux fonctions :
1. `compter_mots` : Reçoit une référence immuable vers une `String` et retourne le nombre de mots qu'elle contient (on considère que les mots sont séparés par des espaces).
2. `rendre_poli` : Reçoit une référence mutable vers une `String`. Si la chaîne ne se termine pas par un point (`.`), la fonction doit ajouter ce point à la fin de la chaîne.

Dans votre fonction `main`, vous devrez initialiser une phrase, afficher son nombre de mots, la modifier avec `rendre_poli`, puis afficher le résultat final.

### Indices
* Pour compter les mots, vous pouvez utiliser la méthode `.split_whitespace()` sur une chaîne, puis appeler `.count()` sur l'itérateur obtenu.
* Pour vérifier la fin d'une chaîne, utilisez la méthode `.ends_with('.')`.
* Pour ajouter un caractère à une `String`, utilisez la méthode `.push('.')`.

---

### Correction Détaillée

```rust
// 1. Emprunt immuable (&String) car nous lisons uniquement la donnée
fn compter_mots(texte: &String) -> usize {
    // split_whitespace() crée un itérateur sur les sous-parties du texte
    texte.split_whitespace().count()
}

// 2. Emprunt mutable (&mut String) car nous modifions la donnée d'origine
fn rendre_poli(texte: &mut String) {
    if !texte.ends_with('.') {
        texte.push('.'); // Modification directe en mémoire
    }
}

fn main() {
    // La variable d'origine doit être déclarée 'mut' pour pouvoir être empruntée mutablement plus tard
    let mut phrase = String::from("Apprendre le Rust est passionnant");

    // Premier emprunt : Immuable. 
    // Nous passons une référence pour que 'compter_mots' ne prenne pas la propriété de 'phrase'.
    let nb_mots = compter_mots(&phrase);
    println!("La phrase contient {} mots.", nb_mots);

    // Deuxième emprunt : Mutable.
    // Nous passons une référence exclusive pour permettre la modification.
    rendre_poli(&mut phrase);

    // Après l'exécution des fonctions, 'phrase' est toujours valide et a été modifiée.
    println!("Phrase corrigée : \"{}\"", phrase);
}
```

**Explications pédagogiques :**
* `compter_mots(&phrase)` : Nous prêtons la phrase en lecture seule. Une fois la fonction terminée, l'emprunt prend fin.
* `rendre_poli(&mut phrase)` : Nous prêtons la phrase en écriture. Le compilateur s'assure qu'aucune autre référence (immuable ou mutable) n'est active à ce moment précis, évitant tout conflit d'accès.

---

## Exercice 2 : Le Détecteur de Conflits (Moyen)

### Énoncé
Un développeur junior a écrit le code suivant pour gérer l'état d'un livre dans une bibliothèque numérique. Cependant, le compilateur Rust refuse catégoriquement de compiler ce programme.

```rust
struct Livre {
    titre: String,
    disponible: bool,
}

fn main() {
    let mut livre = Livre {
        titre: String::from("Le Petit Prince"),
        disponible: true,
    };

    // Le développeur veut garder une référence vers le titre
    let ref_titre = &livre.titre; 

    // Il veut également marquer le livre comme emprunté (non disponible)
    let ref_livre_mut = &mut livre; 
    ref_livre_mut.disponible = false;

    // Il affiche enfin le titre en utilisant la référence créée plus haut
    println!("Le livre '{}' a été emprunté.", ref_titre);
}
```

1. **Identifiez et expliquez** précisément pourquoi le compilateur refuse ce code (en faisant référence à la règle d'or du *Borrow Checker*).
2. **Proposez une solution** pour corriger ce code sans cloner le titre ni supprimer l'affichage final, en tirant parti du concept de *Non-Lexical Lifetimes* (NLL) ou en réorganisant les instructions.

### Indices
* Relisez la règle d'or : **Aliasing XOR Mutabilité**.
* Regardez à quel endroit précis `ref_titre` (emprunt immuable) est utilisé pour la dernière fois, et où `ref_livre_mut` (emprunt mutable) commence à être utilisé.

---

### Correction Détaillée

#### 1. Analyse de l'erreur
Le code ne compile pas car il enfreint la règle d'or du partage des données : **on ne peut pas avoir un emprunt mutable en même temps qu'un emprunt immuable sur la même ressource**.

* À la ligne `let ref_titre = &livre.titre;`, un emprunt **immuable** est créé sur une partie de `livre`.
* À la ligne `let ref_livre_mut = &mut livre;`, un emprunt **mutable** est créé sur l'intégralité de `livre`.
* À la ligne `println!(..., ref_titre);`, l'emprunt immuable `ref_titre` est utilisé.

Puisque l'emprunt mutable `ref_livre_mut` intervient *pendant* que l'emprunt immuable `ref_titre` est encore actif (car utilisé plus bas), le compilateur bloque le programme pour éviter que la structure ne soit modifiée pendant qu'on lit l'un de ses champs.

#### 2. Code corrigé (Solution)

Pour résoudre ce problème, il suffit de déplacer l'affichage (qui utilise l'emprunt immuable) **avant** la création de l'emprunt mutable. Grâce aux *Non-Lexical Lifetimes* (NLL), le compilateur comprendra que l'emprunt immuable se termine dès que la variable n'est plus lue.

```rust
struct Livre {
    titre: String,
    disponible: bool,
}

fn main() {
    let mut livre = Livre {
        titre: String::from("Le Petit Prince"),
        disponible: true,
    };

    // 1. Emprunt immuable créé
    let ref_titre = &livre.titre; 

    // 2. Utilisation de l'emprunt immuable. 
    // C'est sa DERNIÈRE utilisation active. L'emprunt immuable s'arrête ici !
    println!("Le livre '{}' va être emprunté.", ref_titre);

    // 3. Emprunt mutable créé. 
    // C'est parfaitement valide car plus aucun autre emprunt n'est actif sur 'livre'.
    let ref_livre_mut = &mut livre; 
    ref_livre_mut.disponible = false;
    
    println!("Statut de disponibilité mis à jour.");
}
```

---

## Exercice 3 : L'Inventaire de Magasin (Difficile)

### Énoncé
Vous développez un système de gestion de stock pour un magasin de jeux de société. Chaque produit est représenté par la structure suivante :

```rust
struct Produit {
    nom: String,
    prix: f64,
    quantite: u32,
}
```

Vous devez écrire un programme performant qui évite toute copie de structure. Implémentez les trois fonctions suivantes :

1. `calculer_valeur_stock` : Reçoit une référence immuable vers un vecteur de produits (`&Vec<Produit>`) et retourne la valeur totale du stock (somme de `prix * quantite` pour chaque produit).
2. `appliquer_remise` : Reçoit une référence mutable vers un vecteur de produits (`&mut Vec<Produit>`) et un pourcentage de remise (ex: `10.0` pour 10%). Elle doit réduire le prix de chaque produit du stock de ce pourcentage.
3. `trouver_produit_le_plus_cher` : Reçoit une référence immuable vers un vecteur de produits (`&Vec<Produit>`) et retourne une **option contenant une référence immuable** vers le produit le plus cher (`Option<&Produit>`). Si le vecteur est vide, retournez `None`.

### Indices
* Pour parcourir un vecteur par référence immuable, utilisez `for produit in inventaire`.
* Pour parcourir un vecteur par référence mutable afin de modifier ses éléments, utilisez `for produit in inventaire.iter_mut()`.
* Pour trouver le produit le plus cher, vous pouvez déclarer une variable temporaire `let mut plus_cher: Option<&Produit> = None;` et comparer les prix lors du parcours du vecteur.

---

### Correction Détaillée

```rust
#[derive(Debug)]
struct Produit {
    nom: String,
    prix: f64,
    quantite: u32,
}

// 1. Calcul de la valeur totale (Lecture seule -> &Vec<Produit>)
fn calculer_valeur_stock(inventaire: &Vec<Produit>) -> f64 {
    let mut total = 0.0;
    for produit in inventaire {
        total += produit.prix * (produit.quantite as f64);
    }
    total
}

// 2. Application d'une remise (Modification -> &mut Vec<Produit>)
fn appliquer_remise(inventaire: &mut Vec<Produit>, pourcentage: f64) {
    // iter_mut() permet d'obtenir des références mutables sur chaque élément du vecteur
    for produit in inventaire.iter_mut() {
        produit.prix -= produit.prix * (pourcentage / 100.0);
    }
}

// 3. Recherche du produit le plus cher (Retourne une référence liée à la durée de vie du vecteur)
fn trouver_produit_le_plus_cher(inventaire: &Vec<Produit>) -> Option<&Produit> {
    if inventaire.is_empty() {
        return None;
    }

    let mut produit_max = &inventaire[0]; // On commence par le premier élément

    for produit in inventaire {
        if produit.prix > produit_max.prix {
            produit_max = produit; // On met à jour la référence vers le produit le plus cher
        }
    }

    Some(produit_max)
}

fn main() {
    let mut stock = vec![
        Produit { nom: String::from("Dixit"), prix: 30.0, quantite: 5 },
        Produit { nom: String::from("Catan"), prix: 40.0, quantite: 3 },
        Produit { nom: String::from("7 Wonders"), prix: 45.0, quantite: 2 },
    ];

    // Étape 1 : Calcul et affichage de la valeur initiale du stock
    let valeur_initiale = calculer_valeur_stock(&stock);
    println!("Valeur totale initiale du stock : {:.2} €", valeur_initiale);

    // Étape 2 : Recherche du produit le plus cher
    if let Some(cher) = trouver_produit_le_plus_cher(&stock) {
        println!("Le produit le plus cher est : {} ({:.2} €)", cher.nom, cher.prix);
    }

    // Étape 3 : Application d'une remise de 10%
    println!("\n--- Application d'une remise de 10% ---");
    appliquer_remise(&mut stock, 10.0);

    // Étape 4 : Recalcul après remise
    let valeur_apres_remise = calculer_valeur_stock(&stock);
    println!("Nouvelle valeur totale du stock : {:.2} €", valeur_apres_remise);
    
    if let Some(cher) = trouver_produit_le_plus_cher(&stock) {
        println!("Le produit le plus cher après remise : {} ({:.2} €)", cher.nom, cher.prix);
    }
}
```

**Pourquoi ce code est-il robuste et performant ?**
1. **Zéro allocation superflue** : À aucun moment nous ne dupliquons les structures `Produit` ou les chaînes de caractères `nom`. Tout se fait par manipulation d'adresses mémoires (pointeurs sûrs).
2. **Signature de fonction propre** : La fonction `trouver_produit_le_plus_cher` renvoie un `Option<&Produit>`. Cette référence est garantie par Rust comme pointant vers un produit existant à l'intérieur du vecteur. Si le vecteur venait à être détruit, le compilateur interdirait l'accès à cette référence.