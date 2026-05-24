# Exercices d'Application : La Concurrence sans peur (Fearless Concurrency)

Ce cahier d'exercices pratiques a pour but de consolider vos compétences sur le partage sécurisé de données entre threads en Rust. Les exercices sont classés par ordre de difficulté progressive.

---

## Exercice 1 : Calcul de Somme Parallèle avec État Partagé (`Arc<Mutex<T>>`)

### Énoncé
Dans cet exercice, vous devez concevoir un programme qui calcule la somme d'un grand tableau d'entiers en divisant le travail entre plusieurs threads. 

Pour optimiser les performances et éviter la **contention de verrou** (le fait que plusieurs threads attendent constamment après le même `Mutex`), chaque thread devra d'abord calculer sa somme locale de manière indépendante. Une fois son calcul local terminé, chaque thread devra acquérir un verrou sur un compteur global partagé pour y ajouter son résultat.

#### Spécifications :
1. Créez un vecteur contenant les nombres de `1` à `100 000`.
2. Définissez un nombre de threads (par exemple, `4`).
3. Divisez le vecteur en morceaux (*chunks*) de taille égale, un pour chaque thread.
4. Créez un accumulateur global protégé par un `Mutex` et enveloppé dans un `Arc`.
5. Lancez les threads. Chaque thread doit calculer la somme de son morceau localement, puis ajouter ce résultat à l'accumulateur global.
6. Attendez la fin de tous les threads (`join`) et affichez la somme totale finale.

### Indices
1. Utilisez la méthode `.chunks()` sur les slices Rust pour découper facilement votre vecteur : `let morceaux = donnees.chunks(taille_morceau);`.
2. Pour passer le morceau de vecteur au thread enfant sans problème de durée de vie (*lifetime*), vous pouvez convertir le morceau en un vecteur indépendant (`morceau.to_vec()`) avant de le transférer via le mot-clé `move`.
3. Veillez à ce que l'acquisition du verrou `Mutex` ne se fasse **qu'après** la boucle de calcul local du thread.

### Correction Détaillée

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // 1. Préparation des données
    let limites = 100_000;
    let donnees: Vec<u64> = (1..=limites).collect();
    
    // Définition du nombre de threads
    let nb_threads = 4;
    let taille_morceau = donnees.len() / nb_threads;

    // 2. Initialisation de l'accumulateur global partagé
    let somme_globale = Arc::new(Mutex::new(0u64));
    let mut handles = vec![];

    println!("[Système] Début du calcul parallèle sur {} threads...", nb_threads);

    // 3. Découpage et distribution du travail
    for (i, morceau) in donnees.chunks(taille_morceau).enumerate() {
        // Cloner l'Arc pour le thread enfant
        let somme_partagee = Arc::clone(&somme_globale);
        
        // Copie locale du morceau pour le transférer au thread en toute propriété
        let donnees_locales = morceau.to_vec();

        let handle = thread::spawn(move || {
            // Calcul local : aucune synchronisation requise ici (très rapide !)
            let somme_locale: u64 = donnees_locales.iter().sum();
            println!(" -> [Thread {}] Somme locale calculée : {}", i, somme_locale);

            // Section critique : mise à jour de l'état partagé
            // Le verrou n'est acquis que pour une opération ultra-rapide
            let mut garde = somme_partagee.lock().unwrap();
            *garde += somme_locale;
            // Le verrou est automatiquement libéré ici à la fin de la portée du thread
        });
        
        handles.push(handle);
    }

    // 4. Attente de la fin de tous les threads
    for handle in handles {
        handle.join().unwrap();
    }

    // 5. Affichage du résultat final
    let resultat_final = *somme_globale.lock().unwrap();
    println!("[Système] Calcul terminé !");
    println!("Somme totale calculée : {}", resultat_final);
    
    // Vérification mathématique : (n * (n + 1)) / 2
    let verification = (limites * (limites + 1)) / 2;
    assert_eq!(resultat_final, verification);
    println!("Vérification réussie : {} == {}", resultat_final, verification);
}
```

---

## Exercice 2 : Système de Journalisation Centralisé (MPSC & Cycle de vie)

### Énoncé
Dans les architectures de serveurs, il est courant d'avoir plusieurs threads de traitement (workers) qui génèrent des logs, et un seul thread dédié à l'écriture de ces logs (dans la console ou un fichier) afin d'éviter que les affichages ne s'entremêlent de façon chaotique.

Vous devez concevoir un système de journalisation asynchrone en utilisant un canal de communication multi-producteur, mono-consommateur (`mpsc`).

#### Spécifications :
1. Créez un canal `mpsc` acceptant des chaînes de caractères (`String`).
2. Lancez un thread "Logger" (le consommateur) qui écoute en continu sur le canal et affiche chaque message reçu avec un préfixe d'horodatage simulé (ex: `[LOG] : ...`).
3. Lancez 3 threads "Workers" (les producteurs). Chaque worker doit simuler une tâche en cours (avec un court `sleep`), puis envoyer un message de statut au Logger (ex: `[Worker 1] Étape A complétée`).
4. Le thread principal doit attendre que tous les workers aient terminé leur exécution.
5. **Défi de cycle de vie :** Assurez-vous que le thread "Logger" s'arrête proprement de lui-même une fois que tous les workers ont fini de travailler et qu'il n'y a plus aucun message à traiter.

### Indices
1. Pour que le thread "Logger" s'arrête, la boucle `for message in rx` doit se terminer. Cette boucle ne se termine que lorsque **tous** les émetteurs (`tx`) associés au canal sont détruits (sortis de la portée ou explicitement supprimés avec `drop`).
2. Attention à l'émetteur original créé dans le thread principal : si vous ne le détruisez pas dans le thread principal après avoir lancé les workers, le récepteur attendra indéfiniment.

### Correction Détaillée

```rust
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    // 1. Création du canal MPSC
    let (tx, rx) = mpsc::channel::<String>();

    // 2. Lancement du thread Logger (Consommateur)
    let logger_handle = thread::spawn(move || {
        println!("[Logger] Démarrage du thread de journalisation...");
        // La boucle s'arrêtera d'elle-même quand tous les 'tx' seront détruits
        for message in rx {
            println!("[LOG] {}", message);
        }
        println!("[Logger] Tous les émetteurs sont fermés. Arrêt du Logger.");
    });

    // Vecteur pour stocker les handles des workers
    let mut worker_handles = vec![];

    // 3. Lancement de 3 threads Workers (Producteurs)
    for id in 1..=3 {
        // On clone l'émetteur pour chaque worker
        let tx_clone = tx.clone();

        let handle = thread::spawn(move || {
            tx_clone.send(format!("Worker {} : Initialisation", id)).unwrap();
            
            // Simulation d'un travail
            thread::sleep(Duration::from_millis(100 * id));
            tx_clone.send(format!("Worker {} : Étape 1 terminée", id)).unwrap();
            
            thread::sleep(Duration::from_millis(150 * id));
            tx_clone.send(format!("Worker {} : Tâche accomplie avec succès !", id)).unwrap();
            
            // L'émetteur 'tx_clone' sort de la portée et est détruit ici
        });
        worker_handles.push(handle);
    }

    // 4. Étape cruciale : Détruire l'émetteur original possédé par le main
    // Si on oublie cette ligne, le logger restera bloqué en attente car le 'tx' du main est toujours actif.
    drop(tx);

    // 5. Attente de la fin des workers
    for handle in worker_handles {
        handle.join().unwrap();
    }
    println!("[Système] Tous les workers ont terminé leur travail.");

    // 6. Attente de la fin du Logger
    // Le logger va consommer les derniers messages restants dans le canal, puis s'arrêter.
    logger_handle.join().unwrap();
    println!("[Système] Fin du programme.");
}
```

---

## Exercice 3 : Éviter les Verrous Mortels (Deadlocks) dans un Système de Transactions (Avancé)

### Énoncé
Dans cet exercice, nous allons simuler un système de transferts de fonds entre des comptes bancaires de manière concurrente. Chaque compte est représenté par une structure contenant un identifiant unique et un solde protégé par un `Mutex`.

Si le Thread 1 tente de transférer de l'argent du Compte A vers le Compte B (en verrouillant A puis B), et que simultanément le Thread 2 tente de transférer du Compte B vers le Compte A (en verrouillant B puis A), un **Deadlock (verrou mortel)** va se produire.

Votre tâche est d'implémenter une fonction de transfert sécurisée qui prévient activement les deadlocks en utilisant la technique de l'**ordonnancement des verrous** (*Lock Ordering*).

#### Spécifications :
1. Créez une structure `Compte` avec un `id: u32` et `solde: Mutex<i32>`.
2. Implémentez une fonction `transferer(source: &Compte, destination: &Compte, montant: i32)` :
   * Cette fonction doit acquérir les verrous des deux comptes.
   * Pour éviter les deadlocks, elle doit **toujours verrouiller en premier le compte ayant le plus petit ID**, quel que soit l'ordre des paramètres passés à la fonction.
3. Dans le `main`, créez deux comptes enveloppés dans des `Arc`.
4. Lancez deux threads effectuant des transactions croisées intensives (l'un fait A -> B, l'autre fait B -> A) dans une boucle de 1000 itérations.
5. Vérifiez qu'aucun deadlock ne se produit et que les soldes finaux sont corrects.

### Indices
1. Comparez les identifiants : `if source.id < destination.id { ... } else { ... }`.
2. Dans chaque branche du `if`, verrouillez les mutex dans l'ordre établi par votre comparaison, puis effectuez le transfert de solde.
3. Utilisez des variables temporaires pour stocker les gardes de verrous (`_garde1`, `_garde2`) afin de maintenir les verrous actifs pendant toute la durée de la transaction locale.

### Correction Détaillée

```rust
use std::sync::{Arc, Mutex};
use std::thread;

// 1. Définition de la structure de données
struct Compte {
    id: u32,
    solde: Mutex<i32>,
}

// 2. Fonction de transfert sécurisée contre les deadlocks
fn transferer(compte_a: &Compte, compte_b: &Compte, montant: i32) {
    // Si les IDs sont identiques, c'est le même compte (pas de transfert nécessaire)
    if compte_a.id == compte_b.id {
        return;
    }

    // Ordonnancement des verrous (Lock Ordering)
    // On verrouille toujours le compte avec le plus petit ID en premier.
    let (_garde_premier, _garde_second) = if compte_a.id < compte_b.id {
        // On acquiert le verrou de A, puis de B
        let g_a = compte_a.solde.lock().unwrap();
        let g_b = compte_b.solde.lock().unwrap();
        (g_a, g_b)
    } else {
        // On acquiert le verrou de B, puis de A
        let g_b = compte_b.solde.lock().unwrap();
        let g_a = compte_a.solde.lock().unwrap();
        (g_a, g_b)
    };

    // À ce stade, les deux verrous sont acquis en toute sécurité.
    // Grâce au destructeur (RAII), ils seront libérés à la sortie de cette fonction.
    
    // Accès aux données internes via déréférencement des gardes de verrous mutables
    let mut solde_a = _garde_premier;
    let mut solde_b = _garde_second;

    if *solde_a >= montant {
        *solde_a -= montant;
        *solde_b += montant;
    }
}

fn main() {
    // 3. Initialisation des comptes enveloppés dans un Arc pour le partage
    let compte_1 = Arc::new(Compte {
        id: 1,
        solde: Mutex::new(1000),
    });

    let compte_2 = Arc::new(Compte {
        id: 2,
        solde: Mutex::new(1000),
    });

    println!("[Système] Soldes initiaux : Compte 1 = 1000€, Compte 2 = 1000€");
    println!("[Système] Lancement des transactions croisées concurrentes...");

    // Clone des références pour les threads
    let c1_t1 = Arc::clone(&compte_1);
    let c2_t1 = Arc::clone(&compte_2);

    // Thread 1 : Transfère de Compte 1 vers Compte 2 de manière répétée
    let t1 = thread::spawn(move || {
        for _ in 0..10_000 {
            transferer(&c1_t1, &c2_t1, 10);
        }
    });

    let c1_t2 = Arc::clone(&compte_1);
    let c2_t2 = Arc::clone(&compte_2);

    // Thread 2 : Transfère de Compte 2 vers Compte 1 de manière répétée
    let t2 = thread::spawn(move || {
        for _ in 0..10_000 {
            transferer(&c2_t2, &c1_t2, 10);
        }
    });

    // 4. Attente des threads
    t1.join().unwrap();
    t2.join().unwrap();

    // 5. Affichage et vérification des résultats
    let solde_final_1 = *compte_1.solde.lock().unwrap();
    let solde_final_2 = *compte_2.solde.lock().unwrap();

    println!("[Système] Toutes les transactions ont été exécutées avec succès !");
    println!("Solde final Compte 1 : {}€", solde_final_1);
    println!("Solde final Compte 2 : {}€", solde_final_2);
    println!("Somme totale des comptes : {}€ (Attendu : 2000€)", solde_final_1 + solde_final_2);

    assert_eq!(solde_final_1 + solde_final_2, 2000);
}
```