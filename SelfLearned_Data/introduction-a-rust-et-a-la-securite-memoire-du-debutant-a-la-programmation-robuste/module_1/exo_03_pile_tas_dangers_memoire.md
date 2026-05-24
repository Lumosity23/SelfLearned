# Exercices d'Application : Qu'est-ce que la mémoire ? Comprendre la Pile (Stack), le Tas (Heap) et les dangers du code non sécurisé

---

## Exercice 1 : Visualisation de la Mémoire et Portée (RAII)

### Énoncé
L'objectif de cet exercice est de comprendre précisément le cycle de vie des variables sur la Pile et sur le Tas en utilisant des blocs de portée (`{ ... }`).

Soit le programme Rust suivant :

```rust
fn main() {
    let a = 10; // Variable A
    
    {
        let b = Box::new(20); // Variable B
        let c = 30; // Variable C
        println!("Dans le bloc : a = {}, b = {}, c = {}", a, b, c);
    } // <-- Point de contrôle X
    
    // println!("Hors du bloc : b = {}", b); // Ligne commentée
    let d = Box::new(40); // Variable D
    println!("Fin du main : a = {}, d = {}", a, d);
} // <-- Point de contrôle Y
```

1. **Analyse de la mémoire** : 
   * Au **Point de contrôle X** (juste avant l'accolade de fermeture du bloc interne), listez les variables présentes sur la **Pile** et celles présentes sur le **Tas**.
   * Que se passe-t-il pour la mémoire au moment précis où l'on franchit le **Point de contrôle X** ?
2. **Cycle de vie** :
   * Si l'on décommente la ligne `println!("Hors du bloc : b = {}", b);`, que se passe-t-il à la compilation ? Pourquoi ?
3. **État final** :
   * Au **Point de contrôle Y** (juste avant la fin du `main`), quelles données sont encore en mémoire ?

---

### Indices
1. *Indice 1* : Les variables déclarées avec `Box::new` possèdent un pointeur sur la Pile, mais la valeur réelle qu'elles enveloppent est stockée sur le Tas.
2. *Indice 2* : Le concept de RAII stipule que lorsqu'une variable sort de sa portée (délimitée par `{}`), sa mémoire est immédiatement libérée. Cela s'applique à la fois à son espace sur la Pile et à la mémoire sur le Tas vers laquelle elle pointe.

---

### Correction Détaillée

#### 1. Analyse de la mémoire au Point de contrôle X
Juste avant la fermeture du bloc interne :
* **Sur la Pile (Stack)** :
  * `a` : contient la valeur entière `10` (taille fixe).
  * `b` : contient l'adresse mémoire (pointeur) qui pointe vers le Tas (ex: `0x00AF12`).
  * `c` : contient la valeur entière `30` (taille fixe).
* **Sur le Tas (Heap)** :
  * À l'adresse pointée par `b` (ex: `0x00AF12`), on trouve la valeur entière `20`.

**Au franchissement du Point de contrôle X :**
Le bloc interne se termine. Les variables locales à ce bloc (`b` et `c`) sortent de la portée.
* `c` est dépilée (libérée de la pile).
* `b` (le pointeur) est dépilée. Puisque `b` possédait la propriété de la donnée sur le tas via la `Box`, Rust libère **immédiatement et automatiquement** l'espace mémoire sur le Tas contenant la valeur `20`.

#### 2. Décommenter la ligne interdite
Si on décommente la ligne `println!("Hors du bloc : b = {}", b);`, le compilateur Rust génère une erreur de compilation stricte :
```text
error[E0425]: cannot find value `b` in this scope
```
**Explication** : `b` a été détruite au Point de contrôle X. Tenter d'y accéder en dehors de son bloc d'existence est impossible. En C/C++, cela aurait pu causer un bogue de type *Use-After-Free* (si le pointeur avait été conservé manuellement), mais Rust l'empêche dès la compilation.

#### 3. État final au Point de contrôle Y
Juste avant la fin du `main` :
* **Sur la Pile (Stack)** :
  * `a` (valeur `10`).
  * `d` (pointeur vers le Tas, ex: `0x00AF90`).
* **Sur le Tas (Heap)** :
  * À l'adresse pointée par `d`, on trouve la valeur `40`.

Dès que la fonction `main` se termine (accolade finale), `a` et `d` sont retirées de la pile, et la mémoire du tas contenant `40` est libérée.

---

## Exercice 2 : Résoudre le piège de la référence locale (Dangling Pointer)

### Énoncé
Un développeur junior tente d'écrire une fonction qui configure un identifiant de session. Il souhaite créer cet identifiant dans une fonction dédiée et retourner une référence vers celui-ci pour éviter de copier la donnée.

Voici son code qui refuse obstinément de compiler :

```rust
// CE CODE NE COMPILE PAS
fn obtenir_identifiant_session() -> &i32 {
    let id = 8192; // Alloué sur la pile de la fonction
    &id            // Retourne une référence vers 'id'
}

fn main() {
    let session_id = obtenir_identifiant_session();
    println!("ID de session : {}", session_id);
}
```

1. Expliquez précisément pourquoi le compilateur refuse ce code en vous basant sur le fonctionnement de la **Pile (Stack)**. Quel bogue mémoire historique Rust est-il en train d'éviter ici ?
2. Proposez une première correction en modifiant la fonction pour qu'elle retourne directement la **valeur** (transfert de propriété sur la pile).
3. Proposez une seconde correction en allouant l'identifiant sur le **Tas (Heap)** à l'aide d'une `Box`, puis en retournant cette `Box`.

---

### Indices
1. *Indice 1* : Lorsqu'une fonction se termine, son cadre de pile (*Stack Frame*) est entièrement détruit. Toute référence pointant vers cette zone devient un "pointeur suspendu" (*dangling pointer*).
2. *Indice 2* : Pour retourner une `Box`, la signature de la fonction doit retourner le type `Box<i32>`.

---

### Correction Détaillée

#### 1. Explication théorique du problème
La variable `id` est une variable locale à la fonction `obtenir_identifiant_session`. Elle est donc allouée sur la **Pile** dans le cadre de pile de cette fonction. 

Dès que la fonction se termine, son cadre de pile est détruit et la mémoire associée à `id` est marquée comme disponible pour de futures fonctions. Si Rust nous laissait retourner `&id` (une référence/un pointeur vers cette zone mémoire détruite), la variable `session_id` dans le `main` pointerait vers de la mémoire invalide. 

C'est le bogue historique du **Pointeur Suspendu (Dangling Pointer)** ou **Use-After-Free**. Un attaquant pourrait exploiter cette adresse pour lire des données sensibles écrites par d'autres fonctions à cet emplacement de la pile.

---

#### 2. Solution 1 : Retourner la valeur par copie/déplacement (Pile)
La méthode la plus simple pour les types de taille fixe (comme `i32`) est de retourner directement la valeur. La valeur est alors copiée dans le cadre de pile de la fonction appelante (`main`).

```rust
// Solution 1 : Retour par valeur
fn obtenir_identifiant_session() -> i32 {
    let id = 8192;
    id // On retourne la valeur directement (copie sur la pile)
}

fn main() {
    let session_id = obtenir_identifiant_session();
    println!("ID de session (Solution 1) : {}", session_id);
}
```

---

#### 3. Solution 2 : Allocation sur le Tas avec `Box`
Si la donnée était très volumineuse et que nous voulions éviter de la copier sur la pile, nous pourrions l'allouer sur le Tas. En retournant la `Box`, nous transférons la propriété du pointeur au `main`.

```rust
// Solution 2 : Allocation sur le Tas
fn obtenir_identifiant_session_tas() -> Box<i32> {
    let id = Box::new(8192); // Alloué sur le Tas
    id // On retourne la Box (le pointeur est transféré)
}

fn main() {
    let session_id = obtenir_identifiant_session_tas();
    println!("ID de session (Solution 2) : {}", session_id);
} // La mémoire sur le Tas contenant 8192 est libérée proprement ici.
```

---

## Exercice 3 : Structure Récursive et Nécessité du Tas

### Énoncé
En Rust, toutes les structures de données doivent avoir une taille connue à la compilation. C'est pourquoi il est impossible de définir une structure qui se contient elle-même directement.

Soit le scénario suivant : nous voulons modéliser une liste chaînée ultra-simple de tâches à faire (une "To-Do List" où chaque tâche pointe vers la tâche suivante).

Voici notre première tentative de code :

```rust
// CE CODE NE COMPILE PAS
struct Tache {
    description: String,
    suivante: Option<Tache>, // Une tâche contient potentiellement la tâche suivante
}
```

Le compilateur rejette ce code avec l'erreur suivante :
```text
error[E0072]: recursive type `Tache` has infinite size
```

1. Pourquoi le compilateur dit-il que cette structure a une "taille infinie" ?
2. Comment l'utilisation du **Tas (Heap)** via une `Box` permet-elle de résoudre ce problème de taille ?
3. Corrigez la structure `Tache` et écrivez une fonction `main` qui crée une liste de deux tâches chaînées (ex: "Acheter le pain" qui pointe vers "Préparer le dîner").

---

### Indices
1. *Indice 1* : Pour calculer la taille d'une structure sur la pile, le compilateur doit additionner la taille de tous ses champs. Si un champ `Tache` contient une autre `Tache`, qui elle-même contient une `Tache`, la taille devient théoriquement infinie.
2. *Indice 2* : Un pointeur (`Box`) a toujours une taille fixe (8 octets sur une architecture 64 bits), peu importe la taille de la donnée vers laquelle il pointe sur le Tas.
3. *Indice 3* : Le type du champ `suivante` doit devenir `Option<Box<Tache>>`.

---

### Correction Détaillée

#### 1. Pourquoi la taille est-elle "infinie" ?
Pour allouer une structure sur la Pile, Rust doit savoir exactement combien d'octets réserver dès la compilation. 
Si `Tache` contient directement une `Option<Tache>`, alors pour calculer la taille de `Tache`, il faut connaître la taille de `Option<Tache>`, qui requiert de connaître la taille de `Tache`, et ainsi de suite à l'infini. C'est une récursion infinie de types.

#### 2. Comment la `Box` résout le problème
En encapsulant la tâche suivante dans une `Box` (`Box<Tache>`), on ne stocke plus la structure `Tache` directement à l'intérieur d'elle-même. À la place, on stocke un **pointeur** vers le Tas. 
Un pointeur a une taille fixe et connue (64 bits / 8 octets sur les processeurs modernes). Le compilateur peut désormais calculer précisément la taille de la structure sur la pile : `taille(String) + taille(Option de pointeur)`.

#### 3. Code corrigé et implémentation

Voici le code complet et fonctionnel :

```rust
// Définition de la structure avec Box pour l'allocation sur le Tas
struct Tache {
    description: String,
    suivante: Option<Box<Tache>>, // Taille fixe grâce à la Box !
}

fn main() {
    // 1. On crée la deuxième tâche (la fin de la liste)
    let deuxieme_tache = Tache {
        description: String::from("Préparer le dîner"),
        suivante: None, // Pas de tâche suivante
    };

    // 2. On crée la première tâche qui pointe vers la deuxième
    // On doit placer 'deuxieme_tache' sur le tas avec Box::new
    let premiere_tache = Tache {
        description: String::from("Acheter le pain"),
        suivante: Some(Box::new(deuxieme_tache)),
    };

    // 3. Affichage pour vérifier la structure
    println!("Première tâche : {}", premiere_tache.description);
    
    // On inspecte la tâche suivante en "déballant" l'Option
    if let Some(ref tache_suivante) = premiere_tache.suivante {
        println!("Tâche suivante : {}", tache_suivante.description);
    }
} // Tout est nettoyé automatiquement ici :
  // 'premiere_tache' sort de la portée, ce qui libère sa Box sur le tas,
  // ce qui détruit 'deuxieme_tache' à son tour. Aucune fuite de mémoire !
```