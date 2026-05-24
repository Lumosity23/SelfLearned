# Erreurs irrécupérables (panic!) vs Erreurs récupérables (le type Result)

Dans les modules précédents, nous avons exploré comment Rust garantit la sécurité mémoire au niveau matériel grâce à l'ownership (Module 2) et comment structurer des données complexes (Module 3). Cependant, un logiciel robuste ne se contente pas de gérer correctement sa mémoire en situation nominale : il doit également réagir de manière prévisible et sécurisée face à l'imprévu.

La gestion des erreurs est l'un des piliers majeurs de la philosophie de Rust. Contrairement à de nombreux langages de programmation qui reposent sur un mécanisme unique d'exceptions, Rust sépare fondamentalement les erreurs en deux catégories distinctes : les **erreurs irrécupérables** et les **erreurs récupérables**. 

Ce chapitre détaille cette dualité conceptuelle, analyse les mécanismes internes de ces deux approches et fournit les clés méthodologiques pour concevoir des applications hautement résilientes.

---

## 1. Introduction Conceptuelle

### Le problème des exceptions traditionnelles
Dans des langages comme Java, C++ ou Python, la gestion des erreurs repose principalement sur la levée et la capture d'exceptions (`try-catch` ou `try-except`). Bien que populaire, cette approche présente plusieurs inconvénients majeurs du point de vue de la sécurité et de la clarté du code :

1. **Invisibilité à la signature des fonctions** : Rien dans la signature d'une fonction classique ne force un développeur à savoir qu'une exception peut être levée, à moins de lire la documentation ou le code source de la fonction appelée.
2. **Rupture invisible du flux d'exécution** : Une exception remonte la pile d'appels de manière invisible, ce qui rend difficile le raisonnement sur l'état des variables et peut introduire des bugs subtils si des ressources ne sont pas correctement libérées.
3. **Surcharge cognitive et oublis** : Il est facile d'oublier de capturer une exception, ce qui mène à des plantages inattendus en production.

### La philosophie de Rust : L'explicabilité avant tout
Rust fait un choix radicalement différent. Il n'existe pas d'exceptions traditionnelles. À la place, Rust sépare les erreurs selon leur nature :

```
                        ┌─────────────────────────────────┐
                        │      Une erreur survient        │
                        └────────────────┬────────────────┘
                                         │
                ┌────────────────────────┴────────────────────────┐
                ▼                                                 ▼
     [ Erreur Irrécupérable ]                          [ Erreur Récupérable ]
  - Bug logique, invariant violé                    - Fichier manquant, timeout réseau
  - Impossible de continuer sainement               - Situation attendue et gérable
  - Action : Arrêt immédiat (panic!)                - Action : Retourner un type Result
```

* **Les erreurs irrécupérables** : Ce sont des situations qui traduisent un bug logique dans le programme (ex. accès hors des limites d'un tableau, division par zéro). Le programme est dans un état corrompu et ne peut pas continuer à s'exécuter en toute sécurité. La seule réponse saine est l'arrêt immédiat du programme via le mécanisme de `panic!`.
* **Les erreurs récupérables** : Ce sont des situations où l'échec est une issue normale et prévisible de l'opération (ex. un fichier introuvable lors d'une ouverture, une déconnexion réseau temporaire). Le programme doit être capable de traiter cet échec et de poursuivre son exécution. Rust utilise ici un type de retour explicite : l'énumération `Result<T, E>`.

---

## 2. Fondations Théoriques

### 2.1 Le mécanisme de `panic!`

Lorsqu'une erreur irrécupérable se produit, Rust déclenche une panique (`panic`). Ce processus effectue plusieurs actions critiques pour préserver l'intégrité du système.

#### Unwinding (Dépilage) vs Aborting (Arrêt brutal)
Par défaut, lorsqu'une panique se produit, Rust commence l'**unwinding** (le dépilage). Le programme remonte la pile d'exécution (stack) et libère la mémoire de chaque fonction en appelant les destructeurs (`drop`) de toutes les variables locales encore actives. Cela garantit qu'aucune ressource (fichiers, sockets, mémoire du tas) n'est laissée dans un état instable.

Cependant, ce dépilage a un coût en taille de binaire et en performance. Dans les systèmes embarqués ou les applications à haute performance, il est possible de configurer Rust pour qu'il effectue un **abort** (arrêt immédiat). Le programme s'arrête alors instantanément sans nettoyer la pile, laissant le système d'exploitation récupérer les ressources.

Pour configurer l'arrêt immédiat en cas de panique, on modifie le fichier `Cargo.toml` :

```toml
[profile.release]
panic = "abort"
```

#### Les Backtraces
Pour diagnostiquer l'origine d'une panique, Rust permet d'afficher la pile d'appels (backtrace). Par défaut, pour des raisons de performance, les backtraces sont désactivées. On les active en définissant la variable d'environnement `RUST_BACKTRACE=1` dans le terminal avant de lancer l'exécutable.

---

### 2.2 L'énumération `Result<T, E>`

Pour les erreurs récupérables, Rust utilise la puissance de son système de types, et plus particulièrement des énumérations (étudiées au Module 3.2). Le type `Result` est défini dans la bibliothèque standard de la manière suivante :

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

Ce type utilise la généricité (qui sera approfondie dans les modules ultérieurs) :
* `T` représente le type de la valeur retournée en cas de succès (`Ok`).
* `E` représente le type de l'erreur retournée en cas d'échec (`Err`).

#### Pourquoi ce système est-il ultra-sécurisé ?
Contrairement aux langages où une fonction peut renvoyer une valeur *ou* lever une exception en secret, une fonction Rust qui peut échouer **doit** retourner un type `Result`. 

Le compilateur Rust applique une règle stricte : **vous ne pouvez pas accéder à la valeur de type `T` sans inspecter explicitement le `Result`**. Si vous tentez d'ignorer le résultat d'une fonction retournant un `Result`, le compilateur générera un avertissement (*warning*) très sévère (`unused_must_use`). Cela élimine par construction le risque d'ignorer accidentellement une erreur.

---

## 3. Implémentation Pratique Pas-à-Pas

### 3.1 Déclencher et analyser une panique (`panic!`)

Commençons par observer le comportement d'une panique provoquée manuellement ou par une erreur d'exécution.

```rust
fn verifier_age(age: i32) {
    if age < 0 {
        // Déclenchement explicite d'une panique
        panic!("L'âge ne peut pas être négatif ! Valeur reçue : {}", age);
    }
    println!("Âge valide : {}", age);
}

fn main() {
    println!("Début du programme.");
    verifier_age(-5);
    println!("Cette ligne ne sera jamais exécutée.");
}
```

**Sortie attendue dans la console :**
```text
Début du programme.
thread 'main' panicked at 'L'âge ne peut pas être négatif ! Valeur reçue : -5', src/main.rs:4:9
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

---

### 3.2 Manipuler `Result` avec le Pattern Matching

Le moyen le plus fondamental et le plus sûr de traiter un `Result` est d'utiliser le filtrage par motif (`match`), que nous avons étudié au Module 3.2.

Voici un exemple complet simulant la division de deux nombres réels, où la division par zéro est traitée comme une erreur récupérable.

```rust
// Définition d'un type d'erreur personnalisé sous forme d'énumération
#[derive(Debug, PartialEq)]
enum ErreurMathematique {
    DivisionParZero,
}

// La fonction retourne un Result. 
// En cas de succès, elle contient un f64. En cas d'erreur, elle contient notre énumération.
fn diviser(numerateur: f64, denominateur: f64) -> Result<f64, ErreurMathematique> {
    if denominateur == 0.0 {
        Err(ErreurMathematique::DivisionParZero)
    } else {
        Ok(numerateur / denominateur)
    }
}

fn main() {
    let cas_succes = diviser(10.0, 2.0);
    let cas_erreur = diviser(5.0, 0.0);

    // Traitement du cas de succès
    match cas_succes {
        Ok(valeur) => println!("Succès ! Le résultat est : {}", valeur),
        Err(e) => println!("Erreur rencontrée : {:?}", e),
    }

    // Traitement du cas d'erreur
    match cas_erreur {
        Ok(valeur) => println!("Succès ! Le résultat est : {}", valeur),
        Err(ErreurMathematique::DivisionParZero) => {
            println!("Erreur : Impossible de diviser par zéro !");
        }
    }
}
```

---

### 3.3 Les méthodes utilitaires de `Result`

Écrire un bloc `match` complet peut parfois s'avérer verbeux. La bibliothèque standard de Rust fournit plusieurs méthodes pratiques pour manipuler les `Result` de manière plus concise.

#### 1. `unwrap()` et `expect()` : Les raccourcis risqués
Ces méthodes extraient la valeur contenue dans `Ok`. Cependant, **si le résultat est un `Err`, le programme panique immédiatement**.

```rust
let resultat_ok: Result<i32, &str> = Ok(42);
let valeur = resultat_ok.unwrap(); // Retourne 42

let resultat_err: Result<i32, &str> = Err("Une erreur critique");
// resultat_err.unwrap(); // ! FERA PANIQUER LE PROGRAMME !

// expect() permet de personnaliser le message de panique
// resultat_err.expect("Le chargement de la configuration a échoué"); 
```

#### 2. `unwrap_or()` : La valeur par défaut sécurisée
Cette méthode permet de fournir une valeur de repli en cas d'erreur, évitant ainsi toute panique.

```rust
let port_serveur: Result<u16, &str> = Err("Port invalide");
// Si erreur, on utilise le port par défaut 8080
let port = port_serveur.unwrap_or(8080); 
println!("Connexion sur le port : {}", port); // Affiche 8080
```

#### 3. `and_then()` : Enchaîner les opérations (Monades)
`and_then` permet de passer le contenu d'un `Ok` à une autre fonction qui retourne elle-même un `Result`. Si le premier `Result` est un `Err`, l'enchaînement s'arrête et l'erreur est propagée.

```rust
fn verifier_format(entree: &str) -> Result<i32, &str> {
    entree.parse::<i32>().map_err(|_| "Ce n'est pas un nombre valide")
}

fn verifier_positif(nombre: i32) -> Result<i32, &str> {
    if nombre >= 0 {
        Ok(nombre)
    } else {
        Err("Le nombre doit être positif")
    }
}

fn main() {
    let entree_utilisateur = "42";
    
    // Enchaînement des vérifications
    let resultat: Result<i32, &str> = verifier_format(entree_utilisateur)
        .and_then(verifier_positif);

    match resultat {
        Ok(n) => println!("Nombre validé : {}", n),
        Err(msg) => println!("Validation échouée : {}", msg),
    }
}
```

> **Note sur la propagation d'erreurs :** Rust dispose également d'un opérateur extrêmement puissant, l'opérateur point d'interrogation (`?`), dédié à la propagation simplifiée des erreurs. Ce mécanisme fondamental fera l'objet d'une étude exhaustive et dédiée dans le **Module 4.3**.

---

## 4. Pièges Fréquents et Bonnes Pratiques

### 4.1 L'abus de `unwrap()` (L'anti-pattern absolu)
L'utilisation systématique de `.unwrap()` est l'erreur la plus fréquente chez les débutants en Rust. Elle réintroduit le risque de plantages soudains à l'exécution, annulant ainsi les garanties de robustesse offertes par le langage.

**Règle d'or :**
* N'utilisez `unwrap()` que dans les **tests unitaires**, les **prototypes rapides**, ou lorsque vous pouvez prouver mathématiquement au compilateur que l'erreur est impossible (ex. parser une chaîne de caractères codée en dur dont vous êtes absolument sûr du format).
* Dans le code de production, préférez toujours `match`, `unwrap_or()`, ou la propagation d'erreurs.

### 4.2 Quand utiliser `panic!` plutôt que `Result` ?

| Situation | Choix recommandé | Justification |
| :--- | :--- | :--- |
| **Erreur de saisie utilisateur** | `Result` | L'utilisateur fait des erreurs fréquemment. Le programme doit lui demander de corriger sa saisie sans planter. |
| **Échec de connexion réseau** | `Result` | Le réseau est intrinsèquement instable. C'est un événement externe attendu. |
| **Violation d'un invariant interne** | `panic!` | Si l'état interne de votre structure de données est corrompu, continuer l'exécution pourrait corrompre la mémoire ou corrompre la base de données. |
| **Échec d'un test unitaire** | `panic!` | Un test doit échouer de manière visible et immédiate pour signaler un bug. |
| **Ressource système critique manquante** | `panic!` ou `Result` | Si l'application ne peut absolument pas démarrer sans un fichier de configuration central, une panique propre au démarrage est acceptable. |

### 4.3 Impact sur les performances
Contrairement aux exceptions dans d'autres langages qui nécessitent la création d'une pile d'appels complexe et coûteuse dès qu'elles sont levées, le type `Result` de Rust n'a **aucun coût caché**. 

Lorsqu'une fonction retourne un `Result`, elle retourne simplement une valeur d'énumération contenant soit la donnée, soit l'erreur. Si vous n'utilisez pas le mécanisme de panique, la gestion des erreurs en Rust est aussi rapide qu'un simple retour de structure en C.

---

## 5. Synthèse Pédagogique

| Caractéristique | Erreur Irrécupérable (`panic!`) | Erreur Récupérable (`Result<T, E>`) |
| :--- | :--- | :--- |
| **Concept** | Bug logique, état impossible à gérer. | Événement attendu qui peut échouer. |
| **Mécanisme technique** | Dépilage de la pile (unwinding) ou arrêt immédiat (abort). | Retour d'une énumération (`Ok` ou `Err`). |
| **Impact sur le programme** | Arrêt immédiat du thread ou du processus. | Le programme continue, l'appelant gère l'erreur. |
| **Outils de manipulation** | Macro `panic!`, `unwrap()`, `expect()`. | `match`, `unwrap_or()`, combinateurs (`and_then`). |
| **Usage type** | Indice hors limites, division par zéro, assertions de test. | Fichier introuvable, erreur de parsing, timeout. |

---

## 6. Exercice Pratique d'Application

### Énoncé : Le Système de Contrôle de Température d'un Réacteur

Vous devez concevoir le logiciel de surveillance d'un réacteur chimique. Le système lit des chaînes de caractères brutes provenant de capteurs thermiques. 

Une chaîne de capteur valide respecte le format suivant : `"ID_CAPTEUR:TEMPERATURE"`.
Exemple : `"sensor_01:45.2"` ou `"sensor_02:-12.5"`.

Vous devez écrire une fonction de traitement qui analyse cette chaîne et applique les règles de sécurité suivantes :

1. **Erreur de format (Récupérable)** : Si la chaîne ne contient pas de séparateur `:` ou si la température n'est pas un nombre valide, la fonction doit retourner une erreur de format.
2. **Température hors limites physiques (Récupérable)** : La température mesurée ne peut pas être inférieure au zéro absolu ($-273.15^\circ\text{C}$). Si c'est le cas, la fonction doit retourner une erreur de valeur incohérente.
3. **Erreur critique de sécurité (Irrécupérable)** : Si l'identifiant du capteur est `"CRITICAL_FAIL"`, cela signifie que le matériel est en train de fondre. Le système doit immédiatement paniquer pour couper les vannes d'alimentation du réacteur.

### Squelette de départ

```rust
#[derive(Debug, PartialEq)]
enum ErreurCapteur {
    FormatInvalide,
    TemperatureIncoherente,
}

struct Lecture {
    id: String,
    temperature: f64,
}

// À implémenter
fn analyser_lecture(donnee_brute: &str) -> Result<Lecture, ErreurCapteur> {
    // Votre code ici
    todo!()
}
```

### Indices pour la résolution
1. Utilisez la méthode `split_once(':')` disponible sur les chaînes de caractères (`&str`) pour séparer l'identifiant de la température.
2. Pour convertir la température de `&str` vers `f64`, utilisez la méthode `.parse::<f64>()`. Cette méthode retourne un `Result`, que vous pouvez inspecter ou convertir.
3. Utilisez le filtrage par motif (`match`) pour valider l'identifiant avant de faire d'autres vérifications.

---

### Correction Complète et Commentée

Voici l'implémentation robuste et conforme aux standards de production de Rust :

```rust
#[derive(Debug, PartialEq)]
enum ErreurCapteur {
    FormatInvalide,
    TemperatureIncoherente,
}

#[derive(Debug, PartialEq)]
struct Lecture {
    id: String,
    temperature: f64,
}

/// Analyse la lecture brute d'un capteur et applique les règles de sécurité.
fn analyser_lecture(donnee_brute: &str) -> Result<Lecture, ErreurCapteur> {
    // 1. Découpage de la chaîne sur le caractère ':'
    let (id_str, temp_str) = match donnee_brute.split_once(':') {
        Some((id, temp)) => (id, temp),
        None => return Err(ErreurCapteur::FormatInvalide),
    };

    // 2. Vérification de l'erreur critique de sécurité (Matériel en panne)
    if id_str == "CRITICAL_FAIL" {
        panic!("URGENCE ABSOLUE : Défaillance critique du capteur détectée ! Arrêt d'urgence du réacteur !");
    }

    // 3. Conversion de la température en f64
    let temp_valeur: f64 = match temp_str.trim().parse::<f64>() {
        Ok(valeur) => valeur,
        Err(_) => return Err(ErreurCapteur::FormatInvalide),
    };

    // 4. Validation physique de la température (Zéro absolu)
    if temp_valeur < -273.15 {
        return Err(ErreurCapteur::TemperatureIncoherente);
    }

    // 5. Tout est correct, on retourne la structure encapsulée dans Ok
    Ok(Lecture {
        id: id_str.to_string(),
        temperature: temp_valeur,
    })
}

fn main() {
    println!("--- Début des tests du système de surveillance ---");

    // Test 1 : Cas nominal de succès
    let lecture_valide = "sensor_01:23.8";
    match analyser_lecture(lecture_valide) {
        Ok(lecture) => println!("Succès - Capteur: {}, Température: {}°C", lecture.id, lecture.temperature),
        Err(e) => println!("Échec inattendu : {:?}", e),
    }

    // Test 2 : Erreur de format (pas de ':')
    let lecture_incorrecte = "sensor_02_sans_separateur";
    assert_eq!(analyser_lecture(lecture_incorrecte), Err(ErreurCapteur::FormatInvalide));
    println!("Test Erreur de Format : Réussi (Erreur détectée proprement)");

    // Test 3 : Erreur de température incohérente (sous le zéro absolu)
    let lecture_impossible = "sensor_03:-300.0";
    assert_eq!(analyser_lecture(lecture_impossible), Err(ErreurCapteur::TemperatureIncoherente));
    println!("Test Température Incohérente : Réussi (Erreur détectée proprement)");

    // Test 4 : Erreur de parsing de la température
    let lecture_lettres = "sensor_04:chaud";
    assert_eq!(analyser_lecture(lecture_lettres), Err(ErreurCapteur::FormatInvalide));
    println!("Test Parsing Température : Réussi (Erreur détectée proprement)");

    // Test 5 : Cas critique (Déclenchement de la panique)
    println!("\nTentative de traitement d'un signal critique (devrait paniquer) :");
    let signal_critique = "CRITICAL_FAIL:999.9";
    analyser_lecture(signal_critique); 
    
    // Cette ligne ne sera jamais atteinte
    println!("Ce message ne doit pas s'afficher.");
}
```