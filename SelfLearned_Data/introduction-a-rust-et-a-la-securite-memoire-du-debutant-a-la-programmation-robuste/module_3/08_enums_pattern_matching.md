# Énumérations (Enums) et Pattern Matching : Le contrôle de flux infaillible

---

## 1. Introduction Conceptuelle

### Le problème des architectures d'états traditionnelles
Dans la majorité des langages de programmation traditionnels (comme le C, le C++ ou le Java pré-14), la gestion des états mutuellement exclusifs repose sur des mécanismes fragiles. Prenons l'exemple d'une connexion réseau qui peut être dans l'un des quatre états suivants : `Déconnecté`, `EnCoursDeConnexion`, `Connecté`, ou `Erreur`.

En C, un développeur représenterait généralement cela à l'aide d'une constante entière ou d'une énumération simple :

```c
// Exemple de conception fragile en C
typedef enum {
    STATE_DISCONNECTED,
    STATE_CONNECTING,
    STATE_CONNECTED,
    STATE_ERROR
} ConnectionState;

struct Connection {
    ConnectionState state;
    char* ip_address;      // Valide uniquement si CONNECTED ou CONNECTING
    int error_code;        // Valide uniquement si STATE_ERROR
};
```

Cette approche souffre de failles de sécurité et de conception majeures :
1. **Accès incohérent aux données** : Rien n'empêche un développeur d'accéder à `error_code` alors que l'état est `STATE_CONNECTED`. Cela peut retourner une valeur résiduelle de la mémoire (comportement indéfini ou bug logique).
2. **Oubli de cas (Switch incomplet)** : Si l'on ajoute un état `STATE_RECONNECTING`, le compilateur C n'obligera pas le développeur à mettre à jour tous les blocs `switch` du programme. Le comportement par défaut (`default`) sera exécuté, masquant potentiellement des bugs critiques.
3. **Pointeurs nuls** : L'adresse IP peut être un pointeur nul (`NULL`) dans l'état `STATE_DISCONNECTED`, obligeant à des vérifications manuelles constantes et sujettes à l'erreur.

### La philosophie de Rust : Rendre les états invalides impossibles à représenter
Rust résout ce problème à la racine en combinant deux concepts puissants : les **Énumérations avec données associées** (souvent appelées types de données algébriques) et le **Pattern Matching** (filtrage par motif) garanti par le compilateur.

En Rust, une énumération ne liste pas seulement des étiquettes numériques ; elle permet d'associer des structures de données spécifiques et distinctes à chaque variante. Si une donnée n'a de sens que dans un état précis, elle est physiquement encapsulée dans cet état. Il est impossible d'y accéder si l'on n'est pas dans cet état.

---

## 2. Fondations Théoriques

### Les Types de Données Algébriques (ADT)
Pour comprendre la puissance des énumérations en Rust, il faut faire un bref détour par la théorie des types. Les structures de données en Rust se divisent principalement en deux catégories d'ADT :

1. **Les Types Produits (Product Types)** : Ce sont les structures (`struct`) et les tuples. L'ensemble des valeurs possibles d'une structure est le produit cartésien des ensembles de valeurs de ses champs.
   $$\text{Taille de l'espace d'état} = \text{Taille}(Champ_1) \times \text{Taille}(Champ_2)$$
2. **Les Types Sommes (Sum Types)** : Ce sont les énumérations (`enum`). Une instance d'une énumération ne peut contenir qu'une seule variante à la fois. L'ensemble des valeurs possibles est la somme des ensembles de valeurs de chaque variante.
   $$\text{Taille de l'espace d'état} = \text{Taille}(Variante_1) + \text{Taille}(Variante_2)$$

Cette distinction est cruciale pour la sécurité mémoire : les types sommes permettent de restreindre l'espace d'état au strict minimum nécessaire, éliminant ainsi les combinaisons de variables d'état invalides.

### Représentation en mémoire (Layout)
Comment le compilateur Rust gère-t-il ces types sommes en mémoire sans perdre en performance ?

Une énumération Rust est stockée sous la forme d'un **tag** (ou discriminant) accompagné d'un **payload** (la charge utile contenant les données de la variante active).

```text
Représentation mémoire théorique d'une Enum :
+-------------------+---------------------------------------------+
| Tag (Discriminant)| Payload (Espace de la variante la plus large)|
| (1 à 8 octets)    | (Partagé par toutes les variantes)          |
+-------------------+---------------------------------------------+
```

* **Le Tag** : Un petit entier généré par le compilateur (généralement 1 octet si l'énumération a moins de 256 variantes) qui indique quelle variante est actuellement active.
* **Le Payload** : La taille de cet espace est égale à la taille de la variante la plus grande. Rust réutilise la même zone mémoire pour toutes les variantes (similaire à une `union` en C/C++), garantissant une utilisation optimale de la mémoire.

#### Optimisation de la niche (Null Pointer Optimization)
Rust applique une optimisation remarquable appelée *l'optimisation de la niche*. Si une variante contient un type qui ne peut pas être nul (comme une référence `&T` ou un type pointeur non nul), Rust utilise la valeur `0x0` (le pointeur nul) pour représenter une autre variante sans données (comme `None` dans l'énumération `Option` qui sera étudiée au Module 4). Dans ce cas, la taille de l'énumération est strictement identique à la taille de la référence, et le coût du tag est réduit à zéro.

---

## 3. Implémentation Pratique Pas-à-Pas

### Étape 1 : Déclaration d'une énumération simple et complexe
Créons un module de gestion de messages pour une application de messagerie.

```rust
// Une énumération représentant différents types d'actions utilisateur
enum Message {
    // Variante sans donnée (similaire à un enum traditionnel)
    Quit,
    // Variante contenant des données anonymes (Tuple Variant)
    Move { x: i32, y: i32 },
    // Variante contenant une chaîne de caractères dynamique
    Write(String),
    // Variante contenant une couleur au format RGB (trois u8)
    ChangeColor(u8, u8, u8),
}
```

### Étape 2 : Le contrôle de flux avec `match`
L'expression `match` est l'outil principal pour consommer une énumération. Contrairement au `switch` d'autres langages, `match` en Rust est une **expression** (elle retourne une valeur) et est **exhaustive** (le compilateur refuse la compilation si un cas est omis).

```rust
fn designer_action(message: Message) {
    match message {
        Message::Quit => {
            println!("L'utilisateur souhaite quitter.");
        }
        // Destructuration des champs nommés de la variante Move
        Message::Move { x, y } => {
            println!("Déplacement vers la position : x = {}, y = {}", x, y);
        }
        // Récupération de la String par propriété (ownership)
        Message::Write(texte) => {
            println!("Message écrit : {}", texte);
        }
        // Destructuration d'un tuple de données
        Message::ChangeColor(r, g, b) => {
            println!("Changement de couleur : Rouge={}, Vert={}, Bleu={}", r, g, b);
        }
    }
}
```

### Étape 3 : Les Gardes de Filtrage (Match Guards)
Il est possible d'ajouter des conditions supplémentaires à une branche de `match` à l'aide d'un garde (`if`).

```rust
fn filtrer_coordonnees(message: Message) {
    match message {
        // Le garde "if x == y" ajoute une condition logique au filtrage
        Message::Move { x, y } if x == y => {
            println!("Déplacement diagonal parfait sur l'axe : {}", x);
        }
        Message::Move { x, y } => {
            println!("Déplacement standard : x = {}, y = {}", x, y);
        }
        // Utilisation du motif de liaison '_' pour ignorer les autres variantes
        _ => println!("Autre action non liée à un déplacement."),
    }
}
```

### Étape 4 : La syntaxe concise `if let`
Lorsque vous ne souhaitez traiter qu'**une seule** variante spécifique d'une énumération et ignorer toutes les autres, l'utilisation de `match` peut s'avérer verbeuse. Rust propose la structure de contrôle `if let` pour ce cas d'usage précis.

```rust
fn verifier_si_ecriture(message: Message) {
    // if let prend un motif à gauche et une expression à droite
    if let Message::Write(contenu) = message {
        println!("Traitement rapide du texte : {}", contenu);
    } else {
        println!("Le message n'est pas un texte.");
    }
}
```

---

## 4. Pièges Fréquents et Bonnes Pratiques

### Piège 1 : L'abus du motif universel `_` (Wildcard)
Le motif `_` permet de capturer tous les cas non explicitement traités. Bien que pratique, son utilisation abusive détruit la sécurité apportée par l'exhaustivité du compilateur.

*Exemple à éviter :*
```rust
enum ModePaiement {
    CarteBancaire,
    Paypal,
    Virement, // Ajouté plus tard
}

fn traiter_paiement(mode: ModePaiement) {
    match mode {
        ModePaiement::CarteBancaire => println!("Traitement CB"),
        _ => println!("Autre mode de paiement"), // Dangereux !
    }
}
```
Si vous ajoutez `Virement` à l'énumération, le compilateur ne signalera aucune erreur car le virement sera capturé silencieusement par le `_`.
*Bonne pratique* : Épelez explicitement toutes les variantes autant que possible. N'utilisez `_` que si l'ensemble des cas futurs doit réellement subir le même traitement par défaut.

### Piège 2 : Le coût mémoire des variantes disproportionnées
Comme expliqué dans la section théorique, la taille d'une énumération en mémoire est calquée sur sa plus grande variante.

```rust
// Cette énumération pèse plus de 4096 octets en mémoire !
enum Fichier {
    Vide,
    PetitNom(String),
    ContenuBrut([u8; 4096]), // Cette variante force l'enum à être énorme
}
```
Chaque instance de `Fichier`, même si elle est `Fichier::Vide`, occupera plus de 4 Ko sur la pile (Stack).
*Bonne pratique* : Si une variante contient une structure de données volumineuse, utilisez l'indirection (comme un pointeur intelligent `Box`, qui sera étudié en détail dans les modules suivants) pour stocker la donnée sur le tas (Heap) et ne conserver qu'un pointeur (8 octets) dans l'énumération.

---

## 5. Synthèse Pédagogique

### Tableau Comparatif des Structures de Contrôle et de Données

| Concept | Usage Principal | Avantage Majeur | Inconvénient / Limite |
| :--- | :--- | :--- | :--- |
| **`Struct`** | Regrouper des données hétérogènes (Produit) | Accès direct aux champs | Impossible de représenter l'exclusion mutuelle proprement |
| **`Enum`** | Représenter des états exclusifs (Somme) | Typage fort, sécurité mémoire | Nécessite un filtrage pour accéder aux données |
| **`match`** | Traitement exhaustif de tous les cas | Garantie de compilation sans oubli | Syntaxe parfois verbeuse pour un cas unique |
| **`if let`** | Traitement d'un cas unique ciblé | Code concis et lisible | Ignore silencieusement les autres variantes |

### Points Clés à Retenir
* Les énumérations Rust sont des **types sommes** capables de transporter des données hétérogènes.
* Le compilateur garantit **l'exhaustivité** du filtrage par motif (`match`). Aucun cas ne peut être omis.
* Les données associées à une variante ne sont accessibles que si le motif correspond, éliminant les accès mémoire invalides.
* L'optimisation de la mémoire garantit que l'empreinte d'une énumération est minimale (taille de la variante maximale + tag).

---

## 6. Exercice Pratique d'Application

### Énoncé : Conception d'un automate de consigne automatique
Vous devez concevoir le logiciel de contrôle d'une consigne automatique de gare. Une consigne individuelle peut se trouver dans l'un des états suivants :
1. **Libre** (ne contient rien).
2. **Occupée** (contient un colis identifié par un code de suivi `String` et un poids `f64`).
3. **HorsService** (contient un motif de panne `String`).

Vous devez modéliser ces états à l'aide d'une énumération Rust, puis implémenter une fonction de transition de sécurité qui simule le dépôt d'un colis.

#### Spécifications :
* Créez l'énumération `EtatConsigne`.
* Créez une énumération `ResultatDepot` pour représenter l'issue de l'opération :
  * `Succes` (contenant le nouvel état de la consigne).
  * `ErreurRefusee` (si la consigne n'était pas libre ou était hors service, avec un message explicatif).
* Implémentez la fonction `deposer_colis(consigne_actuelle: EtatConsigne, code: String, poids: f64) -> ResultatDepot`.

### Indices pour la résolution
1. Rappelez-vous que pour extraire ou modifier l'état, vous devez utiliser un `match` sur `consigne_actuelle`.
2. Si la consigne est `Libre`, la transition doit retourner `ResultatDepot::Succes` contenant la consigne mise à jour en `Occupée` avec les données fournies.
3. Si la consigne est déjà occupée ou hors service, vous devez retourner `ResultatDepot::ErreurRefusee` avec une explication textuelle.

---

### Correction Complète et Commentée

Voici l'implémentation complète, robuste et fonctionnelle du problème :

```rust
// Définition des états possibles de la consigne
#[derive(Debug, Clone)]
enum EtatConsigne {
    Libre,
    Occupee { code_suivi: String, poids: f64 },
    HorsService(String),
}

// Définition des résultats possibles d'une tentative de dépôt
#[derive(Debug)]
enum ResultatDepot {
    Succes(EtatConsigne),
    ErreurRefusee(String),
}

/// Tente de déposer un colis dans la consigne donnée.
/// Cette fonction consomme l'ancien état et retourne le nouvel état ou une erreur.
fn deposer_colis(consigne_actuelle: EtatConsigne, code: String, poids: f64) -> ResultatDepot {
    match consigne_actuelle {
        // Cas nominal : la consigne est libre, on effectue la transition
        EtatConsigne::Libre => {
            let nouvel_etat = EtatConsigne::Occupee {
                code_suivi: code,
                poids,
            };
            ResultatDepot::Succes(nouvel_etat)
        }
        // Cas d'erreur : la consigne est déjà occupée, on refuse le dépôt
        EtatConsigne::Occupee { code_suivi, .. } => {
            ResultatDepot::ErreurRefusee(format!(
                "Opération rejetée : La consigne contient déjà le colis '{}'.",
                code_suivi
            ))
        }
        // Cas d'erreur : la consigne est en panne
        EtatConsigne::HorsService(raison) => {
            ResultatDepot::ErreurRefusee(format!(
                "Opération impossible : Consigne hors service pour la raison suivante : '{}'.",
                raison
            ))
        }
    }
}

fn main() {
    // Test 1 : Dépôt réussi dans une consigne libre
    let consigne_a = EtatConsigne::Libre;
    println!("--- Test 1 : Consigne Initiale Libre ---");
    match deposer_colis(consigne_a, String::from("FR-8892-XP"), 4.5) {
        ResultatDepot::Succes(nouvel_etat) => {
            println!("Dépôt réussi ! Nouvel état : {:?}", nouvel_etat);
        }
        ResultatDepot::ErreurRefusee(err) => {
            println!("Échec inattendu : {}", err);
        }
    }

    // Test 2 : Tentative de dépôt dans une consigne occupée
    println!("\n--- Test 2 : Consigne Déjà Occupée ---");
    let consigne_b = EtatConsigne::Occupee {
        code_suivi: String::from("DE-1120-LM"),
        poids: 12.8,
    };
    match deposer_colis(consigne_b, String::from("FR-8892-XP"), 2.0) {
        ResultatDepot::Succes(_) => {
            println!("Erreur de sécurité : Un colis a écrasé un autre colis !");
        }
        ResultatDepot::ErreurRefusee(err) => {
            println!("Refus sécurisé conforme : {}", err);
        }
    }
}
```

#### Explications de la correction :
1. **Sécurité d'accès** : Dans le cas `EtatConsigne::Occupee`, nous utilisons la syntaxe `..` pour ignorer le champ `poids` dont nous n'avons pas besoin pour formuler notre message d'erreur.
2. **Garantie de l'état** : Grâce au système d'ownership de Rust, la fonction `deposer_colis` consomme l'ancien état (`consigne_actuelle`). Il est donc impossible pour l'appelant d'utiliser accidentellement l'ancien état après une transition réussie, éliminant ainsi les bugs de double allocation ou de corruption d'état.