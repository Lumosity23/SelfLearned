# Module 1.2 : Familles de files d'attente (Queue Families) et Fenêtrage (WSI)

---

## 1. Introduction Conceptuelle

### Le "Pourquoi" : La philosophie asynchrone de Vulkan
Dans les anciennes API graphiques (comme OpenGL), le processeur (CPU) envoyait des commandes au processeur graphique (GPU) de manière synchrone et implicite. Le GPU était vu comme une boîte noire qui exécutait les instructions immédiatement ou presque. 

Vulkan rompt totalement avec ce modèle pour se rapprocher de la réalité matérielle des cartes graphiques modernes. Un GPU moderne est un coprocesseur hautement parallèle et asynchrone. Pour lui donner du travail, nous devons déposer des paquets d'instructions (appelés *Command Buffers*) dans des **files d'attente** (ou **Queues**). Le GPU pioche ensuite dans ces files pour exécuter les tâches à son propre rythme.

```
+------------------+     Soumission     +-------------------------+
|   CPU (Notre     |  ----------------> |  File d'attente (Queue) |
|   Application)   |                    +-------------------------+
+------------------+                                 |
                                                     v
                                        +-------------------------+
                                        |      GPU (Moteur de     |
                                        |     rendu matériel)     |
                                        +-------------------------+
```

### Qu'est-ce qu'une "Famille de files d'attente" (Queue Family) ?
Sur une carte graphique, tous les circuits intégrés ne sont pas identiques. Certains circuits sont spécialisés dans le calcul mathématique lourd, d'autres dans le transfert ultra-rapide de mémoire, et d'autres dans le rendu de triangles (la rastérisation).

Vulkan regroupe ces files d'attente par **Familles** (Queue Families). Chaque famille possède des capacités spécifiques :
*   **Graphique (Graphics)** : Capable de dessiner des triangles, d'exécuter des shaders de fragments, etc.
*   **Calcul (Compute)** : Capable de lancer des calculs massivement parallèles (GPGPU), par exemple pour de la physique ou de l'intelligence artificielle.
*   **Transfert (Transfer)** : Spécialisée dans la copie ultra-rapide de données entre la mémoire système (RAM) et la mémoire vidéo (VRAM).
*   **Présentation (Present)** : Capable d'envoyer l'image finale à l'écran pour l'afficher à l'utilisateur.

### Le problème du fenêtrage : L'indépendance de Vulkan
Par conception, Vulkan est une API **multiplateforme et agnostique**. Cela signifie qu'elle ne sait pas ce qu'est une fenêtre Windows (Win32), une fenêtre Linux (X11 ou Wayland) ou une application macOS. Vulkan sait uniquement calculer des pixels et les écrire dans de la mémoire.

Pour afficher ces pixels dans une fenêtre système, nous avons besoin d'une extension appelée **WSI (Window System Integration)**. Le WSI introduit deux concepts clés :
1.  **La Surface (`VkSurfaceKHR`)** : Une abstraction Vulkan représentant la fenêtre de notre système d'exploitation.
2.  **La file de présentation (Present Queue)** : Une file d'attente capable de prendre une image calculée par le GPU et de l'envoyer à la Surface.

---

## 2. Fondations Théoriques

### 1. Les Familles de files d'attente sous la loupe
Chaque GPU physique expose un certain nombre de familles de files d'attente. Pour chaque famille, nous pouvons interroger ses propriétés via la structure `VkQueueFamilyProperties`. Cette structure contient notamment :
*   `queueFlags` : Un masque de bits indiquant les capacités (ex: `VK_QUEUE_GRAPHICS_BIT`, `VK_QUEUE_COMPUTE_BIT`, `VK_QUEUE_TRANSFER_BIT`).
*   `queueCount` : Le nombre de files d'attente physiques disponibles dans cette famille précise.

### 2. Le mécanisme du WSI (Window System Integration)
Comme le WSI fait partie des extensions optionnelles de Vulkan (car un serveur de calcul sans écran n'en a pas besoin), son nom contient le suffixe `KHR` (Khronos Group).

Pour faire du fenêtrage, nous devons activer :
1.  **Au niveau de l'Instance** : Des extensions pour créer la surface (ex: `VK_KHR_surface` combinée avec `VK_KHR_win32_surface` sur Windows).
2.  **Au niveau du Logical Device** : L'extension de la Swapchain (`VK_KHR_swapchain`), qui gère la double/triple mise en mémoire tampon des images (ce point sera détaillé dans le *Module 1.3*).

### 3. La distinction cruciale : Graphique vs Présentation
Il est fondamental de comprendre qu'une file d'attente capable de faire des calculs graphiques (dessiner) n'est pas obligatoirement capable d'afficher le résultat sur votre écran. 

*   **File Graphique** : Écrit dans une texture en mémoire.
*   **File de Présentation** : Communique avec le système d'exploitation pour afficher cette texture.

Sur la majorité des ordinateurs de bureau modernes, la même famille de files d'attente supporte à la fois le graphisme et la présentation. Cependant, sur des architectures mobiles ou des configurations multi-GPU (ordinateurs portables avec GPU intégré Intel/AMD et GPU dédié NVIDIA/AMD), ces deux tâches peuvent être gérées par des familles différentes. Notre code doit impérativement être capable de gérer ces deux scénarios.

---

## 3. Implémentation Pratique Pas-à-Pas

Nous allons maintenant écrire le code C++ permettant de :
1.  Initialiser une fenêtre avec la bibliothèque **GLFW**.
2.  Créer la surface de rendu Vulkan (`VkSurfaceKHR`).
3.  Rechercher les indices des familles de files d'attente (Graphique et Présentation).
4.  Créer le périphérique logique (`VkDevice`) en activant ces files d'attente.
5.  Récupérer les poignées (`VkQueue`) pour pouvoir les utiliser plus tard.

### Rappel C++ pour les débutants
*   `std::optional<uint32_t>` : Un conteneur introduit en C++17 qui peut ou non contenir une valeur. Très utile pour représenter un index de file d'attente qui n'a pas encore été trouvé.
*   `std::set` : Une collection d'éléments uniques. Nous l'utiliserons pour éviter de créer deux fois la même file d'attente si l'index graphique et l'index de présentation sont identiques.

### Code Source Complet et Structuré

```cpp
#define GLFW_INCLUDE_VULKAN
#include <GLFW/glfw3.h>

#include <iostream>
#include <vector>
#include <optional>
#include <set>
#include <stdexcept>

// Structure regroupant les indices des familles de files d'attente dont nous avons besoin
struct QueueFamilyIndices {
    std::optional<uint32_t> graphicsFamily;
    std::optional<uint32_t> presentFamily;

    // Vérifie si toutes les files d'attente requises ont été trouvées
    bool isComplete() const {
        return graphicsFamily.has_value() && presentFamily.has_value();
    }
};

class VulkanApplication {
public:
    void run() {
        initWindow();
        initVulkan();
        mainLoop();
        cleanup();
    }

private:
    // Variables membres
    GLFWwindow* window = nullptr;
    VkInstance instance = VK_NULL_HANDLE;
    VkSurfaceKHR surface = VK_NULL_HANDLE;
    VkPhysicalDevice physicalDevice = VK_NULL_HANDLE;
    VkDevice device = VK_NULL_HANDLE;
    
    // Poignées vers nos files d'attente (récupérées après la création du Device)
    VkQueue graphicsQueue = VK_NULL_HANDLE;
    VkQueue presentQueue = VK_NULL_HANDLE;

    const uint32_t WIDTH = 800;
    const uint32_t HEIGHT = 600;

    // 1. Initialisation de la fenêtre avec GLFW
    void initWindow() {
        if (!glfwInit()) {
            throw std::runtime_error("Échec de l'initialisation de GLFW");
        }

        // Indiquer à GLFW de ne pas charger l'API OpenGL par défaut
        glfwWindowHint(GLFW_CLIENT_API, GLFW_NO_API);
        // Désactiver la possibilité de redimensionner la fenêtre pour simplifier ce module
        glfwWindowHint(GLFW_RESIZABLE, GLFW_FALSE);

        window = glfwCreateWindow(WIDTH, HEIGHT, "Vulkan - Files d'attente & WSI", nullptr, nullptr);
        if (!window) {
            throw std::runtime_error("Échec de la création de la fenêtre GLFW");
        }
    }

    // 2. Initialisation de Vulkan
    void initVulkan() {
        createInstance();
        createSurface();      // La surface doit être créée juste après l'instance !
        pickPhysicalDevice();
        createLogicalDevice();
    }

    // Création de l'Instance Vulkan (Concept vu dans le Module 1.1)
    void createInstance() {
        VkApplicationInfo appInfo{};
        appInfo.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
        appInfo.pApplicationName = "Vulkan App";
        appInfo.applicationVersion = VK_MAKE_VERSION(1, 0, 0);
        appInfo.pEngineName = "No Engine";
        appInfo.engineVersion = VK_MAKE_VERSION(1, 0, 0);
        appInfo.apiVersion = VK_API_VERSION_1_0;

        VkInstanceCreateInfo createInfo{};
        createInfo.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
        createInfo.pApplicationInfo = &appInfo;

        // Récupération des extensions requises par GLFW pour le fenêtrage
        uint32_t glfwExtensionCount = 0;
        const char** glfwExtensions = glfwGetRequiredInstanceExtensions(&glfwExtensionCount);

        createInfo.enabledExtensionCount = glfwExtensionCount;
        createInfo.ppEnabledExtensionNames = glfwExtensions;
        createInfo.enabledLayerCount = 0;

        if (vkCreateInstance(&createInfo, nullptr, &instance) != VK_SUCCESS) {
            throw std::runtime_error("Échec de la création de l'instance Vulkan");
        }
    }

    // 3. Création de la Surface (WSI)
    void createSurface() {
        // GLFW encapsule les appels système complexes (Win32, X11, Cocoa) 
        // et crée la VkSurfaceKHR de manière portable.
        if (glfwCreateWindowSurface(instance, window, nullptr, &surface) != VK_SUCCESS) {
            throw std::runtime_error("Échec de la création de la surface de fenêtre");
        }
    }

    // Sélection du GPU Physique (Concept initié dans le Module 1.1, complété ici)
    void pickPhysicalDevice() {
        uint32_t deviceCount = 0;
        vkEnumeratePhysicalDevices(instance, &deviceCount, nullptr);

        if (deviceCount == 0) {
            throw std::runtime_error("Aucun GPU supportant Vulkan n'a été trouvé");
        }

        std::vector<VkPhysicalDevice> devices(deviceCount);
        vkEnumeratePhysicalDevices(instance, &deviceCount, devices.data());

        for (const auto& dev : devices) {
            if (isDeviceSuitable(dev)) {
                physicalDevice = dev;
                break;
            }
        }

        if (physicalDevice == VK_NULL_HANDLE) {
            throw std::runtime_error("Aucun GPU ne convient aux exigences de l'application");
        }
    }

    // Vérification de la compatibilité du GPU
    bool isDeviceSuitable(VkPhysicalDevice dev) {
        QueueFamilyIndices indices = findQueueFamilies(dev);
        return indices.isComplete();
    }

    // 4. Recherche des familles de files d'attente requises
    QueueFamilyIndices findQueueFamilies(VkPhysicalDevice dev) {
        QueueFamilyIndices indices;

        uint32_t queueFamilyCount = 0;
        vkGetPhysicalDeviceQueueFamilyProperties(dev, &queueFamilyCount, nullptr);

        std::vector<VkQueueFamilyProperties> queueFamilies(queueFamilyCount);
        vkGetPhysicalDeviceQueueFamilyProperties(dev, &queueFamilyCount, queueFamilies.data());

        int i = 0;
        for (const auto& queueFamily : queueFamilies) {
            // A. Vérification du support graphique
            if (queueFamily.queueFlags & VK_QUEUE_GRAPHICS_BIT) {
                indices.graphicsFamily = i;
            }

            // B. Vérification du support de la présentation
            VkBool32 presentSupport = false;
            vkGetPhysicalDeviceSurfaceSupportKHR(dev, i, surface, &presentSupport);

            if (presentSupport) {
                indices.presentFamily = i;
            }

            // Si on a trouvé toutes nos files, on arrête la recherche
            if (indices.isComplete()) {
                break;
            }

            i++;
        }

        return indices;
    }

    // 5. Création du Périphérique Logique (Logical Device) et récupération des Queues
    void createLogicalDevice() {
        QueueFamilyIndices indices = findQueueFamilies(physicalDevice);

        // Nous utilisons un std::set pour stocker les indices uniques.
        // Si l'index graphique et l'index de présentation sont identiques, le set n'aura qu'un seul élément.
        std::vector<VkDeviceQueueCreateInfo> queueCreateInfos;
        std::set<uint32_t> uniqueQueueFamilies = {
            indices.graphicsFamily.value(), 
            indices.presentFamily.value()
        };

        float queuePriority = 1.0f; // Priorité de la file d'attente (entre 0.0 et 1.0)
        for (uint32_t queueFamily : uniqueQueueFamilies) {
            VkDeviceQueueCreateInfo queueCreateInfo{};
            queueCreateInfo.sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO;
            queueCreateInfo.queueFamilyIndex = queueFamily;
            queueCreateInfo.queueCount = 1;
            queueCreateInfo.pQueuePriorities = &queuePriority;
            queueCreateInfos.push_back(queueCreateInfo);
        }

        // Spécification des fonctionnalités du GPU requises (aucune pour l'instant)
        VkPhysicalDeviceFeatures deviceFeatures{};

        VkDeviceCreateInfo createInfo{};
        createInfo.sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO;
        createInfo.queueCreateInfoCount = static_cast<uint32_t>(queueCreateInfos.size());
        createInfo.pQueueCreateInfos = queueCreateInfos.data();
        createInfo.pEnabledFeatures = &deviceFeatures;

        // Activation de l'extension de la Swapchain (nécessaire pour le rendu à l'écran)
        const std::vector<const char*> deviceExtensions = {
            VK_KHR_SWAPCHAIN_EXTENSION_NAME
        };
        createInfo.enabledExtensionCount = static_cast<uint32_t>(deviceExtensions.size());
        createInfo.ppEnabledExtensionNames = deviceExtensions.data();
        createInfo.enabledLayerCount = 0;

        // Création finale du périphérique logique
        if (vkCreateDevice(physicalDevice, &createInfo, nullptr, &device) != VK_SUCCESS) {
            throw std::runtime_error("Échec de la création du périphérique logique");
        }

        // Récupération des poignées de files d'attente (Queues)
        // Le troisième paramètre (0) correspond à l'index de la file au sein de la famille (nous n'en avons demandé qu'une)
        vkGetDeviceQueue(device, indices.graphicsFamily.value(), 0, &graphicsQueue);
        vkGetDeviceQueue(device, indices.presentFamily.value(), 0, &presentQueue);
    }

    // Boucle de rendu principale (vide pour le moment)
    void mainLoop() {
        while (!glfwWindowShouldClose(window)) {
            glfwPollEvents();
        }
    }

    // Nettoyage rigoureux des ressources
    void cleanup() {
        // 1. Détruire le périphérique logique
        if (device != VK_NULL_HANDLE) {
            vkDestroyDevice(device, nullptr);
        }

        // 2. Détruire la surface (doit être fait AVANT l'instance)
        if (surface != VK_NULL_HANDLE) {
            vkDestroySurfaceKHR(instance, surface, nullptr);
        }

        // 3. Détruire l'instance Vulkan
        if (instance != VK_NULL_HANDLE) {
            vkDestroyInstance(instance, nullptr);
        }

        // 4. Fermer la fenêtre GLFW et terminer la bibliothèque
        if (window) {
            glfwDestroyWindow(window);
        }
        glfwTerminate();
    }
};

int main() {
    VulkanApplication app;
    try {
        app.run();
    } catch (const std::exception& e) {
        std::cerr << "Erreur fatale : " << e.what() << std::endl;
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
```

---

## 4. Pièges Fréquents et Bonnes Pratiques

### 1. L'ordre de destruction des objets (Le "Crash de fermeture")
C'est l'erreur numéro un des débutants en Vulkan. Vulkan est extrêmement strict sur l'ordre de destruction. 
*   **Règle d'or** : Les objets enfants doivent être détruits avant leurs parents.
*   La surface (`VkSurfaceKHR`) est créée à partir de l'instance (`VkInstance`). Elle doit donc être détruite **avant** l'instance.
*   Le périphérique logique (`VkDevice`) utilise la surface indirectement. Il doit être détruit **avant** la surface.
*   *Conséquence* : Si vous détruisez l'instance avant la surface, votre programme plantera instantanément à la fermeture avec une violation d'accès mémoire.

### 2. Doubler la création de files d'attente identiques
Si la famille de files graphiques et la famille de présentation ont le même index (ce qui est très fréquent), et que vous tentez de créer deux configurations de files d'attente distinctes avec le même index dans `VkDeviceCreateInfo`, Vulkan générera une erreur ou un comportement indéfini. 
*   *Solution* : Utilisez toujours un conteneur d'éléments uniques comme `std::set` pour filtrer les doublons d'indices avant de remplir la structure de création du périphérique logique.

### 3. Oublier d'activer les extensions de fenêtrage de GLFW
Si vous créez une instance Vulkan standard sans passer les extensions requises par GLFW (`glfwGetRequiredInstanceExtensions`), l'appel à `glfwCreateWindowSurface` échouera lamentablement avec l'erreur `VK_ERROR_EXTENSION_NOT_PRESENT`.

---

## 5. Synthèse Pédagogique

### Résumé des concepts clés

| Concept | Rôle principal | Durée de vie / Parent |
| :--- | :--- | :--- |
| **`VkSurfaceKHR`** | Représentation abstraite de la fenêtre OS pour Vulkan. | Parent : `VkInstance`. Doit être détruite avant l'Instance. |
| **Queue Family** | Catégorie de processeurs sur le GPU (Graphisme, Calcul, Transfert). | Liée au `VkPhysicalDevice`. Non détruite explicitement. |
| **`VkQueue`** | Poignée de contrôle pour envoyer des commandes au GPU. | Parent : `VkDevice`. Pas de destruction manuelle (gérée par le Device). |
| **WSI** | Couche d'intégration permettant de lier Vulkan à l'affichage système. | Extension globale de l'API. |

### Schéma d'architecture des objets créés

```
+-------------------------------------------------------------------+
|                           VkInstance                              |
|  +--------------------+                     +------------------+  |
|  |  VkPhysicalDevice  | <--- Requêtes ----> |   VkSurfaceKHR   |  |
|  +--------------------+                     +------------------+  |
|           |                                           ^           |
+-----------|-------------------------------------------|-----------+
            v                                           |
+--------------------------------------------------+    |
|                        VkDevice                  |    |
|  +--------------------------------------------+  |    |
|  | Queues actives :                           |  |    |
|  | - Graphics Queue (Index X)                 |  |    |
|  | - Present Queue  (Index Y) ----------------|--+----+
|  +--------------------------------------------+  |
+--------------------------------------------------+
```

---

## 6. Exercice Pratique d'Application

### Énoncé : Intégration d'une file de transfert dédiée
Dans les applications professionnelles, on évite de surcharger la file d'attente graphique principale avec des transferts de textures ou de modèles 3D depuis la RAM vers la VRAM. On préfère utiliser une **file de transfert dédiée** (Transfer Queue) si le GPU en propose une.

**Votre objectif** : Modifier la structure `QueueFamilyIndices` et la fonction `findQueueFamilies` pour :
1.  Chercher une famille de files d'attente supportant spécifiquement le transfert (`VK_QUEUE_TRANSFER_BIT`).
2.  **Bonus de rigueur** : Choisir de préférence une famille qui supporte le transfert mais qui n'est *pas* graphique (pour avoir une vraie file de transfert asynchrone dédiée). Si ce n'est pas possible, se rabattre sur la file graphique (qui sait aussi faire du transfert).

### Indices
1.  Le flag pour le transfert est `VK_QUEUE_TRANSFER_BIT`.
2.  Pour vérifier qu'une famille est *uniquement* dédiée au transfert et pas au graphisme, vous pouvez utiliser des opérations binaires : 
    `((properties.queueFlags & VK_QUEUE_TRANSFER_BIT) && !(properties.queueFlags & VK_QUEUE_GRAPHICS_BIT))`

### Correction complète de l'exercice

Voici comment modifier le code pour intégrer cette logique :

```cpp
// 1. Mise à jour de la structure pour inclure la file de transfert
struct QueueFamilyIndices {
    std::optional<uint32_t> graphicsFamily;
    std::optional<uint32_t> presentFamily;
    std::optional<uint32_t> transferFamily; // Nouvelle file

    bool isComplete() const {
        return graphicsFamily.has_value() && 
               presentFamily.has_value() && 
               transferFamily.has_value();
    }
};

// 2. Mise à jour de la fonction de recherche
QueueFamilyIndices findQueueFamilies(VkPhysicalDevice dev, VkSurfaceKHR surf) {
    QueueFamilyIndices indices;

    uint32_t queueFamilyCount = 0;
    vkGetPhysicalDeviceQueueFamilyProperties(dev, &queueFamilyCount, nullptr);

    std::vector<VkQueueFamilyProperties> queueFamilies(queueFamilyCount);
    vkGetPhysicalDeviceQueueFamilyProperties(dev, &queueFamilyCount, queueFamilies.data());

    int i = 0;
    for (const auto& queueFamily : queueFamilies) {
        // A. Recherche du support Graphique
        if (queueFamily.queueFlags & VK_QUEUE_GRAPHICS_BIT) {
            indices.graphicsFamily = i;
        }

        // B. Recherche du support de Présentation
        VkBool32 presentSupport = false;
        vkGetPhysicalDeviceSurfaceSupportKHR(dev, i, surf, &presentSupport);
        if (presentSupport) {
            indices.presentFamily = i;
        }

        // C. Recherche d'une file de transfert dédiée (sans graphisme)
        if ((queueFamily.queueFlags & VK_QUEUE_TRANSFER_BIT) && 
            !(queueFamily.queueFlags & VK_QUEUE_GRAPHICS_BIT)) {
            indices.transferFamily = i;
        }

        if (indices.isComplete()) {
            break;
        }
        i++;
    }

    // Solution de repli (Fallback) : Si aucune file de transfert dédiée n'a été trouvée,
    // on réutilise la file graphique (qui supporte implicitement le transfert).
    if (!indices.transferFamily.has_value()) {
        indices.transferFamily = indices.graphicsFamily;
    }

    return indices;
}
```

Cette architecture robuste garantit que votre moteur graphique tirera le meilleur parti des capacités matérielles de n'importe quel GPU, qu'il s'agisse d'une puce intégrée légère ou d'une carte graphique dédiée haut de gamme.