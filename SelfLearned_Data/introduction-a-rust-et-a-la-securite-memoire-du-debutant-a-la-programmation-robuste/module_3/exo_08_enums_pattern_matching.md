# Exercices d'Application : Énumérations (Enums) et Pattern Matching

Ce cahier d'exercices pratiques a pour but de consolider vos compétences sur la modélisation d'états avec les énumérations Rust, la manipulation sécurisée des données via le filtrage par motif (`match` et `if let`), ainsi que l'optimisation de la mémoire associée à ces structures.

---

## Exercice 1 : Contrôle d'Objets Connectés (Niveau Facile)

### Énoncé
Dans le cadre du développement d'une passerelle pour maison connectée (Smart Home), vous devez concevoir un système capable de recevoir et de traiter des commandes pour des ampoules intelligentes.

Une commande d'ampoule peut prendre l'une des formes suivantes :
1. **Allumer** (sans paramètre).
2. **Éteindre** (sans paramètre).
3. **Régler la luminosité** (un pourcentage représenté par un entier `u8` de 0 à 100).
4. **Changer la couleur** (une couleur au format RGB représentée par trois valeurs `u8` : rouge, vert, bleu).

#### Objectifs :
1. Définissez l'énumération `CommandeAmpoule` modélisant ces quatre états.
2. Implémentez une fonction `executer_commande(commande: CommandeAmpoule)` qui utilise un bloc `match` pour afficher l'action en cours de réalisation (par exemple : *"Luminosité réglée à 75%"*).
3. Afin de détecter rapidement les tentatives de pollution lumineuse nocturne, écrivez une fonction `intercepter_lumiere_rouge(commande: &CommandeAmpoule)` en utilisant la syntaxe concise `if let`. Cette fonction doit afficher un message d'alerte spécifique uniquement si la commande consiste à changer la couleur avec le canal rouge au maximum (`255`), indépendamment des valeurs de vert et de bleu.

---

### Indices
1. Pour la variante de luminosité, utilisez un tuple ou un champ nommé contenant un `u8`.
2. Pour la fonction `intercepter_lumiere_rouge`, vous devez passer une référence `&CommandeAmpoule` afin de ne pas consommer (déplacer l'ownership de) la commande.
3. Dans le motif du `if let`, vous pouvez utiliser le caractère de substitution `_` pour ignorer les valeurs de vert et de bleu qui ne vous intéressent pas.

---

### Correction Détaillée

```rust
// 1. Définition de l'énumération avec données associées
#[derive(Debug, Clone)]
enum CommandeAmpoule {
    Allumer,
    Eteindre,
    ReglerLuminosite(u8),       // Tuple variant
    ChangerCouleur(u8, u8, u8), // Tuple variant (Rouge, Vert, Bleu)
}

// 2. Traitement exhaustif avec match
fn executer_commande(commande: CommandeAmpoule) {
    match commande {
        CommandeAmpoule::Allumer => {
            println!("Action : Allumage de l'ampoule.");
        }
        CommandeAmpoule::Eteindre => {
            println!("Action : Extinction de l'ampoule.");
        }
        CommandeAmpoule::ReglerLuminosite(pourcentage) => {
            // Optionnel : validation simple de la donnée
            if pourcentage > 100 {
                println!("Erreur : Luminosité impossible ({}% demandés, max 100%).", pourcentage);
            } else {
                println!("Action : Luminosité réglée à {}%.", pourcentage);
            }
        }
        CommandeAmpoule::ChangerCouleur(r, v, b) => {
            println!("Action : Couleur modifiée en RGB({}, {}, {}).", r, v, b);
        }
    }
}

// 3. Interception ciblée avec if let et référence
fn intercepter_lumiere_rouge(commande: &CommandeAmpoule) {
    // On filtre uniquement sur la variante ChangerCouleur avec r = 255
    if let CommandeAmpoule::ChangerCouleur(255, _, _) = commande {
        println!("Alerte : Commande de lumière rouge maximale détectée !");
    }
}

fn main() {
    let cmd_on = CommandeAmpoule::Allumer;
    let cmd_dim = CommandeAmpoule::ReglerLuminosite(85);
    let cmd_rouge = CommandeAmpoule::ChangerCouleur(255, 0, 120);
    let cmd_bleu = CommandeAmpoule::ChangerCouleur(0, 0, 255);

    println!("--- Exécution des commandes ---");
    executer_commande(cmd_on);
    executer_commande(cmd_dim);

    println!("\n--- Phase d'interception ---");
    intercepter_lumiere_rouge(&cmd_rouge); // Doit déclencher l'alerte
    intercepter_lumiere_rouge(&cmd_bleu);  // Ne doit rien afficher
}
```

---

## Exercice 2 : Système de Validation de Paiements (Niveau Moyen)

### Énoncé
Une plateforme de commerce électronique accepte trois types de paiement :
1. **CarteBancaire** : contient un numéro de carte (`String`) et le solde disponible (`f64`).
2. **Crypto** : contient une adresse de portefeuille (`String`) et un booléen indiquant si la signature de transaction est valide (`bool`).
3. **CarteCadeau** : contient un code unique (`String`) et le solde restant (`f64`).

Vous devez concevoir un module de validation robuste qui vérifie si un paiement peut être validé pour un montant d'achat donné.

#### Objectifs :
1. Créez l'énumération `MoyenPaiement`.
2. Créez une énumération de sortie `StatutPaiement` ayant deux variantes :
   * `Accepte` (contenant le moyen de paiement mis à jour après déduction du montant).
   * `Refuse` (contenant une explication textuelle `String`).
3. Implémentez la fonction `valider_paiement(moyen: MoyenPaiement, montant: f64) -> StatutPaiement`.
   * **Règles de gestion (Gardes de filtrage obligatoires) :**
     * Pour une **CarteBancaire** : Le paiement est accepté uniquement si le solde est supérieur ou égal au montant de l'achat.
     * Pour la **Crypto** : Le paiement est accepté uniquement si la signature est valide (considérez que le portefeuille a toujours les fonds nécessaires pour simplifier).
     * Pour une **CarteCadeau** : Le paiement est accepté uniquement si le solde est supérieur ou égal au montant.
     * Tout autre cas doit être explicitement refusé avec un message clair (sans utiliser de wildcard `_` global afin de conserver la sécurité d'exhaustivité).

---

### Indices
1. Utilisez des *Match Guards* (`if`) directement dans vos branches de `match` pour valider les soldes et les signatures.
2. Pour mettre à jour le solde d'une carte bancaire ou d'une carte cadeau, vous devez reconstruire une nouvelle instance de la variante avec le solde diminué du montant, puis l'encapsuler dans `StatutPaiement::Accepte`.
3. Évitez l'utilisation d'un unique bras `_ => ...` à la fin du match. Épelez les cas de refus (ex: solde insuffisant) pour chaque variante afin de garantir que si une nouvelle variante est ajoutée au code futur, le compilateur vous force à la traiter.

---

### Correction Détaillée

```rust
#[derive(Debug, Clone)]
enum MoyenPaiement {
    CarteBancaire { numero: String, solde: f64 },
    Crypto { adresse: String, signature_valide: bool },
    CarteCadeau { code: String, solde: f64 },
}

#[derive(Debug)]
enum StatutPaiement {
    Accepte(MoyenPaiement),
    Refuse(String),
}

fn valider_paiement(moyen: MoyenPaiement, montant: f64) -> StatutPaiement {
    match moyen {
        // Cas 1 : Carte Bancaire avec solde suffisant
        MoyenPaiement::CarteBancaire { numero, solde } if solde >= montant => {
            let nouveau_moyen = MoyenPaiement::CarteBancaire {
                numero,
                solde: solde - montant,
            };
            StatutPaiement::Accepte(nouveau_moyen)
        }
        // Cas 2 : Carte Bancaire avec solde insuffisant
        MoyenPaiement::CarteBancaire { numero: _, solde } => {
            StatutPaiement::Refuse(format!(
                "Refusé : Solde insuffisant sur la carte (disponible: {:.2}, requis: {:.2}).",
                solde, montant
            ))
        }

        // Cas 3 : Crypto avec signature valide
        MoyenPaiement::Crypto { adresse, signature_valide: true } => {
            // On considère la transaction validée
            StatutPaiement::Accepte(MoyenPaiement::Crypto { adresse, signature_valide: true })
        }
        // Cas 4 : Crypto avec signature invalide
        MoyenPaiement::Crypto { adresse: _, signature_valide: false } => {
            StatutPaiement::Refuse(String::from("Refusé : Signature de transaction invalide."))
        }

        // Cas 5 : Carte Cadeau avec solde suffisant
        MoyenPaiement::CarteCadeau { code, solde } if solde >= montant => {
            let nouveau_moyen = MoyenPaiement::CarteCadeau {
                code,
                solde: solde - montant,
            };
            StatutPaiement::Accepte(nouveau_moyen)
        }
        // Cas 6 : Carte Cadeau avec solde insuffisant
        MoyenPaiement::CarteCadeau { code: _, solde } => {
            StatutPaiement::Refuse(format!(
                "Refusé : Solde de carte cadeau insuffisant ({:.2} restant).",
                solde
            ))
        }
    }
}

fn main() {
    let cb = MoyenPaiement::CarteBancaire {
        numero: String::from("4970-XXXX-XXXX-1234"),
        solde: 150.0,
    };
    
    let crypto_invalide = MoyenPaiement::Crypto {
        adresse: String::from("0x71C...397"),
        signature_valide: false,
    };

    println!("--- Tentative 1 : Achat de 50.00€ via Carte Bancaire ---");
    match valider_paiement(cb, 50.0) {
        StatutPaiement::Accepte(nouveau_moyen) => {
            println!("Paiement accepté ! Nouveau statut du compte : {:?}", nouveau_moyen);
        }
        StatutPaiement::Refuse(err) => {
            println!("Échec : {}", err);
        }
    }

    println!("\n--- Tentative 2 : Achat de 10.00€ via Crypto non signée ---");
    match valider_paiement(crypto_invalide, 10.0) {
        StatutPaiement::Accepte(_) => println!("Succès inattendu !"),
        StatutPaiement::Refuse(err) => println!("Sécurité OK. Raison du refus : {}", err),
    }
}
```

---

## Exercice 3 : Optimisation Mémoire d'un Système de Fichiers Virtuel (Niveau Difficile)

### Énoncé
Dans un système d'exploitation embarqué, vous devez modéliser les nœuds d'un système de fichiers virtuel. Un nœud peut être :
1. Un **LienRapide** (qui contient simplement un identifiant numérique `u32`).
2. Un **FichierTexte** (qui contient le chemin sous forme de `String` et le contenu textuel brut).
3. Une **ImageBrute** (qui contient le chemin sous forme de `String` et une matrice brute de pixels représentée par un tableau fixe `[u8; 1024]`).

#### Problématique mémoire :
Si vous déclarez cette énumération de manière naïve, chaque instance de nœud (même un simple `LienRapide` de 4 octets) occupera plus de 1 Ko sur la pile (Stack) à cause de la taille de la variante `ImageBrute`.

#### Objectifs :
1. Déclarez une énumération naïve nommée `NoeudNaif` et observez sa taille en mémoire à l'aide de la fonction `std::mem::size_of`.
2. Concevez une version optimisée nommée `NoeudOptimise` en appliquant le principe d'indirection (en utilisant un pointeur intelligent `Box`) pour déporter la charge utile volumineuse de l'image sur le tas (Heap).
3. Implémentez une fonction `afficher_resume(noeud: &NoeudOptimise)` qui extrait et affiche le chemin ou l'identifiant du nœud, peu importe sa variante.

---

### Indices
1. Pour mesurer la taille d'un type en octets : `std::mem::size_of::<MonType>()`.
2. Pour déplacer une donnée sur le tas, utilisez `Box::new(donnee)`. La taille d'un `Box` sur la pile est équivalente à la taille d'un pointeur (8 octets sur une architecture 64-bits).
3. Dans la variante optimisée, au lieu d'avoir `ImageBrute { chemin: String, pixels: [u8; 1024] }`, vous pouvez regrouper ces données dans une structure dédiée `DonneesImage` et stocker cette structure sous la forme `Box<DonneesImage>`.

---

### Correction Détaillée

```rust
use std::mem::size_of;

// --- 1. Approche Naïve (Gourmande en mémoire) ---
#[allow(dead_code)]
enum NoeudNaif {
    LienRapide(u32),
    FichierTexte { chemin: String, contenu: String },
    ImageBrute { chemin: String, pixels: [u8; 1024] }, // Cette variante pénalise tout le monde
}

// --- 2. Approche Optimisée (Utilisation de Box) ---

// Nous extrayons les données volumineuses dans une structure dédiée
#[derive(Debug)]
struct DonneesImage {
    chemin: String,
    pixels: [u8; 1024],
}

#[derive(Debug)]
enum NoeudOptimise {
    LienRapide(u32),
    FichierTexte { chemin: String, contenu: String },
    // L'image est maintenant stockée sur le tas (Heap).
    // La variante ne stocke plus qu'un pointeur Box (8 octets sur la Stack).
    ImageBrute(Box<DonneesImage>),
}

// --- 3. Implémentation de la fonction d'affichage ---
fn afficher_resume(noeud: &NoeudOptimise) {
    match noeud {
        NoeudOptimise::LienRapide(id) => {
            println!("Type : Lien Rapide | ID : {}", id);
        }
        NoeudOptimise::FichierTexte { chemin, contenu } => {
            println!("Type : Fichier Texte | Chemin : {} (Taille : {} caractères)", chemin, contenu.len());
        }
        // Destructuration à travers le Box
        NoeudOptimise::ImageBrute(donnees_image) => {
            println!(
                "Type : Image Brute | Chemin : {} (Taille de l'image : {} octets)",
                donnees_image.chemin,
                donnees_image.pixels.len()
            );
        }
    }
}

fn main() {
    // Comparaison des tailles en mémoire
    let taille_naive = size_of::<NoeudNaif>();
    let taille_optimisee = size_of::<NoeudOptimise>();

    println!("--- Analyse de l'empreinte mémoire ---");
    println!("Taille de NoeudNaif (sur la pile)     : {} octets", taille_naive);
    println!("Taille de NoeudOptimise (sur la pile) : {} octets", taille_optimisee);
    println!("Gain d'espace sur la pile             : {} %", (100 - (taille_optimisee * 100 / taille_naive)));

    println!("\n--- Utilisation du Noeud Optimisé ---");
    
    // Création d'un nœud image optimisé
    let image_sur_tas = Box::new(DonneesImage {
        chemin: String::from("/images/system_logo.raw"),
        pixels: [0u8; 1024], // Simulation de pixels vides
    });
    
    let noeud_image = NoeudOptimise::ImageBrute(image_sur_tas);
    let noeud_lien = NoeudOptimise::LienRapide(42);

    afficher_resume(&noeud_image);
    afficher_resume(&noeud_lien);
}
```

#### Analyse des résultats de l'exercice 3 :
* **NoeudNaif** pèse généralement autour de **1056 octets** sur la pile. Cela s'explique par la taille de la variante `ImageBrute` qui doit pouvoir contenir le tableau de 1024 octets ainsi que la structure `String` (24 octets) et le tag de l'énumération.
* **NoeudOptimise** ne pèse plus que **32 octets** sur la pile. Grâce à l'utilisation de `Box`, la charge utile de 1 Ko a été déplacée sur le tas. La pile reste propre, légère et rapide d'accès, évitant ainsi tout risque de dépassement de pile (*stack overflow*) lors de la manipulation de listes de nœuds.