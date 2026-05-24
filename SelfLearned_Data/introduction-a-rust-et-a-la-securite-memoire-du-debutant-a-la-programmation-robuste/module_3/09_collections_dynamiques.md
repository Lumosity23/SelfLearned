# Les Collections Standards (Vector, String) et leur gestion dynamique de la mémoire

## 1. Introduction Conceptuelle

Dans les chapitres précédents, nous avons exploré les types de données de base ainsi que les tableaux à taille fixe (`[T; N]`, étudiés au **Module 1.2**). Bien que ces structures soient extrêmement performantes grâce à leur allocation sur la Pile (*Stack*), elles souffrent d'une limitation majeure : leur taille doit être impérativement connue dès la compilation et ne peut plus jamais varier durant l'exécution du programme.

Or, la réalité du développement logiciel impose de manipuler des données dont le volume est par nature imprévisible :
* Un fichier texte dont on ignore le nombre de lignes avant de l'ouvrir.
* Les saisies successives d'un utilisateur au clavier.
* Des paquets réseau reçus de manière asynchrone.

Pour répondre à ce besoin, Rust propose des **collections dynamiques**. Contrairement aux tableaux statiques, ces collections stockent leurs éléments sur le Tas (*Heap*, étudié au **Module 1.3**). Cela leur permet de croître ou de rétrécir dynamiquement au cours de l'exécution. 

Le défi historique de cette flexibilité réside dans la gestion de la mémoire. Dans des langages comme le C, l'allocation dynamique manuelle (`malloc`/`free`) est une source intarissable de failles de sécurité (doubles libérations, fuites de mémoire, pointeurs ballants). Dans d'autres langages, un ramasse-miettes (*Garbage Collector*) gère ce fardeau au prix de pauses d'exécution imprévisibles et d'une surconsommation de ressources.

Rust résout cette équation grâce à son système d'**Ownership (Propriété)** (étudié au **Module 2.1**). Les collections standards comme `Vec<T>` et `String` agissent comme des gestionnaires sécurisés de la mémoire du Tas. Elles appliquent le principe de l'acquisition de ressources à l'initialisation (RAII) : dès que la collection sort de la portée (*scope*), la mémoire allouée sur le Tas est automatiquement et instantanément libérée, sans aucun coût d'exécution caché.

---

## 2. Fondations Théoriques

Pour comprendre l'efficacité et la sécurité des collections dynamiques en Rust, il est indispensable d'analyser leur structure interne sous le capot.

### 2.1 Anatomie d'un Vecteur (`Vec<T>`)

Un vecteur `Vec<T>` est une structure de données de taille fixe stockée sur la **Pile**, qui pointe vers un espace contigu de mémoire alloué sur le **Tas**. 

Sur la Pile, un `Vec<T>` est représenté par exactement trois mots machine (soit 24 octets sur une architecture 64 bits) :

1. **Le Pointeur (`ptr`)** : L'adresse mémoire du premier élément stocké sur le Tas.
2. **La Capacité (`cap`)** : Le nombre total d'éléments que l'espace actuellement alloué sur le Tas peut contenir sans nécessiter de réallocation.
3. **La Longueur (`len`)** : Le nombre d'éléments actuellement initialisés et présents dans le vecteur.

```
       PILE (STACK)                           TAS (HEAP)
   +-------------------+             +--------------------------+
   | ptr (pointeur)    | ----------> | Element 0 | Element 1    |
   +-------------------+             +--------------------------+
   | cap (capacité: 4) |             | Element 2 | (non init)   |
   +-------------------+             +--------------------------+
   | len (longueur: 3) |             
   +-------------------+             
```

### 2.2 Le Mécanisme de Réallocation

Que se passe-t-il lorsque l'on ajoute un élément à un vecteur alors que sa longueur est égale à sa capacité (`len == cap`) ?

1. **Allocation d'un nouveau bloc** : Rust demande à l'allocateur de mémoire un nouveau bloc sur le Tas, généralement deux fois plus grand que le précédent (stratégie de croissance géométrique).
2. **Copie/Déplacement** : Les éléments existants sont déplacés vers le nouvel emplacement.
3. **Désallocation** : L'ancien bloc de mémoire sur le Tas est libéré.
4. **Mise à jour des métadonnées** : Le pointeur du vecteur est mis à jour vers la nouvelle adresse, la capacité est doublée, et la longueur est incrémentée.

Cette stratégie de doublement garantit que l'insertion d'un élément s'effectue en un temps amorti constant, soit $\mathcal{O}(1)$.

### 2.3 Le Cas Particulier de `String`

En Rust, une chaîne de caractères `String` n'est rien d'autre qu'une enveloppe de protection (*wrapper*) autour d'un vecteur d'octets de type `Vec<u8>`.

La seule différence conceptuelle réside dans une garantie fondamentale : **un `String` doit toujours contenir une séquence UTF-8 valide**. Rust applique cette vérification de manière stricte lors de la création ou de la modification d'un `String`.

### 2.4 Sécurité Mémoire et Réallocation

Le système d'Ownership de Rust empêche un bug classique des langages système : le pointeur ballant post-réallocation. 

Si un programme conserve une référence vers un élément situé à l'intérieur d'un vecteur, et que ce vecteur subit une réallocation, l'ancienne mémoire est libérée. La référence pointerait alors vers de la mémoire invalide. En Rust, le **Borrow Checker** (étudié au **Module 2.2**) détecte et interdit formellement cette situation à la compilation en empêchant toute modification du vecteur tant qu'une référence sur l'un de ses éléments est active.

---

## 3. Implémentation Pratique Pas-à-Pas

### 3.1 Manipulation des Vecteurs (`Vec<T>`)

Voici comment créer, modifier et inspecter des vecteurs de manière idiomatique.

```rust
fn main() {
    // 1. Création d'un vecteur vide. Rust exige la spécification du type si aucun élément n'est inséré.
    let mut nombres: Vec<i32> = Vec::new();

    // 2. Ajout d'éléments (mutation)
    nombres.push(10);
    nombres.push(20);
    nombres.push(30);

    println!("Vecteur après ajouts : {:?}", nombres);
    println!("Longueur : {}, Capacité : {}", nombres.len(), nombres.capacity());

    // 3. Utilisation de la macro de commodité vec!
    let mut notes = vec![15, 18, 12];
    
    // 4. Retrait du dernier élément
    // pop() renvoie une Option<T> (étudiée en détail au Module 4.2)
    if let Some(derniere_note) = notes.pop() {
        println!("Note retirée : {}", derniere_note);
    }

    // 5. Accès sécurisé vs Accès direct
    // Accès direct par index (risque de panique si l'index est hors-limites)
    let premiere_note = notes[0];
    println!("Première note (direct) : {}", premiere_note);

    // Accès sécurisé via .get() qui renvoie une Option<&T>
    match notes.get(5) {
        Some(note) => println!("Note à l'index 5 : {}", note),
        None => println!("Aucune note à l'index 5 (Accès sécurisé sans plantage)."),
    }
}
```

### 3.2 Manipulation des Chaînes de Caractères (`String`)

Comprendre la distinction entre `String` (alloué sur le Tas, modifiable) et `&str` (tranche de chaîne de caractères, souvent stockée dans le binaire ou pointant vers un `String`, étudiée au **Module 2.3**).

```rust
fn main() {
    // 1. Création d'un String à partir d'une litéraire de chaîne (&str)
    let mut message = String::from("Bonjour");
    
    // Alternative idiomatique :
    let mut message_alt = "Bonjour".to_string();

    // 2. Modification de la chaîne
    message.push(' ');          // Ajoute un seul caractère (char)
    message.push_str("à tous"); // Ajoute une tranche de chaîne (&str)

    println!("Message : {}", message);

    // 3. Pourquoi l'indexation directe s'avère impossible ?
    // Le code suivant NE compilera PAS :
    // let lettre = message[0];
    //
    // Explication : UTF-8 utilise une largeur variable (1 à 4 octets par caractère).
    // Indexer par octet pourrait couper un caractère Unicode en deux, produisant un état invalide.
    
    // Comment parcourir correctement un String ?
    // Option A : Parcourir les caractères Unicode (sûr et logique)
    print!("Caractères : ");
    for c in message.chars() {
        print!("[{}] ", c);
    }
    println!();

    // Option B : Parcourir les octets bruts (représentation sous-jacente)
    print!("Octets : ");
    for b in message.bytes() {
        print!("{:X} ", b);
    }
    println!();
}
```

---

## 4. Pièges Fréquents et Bonnes Pratiques

### 4.1 L'Invalidation d'Itérateur (Le piège de la mutation concomitante)

C'est l'un des bugs les plus redoutables en C++. En Rust, le compilateur l'élimine purement et simplement.

#### Code incorrect (refusé par le compilateur) :
```rust
fn main() {
    let mut collection = vec![1, 2, 3];

    // On crée une référence de lecture (emprunt immuable) via l'itérateur
    for &valeur in &collection {
        if valeur == 2 {
            // TENTATIVE DE MUTATION : push requiert un emprunt mutable (&mut)
            collection.push(4); 
        }
    }
}
```

#### Message d'erreur du compilateur :
```text
error[E0502]: cannot borrow `collection` as mutable because it is also borrowed as immutable
  --> src/main.rs:7:13
   |
5  |     for &valeur in &collection {
   |                    -----------
   |                    |
   |                    immutable borrow occurs here
   |                    immutable borrow later used here
6  |         if valeur == 2 {
7  |             collection.push(4);
   |             ^^^^^^^^^^^^^^^^^^ mutable borrow occurs here
```

**Pourquoi ce refus ?** Si `push` déclenchait une réallocation mémoire, l'adresse de `collection` changerait sur le Tas. L'itérateur en cours d'exécution pointerait alors vers une zone mémoire libérée, provoquant un comportement indéfini (*Undefined Behavior*).

### 4.2 Optimisation des performances : L'allocation préventive

Chaque réallocation dynamique a un coût CPU (allocation, copie, libération). Si vous connaissez à l'avance le nombre approximatif d'éléments à stocker, utilisez `with_capacity`.

```rust
// Mauvaise pratique : Provoque de multiples réallocations sur le Tas
let mut v_lent = Vec::new();
for i in 0..1000 {
    v_lent.push(i); // Va réallouer environ 10 fois en interne
}

// Bonne pratique : Une seule allocation initiale sur le Tas
let mut v_rapide = Vec::with_capacity(1000);
for i in 0..1000 {
    v_rapide.push(i); // Zéro réallocation !
}
```

---

## 5. Synthèse Pédagogique

| Collection | Emplacement des Métadonnées | Emplacement des Données | Croissance Dynamique | Garantie Clé |
| :--- | :--- | :--- | :--- | :--- |
| **`Vec<T>`** | Pile (24 octets : `ptr`, `cap`, `len`) | Tas (contigu) | Oui (`push`/`pop`) | Accès contigu en mémoire ($\mathcal{O}(1)$ par index). |
| **`String`** | Pile (24 octets : `ptr`, `cap`, `len`) | Tas (contigu) | Oui (`push_str`) | Encodage UTF-8 valide garanti à tout instant. |
| **`&[T]` (Slice)** | Pile (16 octets : `ptr`, `len`) | Pile ou Tas | Non (Taille fixe) | Vue immuable ou mutable sur une portion contiguë. |
| **`&str` (Slice)** | Pile (16 octets : `ptr`, `len`) | Pile, Tas ou Segment Code | Non (Taille fixe) | Vue sur une séquence UTF-8 valide. |

### Points clés à retenir :
1. **RAII automatique** : Pas besoin de libérer manuellement la mémoire d'un `Vec` ou d'un `String`. Rust s'en charge dès que la variable sort de sa portée.
2. **Capacité vs Longueur** : La capacité est l'espace réservé ; la longueur est l'espace réellement utilisé.
3. **Pas d'indexation directe sur `String`** : L'indexation directe par entier est interdite pour éviter les erreurs de découpage UTF-8. Il faut utiliser `.chars()` ou `.bytes()`.

---

## 6. Exercice Pratique d'Application

### Énoncé : Le Purificateur de Logs

Vous devez concevoir un utilitaire système chargé de nettoyer et de filtrer des fichiers de logs bruts. 
Chaque ligne de log est représentée par un `String`.

#### Objectifs :
1. Écrire une fonction `purifier_logs(logs_bruts: Vec<String>) -> Vec<String>` qui :
   * Ignore les lignes vides ou ne contenant que des espaces.
   * Supprime les espaces superflus au début et à la fin de chaque ligne valide.
   * Ne conserve que les logs qui commencent par la balise `"[ERROR]"` ou `"[WARNING]"`.
2. Optimiser l'allocation mémoire de la collection de sortie en évitant les réallocations inutiles.

---

### Indices pour la résolution

1. Pour nettoyer les espaces au début et à la fin d'une chaîne, utilisez la méthode `.trim()` disponible sur les tranches de chaînes.
2. Pour vérifier le démarrage d'une chaîne, utilisez `.starts_with("motif")`.
3. Pour optimiser la mémoire, initialisez le vecteur de sortie avec une capacité maximale égale à la taille du vecteur d'entrée.

---

### Correction Complète et Commentée

Voici l'implémentation complète, robuste et optimisée de l'exercice.

```rust
/// Purifie une liste de logs bruts selon des critères de sécurité et de formatage.
fn purifier_logs(logs_bruts: Vec<String>) -> Vec<String> {
    // Étape d'optimisation : Le vecteur de sortie aura au maximum la taille du vecteur d'entrée.
    // On pré-alloue donc cette capacité pour éviter toute réallocation sur le Tas.
    let mut logs_purifies = Vec::with_capacity(logs_bruts.len());

    for log in logs_bruts {
        // 1. Nettoyage des espaces blancs au début et à la fin.
        // .trim() renvoie une tranche de chaîne (&str) pointant à l'intérieur de `log`.
        let log_nettoye: &str = log.trim();

        // 2. Vérification de vacuité
        if log_nettoye.is_empty() {
            continue; // On ignore les lignes vides
        }

        // 3. Filtrage par balises de sécurité
        if log_nettoye.starts_with("[ERROR]") || log_nettoye.starts_with("[WARNING]") {
            // On convertit la tranche &str nettoyée en un nouveau String alloué sur le Tas.
            logs_purifies.push(log_nettoye.to_string());
        }
    }

    // Optionnel : Libère la capacité excédentaire non utilisée sur le Tas
    logs_purifies.shrink_to_fit();

    logs_purifies
}

fn main() {
    // Simulation d'une entrée de logs bruts
    let entrees_brutes = vec![
        String::from("  [ERROR] Connexion perdue avec la base de données   "),
        String::from("   "),
        String::from("[INFO] Démarrage du serveur sur le port 8080"),
        String::from("[WARNING] Utilisation CPU élevée à 85%"),
        String::from("  [ERROR] Échec d'authentification de l'utilisateur admin"),
    ];

    println!("--- Début de la purification des logs ---");
    
    let resultats = purifier_logs(entrees_brutes);

    // Affichage des résultats purifiés
    for (index, log) in resultats.iter().enumerate() {
        println!("Log épuré n°{} : {:?}", index + 1, log);
    }

    // Vérification de l'optimisation de la capacité
    println!("\nStatistiques mémoire du vecteur final :");
    println!("Longueur : {}, Capacité : {}", resultats.len(), resultats.capacity());
}
```