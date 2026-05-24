# Module 3.2 : Synchronisation GPU-GPU et CPU-GPU (Semaphores & Fences)

## 1. Introduction Conceptuelle

Pour comprendre la synchronisation dans Vulkan, il faut abandonner l'idée que le processeur (CPU) et la carte graphique (GPU) travaillent de concert, pas à pas. En programmation graphique moderne, le CPU et le GPU sont deux processeurs totalement indépendants qui s'échangent des données de manière **asynchrone**.

### Le problème de l'asynchronisme

Lorsque vous écrivez un programme C++ classique, chaque ligne de code s'exécute l'une après l'autre. Si vous écrivez :

```cpp
int x = 5;
int y = x + 2;
```

Vous êtes certain que `x` vaut `5` avant que `y` ne soit calculé. 

Dans Vulkan, ce n'est plus le cas entre le CPU et le GPU. Lorsque le CPU envoie des commandes de dessin au GPU (via les *Command Buffers* étudiés dans le Module 3.1), il ne fait que les mettre dans une file d'attente (*Queue*). Le CPU continue immédiatement son exécution sans attendre que le GPU ait fini de dessiner.

```
CPU: [Envoi Commandes Frame 1] ---> [Envoi Commandes Frame 2] ---> [Calculs Physiques...]
GPU:                                [Exécution Frame 1........................]
```

Sans synchronisation explicite, deux problèmes majeurs surviennent :
1. **La collision de ressources (Data Race) :** Le CPU tente de modifier la mémoire d'une image (par exemple pour la mettre à jour) alors que le GPU est encore en train de la lire pour l'afficher à l'écran. Cela provoque des déchirures d'écran (*tearing*) ou des plantages.
2. **Le débordement de commandes :** Le CPU, beaucoup plus rapide pour soumettre des commandes que le GPU pour les exécuter, s'emballe et s'épuise à allouer de la mémoire pour des milliers de trames en avance, provoquant une explosion de la consommation mémoire.

### La philosophie de Vulkan : "Explicit"

Contrairement aux anciennes API comme OpenGL qui géraient cette synchronisation en arrière-plan (au prix de performances imprévisibles et de ralentissements mystérieux), **Vulkan ne fait rien automatiquement**. C'est à vous, le développeur, d'indiquer précisément quel processeur doit attendre quel événement. 

Pour cela, Vulkan met à notre disposition deux outils principaux :
* **Les Fences (Barrières CPU-GPU)**
* **Les Semaphores (Sémaphores GPU-GPU)**

---

## 2. Fondations Théoriques

Pour concevoir une architecture de rendu stable, il est crucial de comprendre la différence fondamentale de cible entre les *Fences* et les *Semaphores*.

```
+-------------------------------------------------------------------+
|                           MÉMOIRE CPU                             |
|  [ Code C++ ]                                                     |
+-------------------------------------------------------------------+
       |                                                      ^
       | Soumet des commandes                                 | Attend (vkWaitForFences)
       v                                                      |
+-------------------------------------------------------------------+
|                           MÉMOIRE GPU                             |
|                                                                   |
|  [ Étape 1 : Acquisition ] --(Semaphore)--> [ Étape 2 : Rendu ]   |
|                                                     |             |
|                                                     +---(Fence)---+
+-------------------------------------------------------------------+
```

### A. Les Fences (Synchronisation CPU-GPU)

Une **Fence** (barrière) est un objet de synchronisation utilisé par le GPU pour signaler au CPU qu'un travail est terminé.

* **Direction :** GPU $\rightarrow$ CPU.
* **État :** Une Fence est un objet binaire. Elle est soit **Signalée** (le GPU a fini), soit **Non-signalée** (le GPU travaille ou n'a pas commencé).
* **Fonctionnement :** 
  1. Le CPU soumet un travail au GPU et lui associe une Fence.
  2. Le CPU continue ses calculs.
  3. Arrivé à un point où le CPU a absolument besoin des résultats du GPU, il appelle la fonction `vkWaitForFences`. Le CPU s'arrête et "dort" tant que la Fence n'est pas passée à l'état "Signalée".
  4. Une fois le signal reçu, le CPU doit **manuellement réinitialiser** la Fence à l'état "Non-signalé" via `vkResetFences` avant de pouvoir la réutiliser pour la trame suivante.

### B. Les Semaphores (Synchronisation GPU-GPU)

Un **Semaphore** est utilisé pour coordonner des opérations au sein même du GPU, souvent entre différentes files d'attente (*Queues*) ou différentes étapes d'une même pipeline. Le CPU n'attend jamais directement sur un sémaphore.

* **Direction :** GPU $\rightarrow$ GPU.
* **État :** Binaire (dans sa forme classique). Signalé ou Non-signalé.
* **Fonctionnement :**
  1. Une opération GPU $A$ (ex: acquérir une image de la Swapchain) est lancée et configurée pour *signaler* un sémaphore $S$ lorsqu'elle est terminée.
  2. Une opération GPU $B$ (ex: dessiner sur l'image) est soumise en même temps, mais on lui donne une consigne : "Attends que le sémaphore $S$ soit signalé avant de commencer l'étape d'écriture des pixels".
  3. Le GPU gère cela en interne, de manière extrêmement efficace, sans jamais faire intervenir le CPU.
  4. Contrairement aux Fences, les sémaphores sont **automatiquement réinitialisés** à l'état non-signalé dès qu'une opération GPU a consommé l'attente.

### C. Les étapes de la Pipeline (Pipeline Stages)

Pour éviter de bloquer l'intégralité du GPU, Vulkan permet d'associer l'attente d'un sémaphore à une étape précise de la pipeline graphique (*Pipeline Stage*).

Par exemple, lors du rendu d'une trame, nous n'avons pas besoin de bloquer l'étape de lecture des sommets géométriques (*Vertex Input*) tant que l'image de la Swapchain n'est pas prête. Nous devons uniquement bloquer l'étape d'écriture des couleurs sur l'image (*Color Attachment Output*). Cela permet au GPU de commencer à traiter la géométrie 3D en parallèle, optimisant ainsi grandement les performances.

### Tableau Comparatif Récapitulatif

| Caractéristique | Fence (Barrière) | Semaphore (Sémaphore) |
| :--- | :--- | :--- |
| **Cible de l'attente** | Le CPU (votre code C++) | Le GPU (les files d'attente internes) |
| **Signalé par** | Le GPU (fin d'un lot de commandes) | Le GPU (fin d'une tâche spécifique) |
| **Attendu par** | Le CPU via `vkWaitForFences` | Le GPU via la soumission de commandes |
| **Réinitialisation** | Manuelle par le CPU (`vkResetFences`) | Automatique par l'API après consommation |
| **Usage typique** | Éviter que le CPU ne prépare la trame $N+2$ avant que la trame $N$ ne soit finie sur le GPU. | Attendre que l'image de l'écran soit disponible avant de dessiner dessus. |

---

## 3. Implémentation Pratique Pas-à-Pas

Nous allons maintenant écrire le code C++ nécessaire pour créer et configurer ces objets de synchronisation. Nous allons concevoir un système de synchronisation pour gérer **plusieurs trames en vol** (*Frames in Flight*), une technique standard qui permet au CPU de préparer la trame suivante pendant que le GPU dessine la trame en cours.

### Rappel C++ pour les débutants : L'initialisation dans Vulkan

Dans Vulkan, presque toutes les créations d'objets suivent le même schéma :
1. On remplit une structure de configuration de type `Vk...CreateInfo`.
2. On appelle une fonction de création de type `vkCreate...`.
3. On vérifie que la fonction renvoie `VK_SUCCESS` (un type énuméré `VkResult`).

### Étape 1 : Définition des variables membres

Dans votre classe de rendu (par exemple `HelloTriangleApplication`), nous devons stocker les handles (pointeurs opaques Vulkan) de nos objets de synchronisation. Nous allons utiliser un système à double tampon (*Double Buffering*), donc nous définissons une constante :

```cpp
#include <vulkan/vulkan.h>
#include <vector>
#include <stdexcept>

// Nous permettons d'avoir au maximum 2 trames en cours de traitement simultané
const int MAX_FRAMES_IN_FLIGHT = 2;

class HelloTriangleApplication {
private:
    VkDevice device; // Supposé initialisé dans le Module 1.1

    // Listes d'objets de synchronisation (un par trame en vol)
    std::vector<VkSemaphore> imageAvailableSemaphores;
    std::vector<VkSemaphore> renderFinishedSemaphores;
    std::vector<VkFence> inFlightFences;

    // Index pour suivre la trame logique actuelle (0 ou 1)
    size_t currentFrame = 0;

    void createSyncObjects();
    void cleanup();
};
```

### Étape 2 : Création des Sémaphores

La création d'un sémaphore est extrêmement simple car la structure `VkSemaphoreCreateInfo` ne contient aucun paramètre complexe.

```cpp
void HelloTriangleApplication::createSyncObjects() {
    // Redimensionner nos conteneurs pour accueillir les objets de chaque trame
    imageAvailableSemaphores.resize(MAX_FRAMES_IN_FLIGHT);
    renderFinishedSemaphores.resize(MAX_FRAMES_IN_FLIGHT);
    inFlightFences.resize(MAX_FRAMES_IN_FLIGHT);

    // Structure de configuration commune pour les sémaphores
    VkSemaphoreCreateInfo semaphoreInfo{};
    semaphoreInfo.sType = VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO;
    semaphoreInfo.pNext = nullptr; // Réservé pour des extensions futures
    semaphoreInfo.flags = 0;       // Réservé pour un usage futur
```

### Étape 3 : Création des Fences (Le piège du démarrage)

C'est ici que réside le piège le plus classique de Vulkan. Si nous créons une Fence par défaut, elle est créée à l'état **Non-signalé**. 

Lors de la toute première trame de notre boucle de rendu, notre code va appeler `vkWaitForFences` pour s'assurer que le GPU a fini de travailler. Mais comme aucun travail n'a encore été soumis, la Fence ne sera jamais signalée. Le programme va alors se bloquer indéfiniment (un *Deadlock* ou gel complet de l'application).

Pour résoudre cela, nous devons créer la Fence directement à l'état **Signalé** en utilisant le flag `VK_FENCE_CREATE_SIGNALED_BIT`.

```cpp
    VkFenceCreateInfo fenceInfo{};
    fenceInfo.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
    fenceInfo.pNext = nullptr;
    // TRÈS IMPORTANT : Initialiser la Fence à l'état signalé
    fenceInfo.flags = VK_FENCE_CREATE_SIGNALED_BIT;

    // Boucle de création pour chaque trame en vol
    for (size_t i = 0; i < MAX_FRAMES_IN_FLIGHT; i++) {
        // Création du sémaphore d'acquisition d'image
        if (vkCreateSemaphore(device, &semaphoreInfo, nullptr, &imageAvailableSemaphores[i]) != VK_SUCCESS) {
            throw std::runtime_error("Erreur : Impossible de creer le semaphore d'acquisition d'image !");
        }

        // Création du sémaphore de fin de rendu
        if (vkCreateSemaphore(device, &semaphoreInfo, nullptr, &renderFinishedSemaphores[i]) != VK_SUCCESS) {
            throw std::runtime_error("Erreur : Impossible de creer le semaphore de fin de rendu !");
        }

        // Création de la Fence de synchronisation CPU-GPU
        if (vkCreateFence(device, &fenceInfo, nullptr, &inFlightFences[i]) != VK_SUCCESS) {
            throw std::runtime_error("Erreur : Impossible de creer la Fence de synchronisation !");
        }
    }
}
```

### Étape 4 : Nettoyage des ressources (Destruction)

Comme pour toute ressource allouée dans Vulkan, il est impératif de détruire explicitement ces objets lorsque l'application se ferme pour éviter les fuites de mémoire. La destruction doit se faire **après** s'être assuré que le GPU a totalement fini de travailler.

```cpp
void HelloTriangleApplication::cleanup() {
    // Attendre que le GPU soit complètement inactif avant de détruire les objets
    vkDeviceWaitIdle(device);

    for (size_t i = 0; i < MAX_FRAMES_IN_FLIGHT; i++) {
        vkDestroySemaphore(device, imageAvailableSemaphores[i], nullptr);
        vkDestroySemaphore(device, renderFinishedSemaphores[i], nullptr);
        vkDestroyFence(device, inFlightFences[i], nullptr);
    }

    // Le reste du nettoyage du périphérique (VkDevice) se fait après...
}
```

---

## 4. Pièges Fréquents et Bonnes Pratiques

### 1. Le Deadlock de la première trame
* **Le Piège :** Omettre le flag `VK_FENCE_CREATE_SIGNALED_BIT` lors de la création de la Fence.
* **Le Symptôme :** L'application s'ouvre sur une fenêtre noire et se fige instantanément sans aucun message d'erreur.
* **La Solution :** Toujours s'assurer que les Fences contrôlant le flux principal de la boucle de rendu soient créées à l'état signalé.

### 2. Oublier de réinitialiser la Fence (`vkResetFences`)
* **Le Piège :** Appeler `vkWaitForFences` mais oublier d'appeler `vkResetFences` avant de soumettre à nouveau le travail au GPU.
* **Le Symptôme :** Le CPU n'attend plus du tout le GPU après la première trame. Le CPU s'emballe, ce qui provoque des corruptions graphiques massives ou des crashs aléatoires du pilote graphique (souvent une erreur de type `Device Lost`).
* **La Solution :** Le flux logique doit toujours être : 
  `vkWaitForFences` $\rightarrow$ `vkResetFences` $\rightarrow$ `vkQueueSubmit`.

### 3. La sur-synchronisation (Stall)
* **Le Piège :** Utiliser une seule Fence globale (`MAX_FRAMES_IN_FLIGHT = 1`).
* **Le Symptôme :** Le jeu fonctionne correctement mais les performances (FPS) sont extrêmement basses, car le CPU attend que le GPU ait fini d'afficher la trame $N$ avant même de commencer à calculer la trame $N+1$. Le GPU et le CPU passent la moitié de leur temps à s'attendre mutuellement.
* **La Solution :** Utiliser le double-buffering (2 trames en vol) ou le triple-buffering (3 trames en vol). Cela permet de paralléliser le travail : pendant que le GPU dessine la trame 0, le CPU prépare déjà les commandes de la trame 1.

---

## 5. Synthèse Pédagogique

Pour bien fixer les idées, voici le déroulement chronologique exact de la synchronisation lors de l'affichage d'une trame (ce flux sera implémenté en détail dans le Module 3.3) :

```
[ ÉTAPE CPU ]
1. Attendre que la trame précédente soit finie : vkWaitForFences(inFlightFences[currentFrame])
2. Verrouiller la Fence pour le nouveau travail : vkResetFences(inFlightFences[currentFrame])

[ ÉTAPE GPU - ACQUISITION ]
3. Demander une image à la Swapchain. 
   Le GPU signalera 'imageAvailableSemaphores[currentFrame]' quand elle sera prête.

[ ÉTAPE GPU - RENDU ]
4. Soumettre les commandes de dessin à la Queue.
   - Configurer pour ATTENDRE : 'imageAvailableSemaphores[currentFrame]'
   - Configurer pour SIGNALER en fin de rendu : 'renderFinishedSemaphores[currentFrame]'
   - Associer la Fence 'inFlightFences[currentFrame]' pour qu'elle se signale à la toute fin.

[ ÉTAPE GPU - PRÉSENTATION ]
5. Envoyer l'image dessinée à l'écran.
   - Configurer pour ATTENDRE : 'renderFinishedSemaphores[currentFrame]'

6. Passer à la trame suivante : currentFrame = (currentFrame + 1) % MAX_FRAMES_IN_FLIGHT
```

---

## 6. Exercice Pratique d'Application

### Énoncé
Dans cet exercice, vous devez concevoir une classe C++ autonome nommée `VulkanSyncManager`. Cette classe doit encapsuler la création, la gestion et la destruction de tous les objets de synchronisation nécessaires pour un nombre variable de trames en vol ($N$). 

L'objectif est de fournir une interface propre pour éviter de polluer le code principal de votre moteur de rendu.

### Spécifications de la classe :
1. Le constructeur doit prendre en paramètre une référence vers le périphérique logique `VkDevice` et le nombre de trames en vol souhaité.
2. Elle doit exposer une méthode `initialize()` qui crée les ressources.
3. Elle doit exposer des accesseurs (`getters`) pour récupérer le sémaphore d'acquisition, le sémaphore de rendu et la Fence pour une trame d'index donné.
4. Elle doit exposer une méthode `waitAndResetFence(size_t frameIndex)` qui gère proprement l'attente et la réinitialisation de la Fence de la trame active.
5. Elle doit gérer sa propre destruction proprement dans son destructeur.

### Indices
* Pensez à stocker le `VkDevice` en tant que variable membre pour pouvoir détruire les objets dans le destructeur.
* Utilisez `std::vector` pour stocker dynamiquement les objets de synchronisation en fonction du paramètre passé au constructeur.
* Rappel de la signature de `vkWaitForFences` :
  ```cpp
  VkResult vkWaitForFences(
      VkDevice device,
      uint32_t fenceCount,
      const VkFence* pFences,
      VkBool32 waitAll,
      uint64_t timeout
  );
  ```
  Pour attendre indéfiniment une seule Fence, utilisez `waitAll = VK_TRUE` et `timeout = UINT64_MAX`.

---

### Correction de l'Exercice

Voici l'implémentation complète et rigoureuse de la classe `VulkanSyncManager`.

```cpp
#include <vulkan/vulkan.h>
#include <vector>
#include <stdexcept>
#include <iostream>

class VulkanSyncManager {
private:
    VkDevice m_device;
    size_t m_maxFramesInFlight;

    std::vector<VkSemaphore> m_imageAvailableSemaphores;
    std::vector<VkSemaphore> m_renderFinishedSemaphores;
    std::vector<VkFence> m_inFlightFences;

public:
    // Constructeur
    VulkanSyncManager(VkDevice device, size_t maxFramesInFlight)
        : m_device(device), m_maxFramesInFlight(maxFramesInFlight) {}

    // Destructeur automatique
    ~VulkanSyncManager() {
        cleanup();
    }

    // Initialisation des ressources
    void initialize() {
        m_imageAvailableSemaphores.resize(m_maxFramesInFlight);
        m_renderFinishedSemaphores.resize(m_maxFramesInFlight);
        m_inFlightFences.resize(m_maxFramesInFlight);

        // Configuration des Sémaphores
        VkSemaphoreCreateInfo semaphoreInfo{};
        semaphoreInfo.sType = VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO;

        // Configuration des Fences (avec le flag de signalement initial !)
        VkFenceCreateInfo fenceInfo{};
        fenceInfo.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
        fenceInfo.flags = VK_FENCE_CREATE_SIGNALED_BIT;

        for (size_t i = 0; i < m_maxFramesInFlight; ++i) {
            if (vkCreateSemaphore(m_device, &semaphoreInfo, nullptr, &m_imageAvailableSemaphores[i]) != VK_SUCCESS ||
                vkCreateSemaphore(m_device, &semaphoreInfo, nullptr, &m_renderFinishedSemaphores[i]) != VK_SUCCESS) {
                throw std::runtime_error("Echec de la creation des semaphores pour la trame " + std::to_string(i));
            }

            if (vkCreateFence(m_device, &fenceInfo, nullptr, &m_inFlightFences[i]) != VK_SUCCESS) {
                throw std::runtime_error("Echec de la creation de la Fence pour la trame " + std::to_string(i));
            }
        }
        std::cout << "VulkanSyncManager : Initialisation reussie avec " << m_maxFramesInFlight << " trames en vol." << std::endl;
    }

    // Attente et réinitialisation de la Fence pour la trame courante
    void waitAndResetFence(size_t frameIndex) {
        if (frameIndex >= m_maxFramesInFlight) {
            throw std::out_of_range("Index de trame hors limites !");
        }

        // 1. Attendre que le GPU ait fini d'utiliser les ressources de cette trame logique
        // Nous passons 1 en nombre de fences, et l'adresse de notre fence dans le vecteur.
        vkWaitForFences(m_device, 1, &m_inFlightFences[frameIndex], VK_TRUE, UINT64_MAX);

        // 2. Réinitialiser manuellement la Fence pour bloquer le CPU au prochain tour
        vkResetFences(m_device, 1, &m_inFlightFences[frameIndex]);
    }

    // Getters pour l'intégration dans la boucle de rendu
    VkSemaphore getImageAvailableSemaphore(size_t frameIndex) const {
        return m_imageAvailableSemaphores[frameIndex];
    }

    VkSemaphore getRenderFinishedSemaphore(size_t frameIndex) const {
        return m_renderFinishedSemaphores[frameIndex];
    }

    VkFence getFence(size_t frameIndex) const {
        return m_inFlightFences[frameIndex];
    }

private:
    // Nettoyage interne
    void cleanup() {
        // S'assurer que le périphérique n'est pas en train de travailler avant de détruire
        if (m_device != VK_NULL_HANDLE) {
            vkDeviceWaitIdle(m_device);

            for (size_t i = 0; i < m_maxFramesInFlight; ++i) {
                if (m_imageAvailableSemaphores[i] != VK_NULL_HANDLE) {
                    vkDestroySemaphore(m_device, m_imageAvailableSemaphores[i], nullptr);
                }
                if (m_renderFinishedSemaphores[i] != VK_NULL_HANDLE) {
                    vkDestroySemaphore(m_device, m_renderFinishedSemaphores[i], nullptr);
                }
                if (m_inFlightFences[i] != VK_NULL_HANDLE) {
                    vkDestroyFence(m_device, m_inFlightFences[i], nullptr);
                }
            }
        }
        std::cout << "VulkanSyncManager : Ressources de synchronisation liberees." << std::endl;
    }
};
```

### Explication de la correction
* **Encapsulation RAII :** Le destructeur appelle automatiquement `cleanup()`, garantissant qu'aucune fuite de mémoire ne se produira, même en cas d'exception dans le reste du programme.
* **Sécurité :** La méthode `waitAndResetFence` effectue une vérification de sécurité sur l'index de la trame pour éviter des accès mémoire invalides dans le `std::vector`.
* **Propreté du code :** En utilisant cette classe dans notre boucle principale, le code de rendu sera allégé de dizaines de lignes de configuration de bas niveau, le rendant beaucoup plus lisible pour la suite du cours (Module 3.3).