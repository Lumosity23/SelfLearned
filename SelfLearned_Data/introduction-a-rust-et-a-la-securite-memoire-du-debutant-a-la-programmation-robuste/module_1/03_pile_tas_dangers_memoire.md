# Qu'est-ce que la mémoire ? Comprendre la Pile (Stack), le Tas (Heap) et les dangers du code non sécurisé

---

## 1. Introduction Conceptuelle

Pour écrire du code rapide, fiable et sécurisé, un développeur ne peut pas traiter la mémoire de l'ordinateur comme une boîte noire magique. Chaque variable créée, chaque fichier lu et chaque structure de données instanciée doit résider quelque part dans la mémoire vive (RAM) de la machine.

### Le "Pourquoi" avant le "Comment"
Dans les langages de programmation, la gestion de la mémoire se divise historiquement en deux grandes familles :
1. **La gestion manuelle (ex: C, C++)** : Le programmeur demande explicitement de la mémoire au système d'exploitation et doit impérativement la libérer lui-même. C'est d'une efficacité redoutable, mais la moindre distraction humaine conduit à des failles de sécurité critiques ou à des plantages.
2. **La gestion automatique par Garbage Collector (ex: Java, Python, Go)** : Un programme d'arrière-plan surveille constamment la mémoire et nettoie ce qui n'est plus utilisé. C'est extrêmement sécurisé, mais cela consomme des ressources (CPU, RAM) et introduit des pauses imprévisibles (les fameux "GC pauses").

Rust propose une troisième voie révolutionnaire : **la sécurité mémoire absolue, sans Garbage Collector**, garantissant des performances maximales. Pour comprendre comment Rust réalise ce tour de force (que nous étudierons en détail dans le **Module 2**), il est indispensable de maîtriser les deux zones fondamentales de la mémoire : **la Pile (Stack)** et **le Tas (Heap)**.

---

## 2. Fondations Théoriques

La mémoire allouée à un programme en cours d'exécution (un processus) est segmentée en plusieurs zones. Nous allons nous concentrer sur les deux plus importantes pour le développeur : la Pile et le Tas.

```
+-------------------------------------------------------------+
|                      MÉMOIRE DU PROCESSUS                   |
+------------------------------------+------------------------+
|               LA PILE (STACK)      |     LE TAS (HEAP)      |
|  - Taille fixe, connue à la comp.  |  - Taille dynamique    |
|  - Accès ultra-rapide (LIFO)       |  - Accès plus lent     |
|  - Gestion automatique par CPU     |  - Allocation manuelle |
+------------------------------------+------------------------+
```

### 2.1 La Pile (Stack)
La Pile fonctionne selon le principe **LIFO** (*Last In, First Out* - Dernier entré, premier sorti). On peut la comparer à une pile d'assiettes : vous ne pouvez ajouter ou retirer une assiette que par le haut.

* **Caractéristiques** :
  * **Taille connue et fixe** : Toutes les données stockées sur la pile doivent avoir une taille connue et fixe dès la compilation.
  * **Vitesse** : L'allocation est extrêmement rapide. Le processeur se contente de déplacer un pointeur de pile (*stack pointer*).
  * **Cycle de vie** : Les données sont liées à la fonction qui les a créées. Dès que la fonction se termine, sa "tranche" de pile (appelée *Stack Frame* ou cadre de pile) est immédiatement et automatiquement libérée.

### 2.2 Le Tas (Heap)
Le Tas est un grand espace de mémoire désorganisé. On peut le comparer à un immense entrepôt de stockage.

* **Caractéristiques** :
  * **Taille dynamique** : On y stocke des données dont la taille peut changer au cours de l'exécution, ou dont la taille est inconnue au moment de la compilation (par exemple, un texte saisi par l'utilisateur).
  * **Vitesse** : L'allocation est plus lente. Le système d'exploitation doit chercher un espace libre assez grand pour accueillir les données, marquer cet espace comme "occupé", puis retourner l'adresse de cet emplacement.
  * **Le Pointeur** : Pour retrouver ces données, on stocke l'adresse mémoire du Tas (un **pointeur**) sur la Pile. Le pointeur a une taille fixe (par exemple, 64 bits sur un système moderne), il peut donc loger sur la pile.

```
LA PILE (STACK)                           LE TAS (HEAP)
+-------------------------+               +-------------------------+
| Variable 'x' : 42       |               |                         |
+-------------------------+               |                         |
| Pointeur 'p' : 0x00FF8A |-------------->| [ 1, 2, 3, 4, 5, 6 ]    |
+-------------------------+               | Données dynamiques      |
                                          +-------------------------+
```

### 2.3 Les Dangers du Code Non Sécurisé
Lorsque la gestion de ces deux zones est mal maîtrisée (comme en C ou C++), quatre bogues majeurs et extrêmement dangereux surviennent :

1. **L'utilisation après libération (Use-After-Free)** :
   Un pointeur pointe vers une adresse sur le Tas. La mémoire à cette adresse est libérée, mais le programme tente de lire ou d'écrire à nouveau via ce pointeur. Un attaquant peut exploiter cela pour exécuter du code malveillant.
2. **La double libération (Double Free)** :
   Le programme tente de libérer deux fois la même zone de mémoire sur le Tas. Cela corrompt les structures internes de l'allocateur de mémoire et provoque des plantages ou des failles de sécurité.
3. **Le débordement de tampon (Buffer Overflow)** :
   Le programme écrit des données au-delà de la limite allouée (sur la Pile ou le Tas), écrasant les variables voisines ou les instructions de retour de fonction.
4. **La fuite de mémoire (Memory Leak)** :
   De la mémoire est allouée sur le Tas, mais le programme perd le pointeur associé sans l'avoir libérée. La mémoire reste marquée comme occupée, et le programme finit par consommer toute la RAM du système.

---

## 3. Implémentation Pratique Pas-à-Pas

Voyons comment Rust gère concrètement ces concepts. Nous allons utiliser le type `Box<T>`, qui est le moyen le plus simple en Rust de forcer l'allocation d'une donnée sur le Tas.

### Étape 1 : Allocation sur la Pile
Par défaut, les types primitifs de taille fixe (comme étudiés dans le **Module 1.2**) sont alloués sur la pile.

```rust
fn main() {
    // Allocation sur la PILE
    let x: i32 = 42; 
    let y: bool = true;
    
    println!("x vit sur la pile : {}", x);
    println!("y vit sur la pile : {}", y);
} // x et y sont retirés de la pile automatiquement ici
```

### Étape 2 : Allocation sur le Tas avec `Box<T>`
Pour placer un entier sur le Tas, nous l'enveloppons dans une `Box`.

```rust
fn main() {
    // 'valeur_tas' est un pointeur stocké sur la PILE.
    // Il pointe vers la valeur 512 stockée sur le TAS.
    let valeur_tas: Box<i32> = Box::new(512);

    println!("La valeur pointée sur le tas est : {}", valeur_tas);
} // 'valeur_tas' sort de la portée (scope) ici.
  // Rust libère AUTOMATIQUEMENT la mémoire sur le tas.
```

### Étape 3 : Visualiser le nettoyage automatique (RAII)
Rust utilise un concept appelé **RAII** (*Resource Acquisition Is Initialization*). La mémoire est acquise lors de la création de la variable et libérée automatiquement dès que la variable "sort de la portée" (à l'accolade de fermeture `}`).

Pour le prouver, créons un exemple où nous contrôlons la portée avec un bloc de code `{ ... }` :

```rust
fn main() {
    println!("Début du programme.");

    {
        // Début d'une portée locale
        let pointeur_interne = Box::new(1024);
        println!("Pointeur interne créé : {}", pointeur_interne);
    } // <-- 'pointeur_interne' sort de la portée ICI.
      // La mémoire sur le tas contenant 1024 est immédiatement libérée.

    // println!("{}", pointeur_interne); 
    // ^ Si vous décommentez la ligne ci-dessus, le compilateur Rust
    // refusera de compiler car la variable n'existe plus !
    
    println!("Fin du programme.");
}
```

---

## 4. Pièges Fréquents et Bonnes Pratiques

### Piège 1 : Tenter de retourner une référence vers la Pile
Un grand classique des erreurs de segmentation en C est de retourner l'adresse d'une variable locale à la fin d'une fonction. En Rust, le compilateur bloque immédiatement cette tentative.

```rust
// CE CODE NE COMPILE PAS
fn creer_reference_dangereuse() -> &i32 {
    let valeur_locale = 42; // Allouée sur la pile de cette fonction
    &valeur_locale // On tente de retourner une référence (un pointeur) vers la pile
} // 'valeur_locale' est détruite ici ! La référence pointerait vers du vide.

fn main() {
    let _ref_invalide = creer_reference_dangereuse();
}
```

**Message d'erreur du compilateur :**
```text
error[E0106]: missing lifetime specifier
  --> src/main.rs:2:36
   |
2  | fn creer_reference_dangereuse() -> &i32 {
   |                                    ^ expected named lifetime parameter
```
*Note : Le concept de "lifetime" (durée de vie) sera étudié en détail dans le **Module 5.1**. Pour l'instant, retenez que Rust empêche physiquement la création de pointeurs vers de la mémoire détruite.*

### Bonne Pratique : Privilégier la Pile par défaut
L'allocation sur le Tas a un coût en performances. N'utilisez `Box` (ou d'autres structures dynamiques comme `Vec` ou `String` que nous verrons dans le **Module 3.3**) que si :
1. Vous devez manipuler des données dont la taille est inconnue à la compilation.
2. Vous devez transférer la propriété d'une structure de données volumineuse sans la copier en mémoire.

---

## 5. Synthèse Pédagogique

### Tableau Comparatif : Pile vs Tas

| Critère | La Pile (Stack) | Le Tas (Heap) |
| :--- | :--- | :--- |
| **Taille des données** | Fixe, connue à la compilation. | Dynamique, inconnue à la compilation. |
| **Vitesse d'accès** | Ultra-rapide (accès direct). | Plus lente (indirection par pointeur). |
| **Mécanisme d'allocation** | Automatique par le CPU (LIFO). | Requête au système d'exploitation. |
| **Libération** | Immédiate à la fin de la fonction. | Gérée par Rust via la portée (RAII). |
| **Types Rust typiques** | `i32`, `f64`, `bool`, `char`, Tableaux fixes `[T; N]`. | `Box<T>`, `Vec<T>`, `String`. |

### Résumé des garanties de Rust
Grâce à son compilateur strict, Rust élimine à la compilation :
* Les **Use-After-Free** : Impossible d'accéder à une variable hors de sa portée.
* Les **Double Free** : Rust sait exactement quand libérer la mémoire (une seule fois, à la sortie de la portée).
* Les **Buffer Overflows** : Les accès aux tableaux sont vérifiés à l'exécution (nous verrons cela dans le **Module 2.3** sur les Slices).

---

## 6. Exercice Pratique d'Application

### Énoncé
Le but de cet exercice est de concevoir un programme qui simule et compare l'allocation sur la pile et sur le tas, puis de corriger une tentative d'accès mémoire invalide.

1. Créez une fonction `allouer_sur_pile()` qui déclare un tableau de 3 entiers sur la pile et l'affiche.
2. Créez une fonction `allouer_sur_tas()` qui alloue ce même tableau sur le tas à l'aide d'une `Box`, puis le retourne au programme principal.
3. Dans la fonction `main`, récupérez le tableau alloué sur le tas, modifiez sa première valeur, puis affichez-le.

### Indices
* Un tableau de taille fixe s'écrit sous la forme `[type; taille]`. Par exemple : `[i32; 3]`.
* Pour allouer un tableau sur le tas, utilisez `Box::new([valeur1, valeur2, valeur3])`.

### Correction Complète

Voici le code source complet et fonctionnel que vous pouvez tester :

```rust
// 1. Allocation sur la pile
fn allouer_sur_pile() {
    // Ce tableau est stocké entièrement sur la pile de la fonction
    let tableau_pile: [i32; 3] = [10, 20, 30];
    println!("Tableau sur la pile : {:?}", tableau_pile);
} // 'tableau_pile' est détruit ici.

// 2. Allocation sur le tas et retour de la Box
fn allouer_sur_tas() -> Box<[i32; 3]> {
    // Le tableau est créé sur le tas.
    // La Box (le pointeur) est sur la pile et est retournée.
    let tableau_tas = Box::new([100, 200, 300]);
    tableau_tas 
} // La mémoire sur le tas n'est PAS libérée ici car nous avons retourné la Box !

fn main() {
    println!("--- Début de l'exercice ---");

    // Appel de la fonction sur la pile
    allouer_sur_pile();

    // 3. Récupération et modification de la valeur sur le tas
    // Nous devons déclarer la variable comme mutable 'mut' pour pouvoir la modifier
    let mut mon_tableau_tas = allouer_sur_tas();
    
    println!("Tableau initial sur le tas : {:?}", mon_tableau_tas);

    // Modification de la première valeur
    mon_tableau_tas[0] = 999;

    println!("Tableau modifié sur le tas : {:?}", mon_tableau_tas);

    println!("--- Fin de l'exercice ---");
} // 'mon_tableau_tas' sort de la portée ici.
  // La mémoire sur le tas contenant [999, 200, 300] est proprement libérée.
```

### Explications de la correction
* **Ligne 11** : La fonction `allouer_sur_tas` retourne un type `Box<[i32; 3]>`. En retournant cette Box, nous transférons la propriété du pointeur au `main`. C'est ce qui évite que la mémoire du tas soit libérée prématurément.
* **Ligne 23** : Nous utilisons le mot-clé `mut` (étudié dans le **Module 1.2**) car par défaut, toutes les variables en Rust sont immuables. Cela s'applique également aux données stockées sur le tas.
* **Sécurité** : À aucun moment nous n'avons eu besoin d'écrire `free()` ou `delete`. Rust a inséré le code de libération de mémoire de manière invisible à la ligne 31, garantissant l'absence totale de fuite de mémoire.