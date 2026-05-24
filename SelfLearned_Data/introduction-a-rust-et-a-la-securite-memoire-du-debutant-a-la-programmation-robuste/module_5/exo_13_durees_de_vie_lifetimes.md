# Exercices d'Application : Les Durées de Vie (Lifetimes)

Ce cahier d'exercices pratiques a pour objectif de consolider votre compréhension des durées de vie (*lifetimes*) en Rust. À travers trois exercices de difficulté progressive, vous passerez de la manipulation de fonctions simples à la conception de structures de données complexes et optimisées sans copie mémoire.

---

## Exercice 1 : Le Sélecteur de Message avec Repli (Difficulté : Facile)

### Énoncé
Dans cet exercice, vous devez concevoir un utilitaire de traitement de texte pour un système de notification. Vous devez écrire une fonction nommée `choisir_message` qui compare un message personnalisé et un message de repli (*fallback*).

La fonction doit :
1. Prendre en paramètre deux références de chaînes de caractères (`&str`) : `perso` et `repli`.
2. Prendre un troisième paramètre, un motif de recherche de type `&str` nommé `motif`.
3. Si le message `perso` contient le `motif`, la fonction retourne `perso`.
4. Sinon, elle retourne le message de `repli`.

**Contrainte clé** : Le motif de recherche (`motif`) est une variable temporaire qui n'a pas besoin de vivre aussi longtemps que les messages ou que la valeur de retour. Vous devez annoter les durées de vie de manière à ce que le compilateur comprenne que seule la durée de vie de `perso` et `repli` est liée à la valeur de retour.

### Indices
1. Utilisez la méthode `chaine.contains(motif)` pour vérifier si le motif est présent.
2. Demandez-vous : *Quelles sont les références qui peuvent potentiellement être retournées par la fonction ?* Ce sont ces références (et uniquement elles) qui doivent partager la même durée de vie générique `'a`.
3. Le paramètre `motif` n'est jamais retourné. Sa durée de vie peut donc être élidée (laissée au compilateur) ou posséder sa propre durée de vie indépendante `'b`.

### Correction Détaillée

```rust
// Nous définissons une durée de vie 'a pour les données qui peuvent être retournées.
// Le paramètre `motif` n'a pas besoin de vivre aussi longtemps, nous le laissons
// bénéficier de l'élision automatique (ou nous aurions pu lui donner une durée de vie 'b).
fn choisir_message<'a>(perso: &'a str, repli: &'a str, motif: &str) -> &'a str {
    if perso.contains(motif) {
        perso
    } else {
        repli
    }
}

fn main() {
    let message_important = String::from("ALERTE: Une tentative de connexion suspecte a été détectée.");
    let message_secours = "Notification standard : RAS.";
    
    let resultat;
    {
        // Le motif est une variable à durée de vie très courte (limitée à ce bloc)
        let declencheur = String::from("ALERTE");
        
        resultat = choisir_message(&message_important, message_secours, &declencheur);
        // 'declencheur' est détruit ici, mais 'resultat' reste valide car il est lié
        // à la durée de vie de 'message_important' et 'message_secours'.
    }
    
    println!("Résultat de la sélection : {}", resultat);
}
```

**Explications pas-à-pas :**
* **Signature** : `choisir_message<'a>(perso: &'a str, repli: &'a str, motif: &str) -> &'a str`
  En liant `perso`, `repli` et le type de retour avec `'a`, nous garantissons au compilateur que la référence retournée sera valide tant que `perso` **et** `repli` le sont.
* **Indépendance de `motif`** : Puisque `motif` n'est pas annoté avec `'a`, le compilateur lui attribue une durée de vie anonyme distincte. Cela permet d'appeler la fonction avec un motif temporaire (comme `declencheur` dans le bloc interne du `main`) sans restreindre la validité du résultat obtenu.

---

## Exercice 2 : Le Parseur de Profil Utilisateur "Zéro-Copie" (Difficulté : Moyenne)

### Énoncé
Pour éviter des allocations mémoire inutiles sur le tas (*heap*), vous devez concevoir un parseur de profil utilisateur "zéro-copie". Les données brutes arrivent sous la forme d'une seule chaîne de caractères formatée ainsi : `"ID:1024|Nom:Alice|Role:Administrateur"`.

#### Objectifs :
1. Créez une structure `ProfilUtilisateur<'a>` contenant trois champs de type `&'a str` : `id`, `nom`, et `role`.
2. Écrivez une fonction `parser_profil<'a>(donnees: &'a str) -> Option<ProfilUtilisateur<'a>>`.
3. Cette fonction doit découper la chaîne d'origine pour extraire les valeurs associées à chaque champ. Si un champ est manquant ou si le format est invalide, retournez `None`.
4. Écrivez un code de test dans le `main` qui prouve que la structure ne peut pas survivre à la chaîne de caractères source.

### Indices
1. Vous pouvez utiliser la méthode `donnees.split('|')` pour séparer les paires clé-valeur.
2. Pour chaque paire (ex: `"Nom:Alice"`), vous pouvez utiliser `.split_once(':')` qui retourne un tuple `Some((cle, valeur))` bien pratique.
3. Rappelez-vous que la structure contenant des références doit déclarer sa durée de vie : `struct MonNom<'a> { champ: &'a str }`.

### Correction Détaillée

```rust
// 1. Définition de la structure avec sa durée de vie générique
#[derive(Debug)]
struct ProfilUtilisateur<'a> {
    id: &'a str,
    nom: &'a str,
    role: &'a str,
}

// 2. Fonction de parsing zéro-copie
fn parser_profil<'a>(donnees: &'a str) -> Option<ProfilUtilisateur<'a>> {
    let mut id = None;
    let mut nom = None;
    let mut role = None;

    // Découpage par le délimiteur '|'
    for segment in donnees.split('|') {
        // Découpage de chaque segment sur le premier ':'
        if let Some((cle, valeur)) = segment.split_once(':') {
            match cle {
                "ID" => id = Some(valeur),
                "Nom" => nom = Some(valeur),
                "Role" => role = Some(valeur),
                _ => {} // On ignore les clés inconnues
            }
        }
    }

    // On reconstruit le profil si tous les champs obligatoires sont présents
    Some(ProfilUtilisateur {
        id: id?,
        nom: nom?,
        role: role?,
    })
}

fn main() {
    // Cas nominal
    let donnees_brutes = String::from("ID:8842|Nom:Thomas|Role:Developpeur");
    
    let profil = parser_profil(&donnees_brutes);
    match profil {
        Some(p) => println!("Profil parsé avec succès : {:?}", p),
        None => println!("Échec du parsing : format invalide."),
    }

    // Démonstration de la sécurité mémoire (Vérification du Borrow Checker)
    /*
    let profil_invalide;
    {
        let donnees_temporaires = String::from("ID:99|Nom:Inconnu|Role:Invite");
        profil_invalide = parser_profil(&donnees_temporaires);
    } // 'donnees_temporaires' est détruite ici.
    
    // Si vous décommentez la ligne suivante, le compilateur refusera de compiler !
    // println!("Profil temporaire : {:?}", profil_invalide);
    */
}
```

**Explications pas-à-pas :**
* **Zéro allocation** : La structure `ProfilUtilisateur` ne contient aucun type `String`. Elle ne fait que "pointer" (via des références `&str`) vers des sous-parties de la chaîne `donnees_brutes` déjà présente en mémoire.
* **Propagation de la durée de vie** : La signature `parser_profil<'a>(donnees: &'a str) -> Option<ProfilUtilisateur<'a>>` indique au compilateur que le profil retourné est intimement lié à la chaîne `donnees`. Si la chaîne source est désallouée, le profil devient inutilisable, empêchant toute tentative d'accès à de la mémoire libérée.

---

## Exercice 3 : L'Indexeur de Mots-Clés (Difficulté : Difficile)

### Énoncé
Dans les moteurs de recherche, on indexe des documents textuels pour retrouver rapidement les mots. Vous allez concevoir un `Indexeur` qui stocke des références vers des mots uniques extraits de différents textes.

#### Objectifs :
1. Créez une structure `Indexeur<'a>` qui contient un vecteur de références de chaînes : `mots: Vec<&'a str>`.
2. Implémentez les méthodes suivantes pour `Indexeur<'a>` :
   * `new()` : Initialise un indexeur vide.
   * `ajouter_phrase(&mut self, phrase: &'a str)` : Découpe la phrase en mots (séparés par des espaces) et ajoute à l'index les mots qui ne s'y trouvent pas déjà.
   * `contient(&self, mot: &str) -> bool` : Indique si le mot est présent dans l'index.
3. **Le Piège à éviter** : Faites attention à la signature de la méthode `ajouter_phrase`. La référence mutable sur l'indexeur (`&mut self`) ne doit pas être confondue ou fusionnée de force avec la durée de vie `'a` des données qu'il stocke.

### Indices
1. Pour implémenter des méthodes sur une structure ayant une durée de vie, la syntaxe est : `impl<'a> Indexeur<'a> { ... }`.
2. Dans `ajouter_phrase(&mut self, phrase: &'a str)`, notez bien que `&mut self` n'a pas besoin de l'annotation `'a`. Si vous écriviez `&'a mut self`, vous bloqueriez l'indexeur en écriture pour toute sa durée de vie, le rendant inutilisable après le premier appel !
3. Utilisez `phrase.split_whitespace()` pour extraire les mots.

### Correction Détaillée

```rust
// 1. Définition de la structure de l'indexeur
struct Indexeur<'a> {
    mots: Vec<&'a str>,
}

// 2. Implémentation des méthodes
impl<'a> Indexeur<'a> {
    // Constructeur
    fn new() -> Self {
        Indexeur { mots: Vec::new() }
    }

    // Ajoute les mots d'une phrase s'ils ne sont pas déjà présents
    fn ajouter_phrase(&mut self, phrase: &'a str) {
        for mot in phrase.split_whitespace() {
            // Nettoyage basique de la ponctuation pour l'exemple
            let mot_nettoye = mot.trim_matches(|c: char| c.is_ascii_punctuation());
            
            if !mot_nettoye.is_empty() && !self.contient(mot_nettoye) {
                self.mots.push(mot_nettoye);
            }
        }
    }

    // Vérifie la présence d'un mot (recherche insensible à la casse)
    fn contient(&self, mot: &str) -> bool {
        self.mots
            .iter()
            .any(|&m| m.eq_ignore_ascii_case(mot))
    }
}

fn main() {
    let mut indexeur = Indexeur::new();

    // Premier texte (durée de vie 'static car c'est un littéral)
    let texte_1 = "Rust est un langage moderne.";
    indexeur.ajouter_phrase(texte_1);

    {
        // Deuxième texte (durée de vie plus courte, limitée à ce bloc)
        let texte_2 = String::from("La sécurité mémoire est essentielle !");
        indexeur.ajouter_phrase(&texte_2);

        println!("L'index contient 'sécurité' ? {}", indexeur.contient("sécurité")); // true
        println!("L'index contient 'moderne' ? {}", indexeur.contient("moderne"));   // true
        
        // Tout fonctionne parfaitement ici car 'texte_2' est encore en vie.
    } 
    // 'texte_2' est détruit ici.
    
    // ATTENTION : Si nous essayons d'utiliser `indexeur` maintenant, le compilateur
    // lèvera une erreur car l'indexeur contient des références vers 'texte_2' qui a été détruit.
    
    // println!("Contenu de l'index : {:?}", indexeur.mots); // <- ERREUR DE COMPILATION SI DÉCOMMENTÉ !
}
```

**Explications pas-à-pas :**
* **Distinction des durées de vie** : Dans `fn ajouter_phrase(&mut self, phrase: &'a str)`, le paramètre `&mut self` est équivalent à `&'b mut Self` où `'b` est une durée de vie très courte (juste le temps de l'appel de la fonction). En revanche, `phrase` est liée à `'a`. Cela permet d'appeler `ajouter_phrase` plusieurs fois de suite avec des phrases différentes, tant que ces phrases vivent au moins aussi longtemps que l'indexeur lui-même.
* **Sécurité du Borrow Checker** : Dès que `texte_2` sort de la portée, l'indexeur devient "contaminé" par une référence invalide. Le compilateur Rust suit cette trace de validité à la trace et interdit toute lecture ultérieure de `indexeur`, protégeant ainsi le programme contre un crash ou un comportement indéterminé.