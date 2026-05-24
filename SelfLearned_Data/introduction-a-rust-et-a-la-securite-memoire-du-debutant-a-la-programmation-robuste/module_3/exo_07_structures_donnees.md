# Exercices d'Application : Structures (Structs) : Organiser ses données proprement

Ce cahier d'exercices pratiques a pour but de consolider vos connaissances sur les structures en Rust. Vous progresserez de la manipulation de types simples (Tuple Structs) vers la gestion de la propriété (*ownership*) lors de la copie de structures, pour finir par la conception d'un système complet orienté objet (méthodes et mutabilité).

---

## Exercice 1 : Sécuriser les Mesures avec les Tuple Structs (Niveau : Facile)

### Énoncé
Dans les applications d'ingénierie, confondre les unités de mesure peut mener à des catastrophes (comme la perte de la sonde spatiale *Mars Climate Orbiter* due à une confusion entre les unités métriques et impériales). 

Vous devez concevoir un système de conversion de distance ultra-sécurisé en utilisant le pattern **Tuple Struct** (ou *Newtype*).

1. Créez deux structures tuples :
   * `Metre` qui enveloppe un `f64`.
   * `Pied` qui enveloppe un `f64`.
2. Implémentez une fonction classique (non associée) nommée `convertir_en_pieds` qui prend en paramètre une instance de `Metre` et retourne une instance de `Pied`.
   * *Règle de conversion :* $1 \text{ mètre} = 3.28084 \text{ pieds}$.
3. Dans votre fonction `main` :
   * Instanciez une distance de `10.0` mètres.
   * Convertissez-la en pieds à l'aide de votre fonction.
   * Affichez proprement le résultat.
   * Tentez de passer directement un `f64` brut à votre fonction de conversion pour observer comment le compilateur Rust protège votre code.

### Indices
1. Pour accéder à la valeur brute (`f64`) contenue dans une structure tuple, utilisez la notation pointée avec l'index de position : `ma_structure.0`.
2. Pour l'affichage, vous pouvez utiliser la déstructuration ou l'accès direct par index.

---

### Correction Détaillée

```rust
// Définition des structures tuples pour typer fortement nos unités
struct Metre(f64);
struct Pied(f64);

// Fonction de conversion prenant un type strict 'Metre' et retournant un 'Pied'
fn convertir_en_pieds(m: Metre) -> Pied {
    // On accède à la valeur f64 interne via .0
    let valeur_en_pieds = m.0 * 3.28084;
    Pied(valeur_en_pieds)
}

fn main() {
    // 1. Instanciation correcte
    let distance_metres = Metre(10.0);

    // 2. Conversion sécurisée
    let distance_pieds = convertir_en_pieds(distance_metres);

    // 3. Affichage du résultat
    println!("10.0 mètres équivalent à {:.4} pieds.", distance_pieds.0);

    // --- SÉCURITÉ DU TYPAGE ---
    // Si vous décommentez la ligne ci-dessous, le code refusera de compiler :
    // let erreur = convertir_en_pieds(10.0); 
    // Erreur : type attendu `Metre`, trouvé `f64`
    
    // De même, impossible de confondre un Pied et un Metre :
    // let autre_erreur = convertir_en_pieds(distance_pieds);
    // Erreur : type attendu `Metre`, trouvé `Pied`
}
```

---

## Exercice 2 : Clonage et Transfert de Propriété (Niveau : Moyen)

### Énoncé
Cet exercice vise à comprendre le comportement de l'opérateur de mise à jour de structure (`..`) face aux types de données qui n'implémentent pas le trait `Copy` (comme `String`).

1. Déclarez la structure suivante représentant un profil utilisateur :
   ```rust
   struct ProfilUtilisateur {
       pseudo: String,
       email: String,
       niveau: u32,
       actif: bool,
   }
   ```
2. Dans la fonction `main`, créez une instance nommée `user1` avec les données de votre choix.
3. Créez une seconde instance `user2` en utilisant la **syntaxe de mise à jour de structure** (`..user1`). `user2` doit avoir un nouvel `email` (ex: `"nouveau@email.com"`), mais conserver toutes les autres informations de `user1`.
4. Essayez d'afficher le `pseudo` de `user1` après la création de `user2`. Que se passe-t-il ? Pourquoi ?
5. Corrigez le code afin que `user1` reste pleinement utilisable après la création de `user2`.

### Indices
1. Le champ `pseudo` est de type `String` (qui n'est pas `Copy`). Lors de l'utilisation de `..user1`, la propriété de `user1.pseudo` est transférée (*moved*) à `user2`.
2. Pour éviter ce transfert de propriété, vous devez copier explicitement la donnée non-`Copy` en utilisant la méthode `.clone()`.

---

### Correction Détaillée

#### Étape 1 : Comprendre l'erreur de compilation (Scénario de départ)
Si vous tentez d'écrire ceci :

```rust
struct ProfilUtilisateur {
    pseudo: String,
    email: String,
    niveau: u32,
    actif: bool,
}

fn main() {
    let user1 = ProfilUtilisateur {
        pseudo: String::from("Alice"),
        email: String::from("alice@rust.org"),
        niveau: 42,
        actif: true,
    };

    // Utilisation de la syntaxe de mise à jour
    let user2 = ProfilUtilisateur {
        email: String::from("nouvel_alice@rust.org"),
        ..user1 // Déplace 'pseudo' de user1 vers user2 !
    };

    // ERREUR DE COMPILATION ICI :
    // println!("Pseudo de user1 : {}", user1.pseudo);
}
```
*Explication :* Le compilateur refuse de compiler car `user1.pseudo` a été déplacé dans `user2`. `user1` est désormais partiellement détruit.

#### Étape 2 : Résolution du problème
Pour corriger cela, nous devons cloner explicitement le champ `pseudo` afin que `user1` conserve sa propre version en mémoire.

```rust
#[derive(Debug)] // Pour pouvoir afficher nos structures facilement
struct ProfilUtilisateur {
    pseudo: String,
    email: String,
    niveau: u32,
    actif: bool,
}

fn main() {
    let user1 = ProfilUtilisateur {
        pseudo: String::from("Alice"),
        email: String::from("alice@rust.org"),
        niveau: 42,
        actif: true,
    };

    // Pour éviter le transfert de propriété de 'pseudo', 
    // nous l'instancions explicitement avec un clone de celui de user1.
    let user2 = ProfilUtilisateur {
        pseudo: user1.pseudo.clone(), // On duplique la String en mémoire heap
        email: String::from("nouvel_alice@rust.org"),
        ..user1 // Les champs restants (niveau, actif) sont Copy, donc copiés sans move !
    };

    // Maintenant, les deux structures sont parfaitement valides et utilisables !
    println!("User 1 : {} (Email: {})", user1.pseudo, user1.email);
    println!("User 2 : {} (Email: {})", user2.pseudo, user2.email);
    
    // Preuve de la mutabilité indépendante
    println!("\nStructure complète User 1 : {:?}", user1);
    println!("Structure complète User 2 : {:?}", user2);
}
```

---

## Exercice 3 : Simulateur de Compte Épargne (Niveau : Difficile)

### Énoncé
Vous devez concevoir un module de gestion financière modélisant un **Compte Épargne**.

1. Créez une structure `CompteEpargne` avec les champs suivants :
   * `titulaire` : `String`
   * `solde` : `f64`
   * `taux_interet` : `f64` (représenté sous forme décimale, ex: `0.02` pour 2%)

2. Implémentez un bloc `impl` contenant les fonctionnalités suivantes :
   * **Une fonction associée (constructeur)** `nouveau(titulaire: &str, depot_initial: f64, taux: f64) -> CompteEpargne`.
   * **Une méthode** `deposer(&mut self, montant: f64)` qui ajoute de l'argent au solde.
   * **Une méthode** `retirer(&mut self, montant: f64) -> Result<f64, String>` :
     * Si le solde est suffisant, elle déduit le montant et retourne le solde retiré enveloppé dans `Ok`.
     * Si le solde est insuffisant, elle ne modifie rien et retourne un message d'erreur enveloppé dans `Err`.
   * **Une méthode** `appliquer_interets(&mut self)` : calcule les intérêts sur le solde actuel et les ajoute directement au solde ($\text{intérêts} = \text{solde} \times \text{taux\_interet}$).
   * **Une méthode** `afficher_solde(&self)` : affiche un résumé du compte (Nom du titulaire, solde actuel et taux).

3. Écrivez un scénario dans votre fonction `main` pour tester l'ensemble de ces fonctionnalités (création, dépôt, retrait réussi, retrait refusé, application des intérêts et affichages).

### Indices
1. Pensez à utiliser `&mut self` lorsque la méthode doit modifier l'état interne de la structure (comme le solde), et `&self` lorsqu'elle doit simplement le lire.
2. Pour le constructeur, convertissez le paramètre `titulaire` de type `&str` en `String` à l'aide de `.to_string()`.

---

### Correction Détaillée

```rust
#[derive(Debug)]
struct CompteEpargne {
    titulaire: String,
    solde: f64,
    taux_interet: f64,
}

impl CompteEpargne {
    // 1. Constructeur
    fn nouveau(titulaire: &str, depot_initial: f64, taux: f64) -> CompteEpargne {
        CompteEpargne {
            titulaire: titulaire.to_string(),
            solde: depot_initial,
            taux_interet: taux,
        }
    }

    // 2. Méthode de dépôt (Modification de l'état -> &mut self)
    fn deposer(&mut self, montant: f64) {
        if montant > 0.0 {
            self.solde += montant;
            println!("Dépôt de {:.2} € effectué avec succès.", montant);
        } else {
            println!("Erreur : Le montant du dépôt doit être positif.");
        }
    }

    // 3. Méthode de retrait avec vérification de provision
    fn retirer(&mut self, montant: f64) -> Result<f64, String> {
        if montant <= 0.0 {
            return Err(String::from("Le montant du retrait doit être positif."));
        }
        
        if self.solde >= montant {
            self.solde -= montant;
            Ok(montant)
        } else {
            Err(format!(
                "Fonds insuffisants. Solde actuel : {:.2} €, Retrait demandé : {:.2} €",
                self.solde, montant
            ))
        }
    }

    // 4. Méthode d'application des intérêts capitalisés
    fn appliquer_interets(&mut self) {
        let interets = self.solde * self.taux_interet;
        self.solde += interets;
        println!(
            "Intérêts appliqués (+{:.2} € au taux de {:.1}%).",
            interets,
            self.taux_interet * 100.0
        );
    }

    // 5. Méthode de consultation (Lecture seule -> &self)
    fn afficher_solde(&self) {
        println!("========================================");
        println!("Titulaire du compte : {}", self.titulaire);
        println!("Solde actuel        : {:.2} €", self.solde);
        println!("Taux d'intérêt      : {:.2}%", self.taux_interet * 100.0);
        println!("========================================");
    }
}

fn main() {
    // Initialisation du compte (doit être mutable pour pouvoir faire des transactions)
    let mut mon_compte = CompteEpargne::nouveau("Jean Dupont", 1000.0, 0.03); // Taux à 3%

    // Affichage de départ
    mon_compte.afficher_solde();

    // Dépôt d'argent
    mon_compte.deposer(500.0);
    mon_compte.afficher_solde();

    // Tentative de retrait autorisé
    match mon_compte.retirer(300.0) {
        Ok(montant) => println!("Retrait de {:.2} € validé.", montant),
        Err(e) => println!("Erreur transactionnelle : {}", e),
    }
    mon_compte.afficher_solde();

    // Tentative de retrait refusé (fonds insuffisants)
    match mon_compte.retirer(2000.0) {
        Ok(montant) => println!("Retrait de {:.2} € validé.", montant),
        Err(e) => println!("Erreur transactionnelle : {}", e), // Ce cas sera exécuté
    }

    // Application des intérêts annuels
    mon_compte.appliquer_interets();
    mon_compte.afficher_solde();
}
```