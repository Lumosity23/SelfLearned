# Exercices d'Application : Erreurs irrécupérables (panic!) vs Erreurs récupérables (le type Result)

Ce cahier d'exercices pratiques a pour objectif de consolider vos compétences sur la gestion des erreurs en Rust. Vous progresserez à travers trois exercices de difficulté croissante : de la manipulation simple de `Result` et des valeurs par défaut, jusqu'à la mise en place d'une architecture robuste alternant intelligemment entre `panic!` et `Result`.

---

## Exercice 1 : Le Configurateur de Serveur (unwrap_or et Result)
**Niveau : Facile**

### Énoncé
Dans cet exercice, vous devez concevoir un module de configuration pour un serveur web. Le programme doit lire une chaîne de caractères représentant la configuration du port d'écoute. 

Le format attendu est strictement `"PORT=valeur"`.

Vous devez écrire une fonction `extraire_port` qui analyse cette chaîne et gère les cas d'erreurs suivants de manière récupérable :
1. **Format invalide** : La chaîne ne commence pas par `"PORT="` ou ne contient pas de valeur après le signe `=`.
2. **Port invalide** : La valeur fournie n'est pas un entier valide ou dépasse les limites d'un port réseau standard (les ports valides vont de `1` à `65535`).

Dans votre fonction `main`, vous simulerez la lecture de plusieurs configurations et utiliserez la méthode `unwrap_or` pour garantir que le serveur démarre toujours sur le port par défaut `8080` en cas d'erreur de configuration, sans jamais faire planter l'application.

### Squelette de départ

```rust
#[derive(Debug, PartialEq)]
enum ErreurConfig {
    FormatInvalide,
    PortInvalide,
}

fn extraire_port(config: &str) -> Result<u16, ErreurConfig> {
    // À implémenter
    todo!()
}

fn main() {
    let configs_a_tester = vec![
        "PORT=443",
        "PORT=80a",
        "PORT=70000",
        "IP=127.0.0.1",
        "PORT=",
    ];

    let port_par_defaut = 8080;

    for config in configs_a_tester {
        // Appeler extraire_port et utiliser unwrap_or pour obtenir un port valide
        // Afficher le port final qui sera utilisé par le serveur
    }
}
```

### Indices
1. Pour vérifier si une chaîne commence par un motif et extraire le reste, vous pouvez utiliser la méthode `strip_prefix("PORT=")` qui renvoie un `Option<&str>`.
2. Pour convertir la chaîne extraite en nombre entier, utilisez `.parse::<u32>()` (ou directement `u16`). Si le parsing échoue ou si la valeur convertie sort de l'intervalle `[1, 65535]`, retournez une erreur appropriée.

---

### Correction Détaillée

```rust
#[derive(Debug, PartialEq)]
enum ErreurConfig {
    FormatInvalide,
    PortInvalide,
}

/// Analyse une chaîne de configuration pour en extraire le port réseau.
fn extraire_port(config: &str) -> Result<u16, ErreurConfig> {
    // 1. Extraction du préfixe "PORT="
    let valeur_str = match config.strip_prefix("PORT=") {
        Some(valeur) => valeur,
        None => return Err(ErreurConfig::FormatInvalide),
    };

    // Si la valeur après "PORT=" est vide
    if valeur_str.is_empty() {
        return Err(ErreurConfig::FormatInvalide);
    }

    // 2. Parsing de la valeur en entier (u32 pour éviter le débordement avant validation)
    let port_u32: u32 = match valeur_str.parse::<u32>() {
        Ok(valeur) => valeur,
        Err(_) => return Err(ErreurConfig::PortInvalide),
    };

    // 3. Validation de la plage du port (1 - 65535)
    if port_u32 >= 1 && port_u32 <= 65535 {
        Ok(port_u32 as u16)
    } else {
        Err(ErreurConfig::PortInvalide)
    }
}

fn main() {
    let configs_a_tester = vec![
        "PORT=443",
        "PORT=80a",
        "PORT=70000",
        "IP=127.0.0.1",
        "PORT=",
    ];

    let port_par_defaut = 8080;

    println!("--- Initialisation du Serveur ---");
    for config in configs_a_tester {
        let resultat = extraire_port(config);
        
        // Utilisation de unwrap_or pour appliquer la valeur de repli
        let port_final = resultat.unwrap_or(port_par_defaut);
        
        println!(
            "Entrée: {:<15} -> Résultat brut: {:<25} -> Port appliqué: {}",
            config,
            format!("{:?}", resultat),
            port_final
        );
    }
}
```

---

## Exercice 2 : Validation de Formulaire d'Inscription (Enchaînement avec `and_then`)
**Niveau : Moyen**

### Énoncé
Vous développez le système d'inscription d'une plateforme en ligne. Avant d'enregistrer un utilisateur en base de données, vous devez valider ses informations à travers une série de filtres.

Vous devez modéliser ce processus à l'aide de fonctions retournant des `Result` et les enchaîner de manière fluide grâce à la méthode `and_then`.

Voici les règles de validation :
1. **Validation du Pseudo** : Le pseudo ne doit pas être vide et doit faire moins de 10 caractères.
2. **Validation de l'Email** : L'email doit impérativement contenir le caractère `@`.

Vous devez implémenter :
* Une structure `Utilisateur` contenant les champs `pseudo` et `email`.
* Les fonctions de validation individuelles.
* Une fonction globale `creer_utilisateur(pseudo: &str, email: &str) -> Result<Utilisateur, &'static str>` qui enchaîne ces validations. Si toutes les étapes réussissent, elle retourne l'utilisateur créé.

### Squelette de départ

```rust
#[derive(Debug, PartialEq)]
struct Utilisateur {
    pseudo: String,
    email: String,
}

fn valider_pseudo(pseudo: &str) -> Result<&str, &'static str> {
    // À implémenter
    todo!()
}

fn valider_email(email: &str) -> Result<&str, &'static str> {
    // À implémenter
    todo!()
}

fn creer_utilisateur(pseudo: &str, email: &str) -> Result<Utilisateur, &'static str> {
    // À implémenter en utilisant `and_then`
    todo!()
}

fn main() {
    let test_1 = creer_utilisateur("Alice", "alice@rust.org");
    let test_2 = creer_utilisateur("", "bob@rust.org");
    let test_3 = creer_utilisateur("PseudoTropLong", "test@test.com");
    let test_4 = creer_utilisateur("Charlie", "charlie_at_rust.org");

    println!("Test 1 (Valide) : {:?}", test_1);
    println!("Test 2 (Pseudo vide) : {:?}", test_2);
    println!("Test 3 (Pseudo long) : {:?}", test_3);
    println!("Test 4 (Email invalide) : {:?}", test_4);
}
```

### Indices
1. La méthode `and_then` prend une fermeture (closure) en paramètre. Elle s'applique sur un `Result` et, si ce dernier est `Ok(valeur)`, elle passe cette `valeur` à la fonction suivante.
2. Pour `creer_utilisateur`, vous pouvez valider le pseudo, enchaîner avec `and_then` pour valider l'email, et enfin construire la structure `Utilisateur` dans un bloc `Ok` final.

---

### Correction Détaillée

```rust
#[derive(Debug, PartialEq)]
struct Utilisateur {
    pseudo: String,
    email: String,
}

/// Valide la longueur du pseudonyme.
fn valider_pseudo(pseudo: &str) -> Result<&str, &'static str> {
    if pseudo.is_empty() {
        Err("Le pseudo ne peut pas être vide")
    } else if pseudo.len() > 10 {
        Err("Le pseudo est trop long (max 10 caractères)")
    } else {
        Ok(pseudo)
    }
}

/// Valide la présence d'un caractère '@' dans l'email.
fn valider_email(email: &str) -> Result<&str, &'static str> {
    if email.contains('@') {
        Ok(email)
    } else {
        Err("L'adresse email est invalide (manque '@')")
    }
}

/// Enchaîne les validations et construit l'utilisateur si tout est valide.
fn creer_utilisateur(pseudo: &str, email: &str) -> Result<Utilisateur, &'static str> {
    // Enchaînement fonctionnel avec and_then
    valider_pseudo(pseudo).and_then(|pseudo_valide| {
        valider_email(email).map(|email_valide| {
            Utilisateur {
                pseudo: pseudo_valide.to_string(),
                email: email_valide.to_string(),
            }
        })
    })
}

fn main() {
    let test_1 = creer_utilisateur("Alice", "alice@rust.org");
    let test_2 = creer_utilisateur("", "bob@rust.org");
    let test_3 = creer_utilisateur("PseudoTropLong", "test@test.com");
    let test_4 = creer_utilisateur("Charlie", "charlie_at_rust.org");

    // Assertions pour valider le comportement du code
    assert!(test_1.is_ok());
    assert_eq!(test_2, Err("Le pseudo ne peut pas être vide"));
    assert_eq!(test_3, Err("Le pseudo est trop long (max 10 caractères)"));
    assert_eq!(test_4, Err("L'adresse email est invalide (manque '@')"));

    println!("Tous les tests de validation ont réussi !");
    println!("Utilisateur créé avec succès : {:?}", test_1.unwrap());
}
```

---

## Exercice 3 : Le Système Bancaire (panic! vs Result)
**Niveau : Difficile / Synthèse**

### Énoncé
Vous devez concevoir le moteur d'exécution des transactions d'une banque. Ce système doit faire la distinction absolue entre :
* **Les erreurs opérationnelles (récupérables)** : Un client tente de retirer plus d'argent qu'il n'en possède, ou demande un retrait négatif. Ces actions doivent retourner un `Result::Err` pour que l'application puisse en informer l'utilisateur sans s'arrêter.
* **Les violations d'invariants système (irrécupérables)** : Le solde d'un compte devient mathématiquement impossible (valeur `NaN` - *Not a Number*), ou l'identifiant interne de la banque est corrompu (chaîne vide). Ces situations indiquent un bug logique majeur ou une corruption mémoire. Le système doit immédiatement déclencher un `panic!` pour empêcher toute corruption de la base de données globale.

### Spécifications de l'implémentation
1. Créez une structure `CompteBancaire` avec un `id` (`String`) et un `solde` (`f64`).
2. Implémentez la méthode `retirer(&mut self, montant: f64) -> Result<f64, &'static str>` :
   * Si le montant est négatif ou nul, retourner une erreur.
   * Si le solde est insuffisant, retourner une erreur.
   * Si le solde actuel ou le montant est `NaN` (utilisez la méthode `.is_nan()`), déclenchez un `panic!`.
   * Sinon, déduisez le montant et retournez le nouveau solde dans `Ok`.
3. Implémentez une méthode de maintenance `auditer_coherence(&self)` :
   * Si l'identifiant `id` est vide ou si le solde est `NaN`, déclenchez un `panic!` avec un message explicite.

### Squelette de départ

```rust
struct CompteBancaire {
    id: String,
    solde: f64,
}

impl CompteBancaire {
    fn nouveau(id: &str, solde_initial: f64) -> Self {
        // Pensez à vérifier la cohérence dès la création !
        todo!()
    }

    fn retirer(&mut self, montant: f64) -> Result<f64, &'static str> {
        todo!()
    }

    fn auditer_coherence(&self) {
        todo!()
    }
}

fn main() {
    // 1. Test des cas récupérables
    let mut compte = CompteBancaire::nouveau("FR76-1234", 500.0);
    
    // Tenter de retirer trop d'argent
    // Tenter de retirer un montant négatif

    // 2. Test d'un cas irrécupérable (décommenter pour observer la panique)
    // let mut compte_corrompu = CompteBancaire::nouveau("", 100.0); // Doit paniquer
}
```

### Indices
1. Pour tester si un nombre flottant est invalide (`NaN`), utilisez la méthode intégrée de Rust : `valeur.is_nan()`.
2. Rappelez-vous la règle d'or : un solde insuffisant est une erreur utilisateur normale (`Result`), tandis qu'un identifiant vide ou une valeur `NaN` est une anomalie système qui ne devrait jamais se produire dans un code correct (`panic!`).

---

### Correction Détaillée

```rust
#[derive(Debug)]
struct CompteBancaire {
    id: String,
    solde: f64,
}

impl CompteBancaire {
    /// Crée un nouveau compte bancaire avec validation stricte des invariants système.
    fn nouveau(id: &str, solde_initial: f64) -> Self {
        if id.trim().is_empty() {
            panic!("ERREUR SYSTÈME : Tentative de création d'un compte avec un identifiant vide !");
        }
        if solde_initial.is_nan() {
            panic!("ERREUR SYSTÈME : Le solde initial ne peut pas être NaN !");
        }

        CompteBancaire {
            id: id.to_string(),
            solde: solde_initial,
        }
    }

    /// Effectue un retrait. Retourne une erreur récupérable si l'opération est invalide,
    /// mais panique si le système est dans un état incohérent.
    fn retirer(&mut self, montant: f64) -> Result<f64, &'static str> {
        // 1. Détection des corruptions système (Irrécupérable)
        if self.solde.is_nan() || montant.is_nan() {
            panic!(
                "CRITICAL: Valeur NaN détectée lors du retrait sur le compte {}. Solde: {}, Montant: {}",
                self.id, self.solde, montant
            );
        }

        // 2. Détection des erreurs d'utilisation (Récupérable)
        if montant <= 0.0 {
            return Err("Le montant du retrait doit être strictement positif.");
        }

        if montant > self.solde {
            return Err("Solde insuffisant pour effectuer cette opération.");
        }

        // 3. Application de l'état nominal
        self.solde -= montant;
        Ok(self.solde)
    }

    /// Vérifie la validité des invariants de la structure.
    /// Doit être appelé périodiquement ou lors des audits de sécurité.
    fn auditer_coherence(&self) {
        if self.id.is_empty() {
            panic!("CORRUPTION DONNÉES : Identifiant de compte manquant !");
        }
        if self.solde.is_nan() {
            panic!("CORRUPTION DONNÉES : Solde corrompu (NaN) sur le compte {} !", self.id);
        }
    }
}

fn main() {
    println!("--- Initialisation du système bancaire ---");

    // Création d'un compte valide
    let mut compte = CompteBancaire::nouveau("FR-89234", 1000.0);
    println!("Compte créé avec succès : {:?}", compte);

    // --- CAS RÉCUPÉRABLES ---
    println!("\n--- Phase de test des opérations clients ---");

    // Retrait excessif
    match compte.retirer(1500.0) {
        Ok(nouveau_solde) => println!("Retrait réussi ! Nouveau solde : {} €", nouveau_solde),
        Err(e) => println!("Refus opérationnel (Attendu) : {}", e),
    }

    // Retrait négatif
    match compte.retirer(-50.0) {
        Ok(nouveau_solde) => println!("Retrait réussi ! Nouveau solde : {} €", nouveau_solde),
        Err(e) => println!("Refus opérationnel (Attendu) : {}", e),
    }

    // Retrait valide
    match compte.retirer(200.0) {
        Ok(nouveau_solde) => println!("Retrait réussi (Nominal) ! Nouveau solde : {} €", nouveau_solde),
        Err(e) => println!("Échec inattendu : {}", e),
    }

    // Audit de routine
    compte.auditer_coherence();
    println!("Audit de cohérence : OK.");

    // --- CAS IRRÉCUPÉRABLES (PANIC) ---
    // Pour tester la panique système, décommentez l'une des lignes ci-dessous :
    
    println!("\n--- Déclenchement d'une panique de sécurité ---");
    
    // Déclencheur 1 : Création d'un compte invalide
    // let _compte_anonyme = CompteBancaire::nouveau("", 500.0);

    // Déclencheur 2 : Injection d'une valeur corrompue (NaN)
    let montant_corrompu = f64::NAN;
    let _ = compte.retirer(montant_corrompu);
}
```