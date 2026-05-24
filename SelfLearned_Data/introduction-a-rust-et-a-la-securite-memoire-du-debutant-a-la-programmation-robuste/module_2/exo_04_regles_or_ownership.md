# Exercices d'Application : Les trois règles d'or de l'Ownership

Ce cahier d'exercices pratiques a pour objectif de consolider votre compréhension des mécanismes d'Ownership (propriété), de Move (déplacement), de Copy (copie) et de gestion de la portée (Scope) en Rust, sans utiliser les références (qui seront abordées au module suivant).

---

## Exercice 1 : Le Diagnostic de Capteur (Niveau : Facile)

### Énoncé
Dans une usine connectée, vous devez concevoir un module de diagnostic pour un capteur de température. 
Chaque capteur possède un **identifiant numérique** (type `i32`) et un **nom de modèle** (type `String`).

Le code suivant a été écrit par un stagiaire, mais il refuse obstinément de compiler. Votre tâche est d'analyser l'erreur, d'expliquer pourquoi elle se produit en vous basant sur les Règles d'Or de l'Ownership, puis de corriger le code de deux manières différentes.

```rust
fn main() {
    let id_capteur = 1042;
    let modele_capteur = String::from("TempSense-X1");

    // Envoi des données au système de log
    enregistrer_id(id_capteur);
    enregistrer_modele(modele_capteur);

    // Tentative de réutilisation des variables pour un second rapport
    println!("--- RAPPORT DE VÉRIFICATION ---");
    println!("ID Capteur : {}", id_capteur);
    println!("Modèle     : {}", modele_capteur);
}

fn enregistrer_id(id: i32) {
    println!("[LOG] ID enregistré : {}", id);
}

fn enregistrer_modele(modele: String) {
    println!("[LOG] Modèle enregistré : {}", modele);
}
```

### Indices
1. Observez attentivement les types de `id_capteur` et `modele_capteur`. L'un d'eux est stocké sur la Pile et implémente le trait `Copy`, tandis que l'autre est stocké sur le Tas.
2. Que se passe-t-il pour la variable `modele_capteur` lorsqu'elle est passée en paramètre à la fonction `enregistrer_modele` ?

### Correction Détaillée

#### 1. Analyse de l'erreur
Le compilateur Rust refuse de compiler ce code et lève l'erreur suivante :
`error[E0382]: borrow of moved value: 'modele_capteur'`.

* **Pourquoi `id_capteur` fonctionne ?** `id_capteur` est un entier de type `i32`. Ce type a une taille fixe connue à la compilation et est stocké sur la Pile. Il implémente le trait `Copy`. Lors de l'appel `enregistrer_id(id_capteur)`, la valeur est copiée. L'original dans `main` reste donc parfaitement valide.
* **Pourquoi `modele_capteur` échoue ?** `modele_capteur` est une `String`, allouée sur le Tas. Elle n'implémente pas `Copy`. Lors de l'appel `enregistrer_modele(modele_capteur)`, la propriété de la chaîne est **déplacée** (Move) dans le paramètre `modele` de la fonction. À la fin de la fonction `enregistrer_modele`, la variable `modele` sort de la portée et la mémoire est libérée (`drop`). Tenter d'accéder à `modele_capteur` dans le `println!` du `main` revient à essayer d'accéder à de la mémoire déjà libérée, ce que Rust interdit formellement.

#### 2. Solutions de correction

##### Solution A : Utilisation de `.clone()` (Duplication de la mémoire)
Cette solution est idéale si l'on souhaite que la fonction de log possède sa propre copie indépendante de la chaîne.

```rust
fn main() {
    let id_capteur = 1042;
    let modele_capteur = String::from("TempSense-X1");

    enregistrer_id(id_capteur);
    // On passe un clone. L'original 'modele_capteur' reste propriétaire de sa chaîne.
    enregistrer_modele(modele_capteur.clone());

    println!("--- RAPPORT DE VÉRIFICATION ---");
    println!("ID Capteur : {}", id_capteur);
    println!("Modèle     : {}", modele_capteur); // Valide !
}

fn enregistrer_id(id: i32) {
    println!("[LOG] ID enregistré : {}", id);
}

fn enregistrer_modele(modele: String) {
    println!("[LOG] Modèle enregistré : {}", modele);
}
```

##### Solution B : Réorganisation du code (Sans coût de performance)
Si nous n'avons pas besoin de conserver la variable après le log, nous pouvons simplement déplacer l'affichage de vérification **avant** le transfert de propriété. Cela évite une allocation mémoire inutile sur le Tas via `.clone()`.

```rust
fn main() {
    let id_capteur = 1042;
    let modele_capteur = String::from("TempSense-X1");

    // On fait l'affichage de vérification d'abord, pendant que nous sommes propriétaires
    println!("--- RAPPORT DE VÉRIFICATION ---");
    println!("ID Capteur : {}", id_capteur);
    println!("Modèle     : {}", modele_capteur);

    // Ensuite, on transfère définitivement la propriété aux fonctions de log
    enregistrer_id(id_capteur);
    enregistrer_modele(modele_capteur); 
} // Aucune libération de 'modele_capteur' n'a lieu ici dans main, car elle a déjà été déplacée.

fn enregistrer_id(id: i32) {
    println!("[LOG] ID enregistré : {}", id);
}

fn enregistrer_modele(modele: String) {
    println!("[LOG] Modèle enregistré : {}", modele);
} // La mémoire de la String est libérée ici.
```

---

## Exercice 2 : Le Pipeline de Traitement de Données (Niveau : Moyen)

### Énoncé
Vous développez un système de nettoyage de données textuelles brutes issues d'un formulaire web. Le traitement doit suivre un pipeline strict à trois étapes :
1. **Saisie** : Récupération de la chaîne brute.
2. **Nettoyage** : Suppression des espaces superflus au début et à la fin (trim).
3. **Anonymisation** : Remplacement du mot "secret" par "[CONFIDENTIEL]".

Puisque vous ne pouvez pas utiliser de références, vous devez concevoir ce pipeline en **transférant la propriété** de la donnée d'une fonction à l'autre.

### Consignes
1. Écrivez une fonction `nettoyer(donnee: String) -> String` qui supprime les espaces. (Aide : la méthode `.trim()` sur un type `str` retourne une portion de texte. Vous pouvez la convertir en `String` avec `.to_string()`).
2. Écrivez une fonction `anonymiser(donnee: String) -> String` qui remplace `"secret"` par `"[CONFIDENTIEL]"` à l'aide de la méthode `.replace()`.
3. Dans la fonction `main`, orchestrez le pipeline en enchaînant les appels de fonction de manière à ce que la variable finale contienne le résultat final, sans jamais dupliquer inutilement la mémoire avec `.clone()`.

```rust
fn main() {
    let entree_brute = String::from("   Mon mot de passe secret   ");
    
    // Votre code ici : Enchaîner les appels pour obtenir le résultat final.
    
    // Affichage attendu : "Résultat : Mon mot de passe [CONFIDENTIEL]"
}
```

### Indices
1. Pensez à la "Sémantique de déplacement avec retour". Une fonction peut prendre la propriété d'un paramètre, faire des calculs, et renvoyer la propriété d'une nouvelle valeur à l'appelant.
2. Vous pouvez réassigner une variable ou créer de nouvelles variables intermédiaires pour stocker la propriété retournée à chaque étape.

### Correction Détaillée

Voici l'implémentation complète et optimisée du pipeline de traitement :

```rust
// Étape 1 : Nettoyage des espaces
fn nettoyer(donnee: String) -> String {
    // .trim() retourne un &str, .to_string() alloue une nouvelle String sur le Tas
    let resultat = donnee.trim().to_string();
    resultat // Transfert de propriété du résultat vers l'appelant
} // La mémoire allouée à l'argument 'donnee' est libérée ici

// Étape 2 : Anonymisation des données sensibles
fn anonymiser(donnee: String) -> String {
    // .replace crée et retourne une nouvelle String sur le Tas
    let resultat = donnee.replace("secret", "[CONFIDENTIEL]");
    resultat // Transfert de propriété du résultat vers l'appelant
} // La mémoire de l'argument 'donnee' est libérée ici

fn main() {
    let entree_brute = String::from("   Mon mot de passe secret   ");

    // Option A : Enchaînement par variables intermédiaires (Très lisible)
    let etape1 = nettoyer(entree_brute); // 'entree_brute' est déplacée et invalidée
    let etape2 = anonymiser(etape1);     // 'etape1' est déplacée et invalidée

    println!("Résultat Option A : '{}'", etape2);

    // Option B : Enchaînement direct (Plus compact, tout aussi performant)
    let entree_brute_2 = String::from("   Mon mot de passe secret   ");
    let resultat_direct = anonymiser(nettoyer(entree_brute_2));
    
    println!("Résultat Option B : '{}'", resultat_direct);
}
```

---

## Exercice 3 : Le Cycle de Vie d'un Coffre-Fort (Niveau : Difficile)

### Énoncé
Pour comprendre précisément la Règle d'Or n°3 (la destruction automatique via `drop` lors de la sortie de portée), vous allez concevoir un simulateur de coffre-fort numérique.

Nous voulons suivre à la trace le moment exact où les clés d'accès (représentées par des `String`) sont créées, déplacées, et détruites en mémoire.

Analysez le code ci-dessous, puis répondez aux questions suivantes **avant** de regarder la correction :
1. À la ligne 15, la variable `cle_temporaire` est-elle encore accessible ? Pourquoi ?
2. À la ligne 18, la variable `cle_principale` est-elle encore accessible ?
3. Listez précisément l'ordre de destruction (les appels à `drop`) de toutes les chaînes de caractères créées dans ce programme.

```rust
fn main() { // <-- Ligne 1
    let cle_principale = String::from("CLE_A_992"); // <-- Ligne 2
    
    { // <-- Début du Scope Interne (Ligne 4)
        let cle_temporaire = String::from("CLE_TEMP_001"); // <-- Ligne 5
        println!("Dans le scope interne : {}", cle_temporaire); // <-- Ligne 6
        
        let cle_transferee = cle_principale; // <-- Ligne 8
        println!("Clé transférée : {}", cle_transferee); // <-- Ligne 9
    } // <-- Fin du Scope Interne (Ligne 10)

    // println!("Clé temporaire : {}", cle_temporaire); // <-- Ligne 12
    
    // println!("Clé principale : {}", cle_principale); // <-- Ligne 14
    
    let cle_secours = String::from("CLE_SECOURS_888"); // <-- Ligne 16
    println!("Fin du programme."); // <-- Ligne 17
} // <-- Ligne 18
```

### Indices
1. Dessinez les accolades `{}` sur une feuille et tracez des lignes pour délimiter la "durée de vie" de chaque variable.
2. Attention au transfert de propriété à la ligne 8 : qui possède la valeur `"CLE_A_992"` après cette ligne ? Où cette nouvelle variable est-elle déclarée ?

### Correction Détaillée

#### Réponses aux questions théoriques :

1. **Accessibilité de `cle_temporaire` à la ligne 12 :** Non. La variable `cle_temporaire` a été déclarée à l'intérieur du scope interne (délimité par les accolades des lignes 4 et 10). Dès que l'exécution franchit la ligne 10, ce scope se termine. Rust appelle automatiquement `drop` sur `cle_temporaire`. Tenter de l'utiliser à la ligne 12 provoque une erreur de compilation.
2. **Accessibilité de `cle_principale` à la ligne 14 :** Non. Bien que `cle_principale` ait été déclarée dans le scope du `main`, sa propriété a été **déplacée** vers `cle_transferee` à la ligne 8. `cle_principale` est donc devenue invalide à partir de la ligne 8.
3. **Ordre exact de destruction des données sur le Tas :**
   * **1ère destruction (Ligne 10) :** La valeur `"CLE_TEMP_001"` (portée par `cle_temporaire`) est détruite car sa variable sort de sa portée.
   * **2ème destruction (Ligne 10) :** La valeur `"CLE_A_992"` (portée par `cle_transferee`) est détruite. En effet, `cle_transferee` a été déclarée dans le scope interne. Lorsque ce scope se termine à la ligne 10, la variable est détruite, entraînant avec elle la valeur dont elle avait acquis la propriété à la ligne 8.
   * **3ème destruction (Ligne 18) :** La valeur `"CLE_SECOURS_888"` (portée par `cle_secours`) est détruite à la fin de la fonction `main`.

#### Code de démonstration complet avec commentaires de traçabilité :

Voici le code que vous pouvez exécuter. Les commentaires indiquent précisément ce que fait le compilateur en arrière-plan :

```rust
fn main() {
    // 1. Allocation de "CLE_A_992" sur le Tas. Propriétaire : cle_principale.
    let cle_principale = String::from("CLE_A_992"); 
    
    { 
        // 2. Allocation de "CLE_TEMP_001" sur le Tas. Propriétaire : cle_temporaire.
        let cle_temporaire = String::from("CLE_TEMP_001"); 
        println!("Dans le scope interne : {}", cle_temporaire); 
        
        // 3. Transfert de propriété (Move). 
        // Le propriétaire de "CLE_A_992" est désormais cle_transferee.
        // cle_principale est désactivée.
        let cle_transferee = cle_principale; 
        println!("Clé transférée : {}", cle_transferee); 
        
    } // <-- FIN DU SCOPE INTERNE. 
      // Rust appelle drop(cle_transferee) -> Libération de "CLE_A_992" sur le Tas.
      // Rust appelle drop(cle_temporaire) -> Libération de "CLE_TEMP_001" sur le Tas.

    // 4. Allocation de "CLE_SECOURS_888" sur le Tas. Propriétaire : cle_secours.
    let cle_secours = String::from("CLE_SECOURS_888"); 
    
    println!("Fin du programme."); 
} // <-- FIN DU MAIN.
  // Rust appelle drop(cle_secours) -> Libération de "CLE_SECOURS_888" sur le Tas.
```