# Module 1.1 : Architecture de Vulkan, Instance et Périphériques

---

## 1. Introduction Conceptuelle

### 1.1 Qu'est-ce qu'une API Graphique ?
Pour comprendre Vulkan, il faut d'abord comprendre le rôle d'une API (Application Programming Interface) graphique. Votre ordinateur possède un processeur central (**CPU**) et un processeur graphique (**GPU**). Le CPU est excellent pour les tâches séquentielles complexes (logique du jeu, physique, IA), tandis que le GPU est un monstre de calcul parallèle, conçu pour traiter des millions de pixels et de polygones simultanément.

Une API graphique est le pont de communication entre ces deux processeurs. Sans elle, vous devriez écrire du code machine spécifique pour chaque carte graphique existante (Nvidia, AMD, Intel, Apple). L'API standardise cette communication.

```
+------------------+       API Graphique       +------------------+
|   Votre Code     | ------------------------> |      Pilote      |
|  (C++ / CPU)     |   (Vulkan / OpenGL)       | (Nvidia/AMD/GPU) |
+------------------+                           +------------------+
```

### 1.2 L'évolution : D'OpenGL à Vulkan
Pendant des décennies, **OpenGL** a été la norme multiplateforme. OpenGL a été conçu à une époque (1992) où les cartes graphiques étaient très différentes et où les processeurs n'avaient qu'un seul cœur. 

*   **Le problème d'OpenGL :** Il fonctionne comme une "boîte noire" ou une machine à états globale. Le pilote (driver) de la carte graphique fait énormément de travail en coulisses : il devine ce que le programmeur veut faire, compile les shaders au dernier moment, gère la mémoire de manière opaque et force toutes les commandes à passer par un seul thread CPU. Cela crée un goulot d'étranglement majeur.
*   **La solution Vulkan :** Introduit en 2016 par le groupe Khronos, Vulkan est une API dite de **bas niveau** (low-overhead). Vulkan supprime la quasi-totalité des abstractions du pilote. C'est vous, le développeur, qui prenez le contrôle total du GPU. Vous devez allouer explicitement la mémoire, gérer la synchronisation entre les tâches et enregistrer les commandes graphiques en parallèle sur plusieurs cœurs CPU.

| Caractéristique | OpenGL | Vulkan |
| :--- | :--- | :--- |
| **Niveau d'abstraction** | Élevé (Simple mais rigide) | Bas (Complexe mais ultra-performant) |
| **Gestion de la mémoire** | Automatique (gérée par le pilote) | Explicite (gérée par le développeur) |
| **Multi-threading CPU** | Très difficile / Inefficace | Conçu nativement pour cela |
| **Contrôle des erreurs** | Permanent (ralentit l'exécution) | Absent par défaut (via couches de validation) |

### 1.3 Pourquoi Vulkan est-il difficile mais indispensable ?
Vulkan respecte le principe : **"Vous payez uniquement pour ce que vous utilisez"**. Le pilote ne fait aucune vérification d'erreur en mode production pour maximiser les performances. Si vous faites une erreur (par exemple, utiliser une ressource mémoire mal allouée), Vulkan ne lèvera pas d'exception propre : votre application plantera ou affichera des artefacts visuels aléatoires.

Ce cours va vous guider pas à pas. Même si l'initialisation de Vulkan demande des centaines de lignes de code là où OpenGL n'en demandait que dix, chaque ligne a un but précis que nous allons décortiquer.

---

## 2. Fondations Théoriques

Avant d'écrire notre premier code C++, nous devons comprendre les quatre piliers de l'initialisation de Vulkan.

```
             +----------------------------------+
             |           VkInstance             |  <-- Point d'entrée de l'API
             +----------------------------------+
                              |
            +-----------------+-----------------+
            |                                   |
            v                                   v
+-----------------------+           +-----------------------+
|  VkPhysicalDevice 1   |           |  VkPhysicalDevice 2   |  <-- Représentation matérielle
|     (GPU Dédié)       |           |    (GPU Intégré)      |
+-----------------------+           +-----------------------+
            |
            v (Sélectionné)
+-----------------------+
|       VkDevice        |  <-- Interface logique pour l'application
+-----------------------+
```

### 2.1 L'Instance Vulkan (`VkInstance`)
La `VkInstance` est le point de départ de toute application Vulkan. Elle initialise la bibliothèque Vulkan et permet d'établir le lien entre votre application et le runtime Vulkan installé sur le système d'exploitation. 

Lors de sa création, vous devez spécifier :
*   Les métadonnées de votre application (nom, version).
*   Les **extensions globales** que vous souhaitez utiliser (par exemple, l'extension nécessaire pour afficher une fenêtre à l'écran).
*   Les **couches de validation** (Validation Layers) que vous souhaitez activer.

### 2.2 Les Couches de Validation (Validation Layers)
Comme mentionné, Vulkan par défaut ne fait aucune vérification d'erreur pour des raisons de performance. Pour éviter de coder à l'aveugle, Vulkan utilise un système modulaire appelé **Validation Layers**.

Ce sont des bibliothèques externes qui s'insèrent entre votre application et le pilote Vulkan. Elles interceptent chaque appel API pour :
*   Vérifier que les paramètres passés sont valides.
*   Détecter les fuites de mémoire GPU.
*   S'assurer que vous respectez les règles de synchronisation.
*   Générer des rapports d'erreur détaillés dans la console.

**Règle d'or :** Activez toujours les couches de validation en mode *Debug* (développement) et désactivez-les impérativement en mode *Release* (production) pour retrouver les performances maximales.

### 2.3 Le Périphérique Physique (`VkPhysicalDevice`)
Une fois l'instance créée, vous devez interroger le système pour savoir quelles cartes graphiques sont disponibles. Vulkan représente chaque carte graphique physique par un objet `VkPhysicalDevice`.

Il peut y en avoir plusieurs sur un même ordinateur (par exemple, un processeur Intel avec un GPU intégré et une carte graphique dédiée Nvidia ou AMD). Votre code devra lister ces périphériques, interroger leurs caractéristiques (limites de mémoire, fonctionnalités supportées) et choisir le plus adapté.

### 2.4 Le Périphérique Logique (`VkDevice`)
Après avoir sélectionné un périphérique physique (le matériel), vous devez créer un périphérique logique (`VkDevice`). 

Le périphérique logique est l'interface logicielle que vous utiliserez pour créer toutes les ressources futures (les textures, les buffers de géométrie, les pipelines de rendu). C'est à ce moment que vous spécifiez précisément quelles fonctionnalités matérielles vous allez activer (comme le *Ray Tracing* ou le support des textures géantes).

---

## 3. Implémentation Pratique Pas-à-Pas

Nous allons maintenant écrire le code C++ pour initialiser ces composants. 

### Rappels de C++ pour Vulkan
1.  **Gestion de la mémoire :** Vulkan utilise massivement des structures C. Pour éviter les comportements indéterminés, nous devons toujours initialiser nos structures à zéro. En C++, nous utiliserons l'initialisation par accolades `{}`.
2.  **Le pattern de création Vulkan :** Presque tous les objets Vulkan sont créés via le même schéma :
    *   Création d'une structure de configuration : `Vk[NomDeLObjet]CreateInfo`.
    *   Appel de la fonction de création : `vkCreate[NomDeLObjet](parent, &createInfo, allocateurs, &objet)`.
3.  **Le pattern du double appel (Two-Call Pattern) :** Pour récupérer des listes d'éléments de taille inconnue (comme la liste des GPU disponibles), Vulkan utilise un double appel de fonction :
    *   *Premier appel :* On passe un pointeur nul pour récupérer le nombre d'éléments.
    *   *Allocation :* On alloue un tableau (`std::vector`) de cette taille.
    *   *Second appel :* On passe le pointeur vers notre tableau pour le remplir.

### Code Source Complet : `VulkanApp.hpp` et `VulkanApp.cpp`

Voici l'implémentation complète et fonctionnelle d'une classe C++ encapsulant l'initialisation de base de Vulkan.

#### Fichier : `VulkanApp.hpp`
```cpp
#pragma once

#include <vulkan/vulkan.h>
#include <vector>
#include <iostream>
#include <stdexcept>
#include <cstring>

class VulkanApp {
public:
    void run() {
        initVulkan();
        mainLoop();
        cleanup();
    }

private:
    // Variables membres pour stocker nos objets Vulkan
    VkInstance instance = VK_NULL_HANDLE;
    VkDebugUtilsMessengerEXT debugMessenger = VK_NULL_HANDLE;
    VkPhysicalDevice physicalDevice = VK_NULL_HANDLE;
    VkDevice device = VK_NULL_HANDLE;

    // Configuration des Couches de Validation
    const bool enableValidationLayers = true;
    const std::vector<const char*> validationLayers = {
        "VK_LAYER_KHRONOS_validation"
    };

    void initVulkan() {
        createInstance();
        setupDebugMessenger();
        pickPhysicalDevice();
        createLogicalDevice();
    }

    void mainLoop() {
        std::cout << "Boucle principale active. Appuyez sur Entree pour quitter..." << std::endl;
        std::cin.get();
    }

    void cleanup() {
        // L'ordre de destruction est CRUCIAL. C'est l'inverse de la création.
        if (device != VK_NULL_HANDLE) {
            vkDestroyDevice(device, nullptr);
        }

        if (enableValidationLayers && debugMessenger != VK_NULL_HANDLE) {
            destroyDebugUtilsMessengerEXT(instance, debugMessenger, nullptr);
        }

        if (instance != VK_NULL_HANDLE) {
            vkDestroyInstance(instance, nullptr);
        }
    }

    // Fonctions d'initialisation détaillées ci-dessous
    void createInstance();
    bool checkValidationLayerSupport();
    std::vector<const char*> getRequiredExtensions();
    void setupDebugMessenger();
    void populateDebugMessengerCreateInfo(VkDebugUtilsMessengerCreateInfoEXT& createInfo);
    void pickPhysicalDevice();
    bool isDeviceSuitable(VkPhysicalDevice device);
    void createLogicalDevice();

    // Fonctions utilitaires pour charger dynamiquement les extensions de debug
    VkResult createDebugUtilsMessengerEXT(VkInstance instance, 
                                          const VkDebugUtilsMessengerCreateInfoEXT* pCreateInfo, 
                                          const VkAllocationCallbacks* pAllocator, 
                                          VkDebugUtilsMessengerEXT* pDebugMessenger);
    void destroyDebugUtilsMessengerEXT(VkInstance instance, 
                                       VkDebugUtilsMessengerEXT debugMessenger, 
                                       const VkAllocationCallbacks* pAllocator);
};
```

#### Fichier : `VulkanApp.cpp`
```cpp
#include "VulkanApp.hpp"

// Callback de debug : Cette fonction sera appelée par Vulkan lorsqu'un avertissement ou une erreur survient
static VKAPI_ATTR VkBool32 VKAPI_CALL debugCallback(
    VkDebugUtilsMessageSeverityFlagBitsEXT messageSeverity,
    VkDebugUtilsMessageTypeFlagsEXT messageType,
    const VkDebugUtilsMessengerCallbackDataEXT* pCallbackData,
    void* pUserData) {
    
    std::cerr << "[Validation Layer] : " << pCallbackData->pMessage << std::endl;
    return VK_FALSE; // Doit toujours retourner VK_FALSE
}

// 1. Création de l'Instance
void VulkanApp::createInstance() {
    if (enableValidationLayers && !checkValidationLayerSupport()) {
        throw std::runtime_error("Couches de validation demandees mais non disponibles !");
    }

    // Informations sur l'application (Optionnel mais recommandé pour les pilotes)
    VkApplicationInfo appInfo{};
    appInfo.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO; // Obligatoire pour identifier la structure
    appInfo.pNext = nullptr;
    appInfo.pApplicationName = "Mon Application Vulkan";
    appInfo.applicationVersion = VK_MAKE_VERSION(1, 0, 0);
    appInfo.pEngineName = "Aucun Moteur";
    appInfo.engineVersion = VK_MAKE_VERSION(1, 0, 0);
    appInfo.apiVersion = VK_API_VERSION_1_0; // Nous ciblons Vulkan 1.0 pour une compatibilité maximale

    // Configuration de la création de l'instance
    VkInstanceCreateInfo createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
    createInfo.pApplicationInfo = &appInfo;

    // Récupération des extensions requises
    auto extensions = getRequiredExtensions();
    createInfo.enabledExtensionCount = static_cast<uint32_t>(extensions.size());
    createInfo.ppEnabledExtensionNames = extensions.data();

    // Intégration des couches de validation
    VkDebugUtilsMessengerCreateInfoEXT debugCreateInfo{};
    if (enableValidationLayers) {
        createInfo.enabledLayerCount = static_cast<uint32_t>(validationLayers.size());
        createInfo.ppEnabledLayerNames = validationLayers.data();

        // Permet de capturer les messages de debug durant la création et destruction de l'instance elle-même
        populateDebugMessengerCreateInfo(debugCreateInfo);
        createInfo.pNext = (VkDebugUtilsMessengerCreateInfoEXT*) &debugCreateInfo;
    } else {
        createInfo.enabledLayerCount = 0;
        createInfo.pNext = nullptr;
    }

    // Appel système pour créer l'instance
    VkResult result = vkCreateInstance(&createInfo, nullptr, &instance);
    if (result != VK_SUCCESS) {
        throw std::runtime_error("Echec de la creation de l'instance Vulkan ! Code erreur : " + std::to_string(result));
    }
}

// Vérification de la présence des couches de validation sur le système
bool VulkanApp::checkValidationLayerSupport() {
    uint32_t layerCount;
    vkEnumerateInstanceLayerProperties(&layerCount, nullptr);

    std::vector<VkLayerProperties> availableLayers(layerCount);
    vkEnumerateInstanceLayerProperties(&layerCount, availableLayers.data());

    for (const char* layerName : validationLayers) {
        bool layerFound = false;

        for (const auto& layerProperties : availableLayers) {
            if (strcmp(layerName, layerProperties.layerName) == 0) {
                layerFound = true;
                break;
            }
        }

        if (!layerFound) {
            return false;
        }
    }

    return true;
}

// Récupération des extensions nécessaires
std::vector<const char*> VulkanApp::getRequiredExtensions() {
    std::vector<const char*> extensions;

    if (enableValidationLayers) {
        // Cette extension permet de recevoir les messages de debug détaillés
        extensions.push_back(VK_EXT_DEBUG_UTILS_EXTENSION_NAME);
    }

    return extensions;
}

// Configuration du messager de debug
void VulkanApp::populateDebugMessengerCreateInfo(VkDebugUtilsMessengerCreateInfoEXT& createInfo) {
    createInfo = {};
    createInfo.sType = VK_STRUCTURE_TYPE_DEBUG_UTILS_MESSENGER_CREATE_INFO_EXT;
    // Filtrage des messages à recevoir (Erreurs et Avertissements importants)
    createInfo.messageSeverity = VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT | 
                                 VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT;
    // Filtrage par type de message (Général, Validation de spécification, Performance)
    createInfo.messageType = VK_DEBUG_UTILS_MESSAGE_TYPE_GENERAL_BIT_EXT | 
                             VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT | 
                             VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT;
    createInfo.pfnUserCallback = debugCallback; // Notre fonction de callback définie plus haut
    createInfo.pUserData = nullptr; // Optionnel
}

void VulkanApp::setupDebugMessenger() {
    if (!enableValidationLayers) return;

    VkDebugUtilsMessengerCreateInfoEXT createInfo;
    populateDebugMessengerCreateInfo(createInfo);

    if (createDebugUtilsMessengerEXT(instance, &createInfo, nullptr, &debugMessenger) != VK_SUCCESS) {
        throw std::runtime_error("Echec de la configuration du messager de debug !");
    }
}

// 2. Sélection du Périphérique Physique (GPU)
void VulkanApp::pickPhysicalDevice() {
    uint32_t deviceCount = 0;
    vkEnumeratePhysicalDevices(instance, &deviceCount, nullptr);

    if (deviceCount == 0) {
        throw std::runtime_error("Aucun GPU supportant Vulkan n'a ete trouve !");
    }

    std::vector<VkPhysicalDevice> devices(deviceCount);
    vkEnumeratePhysicalDevices(instance, &deviceCount, devices.data());

    for (const auto& device : devices) {
        if (isDeviceSuitable(device)) {
            physicalDevice = device;
            break;
        }
    }

    if (physicalDevice == VK_NULL_HANDLE) {
        throw std::runtime_error("Aucun GPU ne remplit les conditions requises !");
    }
}

// Évaluation de la compatibilité du GPU
bool VulkanApp::isDeviceSuitable(VkPhysicalDevice device) {
    VkPhysicalDeviceProperties deviceProperties;
    VkPhysicalDeviceFeatures deviceFeatures;
    vkGetPhysicalDeviceProperties(device, &deviceProperties);
    vkGetPhysicalDeviceFeatures(device, &deviceFeatures);

    // Pour l'instant, nous acceptons n'importe quel GPU dédié (Discrete GPU)
    // Dans le Module 1.2, nous ajouterons la vérification des familles de files d'attente (Queue Families)
    std::cout << "GPU detecte : " << deviceProperties.deviceName << std::endl;
    return deviceProperties.deviceType == VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU;
}

// 3. Création du Périphérique Logique
void VulkanApp::createLogicalDevice() {
    // Note pédagogique : Pour créer un périphérique logique, nous devons normalement spécifier
    // les files d'attente (Queues). Ce concept sera approfondi dans le Module 1.2.
    // Pour que ce code compile et fonctionne, nous configurons une file d'attente minimale.
    
    float queuePriority = 1.0f;
    VkDeviceQueueCreateInfo queueCreateInfo{};
    queueCreateInfo.sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO;
    queueCreateInfo.queueFamilyIndex = 0; // Hypothèse temporaire (Sera validé dans le Module 1.2)
    queueCreateInfo.queueCount = 1;
    queueCreateInfo.pQueuePriorities = &queuePriority;

    VkPhysicalDeviceFeatures deviceFeatures{}; // Pas de fonctionnalités spéciales requises pour l'instant

    VkDeviceCreateInfo createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO;
    createInfo.pQueueCreateInfos = &queueCreateInfo;
    createInfo.queueCreateInfoCount = 1;
    createInfo.pEnabledFeatures = &deviceFeatures;

    // Configuration des extensions spécifiques au périphérique (ex: Swapchain, voir Module 1.3)
    createInfo.enabledExtensionCount = 0;

    // Compatibilité avec les anciennes implémentations de Vulkan
    if (enableValidationLayers) {
        createInfo.enabledLayerCount = static_cast<uint32_t>(validationLayers.size());
        createInfo.ppEnabledLayerNames = validationLayers.data();
    } else {
        createInfo.enabledLayerCount = 0;
    }

    if (vkCreateDevice(physicalDevice, &createInfo, nullptr, &device) != VK_SUCCESS) {
        throw std::runtime_error("Echec de la creation du peripherique logique !");
    }
}

// --- Chargement dynamique des fonctions d'extension ---
// Les fonctions liées aux extensions (comme le Debug Messenger) ne sont pas chargées automatiquement.
// Nous devons demander à l'instance de récupérer leurs adresses mémoire.

VkResult VulkanApp::createDebugUtilsMessengerEXT(VkInstance instance, 
                                                 const VkDebugUtilsMessengerCreateInfoEXT* pCreateInfo, 
                                                 const VkAllocationCallbacks* pAllocator, 
                                                 VkDebugUtilsMessengerEXT* pDebugMessenger) {
    auto func = (PFN_vkCreateDebugUtilsMessengerEXT) vkGetInstanceProcAddr(instance, "vkCreateDebugUtilsMessengerEXT");
    if (func != nullptr) {
        return func(instance, pCreateInfo, pAllocator, pDebugMessenger);
    } else {
        return VK_ERROR_EXTENSION_NOT_PRESENT;
    }
}

void VulkanApp::destroyDebugUtilsMessengerEXT(VkInstance instance, 
                                              VkDebugUtilsMessengerEXT debugMessenger, 
                                              const VkAllocationCallbacks* pAllocator) {
    auto func = (PFN_vkDestroyDebugUtilsMessengerEXT) vkGetInstanceProcAddr(instance, "vkDestroyDebugUtilsMessengerEXT");
    if (func != nullptr) {
        func(instance, debugMessenger, pAllocator);
    }
}
```

---

## 4. Pièges Fréquents et Bonnes Pratiques

### 4.1 L'Oubli d'Initialisation des Structures
C'est l'erreur numéro un des débutants en Vulkan. En C++, si vous écrivez :
```cpp
VkInstanceCreateInfo createInfo; // Sans accolades !
```
Les variables internes de la structure contiendront des valeurs résiduelles de la mémoire (garbage data). Vulkan lira ces données, tentera d'accéder à des pointeurs invalides et provoquera un crash immédiat.
*   **Bonne pratique :** Toujours utiliser l'initialisation par défaut `{}` :
```cpp
VkInstanceCreateInfo createInfo{}; // Initialise tous les membres à 0 ou nullptr
```

### 4.2 L'Ordre de Destruction des Ressources
Vulkan est extrêmement strict sur l'ordre de libération de la mémoire. Un objet parent ne peut pas être détruit avant ses enfants.
*   **Règle absolue :** L'ordre de destruction dans votre fonction `cleanup()` doit être **le strict inverse** de l'ordre de création dans `initVulkan()`.
    *   Création : Instance -> Debug Messenger -> Device.
    *   Destruction : Device -> Debug Messenger -> Instance.

### 4.3 Négliger les Couches de Validation
Tenter de coder en Vulkan sans activer les couches de validation équivaut à piloter un avion de nuit sans tableau de bord. Si votre programme plante sans message d'erreur, vérifiez immédiatement que `VK_LAYER_KHRONOS_validation` est bien installé via le SDK Vulkan sur votre machine.

---

## 5. Synthèse Pédagogique

### 5.1 Résumé des Objets Clés

| Objet Vulkan | Rôle Principal | Analogie |
| :--- | :--- | :--- |
| **`VkInstance`** | Point d'entrée de l'API, initialise la bibliothèque. | Le contrat d'embauche avec le système graphique. |
| **`VkPhysicalDevice`** | Représente le GPU physique (matériel). | La carte graphique physique dans votre boîtier PC. |
| **`VkDevice`** | Interface logique pour créer les ressources. | Le chef de chantier à qui vous donnez vos ordres de rendu. |
| **`VkDebugUtilsMessengerEXT`** | Capture et affiche les erreurs de développement. | L'inspecteur des travaux finis qui crie en cas d'erreur. |

### 5.2 Flux d'Exécution de l'Initialisation

```
[Démarrage]
    │
    ▼
[Vérifier les Validation Layers] ──(Non disponibles)──> [Lever une Exception]
    │ (Disponibles)
    ▼
[Créer la VkInstance]
    │
    ▼
[Activer le Debug Messenger]
    │
    ▼
[Énumérer les GPU (VkPhysicalDevice)] ──(Aucun compatible)──> [Lever une Exception]
    │ (GPU Trouvé)
    ▼
[Créer le Périphérique Logique (VkDevice)]
    │
    ▼
[Boucle de Rendu]
```

---

## 6. Exercice Pratique d'Application

### Énoncé : "Diagnostic du Matériel (GPU Profiler)"
L'objectif de cet exercice est de modifier et d'étendre notre code pour créer un utilitaire de diagnostic. Votre programme devra interroger le système, lister **tous** les GPU disponibles, et pour chacun d'eux, afficher dans la console :
1.  Son nom (ex: *NVIDIA GeForce RTX 4070*).
2.  Son type (Dédié, Intégré, CPU).
3.  La version de l'API Vulkan supportée par le pilote.
4.  La quantité maximale de mémoire allouable pour une seule texture (limite de dimension 2D).

### Indices
*   Pour récupérer les propriétés d'un GPU, utilisez la fonction :
    `vkGetPhysicalDeviceProperties(device, &properties)`.
*   La structure `VkPhysicalDeviceProperties` contient un membre `limits` de type `VkPhysicalDeviceLimits`. C'est là que se trouve la taille maximale des textures 2D (`maxImageDimension2D`).
*   La version de l'API est stockée sous forme d'un entier encodé. Utilisez les macros suivantes pour décoder la version :
    `VK_VERSION_MAJOR(version)`, `VK_VERSION_MINOR(version)`, `VK_VERSION_PATCH(version)`.

### Correction Complète

Voici le code à intégrer dans votre classe pour réaliser le diagnostic. Vous pouvez remplacer la fonction `pickPhysicalDevice()` par celle-ci :

```cpp
void VulkanApp::pickPhysicalDevice() {
    uint32_t deviceCount = 0;
    vkEnumeratePhysicalDevices(instance, &deviceCount, nullptr);

    if (deviceCount == 0) {
        throw std::runtime_error("Aucun GPU avec support Vulkan detecte !");
    }

    std::vector<VkPhysicalDevice> devices(deviceCount);
    vkEnumeratePhysicalDevices(instance, &deviceCount, devices.data());

    std::cout << "\n=== DIAGNOSTIC DU MATERIEL (GPU PROFILER) ===" << std::endl;
    std::cout << "Nombre de GPU compatibles Vulkan trouves : " << deviceCount << "\n" << std::endl;

    for (size_t i = 0; i < devices.size(); i++) {
        VkPhysicalDeviceProperties properties;
        vkGetPhysicalDeviceProperties(devices[i], &properties);

        std::cout << "--- GPU #" << i << " ---" << std::endl;
        std::cout << "Nom du peripherique : " << properties.deviceName << std::endl;
        
        // Détermination du type de GPU
        std::cout << "Type de GPU         : ";
        switch (properties.deviceType) {
            case VK_PHYSICAL_DEVICE_TYPE_OTHER:          std::cout << "Autre (Inconnu)"; break;
            case VK_PHYSICAL_DEVICE_TYPE_INTEGRATED_GPU: std::cout << "GPU Integre (iGPU)"; break;
            case VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU:   std::cout << "GPU Dedie (dGPU)"; break;
            case VK_PHYSICAL_DEVICE_TYPE_VIRTUAL_GPU:    std::cout << "GPU Virtuel"; break;
            case VK_PHYSICAL_DEVICE_TYPE_CPU:            std::cout << "Processeur (CPU)"; break;
        }
        std::cout << std::endl;

        // Décodage de la version de l'API Vulkan
        uint32_t apiVer = properties.apiVersion;
        std::cout << "Version API Vulkan  : " 
                  << VK_VERSION_MAJOR(apiVer) << "." 
                  << VK_VERSION_MINOR(apiVer) << "." 
                  << VK_VERSION_PATCH(apiVer) << std::endl;

        // Récupération des limites matérielles
        std::cout << "Taille max Texture  : " 
                  << properties.limits.maxImageDimension2D << " x " 
                  << properties.limits.maxImageDimension2D << " pixels" << std::endl;
        std::cout << "---------------------\n" << std::endl;

        // Sélection automatique du premier GPU dédié rencontré
        if (physicalDevice == VK_NULL_HANDLE && properties.deviceType == VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU) {
            physicalDevice = devices[i];
            std::cout << ">> Selection de " << properties.deviceName << " pour le rendu." << std::endl;
        }
    }

    // Si aucun GPU dédié n'est trouvé, on prend le premier disponible par défaut
    if (physicalDevice == VK_NULL_HANDLE && !devices.empty()) {
        physicalDevice = devices[0];
        VkPhysicalDeviceProperties properties;
        vkGetPhysicalDeviceProperties(physicalDevice, &properties);
        std::cout << ">> Aucun GPU dedie trouve. Selection par defaut de : " << properties.deviceName << std::endl;
    }
}
```