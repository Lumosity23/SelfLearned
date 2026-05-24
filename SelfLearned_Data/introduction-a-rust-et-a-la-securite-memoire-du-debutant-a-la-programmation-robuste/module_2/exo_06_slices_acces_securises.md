# Exercices d'Application : Les Tranches (Slices) : Garantir des accès mémoire sécurisés et sans débordement

## Exercice 1 : Analyseur de Télémétrie (Accès sécurisé et Fenêtre Glissante)

### Énoncé
Dans le cadre du développement d'un logiciel embarqué pour un drone, vous recevez un flux continu de mesures d'altitude sous la forme d'un tableau d'éléments `f64`. Pour analyser la stabilité du vol, vous devez extraire des sous-parties de ces données (des fenêtres temporelles) afin de calculer des moyennes locales.

Cependant, le système est soumis à des contraintes de sécurité strictes : le programme ne doit **jamais paniquer**, même si l'opérateur demande une fenêtre de calcul qui dépasse les bornes physiques du tableau de données.

Votre objectif est d'écrire une fonction `extraire_fenetre` qui :
1. Prend en paramètre une tranche immuable de données de télémétrie (`&[f64]`), un index de départ (`debut`), et une taille de fenêtre désirée (`taille`).
2. Renvoie une option contenant la tranche demandée (`Some(&[f64])`) si la fenêtre est entièrement valide et comprise dans les limites.
3. Renvoie `None` de manière sécurisée si la fenêtre dépasse les limites du tableau ou si un débordement d'index se produit.

### Indices
1. Pour éviter les paniques liées à l'indexation directe (comme `tranche[debut..fin]`), utilisez la méthode sécurisée `.get()` combinée avec un intervalle (un *Range*).
2. Attention aux débordements d'entiers (`overflow`) si `debut + taille` dépasse la valeur maximale d'un `usize`. Utilisez la méthode `debut.checked_add(taille)` pour sécuriser ce calcul.

### Correction Détaillée

```rust
/// Extrait de manière sécurisée une sous-tranche de télémétrie.
/// Garantit l'absence totale de panique à l'exécution.
fn extraire_fenetre(donnees: &[f64], debut: usize, taille: usize) -> Option<&[f64]> {
    // 1. Calcul sécurisé de l'index de fin pour éviter les débordements d'entiers (overflow)
    let fin = debut.checked_add(taille)?;

    // 2. Utilisation de .get() avec un Range pour obtenir une Option<&[f64]>
    // Si l'intervalle est hors limites, .get() renvoie naturellement None.
    donnees.get(debut..fin)
}

fn main() {
    let telemetrie = [120.5, 122.1, 121.8, 123.0, 125.4, 124.2, 120.1];

    // Cas nominal : extraction d'une fenêtre valide au milieu
    match extraire_fenetre(&telemetrie, 2, 3) {
        Some(fenetre) => {
            println!("Fenêtre extraite : {:?}", fenetre);
            assert_eq!(fenetre, &[121.8, 123.0, 125.4]);
        }
        None => println!("Erreur inattendue dans le cas nominal."),
    }

    // Cas limite : la fenêtre dépasse de la fin du tableau
    let hors_limites = extraire_fenetre(&telemetrie, 5, 4);
    println!("Tentative hors limites (fin) : {:?}", hors_limites);
    assert!(hors_limites.is_none());

    // Cas limite : index de départ hors limites
    let depart_invalide = extraire_fenetre(&telemetrie, 10, 2);
    println!("Tentative départ invalide : {:?}", depart_invalide);
    assert!(depart_invalide.is_none());

    // Cas extrême : risque d'overflow sur usize
    let overflow = extraire_fenetre(&telemetrie, usize::MAX, 5);
    println!("Tentative avec risque d'overflow : {:?}", overflow);
    assert!(overflow.is_none());
}
```

---

## Exercice 2 : Troncature Sécurisée de Chaînes UTF-8

### Énoncé
Vous développez un composant de chat pour une application de messagerie. Pour limiter la bande passante, le serveur exige que les messages soient tronqués à un nombre maximum de **octets** (par exemple, 10 octets).

Comme vu dans le cours, les chaînes de caractères en Rust (`&str`) sont encodées en UTF-8, où un caractère peut occuper de 1 à 4 octets. Si vous coupez brutalement une tranche à un index d'octet arbitraire (par exemple `&message[..10]`), le programme risque de paniquer si cet index tombe au milieu d'un caractère multi-octets (comme un accent `é` ou un émoji `🚀`).

Écrivez une fonction `tronquer_message` qui prend en paramètre un message (`&str`) et une limite de taille en octets (`max_octets`). Elle doit retourner une tranche immuable (`&str`) du message d'origine, raccourcie de manière à :
1. Ne pas dépasser `max_octets`.
2. S'arrêter exactement à la frontière d'un caractère UTF-8 valide pour éviter toute panique.
3. Ne réaliser aucune allocation mémoire sur le tas (pas de `String`).

### Indices
1. Utilisez la méthode `message.is_char_boundary(index)` pour vérifier si un index donné correspond à un début ou une fin de caractère UTF-8 valide.
2. Si `max_octets` est supérieur ou égal à la longueur du message, vous pouvez retourner le message entier.
3. Sinon, commencez à l'index `max_octets` et décrémentez cet index de 1 en 1 jusqu'à trouver une frontière de caractère valide (`is_char_boundary` renvoie `true`). Utilisez ensuite cet index sûr pour découper la tranche.

### Correction Détaillée

```rust
/// Tronque un message à un nombre maximum d'octets sans jamais couper un caractère UTF-8.
/// Ne produit aucune allocation sur le tas.
fn tronquer_message(message: &str, max_octets: usize) -> &str {
    // Si le message est plus court que la limite, on le retourne en entier
    if max_octets >= message.len() {
        return message;
    }

    // On commence à la limite demandée et on recule jusqu'à trouver une frontière valide
    let mut index_securise = max_octets;
    while !message.is_char_boundary(index_securise) {
        // On recule d'un octet. 
        // C'est mathématiquement sûr de décrémenter car l'index 0 est toujours une frontière valide.
        index_securise -= 1;
    }

    // On retourne la tranche découpée de manière sécurisée
    &message[..index_securise]
}

fn main() {
    // Cas 1 : Caractères ASCII simples (1 caractère = 1 octet)
    let msg_ascii = "Hello World"; // 11 octets
    let coupe_ascii = tronquer_message(msg_ascii, 5);
    println!("ASCII tronqué : '{}'", coupe_ascii);
    assert_eq!(coupe_ascii, "Hello");

    // Cas 2 : Caractères accentués (ex: 'é' prend 2 octets en UTF-8)
    // "café" -> 'c'(1), 'a'(1), 'f'(1), 'é'(2) = 5 octets au total
    let msg_accent = "café"; 
    // Si on coupe à 4 octets, on tombe au milieu du 'é'.
    let coupe_accent = tronquer_message(msg_accent, 4);
    println!("Accenté tronqué (limite 4) : '{}'", coupe_accent);
    // Le programme doit reculer à l'index 3 pour ne pas casser le 'é'
    assert_eq!(coupe_accent, "caf");

    // Cas 3 : Émojis (ex: '🦀' prend 4 octets en UTF-8)
    // "Rust 🦀" -> 'R'(1), 'u'(1), 's'(1), 't'(1), ' '(1), '🦀'(4) = 9 octets
    let msg_emoji = "Rust 🦀";
    // Si on tente de couper à 7 octets (au milieu du crabe)
    let coupe_emoji = tronquer_message(msg_emoji, 7);
    println!("Émoji tronqué (limite 7) : '{}'", coupe_emoji);
    // Doit reculer à l'index 5 (juste après l'espace)
    assert_eq!(coupe_emoji, "Rust ");
}
```

---

## Exercice 3 : Rotation de Tampon In-Place (Tranches Mutables)

### Énoncé
Dans les systèmes de traitement de signal ou de réseau, on utilise souvent des tampons d'écriture circulaires. Lors de la réorganisation de ces tampons, il est fréquent de devoir intervertir deux parties d'un tableau.

Pour des raisons de performance, vous devez réaliser cette opération **in-place** (sans allouer de tableau temporaire) en manipulant des **tranches mutables** (`&mut [T]`).

Écrivez une fonction `pivoter_tampon` qui :
1. Prend en paramètre une tranche mutable d'entiers `tampon: &mut [i32]` et un index de `pivot`.
2. Divise virtuellement le tableau en deux parties au niveau du pivot : la partie gauche `[..pivot]` et la partie droite `[pivot..]`.
3. Intervertit ces deux parties pour que la partie droite se retrouve au début et la partie gauche à la fin.

*Exemple :*
* Entrée : `[1, 2, 3, 4, 5]` avec un pivot à `2` (séparation entre `[1, 2]` et `[3, 4, 5]`).
* Sortie attendue : `[3, 4, 5, 1, 2]`.

### Indices
1. Pour diviser une tranche mutable en deux sous-tranches mutables distinctes sans violer les règles d'emprunt de Rust, utilisez la méthode dédiée `.split_at_mut(index)`.
2. Une astuce algorithmique élégante pour pivoter un tableau sans mémoire supplémentaire (in-place) consiste à utiliser des inversions de tranches (méthode `.reverse()`) :
   * Inversez la première partie.
   * Inversez la deuxième partie.
   * Inversez l'intégralité du tableau.
   *(Essayez de simuler cette logique sur papier avec `[1, 2]` et `[3, 4, 5]` !)*

### Correction Détaillée

```rust
/// Pivote un tampon d'entiers in-place autour d'un pivot donné.
/// Utilise des tranches mutables et ne réalise aucune allocation mémoire.
fn pivoter_tampon(tampon: &mut [i32], pivot: usize) {
    let taille = tampon.len();
    
    // Sécurité : si le pivot est hors limites ou inutile, on ne fait rien
    if pivot == 0 || pivot >= taille {
        return;
    }

    // 1. Division de la tranche mutable unique en deux tranches mutables disjointes.
    // Le Borrow Checker autorise cela car split_at_mut garantit mathématiquement
    // que les deux tranches ne se chevauchent pas en mémoire.
    let (gauche, droite) = tampon.split_at_mut(pivot);

    // 2. Application de l'algorithme des trois inversions :
    // Étape A : Inverser la partie gauche
    // [1, 2] devient [2, 1]
    gauche.reverse();

    // Étape B : Inverser la partie droite
    // [3, 4, 5] devient [5, 4, 3]
    droite.reverse();

    // À ce stade, le tableau complet ressemble à : [2, 1, 5, 4, 3]

    // Étape C : Inverser la totalité du tableau
    // [2, 1, 5, 4, 3] inversé devient [3, 4, 5, 1, 2]
    tampon.reverse();
}

fn main() {
    let mut mon_tampon = [1, 2, 3, 4, 5];
    
    println!("Tampon d'origine : {:?}", mon_tampon);
    
    // Pivot à l'index 2 (éléments [1, 2] et [3, 4, 5])
    pivoter_tampon(&mut mon_tampon, 2);
    
    println!("Tampon pivoté    : {:?}", mon_tampon);
    assert_eq!(mon_tampon, [3, 4, 5, 1, 2]);

    // Test de sécurité avec un pivot hors limites (ne doit pas paniquer)
    let mut autre_tampon = [10, 20, 30];
    pivoter_tampon(&mut autre_tampon, 10);
    assert_eq!(autre_tampon, [10, 20, 30]); // Inchangé
}
```