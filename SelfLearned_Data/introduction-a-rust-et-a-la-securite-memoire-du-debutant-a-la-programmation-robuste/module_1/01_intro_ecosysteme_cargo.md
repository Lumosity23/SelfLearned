# Introduction à Rust et premier programme : Comprendre l'écosystème Cargo

---

## 1. Introduction Conceptuelle

### Le "Pourquoi" avant le "Comment" : La genèse de Rust

Depuis les débuts de l'informatique moderne, le développement de logiciels système — les systèmes d'exploitation, les navigateurs web, les moteurs de base de données ou les systèmes embarqués — est dominé par les langages C et C++. Ces langages offrent un contrôle absolu sur le matériel et des performances maximales, car ils ne s'encombrent pas d'un **Ramasse-miettes** (ou *Garbage Collector*), un mécanisme automatique qui suspend périodiquement l'exécution du programme pour nettoyer la mémoire inutilisée.

Cependant, ce pouvoir absolu s'accompagne d'une responsabilité immense. En C et C++, c'est au développeur de gérer manuellement chaque octet de mémoire : l'allouer quand on en a besoin, et la libérer précisément au bon moment. Une simple omission, et c'est la fuite de mémoire (*memory leak*). Une libération trop précoce, et le programme tente d'accéder à une zone mémoire invalide, provoquant des plantages aléatoires ou, pire, des failles de sécurité critiques exploitables par des attaquants (comme les dépassements de tampon ou *buffer overflows*).

Selon les statistiques de Microsoft et de Google (pour le projet Chromium), environ **70 % de toutes les vulnérabilités de sécurité majeures** sont dues à des problèmes de gestion de la mémoire.

C'est pour résoudre ce dilemme historique entre **performance** et **sécurité** que le langage Rust a été créé par Graydon Hoare chez Mozilla, puis propulsé par une communauté mondiale. Rust repose sur une promesse révolutionnaire : **garantir la sécurité de la mémoire à la compilation, sans aucun compromis sur les performances à l'exécution**.

### La philosophie de Rust : Les trois piliers

1. **Sécurité (Safety) :** Le compilateur Rust agit comme un garde-fou ultra-strict. Il analyse statiquement votre code lors de la compilation pour s'assurer qu'aucun bug de gestion mémoire (comme l'accès à de la mémoire libérée ou les conflits d'accès simultanés) ne puisse exister dans le programme final. Si le code compile, il est garanti sans comportement indéfini lié à la mémoire.
2. **Performance (Speed) :** Rust n'utilise pas de ramasse-miettes. Il utilise un système innovant de propriété des données (que nous étudierons en détail dans le *Module 2*). Les performances de Rust sont ainsi équivalentes à celles du C et du C++.
3. **Productivité (Productivity) :** Souvent, les langages système souffrent d'un outillage fragmenté et complexe. Rust prend le contre-pied de cette tradition en fournissant une suite d'outils intégrés de premier ordre, unifiée sous une seule commande : `cargo`.

---

## 2. Fondations Théoriques

### Compilation vs Interprétation

Pour comprendre comment fonctionne Rust, il convient de distinguer deux grandes familles de langages de programmation :

* **Les langages interprétés (ex. Python, JavaScript) :** Le code source est lu et exécuté ligne par ligne à l'exécution par un autre programme appelé interpréteur. C'est flexible, mais lent.
* **Les langages compilés (ex. C, C++, Rust) :** Le code source est entièrement traduit à l'avance par un programme appelé **compilateur** en instructions machines natives (un fichier binaire exécutable, comme un `.exe` sous Windows ou un fichier ELF sous Linux). Une fois compilé, le programme s'exécute à la vitesse maximale du processeur, sans intermédiaire.

```
[ Code Source Rust (.rs) ] 
          │
          ▼  (Vérifications strictes de sécurité)
   [ Compilateur rustc ]
          │
          ▼
 [ Binaire Machine Natif ] ──► Exécution ultra-rapide et autonome
```

### Le rôle du compilateur (`rustc`)

Le compilateur officiel de Rust s'appelle `rustc`. Contrairement aux compilateurs traditionnels qui se contentent de traduire le code et de signaler les erreurs de syntaxe de base, `rustc` effectue des analyses sémantiques extrêmement poussées. 

Il applique des règles mathématiques strictes sur la durée de vie des variables et l'accès aux données. Si une règle est violée, `rustc` refuse de générer l'exécutable. Il produit alors des messages d'erreur d'une clarté inégalée dans l'industrie, expliquant précisément *pourquoi* le code est dangereux et *comment* le corriger.

### L'architecture de l'écosystème Cargo

Bien qu'il soit possible d'appeler directement `rustc` pour compiler un fichier isolé, les projets réels utilisent **Cargo**. Cargo est à la fois le gestionnaire de paquets, le système de construction (*build system*) et l'orchestrateur de tests de Rust.

Un projet géré par Cargo adopte une structure de répertoires standardisée et immuable :

```text
mon_projet/
├── Cargo.toml
├── Cargo.lock
└── src/
    └── main.rs
```

#### 1. Le manifeste : `Cargo.toml`
Le fichier `Cargo.toml` (écrit en syntaxe TOML - *Tom's Obvious Minimal Language*) est la carte d'identité de votre projet. C'est ici que vous définissez le nom du projet, sa version, l'édition de Rust utilisée, ainsi que les bibliothèques externes (appelées **crates** en Rust) dont votre projet a besoin.

#### 2. Le verrou de dépendances : `Cargo.lock`
Ce fichier est généré automatiquement par Cargo. Il enregistre les versions exactes de toutes les dépendances utilisées lors de la compilation réussie. Cela garantit la **reproductibilité** : toute personne qui compilera votre projet obtiendra exactement le même binaire, au bit près, peu importe quand ou sur quelle machine elle le fait.

#### 3. Le répertoire `src/`
Ce dossier contient l'intégralité du code source de votre application. Par convention, le point d'entrée d'un programme exécutable est toujours le fichier `src/main.rs`.

---

## 3. Implémentation Pratique Pas-à-Pas

### Étape 1 : Installation de la chaîne d'outils Rust

La méthode officielle et recommandée pour installer Rust sur tous les systèmes d'exploitation est d'utiliser l'installateur `rustup`.

#### Sur Linux et macOS :
Ouvrez un terminal et exécutez la commande suivante :

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Suivez les instructions à l'écran (l'option par défaut `1` est recommandée). Une fois l'installation terminée, redémarrez votre terminal ou rechargez votre configuration avec :

```bash
source $HOME/.cargo/env
```

#### Sur Windows :
Téléchargez et exécutez l'installateur `rustup-init.exe` disponible sur le site officiel [https://rustup.rs](https://rustup.rs). 
*Note : Rust nécessite les outils de compilation C++ de Microsoft Visual Studio. Si l'installateur vous le demande, acceptez l'installation de ces outils.*

#### Vérification de l'installation :
Pour valider que Rust et Cargo sont correctement installés, tapez les commandes suivantes dans votre terminal :

```bash
rustc --version
cargo --version
```

Vous devriez voir s'afficher les numéros de version actifs (par exemple : `rustc 1.75.0`).

---

### Étape 2 : Création du premier projet avec Cargo

Nous allons utiliser Cargo pour générer automatiquement la structure de notre premier projet, que nous nommerons `hello_rust`.

Exécutez la commande suivante dans votre terminal :

```bash
cargo new hello_rust
```

Le terminal doit afficher :
```text
     Created binary (application) `hello_rust` package
```

Entrez dans le répertoire nouvellement créé :

```bash
cd hello_rust
```

---

### Étape 3 : Exploration de la structure générée

Ouvrons et analysons le fichier `Cargo.toml` généré :

```toml
[package]
name = "hello_rust"
version = "0.1.0"
edition = "2021"

# See more keys and their definitions at https://doc.rust-lang.org/cargo/reference/manifest.html

[dependencies]
```

* **`[package]`** : Introduit la section de configuration de notre programme.
* **`name`** : Le nom de notre exécutable.
* **`version`** : Version actuelle du projet, respectant le versionnage sémantique (SemVer).
* **`edition`** : Spécifie l'édition majeure du langage Rust (ici, l'édition 2021). Rust introduit des améliorations majeures via des éditions tous les trois ans environ, tout en garantissant une rétrocompatibilité totale.
* **`[dependencies]`** : Cette section est actuellement vide. C'est ici que nous listerions les bibliothèques externes nécessaires.

---

### Étape 4 : Analyse syntaxique du "Hello, World!"

Ouvrez maintenant le fichier `src/main.rs`. Cargo a déjà généré le code minimal suivant :

```rust
fn main() {
    println!("Hello, world!");
}
```

Décomposons méticuleusement ce code ligne par ligne :

1. **`fn main()`** : 
   * `fn` est le mot-clé réservé pour déclarer une fonction.
   * `main` est le nom de la fonction spéciale qui sert de point d'entrée unique à tout programme Rust. C'est cette fonction qui est appelée en premier lors du démarrage du programme.
   * Les parenthèses `()` indiquent que cette fonction ne prend aucun paramètre en entrée.
2. **Les accolades `{ ... }`** :
   * Elles délimitent le corps de la fonction `main`. Tout le code situé entre ces accolades sera exécuté séquentiellement.
3. **`println!("Hello, world!");`** :
   * `println!` est une **macro** Rust (et non une simple fonction). Nous la reconnaissons immédiatement grâce au point d'exclamation `!` qui suit son nom. Les macros en Rust sont des outils puissants qui génèrent du code lors de la compilation. Dans le cas de `println!`, elle analyse la chaîne de caractères à la compilation pour s'assurer que les arguments fournis sont valides et sécurisés.
   * `"Hello, world!"` est une chaîne de caractères (littéral) passée en argument à la macro.
   * Le point-virgule `;` est obligatoire. Il indique la fin de l'instruction courante. En Rust, l'omission d'un point-virgule change fondamentalement la signification de la ligne (ce point sera détaillé lors de l'étude des expressions dans le *Module 1.2*).

---

### Étape 5 : Compilation et exécution du projet

Cargo simplifie drastiquement le cycle de développement grâce à trois commandes fondamentales à connaître par cœur.

#### Commande A : Vérifier le code sans compiler (`cargo check`)
Pendant que vous écrivez du code, vous voulez savoir rapidement si votre syntaxe est correcte sans attendre que le compilateur génère le binaire final (ce qui peut prendre du temps sur de gros projets).

Exécutez :
```bash
cargo check
```

Sortie attendue :
```text
    Checking hello_rust v0.1.0 (/chemin/vers/votre/projet/hello_rust)
    Finished dev [unoptimized + debuginfo] target(s) in 0.15s
```
Le code est syntaxiquement correct et respecte les règles de sécurité de Rust.

#### Commande B : Compiler le projet (`cargo build`)
Pour générer l'exécutable de développement, exécutez :

```bash
cargo build
```

Sortie attendue :
```text
   Compiling hello_rust v0.1.0 (/chemin/vers/votre/projet/hello_rust)
    Finished dev [unoptimized + debuginfo] target(s) in 0.42s
```
Cette commande a créé un dossier `target/debug/` contenant l'exécutable nommé `hello_rust` (ou `hello_rust.exe` sous Windows).

#### Commande C : Compiler et exécuter en une seule étape (`cargo run`)
C'est la commande la plus utilisée au quotidien par les développeurs Rust.

Exécutez :
```bash
cargo run
```

Sortie attendue :
```text
    Finished dev [unoptimized + debuginfo] target(s) in 0.01s
     Running `target/debug/hello_rust`
Hello, world!
```
Cargo détecte si des modifications ont été apportées depuis la dernière compilation. Si ce n'est pas le cas, il saute l'étape de compilation et lance directement le binaire existant.

#### Commande D : Compiler pour la production (`cargo build --release`)
Par défaut, `cargo build` compile le code en mode **Debug**. Le binaire généré contient des informations de débogage et n'est pas optimisé, ce qui permet une compilation rapide mais des performances d'exécution réduites.

Lorsque votre code est prêt à être déployé, compilez-le avec :

```bash
cargo build --release
```

Sortie attendue :
```text
   Compiling hello_rust v0.1.0 (/chemin/vers/votre/projet/hello_rust)
    Finished release [optimized] target(s) in 0.50s
```
Le compilateur applique alors des optimisations agressives (comme l'inlining de fonctions et la vectorisation). Le binaire résultant, situé dans `target/release/`, est extrêmement rapide et léger.

---

## 4. Pièges Fréquents et Bonnes Pratiques

### Piège 1 : Oublier le point d'exclamation `!` sur les macros

Un débutant habitué à d'autres langages a tendance à écrire :
```rust
println("Hello, world!"); // ERREUR !
```

**Pourquoi c'est une erreur :**
`println` (sans `!`) serait interprété par Rust comme un appel de fonction classique. Or, il n'existe pas de fonction nommée `println` dans la bibliothèque standard, car la vérification du formatage textuel nécessite la puissance d'analyse d'une macro à la compilation.

**Message d'erreur du compilateur :**
```text
error[E0423]: expected function, found macro `println`
 --> src/main.rs:2:5
  |
2 |     println("Hello, world!");
  |     ^^^^^^^ not a function
  |
help: use `!` to invoke the macro
  |
2 |     println!("Hello, world!");
  |            +
```

---

### Piège 2 : L'omission du point-virgule `;`

En Rust, presque tout est une expression qui retourne une valeur. Oublier un point-virgule à la fin d'une instruction de type action (comme un affichage) indique au compilateur que vous tentez de retourner la valeur de cette ligne.

```rust
fn main() {
    println!("Hello, world!") // ERREUR ! Point-virgule manquant
}
```

**Message d'erreur du compilateur :**
```text
error: expected `;`, found `}`
 --> src/main.rs:2:30
  |
2 |     println!("Hello, world!")
  |                              ^ help: add `;` here
3 | }
  | - unexpected token
```

---

### Bonnes Pratiques de l'Écosystème

#### 1. Formater automatiquement son code (`cargo fmt`)
La communauté Rust est très stricte sur le style de code. Pour éviter les débats stériles sur l'emplacement des accolades ou des espaces, Rust fournit un outil de formatage officiel : `rustfmt`.

Pour formater automatiquement tous les fichiers de votre projet selon les standards officiels, exécutez simplement :
```bash
cargo fmt
```

#### 2. Analyser son code avec le linter (`cargo clippy`)
Rust propose un outil d'analyse statique avancé nommé `clippy`. Il analyse votre code pour y détecter des inefficacités, des pratiques non idiomatiques ou des erreurs logiques subtiles qui compilent mais pourraient être améliorées.

Exécutez régulièrement :
```bash
cargo clippy
```

---

## 5. Synthèse Pédagogique

### Résumé des commandes Cargo indispensables

| Commande | Rôle | Quand l'utiliser ? |
| :--- | :--- | :--- |
| `cargo new <nom>` | Crée un nouveau projet Rust structuré. | Au début d'un nouveau projet. |
| `cargo check` | Vérifie la validité du code sans générer de binaire. | Constamment, pendant la phase d'écriture. |
| `cargo build` | Compile le projet en mode de développement (Debug). | Pour tester localement avec les outils de debug. |
| `cargo run` | Compile (si nécessaire) et exécute le programme. | Pour tester rapidement le comportement du code. |
| `cargo build --release` | Compile le projet avec des optimisations maximales. | Avant de distribuer ou de mesurer les performances. |
| `cargo fmt` | Formate proprement le code source. | Avant chaque commit ou partage de code. |
| `cargo clippy` | Analyse le code pour suggérer des améliorations. | Pour s'assurer de la qualité et de l'idiomaticité du code. |

### Le flux de travail standard du développeur Rust

```text
[ Écriture du code ] ──► [ cargo check ] (Rapide, correction des erreurs)
       ▲                        │ (Si OK)
       │                        ▼
[ Amélioration du code ] ◄── [ cargo run ] (Exécution et tests)
       │
       ▼ (Prêt pour la production)
[ cargo build --release ]
```

---

## 6. Exercice Pratique d'Application

### Énoncé : Le Calculateur de Périmètre

L'objectif de cet exercice est de vous familiariser avec l'utilisation de Cargo, la structure d'un programme Rust, et l'utilisation de la macro `println!` pour afficher des variables et des résultats de calculs simples.

1. Créez un nouveau projet binaire Cargo nommé `calculateur_perimetre`.
2. Dans le fichier `src/main.rs`, écrivez un programme qui :
   * Déclare une variable pour la `longueur` d'un rectangle (valeur entière : `15`).
   * Déclare une variable pour la `largeur` d'un rectangle (valeur entière : `6`).
   * Calcule le périmètre de ce rectangle en appliquant la formule mathématique : $Périmètre = 2 \times (Longueur + Largeur)$.
   * Affiche un message de bienvenue chaleureux.
   * Affiche les dimensions du rectangle ainsi que le résultat du calcul du périmètre de manière lisible.
3. Utilisez `cargo fmt` pour vous assurer que le code est parfaitement formaté.
4. Exécutez le programme avec `cargo run`.

---

### Indices pour la résolution

* **Déclarer une variable :** En Rust, on déclare une variable à l'aide du mot-clé `let`. Par exemple : `let x = 5;`. (Nous étudierons les détails de la mutabilité et des types au *Module 1.2*).
* **Afficher des variables avec `println!` :** Pour afficher la valeur d'une variable au sein d'un texte, on utilise des accolades `{}` comme "espace réservé" (*placeholder*). 
  Exemple :
  ```rust
  let score = 42;
  println!("Le score est de : {}", score);
  ```
* **Opérateurs arithmétiques :** Rust utilise les opérateurs standards : `+` pour l'addition, `*` pour la multiplication. Les parenthèses `()` permettent de gérer les priorités d'opérations.

---

### Correction Complète

#### 1. Initialisation du projet
Dans votre terminal, exécutez :
```bash
cargo new calculateur_perimetre
cd calculateur_perimetre
```

#### 2. Code source (`src/main.rs`)
Remplacez le contenu de `src/main.rs` par le code suivant :

```rust
fn main() {
    // Affichage du message de bienvenue
    println!("========================================");
    println!("  Bienvenue dans le Calculateur Rust !  ");
    println!("========================================");

    // Déclaration des dimensions du rectangle
    let longueur = 15;
    let largeur = 6;

    // Calcul du périmètre : 2 * (longueur + largeur)
    let perimetre = 2 * (longueur + largeur);

    // Affichage des informations et du résultat
    println!("Dimensions du rectangle :");
    println!(" - Longueur : {} cm", longueur);
    println!(" - Largeur  : {} cm", largeur);
    println!("----------------------------------------");
    println!("Le périmètre calculé est de : {} cm", perimetre);
    println!("========================================");
}
```

#### 3. Formatage et exécution
Exécutez la commande de formatage pour nettoyer le code :
```bash
cargo fmt
```

Compilez et lancez le programme :
```bash
cargo run
```

#### 4. Sortie attendue dans le terminal
```text
========================================
  Bienvenue dans le Calculateur Rust !  
========================================
Dimensions du rectangle :
 - Longueur : 15 cm
 - Largeur  : 6 cm
----------------------------------------
Le périmètre calculé est de : 42 cm
========================================
```