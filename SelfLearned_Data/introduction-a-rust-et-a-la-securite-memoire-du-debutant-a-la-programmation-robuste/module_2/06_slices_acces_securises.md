# Les Tranches (Slices) : Garantir des accès mémoire sécurisés et sans débordement

## 1. Introduction Conceptuelle

### Le problème de la référence partielle
Dans les modules précédents, nous avons appris à manipuler des variables entières et à prêter des données grâce aux références (`&T`). Cependant, un problème classique de la programmation système subsiste : **comment faire référence à une sous-partie contiguë d'une collection sans la copier et sans risquer de désynchronisation mémoire ?**

Imaginons que nous ayons une chaîne de caractères ou un tableau d'entiers. Si nous voulons isoler une portion de cette structure (par exemple, le premier mot d'une phrase), la méthode traditionnelle dans des langages comme le C consiste à stocker deux variables distinctes : un pointeur vers l'élément de départ et un entier représentant la taille de la sous-partie. 

Cette approche souffre d'un défaut de sécurité majeur : **l'absence de garantie de cohérence**. Si la collection d'origine est modifiée, vidée ou libérée en mémoire, notre pointeur et notre taille deviennent obsolètes. Nous nous retrouvons alors avec un pointeur pendant (*dangling pointer*) ou un risque majeur de débordement de tampon (*buffer overflow*) si nous tentons d'accéder à cette mémoire devenue invalide.

### La solution de Rust : Les Tranches (*Slices*)
Rust résout ce problème par le concept de **Tranche** (*Slice*). Une tranche est une vue sur une séquence contiguë d'éléments dans une collection. Contrairement à une collection entière, une tranche ne possède pas ses données (elle n'a pas l'*ownership*). Elle se contente de prêter une fenêtre d'accès sur des données existantes.

Grâce au *Borrow Checker* (étudié au cours du module précédent), Rust garantit qu'une tranche ne peut jamais survivre à la collection qu'elle référence, éliminant ainsi par construction toute possibilité de référence pendante ou d'accès hors limites.

---

## 2. Fondations Théoriques

### Qu'est-ce qu'un "Pointeur Gras" (*Fat Pointer*) ?
Sur le plan de la représentation mémoire, une référence classique vers un type de taille connue (comme `&i32`) est un pointeur simple : une adresse mémoire de 64 bits (sur les architectures modernes).

Une référence sur une tranche (notée `&[T]` pour des éléments de type `T`, ou `&str` pour des chaînes de caractères) est ce que l'on appelle un **pointeur gras** (*fat pointer*). Elle occupe le double de l'espace d'un pointeur standard car elle contient deux informations cruciales :
1. **Un pointeur** vers le premier élément de la tranche.
2. **La longueur** de la tranche (le nombre d'éléments qu'elle contient).

#### Schéma de la structure en mémoire d'une tranche
Prenons un tableau d'entiers stocké sur la pile et une tranche référençant les éléments du milieu :

```text
Tableau d'origine : `let array: [i32; 5] = [10, 20, 30, 40, 50];`
Tranche créée     : `let slice: &[i32] = &array[1..4];`

Mémoire (Pile / Stack) :

   [array] (Tableau complet)
   Adresse : 0x7ffee1a0
   +------+------+------+------+------+
   |  10  |  20  |  30  |  40  |  50  |
   +------+------+------+------+------+
   Index: 0      1      2      3      4
                 ^
                 |
   [slice] (Pointeur gras)
   +---------------------+---------------------+
   | Pointeur: 0x7ffee1a4| Longueur: 3         |
   +---------------------+---------------------+
```

### La sécurité par la vérification des bornes (*Bounds Checking*)
En Rust, l'accès aux éléments d'une tranche via l'indexation (ex: `slice[index]`) est protégé par une vérification stricte à l'exécution (*runtime bounds checking*). 

Si votre programme tente d'accéder à un index supérieur ou égal à la longueur stockée dans le pointeur gras, Rust déclenche immédiatement une panique contrôlée (`panic!`) plutôt que de permettre un accès mémoire arbitraire. Cela empêche les failles de sécurité de type dépassement de tampon, très courantes en C et C++.

### Intégration avec les règles d'emprunt
Une tranche étant une référence (`&[T]`), elle est soumise aux règles d'or de l'emprunt :
* Vous pouvez avoir autant de tranches immuables (`&[T]`) que vous le souhaitez sur une même collection.
* Si une tranche immuable est active, la collection d'origine ne peut pas être modifiée (pas d'emprunt mutable simultané).

---

## 3. Implémentation Pratique Pas-à-Pas

### 3.1 Les tranches de chaînes de caractères (`&str`)
Le type `&str` est une tranche de chaîne de caractères. C'est une référence pointant vers une séquence de données UTF-8 valides.

Voici comment créer et manipuler des tranches de chaînes de caractères :

```rust
fn main() {
    // Une String allouée sur le tas
    let message = String::from("Bonjour tout le monde");

    // Création de tranches à l'aide de la syntaxe d'intervalle [début..fin]
    // Note : la borne supérieure est exclusive
    let bonjour: &str = &message[0..7]; // Contient "Bonjour"
    let tout: &str = &message[8..12];   // Contient "tout"

    println!("Premier mot : '{}'", bonjour);
    println!("Deuxième mot : '{}'", tout);

    // Syntaxes raccourcies :
    let debut: &str = &message[..7];  // Équivalent à [0..7]
    let fin: &str = &message[13..];   // Va de l'index 13 jusqu'à la fin
    let tout_le_message: &str = &message[..]; // Référence la chaîne entière

    println!("Début : '{}'", debut);
    println!("Fin : '{}'", fin);
    println!("Complet : '{}'", tout_le_message);
}
```

### 3.2 Les tranches de tableaux (`&[T]`)
Le même concept s'applique aux tableaux de données numériques ou complexes.

```rust
fn main() {
    let temperatures: [f64; 7] = [12.5, 14.0, 15.2, 18.8, 19.1, 16.5, 13.0];

    // Création d'une tranche sur les températures du milieu de semaine
    let milieu_semaine: &[f64] = &temperatures[2..5]; // Éléments aux index 2, 3 et 4

    println!("Températures du milieu de semaine : {:?}", milieu_semaine);
    println!("Nombre de jours ciblés : {}", milieu_semaine.len());

    // Accès sécurisé aux éléments de la tranche
    if !milieu_semaine.is_empty() {
        println!("Première température de la tranche : {}", milieu_semaine[0]);
    }
}
```

### 3.3 Utilisation des tranches dans les signatures de fonctions
L'une des meilleures pratiques en Rust consiste à utiliser des tranches comme paramètres de fonction plutôt que des références à des collections spécifiques.

Par exemple, préférez toujours `&str` à `&String` dans vos fonctions. Cela permet à votre fonction d'accepter à la fois des `String`, des littéraux de chaînes (qui sont déjà des `&str`), et d'autres tranches de chaînes.

```rust
// Mauvaise pratique : limite l'usage aux objets String uniquement
fn inspecter_string(s: &String) {
    println!("Longueur : {}", s.len());
}

// Excellente pratique : accepte les String, les &str et les sous-parties
fn inspecter_tranche(s: &str) {
    println!("Longueur de la tranche : {}", s.len());
}

fn main() {
    let s_allouee = String::from("Rust");
    let s_litteral = "Langage";

    // inspecter_string(&s_litteral); // ERREUR DE COMPILATION !
    
    inspecter_tranche(&s_allouee);     // Fonctionne (coercition de String en &str)
    inspecter_tranche(s_litteral);     // Fonctionne
    inspecter_tranche(&s_allouee[1..3]); // Fonctionne sur une sous-partie ("us")
}
```

---

## 4. Pièges Fréquents et Bonnes Pratiques

### Piège 1 : Le découpage au milieu d'un caractère UTF-8
En Rust, les chaînes de caractères (`String` et `&str`) sont encodées en UTF-8. Cela signifie qu'un caractère (un point de code Unicode) peut occuper entre 1 et 4 octets en mémoire. 

Si vous tentez de créer une tranche en utilisant des index d'octets qui coupent un caractère multi-octets en deux, Rust provoquera une panique immédiate à l'exécution.

```rust
fn main() {
    // Le caractère 'é' occupe 2 octets en UTF-8
    let mot = String::from("café"); 
    
    // Indexation mémoire :
    // c : index 0 (1 octet)
    // a : index 1 (1 octet)
    // f : index 2 (1 octet)
    // é : index 3 et 4 (2 octets)

    // Ce code compile mais va PANQUER à l'exécution !
    // On tente de couper au milieu du 'é' (index 4)
    let tranche_invalide = &mot[0..4]; 
    println!("{}", tranche_invalide);
}
```
*Solution :* Pour manipuler des textes contenant des caractères non-ASCII de manière sûre, utilisez des itérateurs de caractères (`.chars()`) ou assurez-vous que vos indices proviennent de méthodes de recherche sûres comme `.find()`.

### Piège 2 : Tenter de modifier la collection d'origine pendant qu'une tranche est active
Le *Borrow Checker* empêche toute modification de la structure de données sous-jacente tant qu'une tranche immuable pointe dessus.

```rust
fn main() {
    let mut liste = String::from("Hello World");
    
    let tranche = &liste[0..5]; // Emprunt immuable de 'liste'
    
    liste.clear(); // ERREUR DE COMPILATION ! 
    // Impossible de modifier 'liste' car elle est actuellement prêtée via 'tranche'

    println!("La tranche est : {}", tranche);
}
```

### Bonne pratique : L'accès sécurisé avec `.get()`
Plutôt que d'utiliser l'indexation directe `slice[index]` qui peut faire planter votre programme si l'index est hors limites, utilisez la méthode `.get()`. Elle renvoie une `Option<&T>` (concept qui sera approfondi dans le Module 4), permettant de gérer proprement l'absence de valeur sans interrompre le programme.

```rust
fn main() {
    let tableau = [1, 2, 3];
    let tranche = &tableau[..];

    // Accès risqué :
    // let element = tranche[5]; // Panique !

    // Accès sécurisé :
    match tranche.get(5) {
        Some(valeur) => println!("Valeur trouvée : {}", valeur),
        None => println!("Index hors limites, mais le programme continue en toute sécurité !"),
    }
}
```

---

## 5. Synthèse Pédagogique

| Concept | Type de données | Propriété (*Ownership*) | Représentation en mémoire | Sécurité |
| :--- | :--- | :--- | :--- | :--- |
| **Tableau / String** | `[T; N]` / `String` | Oui | Données contiguës (Pile ou Tas) | Totale (gérée par l'owner) |
| **Référence simple** | `&T` | Non | Pointeur simple (adresse seule) | Garantie par le cycle de vie |
| **Tranche (Slice)** | `&[T]` / `&str` | Non | **Pointeur gras** (adresse + longueur) | Vérification des bornes à l'exécution |

### Points clés à retenir :
1. Une tranche est une **vue immuable ou mutable** sur une séquence contiguë d'éléments.
2. Elle ne copie pas les données, elle les référence via un **pointeur gras** (adresse + taille).
3. Elle garantit la **sécurité mémoire** en interdisant toute modification de la collection source pendant sa durée de vie.
4. Elle prévient les failles de sécurité grâce au **Bounds Checking** systématique à l'exécution.

---

## 6. Exercice Pratique d'Application

### Énoncé : Le Parseur de Protocole Réseau
Dans le cadre du développement d'un serveur réseau ultra-sécurisé, vous devez écrire un parseur de paquets. Les paquets reçus respectent le format strict suivant :
`"ID:<identifiant>;DATA:<données_utiles>;CRC:<somme_contrôle>"`

Votre objectif est d'écrire une fonction hautement performante et sécurisée qui extrait uniquement la partie `<données_utiles>` sous forme de tranche (`&str`), **sans effectuer la moindre allocation mémoire sur le tas** (pas de `String`, pas de duplication de données).

#### Spécifications de la fonction :
* Nom : `extraire_donnees`
* Signature : `fn extraire_donnees(paquet: &str) -> &str`
* Comportement : 
  * Trouver la position de `"DATA:"`.
  * Trouver la position du point-virgule `";"` qui suit immédiatement ces données.
  * Retourner la tranche correspondante.
  * Si le format est invalide ou si les balises sont absentes, retourner une tranche vide `""`.

---

### Indices pour la résolution
1. Utilisez la méthode `paquet.find("DATA:")` pour localiser le début de la balise de données. Cette méthode renvoie un `Option<usize>`.
2. Si `"DATA:"` est trouvé à l'index `i`, le contenu commence exactement à `i + 5` (la longueur de `"DATA:"`).
3. Utilisez ensuite la recherche à partir d'un sous-ensemble pour trouver le `";"` de fin : `paquet[debut..].find(';')`.
4. Prenez garde à ne pas faire de découpage hors limites si les caractères de contrôle sont manquants.

---

### Correction Complète et Commentée

Voici l'implémentation complète et rigoureuse de l'exercice :

```rust
/// Extrait de manière sécurisée et sans allocation les données d'un paquet réseau.
fn extraire_donnees(paquet: &str) -> &str {
    // 1. Recherche de la balise de début "DATA:"
    let index_balise = match paquet.find("DATA:") {
        Some(idx) => idx,
        None => return "", // Balise absente, on retourne une tranche vide
    };

    // Le contenu utile commence juste après "DATA:" (qui fait 5 caractères ASCII/octets)
    let index_debut_donnees = index_balise + 5;

    // Sécurité : on s'assure que l'index de début ne dépasse pas la taille du paquet
    if index_debut_donnees > paquet.len() {
        return "";
    }

    // 2. Recherche du point-virgule de fin à partir de l'index de début
    let reste_du_paquet = &paquet[index_debut_donnees..];
    let index_fin_relative = match reste_du_paquet.find(';') {
        Some(idx) => idx,
        None => return "", // Pas de point-virgule de fin, format invalide
    };

    // Calcul de l'index de fin absolu dans le paquet d'origine
    let index_fin_donnees = index_debut_donnees + index_fin_relative;

    // 3. Retour de la tranche de manière totalement sécurisée
    &paquet[index_debut_donnees..index_fin_donnees]
}

fn main() {
    // Cas nominal
    let paquet_valide = "ID:1024;DATA:temperature_moteur_95C;CRC:45A2";
    let donnees = extraire_donnees(paquet_valide);
    println!("Données extraites : '{}'", donnees);
    assert_eq!(donnees, "temperature_moteur_95C");

    // Cas d'erreur : balise DATA manquante
    let paquet_invalide_1 = "ID:1024;CRC:45A2";
    let donnees_vide_1 = extraire_donnees(paquet_invalide_1);
    println!("Test invalide 1 (sans DATA) : '{}'", donnees_vide_1);
    assert_eq!(donnees_vide_1, "");

    // Cas d'erreur : point-virgule de fin manquant
    let paquet_invalide_2 = "ID:1024;DATA:donnees_corrompues";
    let donnees_vide_2 = extraire_donnees(paquet_invalide_2);
    println!("Test invalide 2 (sans ';') : '{}'", donnees_vide_2);
    assert_eq!(donnees_vide_2, "");
    
    println!("\nTous les tests de sécurité du parseur sont passés avec succès !");
}
```