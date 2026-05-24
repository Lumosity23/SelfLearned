# Exercices d'Application : Introduction à Rust et premier programme : Comprendre l'écosystème Cargo

---

## Exercice 1 : Le Convertisseur de Températures (Difficulté : Facile)

### Énoncé
Pour vous échauffer avec la syntaxe de base de Rust et l'utilisation de Cargo, vous allez créer un programme utilitaire qui convertit une température de degrés Celsius (°C) en degrés Fahrenheit (°F).

1. Créez un nouveau projet binaire Cargo nommé `convertisseur_celsius`.
2. Dans le fichier `src/main.rs`, écrivez un programme qui :
   * Déclare une variable entière pour la température en Celsius (choisissez la valeur `20`).
   * Calcule la température équivalente en Fahrenheit en utilisant la formule de conversion entière : 
     $$Fahrenheit = \frac{Celsius \times 9}{5} + 32$$
   * Affiche un message clair présentant la température d'origine et le résultat de la conversion.
3. Formatez votre code avec `cargo fmt`.
4. Compilez et exécutez votre programme à l'aide de Cargo.

### Indices
1. **Priorité des opérations :** En Rust, comme en mathématiques, la multiplication `*` et la division `/` sont prioritaires sur l'addition `+`. Utilisez des parenthèses pour structurer clairement votre calcul : `((celsius * 9) / 5) + 32`.
2. **Affichage multiple :** Vous pouvez afficher plusieurs variables dans un seul `println!` en ajoutant autant de paires d'accolades `{}` que de variables passées en paramètres. 
   * Exemple : `println!("{} Celsius vaut {} Fahrenheit", variable1, variable2);`

### Correction Détaillée

#### Étape 1 : Création du projet
Ouvrez votre terminal et exécutez la commande suivante pour générer la structure du projet :
```bash
cargo new convertisseur_celsius
cd convertisseur_celsius
```

#### Étape 2 : Écriture du code (`src/main.rs`)
Ouvrez le fichier `src/main.rs` et remplacez son contenu par le code suivant :

```rust
fn main() {
    // 1. Déclaration de la température de départ en Celsius
    let celsius = 20;

    // 2. Calcul de la conversion en Fahrenheit (calcul sur des entiers)
    let fahrenheit = ((celsius * 9) / 5) + 32;

    // 3. Affichage du résultat dans le terminal
    println!("=== CONVERTISSEUR DE TEMPÉRATURE ===");
    println!("Température de départ : {}°C", celsius);
    println!("Température convertie : {}°F", fahrenheit);
    println!("====================================");
}
```

#### Étape 3 : Formatage, vérification et exécution
Avant de lancer le programme, assurez-vous que le style respecte les standards de Rust :
```bash
cargo fmt
```

Vérifiez qu'il n'y a pas d'erreur de syntaxe :
```bash
cargo check
```

Enfin, exécutez le programme :
```bash
cargo run
```

#### Sortie attendue dans le terminal :
```text
=== CONVERTISSEUR DE TEMPÉRATURE ===
Température de départ : 20°C
Température convertie : 68°F
====================================
```

---

## Exercice 2 : La Chasse aux Bugs (Difficulté : Moyenne)

### Énoncé
Un développeur junior vient de vous envoyer un script Rust qui refuse de compiler. Votre mission est de jouer le rôle du compilateur et de l'analyste de code pour identifier, comprendre et corriger les erreurs.

1. Créez un nouveau projet Cargo nommé `chasse_aux_bugs`.
2. Remplacez le contenu de `src/main.rs` par le code erroné suivant :

```rust
fn main() {
    let base = 10
    let hauteur = 5;

    let aire = base * hauteur / 2;

    println("L'aire du triangle est de : {} cm²", aire)
}
```

3. Tentez de compiler le projet avec `cargo check` ou `cargo build`.
4. Analysez attentivement les messages d'erreur renvoyés par le compilateur `rustc`.
5. Corrigez le code afin qu'il compile parfaitement et affiche le bon résultat.

### Indices
1. **Regardez la fin des lignes :** En Rust, chaque instruction qui effectue une action ou une assignation doit impérativement se terminer par un caractère spécifique pour indiquer sa fin au compilateur.
2. **Fonction vs Macro :** Portez une attention particulière à la syntaxe de l'outil d'affichage textuel. Est-ce une fonction classique ou un mécanisme de métaprogrammation propre à Rust ?

### Correction Détaillée

#### Étape 1 : Analyse des erreurs du compilateur
Lorsque vous tentez de compiler le code initial avec `cargo check`, le compilateur Rust génère deux messages d'erreur extrêmement précis :

**Erreur 1 :**
```text
error: expected `;`, found `let`
 --> src/main.rs:3:5
  |
2 |     let base = 10
  |                  ^ help: add `;` here
3 |     let hauteur = 5;
  |     ^^^ unexpected token
```
*Explication :* Rust signale qu'il manque un point-virgule `;` à la fin de la ligne 2 avant de pouvoir déclarer la variable suivante à la ligne 3.

**Erreur 2 :**
```text
error[E0423]: expected function, found macro `println`
 --> src/main.rs:7:5
  |
7 |     println("L'aire du triangle est de : {} cm²", aire)
  |     ^^^^^^^ not a function
  |
help: use `!` to invoke the macro
  |
7 |     println!("L'aire du triangle est de : {} cm²", aire);
  |            +                                            +
```
*Explication :* Rust détecte que vous tentez d'appeler `println` comme s'il s'agissait d'une fonction classique. Il vous rappelle que `println!` est une macro et requiert un point d'exclamation `!`. De plus, il note qu'il manque également un point-virgule `;` à la fin de cette instruction.

#### Étape 2 : Code corrigé (`src/main.rs`)
Voici le code source corrigé et conforme aux attentes du compilateur :

```rust
fn main() {
    // Correction 1 : Ajout du point-virgule manquant après le chiffre 10
    let base = 10;
    let hauteur = 5;

    let aire = base * hauteur / 2;

    // Correction 2 : Ajout du '!' pour appeler la macro et du ';' final
    println!("L'aire du triangle est de : {} cm²", aire);
}
```

#### Étape 3 : Validation
Exécutez `cargo run` pour valider la correction.

#### Sortie attendue dans le terminal :
```text
L'aire du triangle est de : 25 cm²
```

---

## Exercice 3 : Le Simulateur de Facturation Éco-Responsable (Difficulté : Avancée)

### Énoncé
Vous devez concevoir un prototype d'application de facturation pour une coopérative agricole biologique. Ce programme doit calculer le montant total d'une commande de pommes bio en appliquant une taxe fixe et une réduction de fidélité, puis afficher un reçu propre et professionnel.

1. Créez un nouveau projet Cargo nommé `facture_bio`.
2. Votre programme doit déclarer les variables suivantes :
   * `prix_au_kilo` (valeur entière : `4` euros).
   * `quantite_kilos` (valeur entière : `12` kilos).
   * `taxe_transport` (valeur entière fixe : `5` euros).
   * `reduction_fidelite` (valeur entière fixe : `3` euros).
3. Effectuez les calculs suivants :
   * Le montant brut (prix au kilo multiplié par la quantité).
   * Le montant final net à payer (montant brut auquel on ajoute la taxe de transport et on soustrait la réduction de fidélité).
4. Affichez une facture structurée dans le terminal.
5. Utilisez l'outil d'analyse statique `cargo clippy` pour vérifier si votre code respecte les meilleures pratiques de Rust, puis formatez-le avec `cargo fmt`.

### Indices
1. **Calculs par étapes :** Pour garder un code lisible, n'hésitez pas à créer des variables intermédiaires (comme `let montant_brut = ...;`) avant de calculer le montant net final.
2. **Mise en page textuelle :** Vous pouvez utiliser des sauts de ligne `\n` ou aligner vos affichages avec plusieurs macros `println!` successives pour dessiner les contours de votre facture (en utilisant des tirets `-` ou des astérisques `*`).

### Correction Détaillée

#### Étape 1 : Initialisation
```bash
cargo new facture_bio
cd facture_bio
```

#### Étape 2 : Implémentation du code (`src/main.rs`)
Remplacez le contenu de `src/main.rs` par le code structuré suivant :

```rust
fn main() {
    // 1. Définition des paramètres de la commande
    let prix_au_kilo = 4;
    let quantite_kilos = 12;
    let taxe_transport = 5;
    let reduction_fidelite = 3;

    // 2. Calculs intermédiaires et finaux
    let montant_brut = prix_au_kilo * quantite_kilos;
    let montant_total = montant_brut + taxe_transport - reduction_fidelite;

    // 3. Affichage du reçu client
    println!("****************************************");
    println!("       COOPÉRATIVE AGRICOLE BIO         ");
    println!("           REÇU DE PAIEMENT             ");
    println!("****************************************");
    println!(" Détails des articles :");
    println!(" - Pommes bio : {} kg x {} €/kg", quantite_kilos, prix_au_kilo);
    println!("----------------------------------------");
    println!(" Sous-total brut   : {} €", montant_brut);
    println!(" Frais de port     : +{} €", taxe_transport);
    println!(" Remise fidélité   : -{} €", reduction_fidelite);
    println!("----------------------------------------");
    println!(" TOTAL À PAYER     : {} €", montant_total);
    println!("****************************************");
    println!("   Merci de soutenir le local & bio !   ");
    println!("****************************************");
}
```

#### Étape 3 : Analyse de qualité et formatage
Exécutez le linter de Rust pour vérifier la qualité de votre code :
```bash
cargo clippy
```
*Note : Si votre code est propre, clippy ne renverra aucun avertissement et affichera simplement qu'il a terminé l'analyse.*

Formatez le code pour aligner parfaitement les blocs :
```bash
cargo fmt
```

#### Étape 4 : Exécution
Lancez l'application :
```bash
cargo run
```

#### Sortie attendue dans le terminal :
```text
****************************************
       COOPÉRATIVE AGRICOLE BIO         
           REÇU DE PAIEMENT             
****************************************
 Détails des articles :
 - Pommes bio : 12 kg x 4 €/kg
----------------------------------------
 Sous-total brut   : 48 €
 Frais de port     : +5 €
 Remise fidélité   : -3 €
----------------------------------------
 TOTAL À PAYER     : 50 €
****************************************
   Merci de soutenir le local & bio !   
****************************************
```