# L'Emprunt (Borrowing) et les Références : Partager des données sans les copier

## 1. Introduction Conceptuelle

Dans le module précédent (Module 2.1), nous avons découvert les trois règles d'or de l'**Ownership** (la propriété). Nous avons vu que lorsqu'une variable est passée à une fonction, sa propriété est transférée (on parle de *Move*). Si la fonction appelante souhaite réutiliser cette donnée, la fonction appelée doit lui restituer la propriété en la renvoyant explicitement (par exemple, via un tuple).

Cette approche, bien que d'une sécurité absolue pour la mémoire, s'avère extrêmement lourde et fastidieuse à l'usage. Imaginez devoir écrire ce type de code à chaque fois que vous souhaitez simplement lire une information :

```rust
fn main() {
    let s1 = String::from("Bonjour");
    
    // Nous devons récupérer s1 car la fonction s'en approprie
    let (s2, longueur) = calculer_longueur(s1);
    
    println!("La longueur de '{}' est de {}.", s2, longueur);
}

fn calculer_longueur(s: String) -> (String, usize) {
    let longueur = s.len();
    (s, longueur) // Restitution manuelle de la propriété
}
```

Ce mode de transfert permanent est l'équivalent de donner définitivement votre livre à un ami qui souhaite simplement y lire une phrase, pour qu'il vous le redonne ensuite. 

C'est ici qu'intervient le concept d'**Emprunt** (*Borrowing*), matérialisé par les **Références**. Au lieu de transférer la propriété d'une ressource, Rust nous permet de prêter un accès à cette ressource. L'emprunteur peut lire ou modifier la donnée, mais la propriété reste fermement entre les mains de la variable d'origine. Lorsque l'emprunt se termine, la ressource n'est pas détruite, car elle appartient toujours à son propriétaire initial.

---

## 2. Fondations Théoriques

### Qu'est-ce qu'une Référence ?

Une référence est un pointeur garanti comme valide, qui pointe vers l'adresse mémoire d'une autre variable contenant la donnée réelle. En Rust, on crée une référence en utilisant l'opérateur esperluette (`&`).

#### Représentation en mémoire

Considérons une variable `s1` de type `String` stockée sur la Pile (Stack) et pointant vers le Tas (Heap), et une référence `r1` pointant vers `s1` :

```rust
let s1 = String::from("Rust");
let r1 = &s1;
```

Voici comment ces éléments sont organisés en mémoire :

```text
       PILE (STACK)                                    TAS (HEAP)
       
       [ Référence r1 ]
       +-------------+
       | pointeur  --|--+
       +-------------+  |
                        v
                  [ Variable s1 ]
                  +-------------+                      +-------------+
                  | pointeur  --|--------------------->| 'R'|'u'|'s'|'t'|
                  | longueur: 4 |                      +-------------+
                  | capacité: 4 |
                  +-------------+
```

La référence `r1` ne possède pas la donnée. Elle pointe simplement vers la structure de contrôle de `s1` sur la pile. Comme `r1` n'est pas propriétaire, la donnée sur le tas ne sera **pas** libérée lorsque `r1` sortira de son scope.

### Les deux types de Références

Rust propose deux manières d'emprunter une donnée, chacune répondant à des besoins précis :

1. **La Référence Immuable (`&T`)** : Permet de lire la donnée, mais pas de la modifier. Vous pouvez créer autant de références immuables que vous le souhaitez simultanément.
2. **La Référence Mutable (`&mut T`)** : Permet de lire et de modifier la donnée. L'accès est exclusif.

### La Règle d'Or du Borrow Checker : L'Aliasing XOR la Mutabilité

Pour garantir l'absence totale de "Data Races" (situations de compétition sur les données) et de comportements indéfinis, le compilateur Rust (via son outil, le *Borrow Checker*) applique une règle stricte et mathématique :

> **À tout moment, pour une ressource donnée, vous pouvez avoir :**
> * Soit un nombre illimité de références immuables (`&T`).
> * Soit exactement une unique référence mutable (`&mut T`).
> 
> **Mais jamais les deux en même temps dans le même scope actif.**

Cette règle peut se résumer par la formule : **Aliasing XOR Mutabilité** (Partage OU Modification, mais jamais les deux).

#### Pourquoi cette règle est-elle vitale ?
Si vous pouviez avoir une référence immuable (qui s'attend à ce que la donnée ne change pas) et une référence mutable (qui modifie la donnée) en même temps, la référence immuable pourrait soudainement pointer vers des données corrompues ou modifiées de manière inattendue. En interdisant cette coexistence, Rust élimine par construction toute une classe de bugs de concurrence et de corruption mémoire.

---

## 3. Implémentation Pratique Pas-à-Pas

### Étape 1 : L'Emprunt Immuable (Lecture seule)

Voyons comment réécrire notre premier exemple de manière élégante grâce aux références immuables.

```rust
fn main() {
    let s1 = String::from("Bonjour");

    // Nous passons une référence (&s1) au lieu de transférer la propriété
    let longueur = calculer_longueur(&s1);

    // s1 est toujours valide ici ! Nous pouvons encore l'utiliser.
    println!("La longueur de '{}' est de {}.", s1, longueur);
}

// La fonction accepte un paramètre de type &String (référence vers un String)
fn calculer_longueur(s: &String) -> usize {
    s.len() // Nous pouvons lire la donnée via la référence
} // Ici, s sort du scope, mais comme il n'a pas la propriété, rien n'est libéré.
```

### Étape 2 : L'Emprunt Mutable (Modification)

Si nous voulons qu'une fonction modifie une donnée empruntée, nous devons utiliser une référence mutable `&mut`. Pour cela, la variable d'origine doit elle-même être déclarée comme mutable avec le mot-clé `mut`.

```rust
fn main() {
    // 1. La variable d'origine doit être mutable
    let mut s = String::from("Bonjour");

    // 2. Nous passons une référence mutable (&mut s)
    ajouter_un_nom(&mut s);

    println!("Résultat : {}", s); // Affiche "Bonjour tout le monde"
}

// 3. La fonction accepte une référence mutable (&mut String)
fn ajouter_un_nom(texte: &mut String) {
    texte.push_str(" tout le monde"); // Modification de la donnée d'origine
}
```

### Étape 3 : Visualiser le refus de compilation (Le Borrow Checker en action)

Tentons d'enfreindre la règle d'or en mélangeant emprunts immuables et mutables.

```rust
fn main() {
    let mut score = 10;

    let ref_immuable1 = &score; // Premier emprunt immuable (OK)
    let ref_immuable2 = &score; // Deuxième emprunt immuable (OK)
    
    // Tentative d'emprunt mutable alors que des emprunts immuables sont actifs
    let ref_mutable = &mut score; 

    // Utilisation des références
    println!("Scores : {} et {}", ref_immuable1, ref_immuable2);
    ref_mutable += 5;
}
```

Si vous tentez de compiler ce code, le compilateur Rust refusera catégoriquement et affichera un message d'erreur extrêmement détaillé :

```text
error[E0502]: cannot borrow `score` as mutable because it is also borrowed as immutable
 --> src/main.rs:8:23
  |
5 |     let ref_immuable1 = &score; // Premier emprunt immuable
  |                         ------ immutable borrow occurs here
...
8 |     let ref_mutable = &mut score; 
  |                       ^^^^^^^^^^ mutable borrow occurs here
9 | 
10|     println!("Scores : {} et {}", ref_immuable1, ref_immuable2);
  |                                   ------------- immutable borrow later used here
```

Le compilateur nous explique clairement que nous ne pouvons pas créer `ref_mutable` parce que `ref_immuable1` est encore utilisé plus bas dans le `println!`.

---

## 4. Pièges Fréquents et Bonnes Pratiques

### Piège 1 : Le scope d'une référence (NLL - Non-Lexical Lifetimes)

Depuis les versions modernes de Rust, le cycle de vie d'une référence ne s'arrête pas forcément à la fin du bloc de code (accolade fermante `}`), mais à sa **dernière utilisation effective**. C'est ce qu'on appelle les *Non-Lexical Lifetimes* (NLL).

Le code suivant est parfaitement **valide** :

```rust
fn main() {
    let mut s = String::from("Hello");

    let r1 = &s; // Emprunt immuable commence
    println!("{}", r1); // Dernière utilisation de r1. L'emprunt immuable s'arrête ICI.

    let r2 = &mut s; // OK : Aucun autre emprunt n'est actif à ce moment-là.
    r2.push_str(" World");
    println!("{}", r2);
}
```

### Piège 2 : Les Références Pendantes (Dangling References)

Une référence pendante est un pointeur qui pointe vers une adresse mémoire dont le contenu a été libéré. En C ou C++, c'est une source majeure de failles de sécurité. En Rust, le compilateur garantit qu'il est impossible de créer une référence pendante.

Tentons d'en créer une :

```rust
fn main() {
    let reference_vers_rien = creer_reference_pendante();
}

fn creer_reference_pendante() -> &String { // Retourne une référence vers un String
    let s = String::from("Fantôme"); // s est créé localement dans la fonction

    &s // Nous retournons une référence vers s
} // Ici, s sort du scope et est détruit (mémoire libérée).
  // La référence retournée pointerait vers de la mémoire invalide !
```

Le compilateur bloque immédiatement ce code avec l'erreur suivante :

```text
error[E0106]: missing lifetime specifier
 --> src/main.rs:5:33
  |
5 | fn creer_reference_pendante() -> &String {
  |                                 ^ expected named lifetime parameter
```

*Note : Le concept de "durée de vie" (Lifetime) soulevé par cette erreur sera étudié en détail dans le Module 5.1. Pour l'instant, retenez simplement que Rust vous empêche physiquement de faire pointer une référence vers une donnée qui va disparaître.*

Pour corriger ce problème, il faut retourner la `String` directement (transfert de propriété) plutôt qu'une référence :

```rust
fn solution_correcte() -> String {
    let s = String::from("Valide");
    s // Propriété transférée à l'appelant, pas de destruction.
}
```

---

## 5. Synthèse Pédagogique

### Tableau Comparatif des Accès Mémoire

| Concept | Syntaxe | Propriétaire ? | Modifiable ? | Nombre d'accès simultanés |
| :--- | :--- | :---: | :---: | :---: |
| **Ownership (Move)** | `T` | **Oui** | Oui (si `mut`) | 1 seul propriétaire |
| **Emprunt Immuable** | `&T` | Non | **Non** | **Illimité** |
| **Emprunt Mutable** | `&mut T` | Non | **Oui** | **Strictement 1 seul** |

### Les Règles d'or à retenir
1. **Pas de pointeurs nuls** : Une référence en Rust pointe toujours vers une valeur valide.
2. **Aliasing XOR Mutabilité** : Soit plusieurs lecteurs, soit un seul rédacteur. Jamais les deux en même temps.
3. **Le propriétaire décide** : Une référence ne peut pas vivre plus longtemps que le propriétaire de la donnée vers laquelle elle pointe.

---

## 6. Exercice Pratique d'Application

### Énoncé : Le Gestionnaire de File d'Attente Sécurisé

Vous devez concevoir un système de gestion de file d'attente pour un guichet administratif. Les clients sont représentés par des chaînes de caractères (`String`). 

Vous devez implémenter trois fonctions en respectant scrupuleusement les règles d'emprunt de Rust :

1. `afficher_file` : Reçoit la file d'attente et affiche la liste des clients dans l'ordre sans détruire ni modifier la file.
2. `ajouter_client` : Reçoit la file d'attente et le nom d'un nouveau client, puis l'ajoute à la fin de la file.
3. `traiter_client` : Reçoit la file d'attente, retire le premier client de la file (s'il y en a un) et affiche son nom pour indiquer qu'il est pris en charge.

### Indices

* Pour représenter la file d'attente, utilisez un vecteur de chaînes de caractères : `Vec<String>`.
* Pour ajouter un élément à un vecteur, utilisez la méthode `.push(valeur)`.
* Pour retirer le premier élément d'un vecteur, vous pouvez utiliser la méthode `.remove(0)`. Attention, cette opération modifie le vecteur !
* Réfléchissez bien au type de référence (`&` ou `&mut`) requis pour chaque fonction selon qu'elle lit ou modifie le vecteur.

---

### Correction Complète et Détaillée

Voici le code complet et fonctionnel qui résout l'exercice :

```rust
// Fonction 1 : Lecture seule. Nous utilisons un emprunt immuable (&Vec<String>)
// car nous voulons juste lire les données sans les modifier ni en prendre la propriété.
fn afficher_file(file: &Vec<String>) {
    println!("\n--- État actuel de la file d'attente ---");
    if file.is_empty() {
        println!("La file est vide.");
    } else {
        for (index, client) in file.iter().enumerate() {
            println!("{}. {}", index + 1, client);
        }
    }
    println!("----------------------------------------");
}

// Fonction 2 : Modification. Nous utilisons un emprunt mutable (&mut Vec<String>)
// car nous allons ajouter un élément au vecteur.
// Le paramètre `nom` est transféré (String) car le vecteur va s'en approprier.
fn ajouter_client(file: &mut Vec<String>, nom: String) {
    println!("-> Ajout de {} à la file d'attente.", nom);
    file.push(nom);
}

// Fonction 3 : Modification. Nous utilisons un emprunt mutable (&mut Vec<String>)
// car nous allons retirer un élément du vecteur.
fn traiter_client(file: &mut Vec<String>) {
    if file.is_empty() {
        println!("Impossible de traiter un client : la file est vide !");
    } else {
        // .remove(0) extrait le premier élément et décale les autres.
        // Cela nécessite un accès exclusif en écriture.
        let client_traite = file.remove(0);
        println!("[Guichet] Appel du client : {} !", client_traite);
    }
}

fn main() {
    // Le vecteur d'origine doit être mutable pour permettre les emprunts mutables
    let mut file_attente: Vec<String> = Vec::new();

    // 1. Ajout de clients
    // Nous passons une référence mutable à la file, et créons des Strings propriétaires
    ajouter_client(&mut file_attente, String::from("Alice"));
    ajouter_client(&mut file_attente, String::from("Bob"));
    ajouter_client(&mut file_attente, String::from("Charlie"));

    // 2. Affichage de la file (Emprunt immuable)
    afficher_file(&file_attente);

    // 3. Traitement du premier client (Emprunt mutable)
    traiter_client(&mut file_attente);

    // 4. Nouvel affichage pour vérifier le changement
    afficher_file(&file_attente);

    // 5. Traitement des clients restants
    traiter_client(&mut file_attente);
    traiter_client(&mut file_attente);

    // 6. Tentative sur une file vide
    traiter_client(&mut file_attente);
    
    // Affichage final
    afficher_file(&file_attente);
}
```

#### Analyse pédagogique de la correction :
* Dans `main`, `file_attente` est déclarée avec `let mut` car elle va subir des modifications.
* Lors de l'appel à `ajouter_client(&mut file_attente, ...)`, le compilateur s'assure qu'aucune autre partie du code ne lit ou n'écrit dans `file_attente` à cet instant précis.
* Dans `afficher_file(&file_attente)`, nous passons une référence simple. Nous pourrions tout à fait appeler cette fonction plusieurs fois en parallèle si nous étions dans un contexte multi-threadé (ce qui sera étudié dans le Module 5.3), car la lecture partagée est totalement sûre.