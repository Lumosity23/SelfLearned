# Variables, mutabilité et types de données de base

## 1. Introduction Conceptuelle

Dans la majorité des langages de programmation traditionnels (comme C, C++, Java ou Python), les variables sont mutables par défaut. Cela signifie qu'une fois qu'une zone mémoire est allouée et nommée, n'importe quelle partie du programme ayant accès à cette variable peut en modifier la valeur à tout moment. Bien que cette approche semble intuitive, elle est à l'origine d'une classe majeure de bogues logiciels : les **effets de bord imprévisibles** et les **concurrences critiques (data races)**.

Rust prend le contre-pied de cette philosophie en imposant l'**immuabilité par défaut**. Lorsque vous déclarez une variable en Rust, sa valeur est figée. Si vous tentez de la modifier, le compilateur refusera de générer le binaire. 

### Pourquoi ce choix ?

1. **Prévisibilité du code** : Un développeur (ou un compilateur) qui lit une fonction peut garantir qu'une variable immuable conservera la même valeur du début à la fin de la portée. Il n'est pas nécessaire de tracer mentalement toutes les lignes de code pour vérifier si la valeur a été altérée ailleurs.
2. **Optimisation du compilateur** : Le compilateur Rust (basé sur LLVM) peut optimiser agressivement le code machine s'il sait de source sûre que certaines données ne changeront jamais (par exemple, en plaçant la valeur directement dans les registres du processeur).
3. **Sécurité en programmation concurrente** : Si plusieurs threads (fils d'exécution) accèdent simultanément à une donnée en lecture seule, aucun conflit ne peut survenir. L'immuabilité élimine nativement le besoin de verrous complexes pour ces scénarios.

La mutabilité reste indispensable pour modéliser le monde réel (comme l'évolution d'un score dans un jeu vidéo ou le remplissage d'un panier d'achat). Rust permet donc la mutabilité, mais elle doit être **explicite**. Ce choix conceptuel force le développeur à se poser la question systématique : *"Cette donnée a-t-elle réellement besoin de changer ?"*

---

## 2. Fondations Théoriques

### 2.1. Immuabilité vs Mutabilité

En Rust, la déclaration d'une variable se fait avec le mot-clé `let`. Par défaut, cette liaison est immuable. Pour la rendre mutable, on adjoint le mot-clé `mut`.

```rust
let x = 5;     // Immuable : x vaudra toujours 5
let mut y = 5; // Mutable : y peut être réassigné plus tard
```

### 2.2. Le Masquage (Shadowing)

Le masquage consiste à déclarer une nouvelle variable portant exactement le même nom qu'une variable existante dans la même portée. La seconde variable "masque" (shadows) la première.

```rust
let x = 5;
let x = x + 1; // x est maintenant masqué par un nouveau x qui vaut 6
```

#### Différence fondamentale entre Mutabilité et Masquage :
* **Mutabilité (`mut`)** : On modifie la valeur stockée dans la *même* boîte mémoire. Le type de la variable ne peut pas changer.
* **Masquage (`let`)** : On crée une *nouvelle* variable, dans un nouvel espace mémoire, en réutilisant le même nom. Cela permet notamment de **changer le type** de la variable tout en conservant un nom cohérent.

### 2.3. Constantes (`const`) vs Variables Immuables (`let`)

Bien qu'elles semblent similaires, les constantes et les variables immuables répondent à des règles différentes :

| Caractéristique | Variable Immuable (`let`) | Constante (`const`) |
| :--- | :--- | :--- |
| **Évaluation** | Évaluée à l'exécution (Runtime) | Évaluée à la compilation (Compile-time) |
| **Type** | Optionnel (inféré par le compilateur) | **Obligatoire** (doit être explicité) |
| **Portée** | Locale au bloc de code | Globale ou locale |
| **Mutabilité** | Peut devenir mutable avec `mut` | Strictement immuable (jamais de `mut`) |
| **Valeur** | Peut être le résultat d'une fonction | Doit être une expression constante pure |

```rust
const VITESSE_LUMIERE_M_S: u32 = 299_792_458; // Déclaration d'une constante
```

### 2.4. Types de Données Scalaires

Un type scalaire représente une valeur unique. Rust dispose de quatre types scalaires principaux.

#### A. Les Entiers (Integers)
Ils se divisent en deux catégories : signés (peuvent être négatifs, préfixés par `i`) et non signés (uniquement positifs ou nuls, préfixés par `u`).

| Taille | Signé | Non signé |
| :--- | :--- | :--- |
| 8 bits | `i8` | `u8` |
| 16 bits | `i16` | `u16` |
| 32 bits | `i32` (défaut) | `u32` |
| 64 bits | `i64` | `u64` |
| 128 bits | `i128` | `u128` |
| Architecture | `isize` | `usize` |

*Note sur `isize` et `usize`* : Leur taille dépend de l'architecture de la machine cible (32 bits ou 64 bits). Ils sont principalement utilisés pour l'indexation des collections ou la mesure de la taille d'objets en mémoire.

#### B. Les Flottants (Floating-Point)
Rust gère les nombres à virgule flottante selon la norme IEEE-754 :
* `f32` : Simple précision (32 bits).
* `f64` : Double précision (64 bits, type par défaut car plus précis sur les processeurs modernes sans perte notable de performance).

#### C. Le Booléen (Boolean)
Le type `bool` ne peut prendre que deux valeurs : `true` ou `false`. Il occupe 1 octet en mémoire.

#### D. Le Caractère (Character)
Le type `char` représente un point de code Unicode. Contrairement à d'autres langages où un caractère fait 1 octet (ASCII), en Rust, un `char` fait **4 octets**. Il peut représenter un caractère accentué, un idéogramme chinois, ou même un émoji.

```rust
let c: char = 'z';
let z: char = 'ℤ';
let heart_eye_emoji: char = '😻';
```

### 2.5. Types de Données Composés

Les types composés regroupent plusieurs valeurs dans un seul type.

#### A. Les Tuples
Un tuple est une collection de valeurs de **types différents** avec une **taille fixe**.

```rust
let mon_tuple: (i32, f64, u8) = (500, 6.4, 1);
```

Pour récupérer les valeurs d'un tuple, on utilise soit la déstructuration, soit l'accès direct par point (`.`) :

```rust
// Déstructuration
let (x, y, z) = mon_tuple;

// Accès direct
let cinq_cents = mon_tuple.0;
let un = mon_tuple.2;
```

#### B. Les Tableaux (Arrays)
Un tableau regroupe plusieurs valeurs du **même type** avec une **taille fixe** déterminée à la compilation. 

*Note de progression : Contrairement aux vecteurs (qui seront étudiés dans le Module 3), la taille d'un tableau ne peut ni augmenter ni diminuer.*

```rust
let mon_tableau: [i32; 5] = [1, 2, 3, 4, 5];
let premier_element = mon_tableau[0];
```

---

## 3. Implémentation Pratique Pas-à-Pas

Nous allons écrire un programme complet mettant en œuvre ces concepts. Créez un projet Cargo nommé `variables_et_types` :

```bash
cargo new variables_et_types
cd variables_et_types
```

Remplacez le contenu du fichier `src/main.rs` par le code suivant :

```rust
// Déclaration d'une constante globale
const TAUX_CONVERSION_USD: f64 = 1.12;

fn main() {
    // --- 1. Immuabilité et Mutabilité ---
    let solde_initial = 100; // Immuable par défaut
    println!("Solde initial : {} EUR", solde_initial);

    // Tentative de modification (décommenter la ligne ci-dessous provoquera une erreur de compilation)
    // solde_initial = 120;

    let mut solde_courant = solde_initial; // Copie de la valeur, mutable
    solde_courant += 50;
    println!("Nouveau solde après dépôt : {} EUR", solde_courant);

    // --- 2. Le Masquage (Shadowing) ---
    let texte_espace = "   "; // Type: &str (chaîne de caractères)
    let texte_espace = texte_espace.len(); // Masquage : Nouveau type (usize)
    println!("Nombre d'espaces : {}", texte_espace);

    // --- 3. Types Scalaires ---
    let entier_signe: i8 = -120;
    let entier_non_signe: u32 = 4_294_967_295; // Utilisation de '_' pour la lisibilité
    let flottant: f32 = 3.14159;
    let est_actif: bool = true;
    let symbole: char = 'λ';

    println!("Scalaires : {}, {}, {}, {}, {}", entier_signe, entier_non_signe, flottant, est_actif, symbole);

    // --- 4. Types Composés ---
    // Tuple représentant un point géographique (Latitude, Longitude, Nom)
    let coordonnees: (f64, f64, char) = (48.8566, 2.3522, 'P');
    let (lat, lon, label) = coordonnees;
    println!("Coordonnées de '{}' : ({}, {})", label, lat, lon);

    // Tableau de températures sur une semaine (taille fixe de 7)
    let temperatures: [f32; 7] = [12.5, 14.0, 13.8, 11.2, 15.1, 16.0, 14.5];
    println!("Température du premier jour : {} °C", temperatures[0]);
    println!("Température du dernier jour : {} °C", temperatures[6]);

    // Conversion de devise en utilisant la constante globale
    let solde_usd = (solde_courant as f64) * TAUX_CONVERSION_USD;
    println!("Solde équivalent en USD : {:.2} $", solde_usd);
}
```

### Compilation et exécution :

```bash
cargo run
```

**Sortie attendue dans la console :**
```text
Solde initial : 100 EUR
Nouveau solde après dépôt : 150 EUR
Nombre d'espaces : 3
Scalaires : -120, 4294967295, 3.14159, true, λ
Coordonnées de 'P' : (48.8566, 2.3522)
Température du premier jour : 12.5 °C
Température du dernier jour : 14.5 °C
Solde équivalent en USD : 168.00 $
```

---

## 4. Pièges Fréquents et Bonnes Pratiques

### Piège 1 : Confondre Mutabilité et Masquage
Un développeur débutant peut penser que `let mut x` et le masquage de `x` sont équivalents. C'est faux.

```rust
// Erreur de type avec la mutabilité
let mut donnees = "123";
donnees = donnees.len(); // ERREUR DE COMPILATION : attendu &str, trouvé usize
```

**Explication** : La mutabilité permet de changer la *valeur*, pas le *type*. Le masquage permet de changer les deux car il recrée une variable.

### Piège 2 : Le dépassement d'entier (Integer Overflow)
Que se passe-t-il si vous tentez de dépasser la valeur maximale d'un type entier ?

```rust
let mut nombre: u8 = 255;
nombre = nombre + 1;
```

* **En mode Debug (`cargo run`)** : Rust inclut des vérifications à l'exécution. Le programme va immédiatement s'arrêter en générant une erreur panique (*panic*).
* **En mode Release (`cargo build --release`)** : Pour des raisons de performance, Rust désactive ces vérifications. Le dépassement s'effectue selon le principe du complément à deux (wrapping) : `255 + 1` devient `0`.

**Bonne pratique** : Pour gérer explicitement les risques de dépassement, utilisez les méthodes dédiées de la bibliothèque standard :
* `wrapping_add(val)` : force le bouclage (retour à 0).
* `checked_add(val)` : retourne un type `Option` (étudié dans le Module 4).
* `overflowing_add(val)` : retourne un tuple avec le résultat et un booléen indiquant s'il y a eu dépassement.

### Piège 3 : L'accès hors limites dans un tableau
Tenter d'accéder à un index inexistant dans un tableau provoque un arrêt brutal du programme (panic) à l'exécution.

```rust
let tab = [1, 2, 3];
let element = tab[5]; // ERREUR : panic à l'exécution (ou erreur de compilation si l'index est statiquement connu)
```

**Bonne pratique** : Rust protège votre mémoire contre les accès illégaux (pas de faille de dépassement de tampon / *buffer overflow*). Cependant, pour éviter les plantages, privilégiez l'utilisation de structures dynamiques sécurisées ou de vérifications de limites.

---

## 5. Synthèse Pédagogique

### Tableau Comparatif des Mécanismes de Liaison

| Mécanisme | Syntaxe | Type modifiable ? | Valeur modifiable ? | Portée d'utilisation |
| :--- | :--- | :---: | :---: | :--- |
| **Liaison Immuable** | `let x = 5;` | Non | Non | Locale |
| **Liaison Mutable** | `let mut x = 5;` | Non | **Oui** | Locale |
| **Masquage** | `let x = 5; let x = "cinq";` | **Oui** | **Oui** (nouvelle var) | Locale |
| **Constante** | `const X: u32 = 5;` | Non | Non | Globale ou Locale |

### Points Clés à Retenir
1. **Sécurité par défaut** : Tout est immuable en Rust tant que vous n'avez pas écrit explicitement `mut`.
2. **Typage statique et fort** : Le compilateur doit connaître le type de chaque variable à la compilation. S'il ne peut pas l'inférer, vous devez l'annoter (`let x: u32 = 10;`).
3. **Unicode natif** : Le type `char` fait 4 octets et supporte l'ensemble des caractères mondiaux.
4. **Zéro comportement indéfini** : Rust préfère faire planter proprement votre programme (panic) plutôt que de vous laisser accéder à de la mémoire corrompue (dépassement d'index de tableau).

---

## 6. Exercice Pratique d'Application

### Énoncé : "Le Système de Télémétrie d'un Drone"

Vous devez concevoir la logique de traitement des données de vol d'un drone de reconnaissance. Le programme doit manipuler plusieurs variables pour calculer l'état de l'appareil.

1. Déclarez une constante globale `GRAVITE` de type `f32` égale à `9.81`.
2. Dans la fonction `main`, déclarez les variables suivantes avec les types appropriés :
   * L'identifiant du drone : une chaîne de caractères immuable (ex: `"Alpha-1"`).
   * L'altitude actuelle : un entier mutable de 32 bits (initialisé à `150` mètres).
   * Les coordonnées GPS : un tuple immuable contenant la latitude (`f64`) et la longitude (`f64`).
   * Les 3 dernières vitesses enregistrées : un tableau de 3 flottants (`f32`) initialisé à `10.2`, `12.5`, et `11.8`.
3. Simulez une mise à jour des données de vol :
   * Le drone monte de `50` mètres (modifiez l'altitude).
   * Calculez la vitesse moyenne à partir du tableau de vitesses.
   * Utilisez le **masquage** pour convertir la vitesse moyenne (qui est un `f32`) en un entier arrondi (`i32`) afin de simplifier l'affichage sur l'écran de contrôle.
4. Affichez l'ensemble de ces informations de manière claire dans la console.

### Indices pour la résolution
* Pour modifier l'altitude, n'oubliez pas le mot-clé permettant la mutabilité.
* La formule de la moyenne de 3 valeurs : `(val1 + val2 + val3) / 3.0`.
* Pour convertir un type numérique en un autre en Rust, on utilise l'opérateur `as` (ex: `let entier = mon_flottant as i32;`).

---

### Correction Complète et Commentée

Voici le code source complet permettant de résoudre l'exercice :

```rust
// 1. Déclaration de la constante globale
const GRAVITE: f32 = 9.81;

fn main() {
    // 2. Initialisation des variables de télémétrie
    let identifiant_drone: &str = "Alpha-1";
    let mut altitude: i32 = 150; // Doit être mutable car l'altitude va changer
    let coordonnees_gps: (f64, f64) = (43.6047, 1.4442); // Toulouse, France
    let vitesses: [f32; 3] = [10.2, 12.5, 11.8];

    // Affichage de l'état initial
    println!("--- TÉLÉMÉTRIE INITIALE [{}] ---", identifiant_drone);
    println!("Altitude : {} m", altitude);
    println!("Position GPS : (Lat: {}, Lon: {})", coordonnees_gps.0, coordonnees_gps.1);
    println!("Constante de gravité appliquée : {} m/s²", GRAVITE);
    println!("---------------------------------");

    // 3. Simulation des modifications
    // A. Le drone prend de l'altitude
    altitude += 50;

    // B. Calcul de la vitesse moyenne (f32)
    let vitesse_moyenne: f32 = (vitesses[0] + vitesses[1] + vitesses[2]) / 3.0;

    // C. Masquage pour convertir le type de la vitesse moyenne en entier (i32)
    // Nous réutilisons le nom 'vitesse_moyenne' mais changeons son type grâce à 'let'
    let vitesse_moyenne: i32 = vitesse_moyenne as i32;

    // 4. Affichage des résultats mis à jour
    println!("\n--- MISE À JOUR DES DONNÉES ---");
    println!("Nouvelle Altitude : {} m", altitude);
    println!("Vitesse Moyenne Arrondie : {} km/h", vitesse_moyenne);
    println!("Statut de vol : Stable");
    println!("---------------------------------");
}
```

### Analyse de la correction :
* **Mutabilité** : La variable `altitude` a été déclarée avec `let mut` car sa valeur a été incrémentée de 50 (`altitude += 50`).
* **Masquage** : La variable `vitesse_moyenne` est d'abord calculée en tant que `f32` pour conserver la précision du calcul. Ensuite, nous avons utilisé `let vitesse_moyenne: i32 = ...` pour la masquer. Cela évite de polluer l'espace de nommage avec des variables redondantes comme `vitesse_moyenne_float` et `vitesse_moyenne_int`.
* **Sécurité** : Le compilateur garantit qu'aucune autre partie du code ne pourra modifier accidentellement l'identifiant du drone ou les coordonnées GPS, assurant ainsi l'intégrité des données de vol critiques.