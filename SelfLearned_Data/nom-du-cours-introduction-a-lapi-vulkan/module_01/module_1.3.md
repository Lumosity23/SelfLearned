# Module 1.3 : Création et configuration de la Swapchain

---

## 1. Introduction Conceptuelle

### 1.1 Le Problème du Rendu Direct : Le Déchirement d'Image (*Tearing*)
Dans les balbutiements de l'informatique graphique, les cartes graphiques écrivaient directement les pixels dans la mémoire d'affichage de l'écran (le *Frame Buffer*). Cette approche naïve pose un problème physique majeur : l'écran possède son propre rythme de rafraîchissement (par exemple, 60 Hz, soit une mise à jour toutes les 16,67 millisecondes), tandis que le processeur graphique (GPU) calcule les images à un rythme variable dépendant de la complexité de la scène.

Si le GPU écrit dans la mémoire d'affichage pendant que l'écran est en train de la lire pour l'afficher, l'utilisateur verra une partie de l'ancienne image et une partie de la nouvelle sur le même écran. Ce phénomène visuel désagréable est appelé **déchirement d'image** ou **tearing**.

```
Écran (Lecture) :   [--- Image N-1 ---] [--- Image N-1 ---] [--- Image N ---]
GPU (Écriture) :          [======== Écriture Image N ========]
Résultat Visuel :         | Haut : Image N-1 | Bas : Image N |  <-- TEARING !
```

### 1.2 La Solution : Le Double et Triple Buffering
Pour éviter le tearing, nous introduisons un mécanisme de synchronisation appelé **Double Buffering** (Double Tampon). 
* **Front Buffer (Tampon Avant)** : L'image actuellement lue par l'écran. Cette mémoire est en lecture seule pour le système d'affichage.
* **Back Buffer (Tampon Arrière)** : L'image en cours de dessin par le GPU.

Une fois que le GPU a terminé de dessiner dans le *Back Buffer*, on procède à un échange (**Swap**). Le *Back Buffer* devient le *Front Buffer*, et inversement. Cet échange est synchronisé avec le signal de synchronisation verticale de l'écran (**V-Sync**).

Le **Triple Buffering** ajoute un troisième tampon (un deuxième *Back Buffer*). Cela permet au GPU de continuer à dessiner la frame suivante même si le *Back Buffer* précédent attend d'être affiché, éliminant ainsi le blocage du GPU tout en évitant le tearing.

### 1.3 Qu'est-ce que la Swapchain dans Vulkan ?
Vulkan est une API totalement agnostique du système d'exploitation et du matériel d'affichage. Par défaut, un périphérique Vulkan (`VkDevice`) ne sait pas ce qu'est un "écran" ou une "fenêtre". 

La **Swapchain** (chaîne d'échange) est l'infrastructure qui fait le pont entre Vulkan et le système de fenêtrage de l'OS (Windows, macOS, Linux). Elle est gérée par l'extension de surface de présentation (`VK_KHR_swapchain`). La Swapchain possède et gère une file d'attente d'images de rendu. Notre application devra acquérir une image de la Swapchain, dessiner dedans, puis la restituer à la Swapchain pour qu'elle soit présentée à l'écran.

---

## 2. Fondations Théoriques

Avant de pouvoir créer une Swapchain, nous devons interroger le GPU pour connaître ses capacités d'affichage sur notre surface de fenêtre (`VkSurfaceKHR`, créée au Module 1.2). Trois types de paramètres doivent être analysés :

```
+-----------------------------------------------------------------+
|                    Propriétés de la Surface                     |
+-----------------------------------------------------------------+
        |                           |                        |
        v                           v                        v
[1. Capabilities]            [2. Formats]            [3. Present Modes]
- Min/Max d'images           - Format de pixel       - Immediate
- Résolution (Extent)        - Espace colorimétrique - FIFO (V-Sync)
- Transformations admises                            - Mailbox
```

### 2.1 Les Capacités de la Surface (`VkSurfaceCapabilitiesKHR`)
Cette structure définit les limites physiques de la surface de présentation :
* **Nombre d'images minimal et maximal** que la Swapchain peut contenir (généralement 2 pour le double buffering, 3 pour le triple buffering).
* **Dimensions actuelles, minimales et maximales** (en pixels) de la surface (appelées *Extent*).
* **Transformations supportées** (comme une rotation de 90 degrés pour les écrans de smartphones).
* **Modes de transparence (Composite Alpha)** supportés pour l'intégration avec les autres fenêtres du système d'exploitation.

### 2.2 Les Formats de Surface (`VkSurfaceFormatKHR`)
Chaque format supporté est un couple composé de :
1. **Format de couleur (`VkFormat`)** : Décrit la disposition des canaux de couleur en mémoire. Par exemple, `VK_FORMAT_B8G8R8A8_SRGB` signifie que chaque pixel est codé sur 32 bits : 8 bits pour le Bleu, 8 bits pour le Vert, 8 bits pour le Rouge, et 8 bits pour l'Alpha (transparence), le tout interprété dans l'espace colorimétrique non-linéaire sRGB.
2. **Espace colorimétrique (`VkColorSpaceKHR`)** : Définit comment les couleurs doivent être interprétées par l'écran (ex: `VK_COLOR_SPACE_SRGB_NONLINEAR_KHR`).

### 2.3 Les Modes de Présentation (`VkPresentModeKHR`)
Le mode de présentation détermine la façon dont les images sont envoyées à l'écran et comment la synchronisation est gérée. Vulkan propose quatre modes principaux :

| Mode | Description | V-Sync | Tearing | Latence | Support |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `IMMEDIATE` | Les images sont envoyées à l'écran immédiatement. | Non | Oui | Très faible | Optionnel |
| `FIFO` | File d'attente classique (First-In, First-Out). Le GPU attend si la file est pleine. | Oui | Non | Moyenne | **Obligatoire** |
| `FIFO_RELAXED` | Similaire à FIFO, mais si le GPU est en retard, l'image est affichée immédiatement (tearing). | Oui | Oui | Faible | Optionnel |
| `MAILBOX` | Triple buffering optimal. Si la file est pleine, l'image la plus ancienne non affichée est remplacée. | Oui | Non | **Minimale** | Optionnel |

### 2.4 Le Concept d'Image View (`VkImageView`)
Une image Vulkan (`VkImage`) représente une zone de mémoire brute contenant des pixels. Cependant, on ne peut pas l'utiliser directement comme cible de rendu. 

Pour des raisons de sécurité et de flexibilité, Vulkan exige la création d'une **Vue d'Image** (`VkImageView`). Une `VkImageView` enveloppe une `VkImage` et lui donne un contexte d'interprétation précis :
* Est-ce une texture 2D, 3D, ou une texture cube ?
* Comment interpréter les canaux (ex: intervertir le Rouge et le Bleu) ?
* À quelle plage de Mipmaps ou de couches de texture avons-nous accès ?

---

## 3. Implémentation Pratique Pas-à-Pas

Nous allons maintenant écrire le code C++ permettant de configurer et de créer la Swapchain ainsi que ses vues d'images associées.

### 3.1 Structure de Support de la Swapchain
Pour structurer notre code, nous définissons une structure C++ regroupant les trois propriétés de compatibilité :

```cpp
#include <vulkan/vulkan.h>
#include <vector>

struct SwapChainSupportDetails {
    VkSurfaceCapabilitiesKHR capabilities;
    std::vector<VkSurfaceFormatKHR> formats;
    std::vector<VkPresentModeKHR> presentModes;
};
```

### 3.2 Requêter les Détails de Support
Nous devons interroger le périphérique physique (`VkPhysicalDevice`) pour remplir cette structure. Nous utilisons ici le motif classique de Vulkan en deux appels pour récupérer les tableaux dynamiques.

```cpp
SwapChainSupportDetails querySwapChainSupport(VkPhysicalDevice device, VkSurfaceKHR surface) {
    SwapChainSupportDetails details;

    // 1. Récupération des capacités de base
    vkGetPhysicalDeviceSurfaceCapabilitiesKHR(device, surface, &details.capabilities);

    // 2. Récupération des formats de pixels supportés
    uint32_t formatCount;
    vkGetPhysicalDeviceSurfaceFormatsKHR(device, surface, &formatCount, nullptr);

    if (formatCount != 0) {
        details.formats.resize(formatCount);
        vkGetPhysicalDeviceSurfaceFormatsKHR(device, surface, &formatCount, details.formats.data());
    }

    // 3. Récupération des modes de présentation supportés
    uint32_t presentModeCount;
    vkGetPhysicalDeviceSurfacePresentModesKHR(device, surface, &presentModeCount, nullptr);

    if (presentModeCount != 0) {
        details.presentModes.resize(presentModeCount);
        vkGetPhysicalDeviceSurfacePresentModesKHR(device, surface, &presentModeCount, details.presentModes.data());
    }

    return details;
}
```

### 3.3 Sélection des Meilleurs Paramètres

#### Choix du Format de Surface
Nous recherchons idéalement un format de couleur 8 bits non-linéaire sRGB (`VK_FORMAT_B8G8R8A8_SRGB`) pour une fidélité de couleur optimale sur les écrans modernes.

```cpp
VkSurfaceFormatKHR chooseSwapSurfaceFormat(const std::vector<VkSurfaceFormatKHR>& availableFormats) {
    for (const auto& availableFormat : availableFormats) {
        if (availableFormat.format == VK_FORMAT_B8G8R8A8_SRGB && 
            availableFormat.colorSpace == VK_COLOR_SPACE_SRGB_NONLINEAR_KHR) {
            return availableFormat;
        }
    }
    // Si notre format idéal n'est pas disponible, on retourne le premier de la liste
    return availableFormats[0];
}
```

#### Choix du Mode de Présentation
Nous privilégions le mode `MAILBOX` (Triple Buffering à faible latence). S'il n'est pas disponible, nous nous rabattons sur le mode `FIFO` qui est garanti par la spécification Vulkan.

```cpp
VkPresentModeKHR chooseSwapPresentMode(const std::vector<VkPresentModeKHR>& availablePresentModes) {
    for (const auto& availablePresentMode : availablePresentModes) {
        if (availablePresentMode == VK_PRESENT_MODE_MAILBOX_KHR) {
            return availablePresentMode;
        }
    }
    // Garanti d'être présent
    return VK_PRESENT_MODE_FIFO_KHR;
}
```

#### Choix de la Dimension des Images (Extent)
L'étendue de la Swapchain correspond à la résolution des images. Généralement, elle correspond exactement à la taille de la fenêtre. Cependant, certains systèmes (comme les écrans Retina d'Apple) utilisent des coordonnées logiques différentes des pixels physiques. Nous devons donc utiliser `glfwGetFramebufferSize` pour obtenir la taille réelle en pixels.

```cpp
#include <GLFW/glfw3.h>
#include <algorithm> // Pour std::clamp

VkExtent2D chooseSwapExtent(const VkSurfaceCapabilitiesKHR& capabilities, GLFWwindow* window) {
    // Si la largeur actuelle n'est pas égale à la valeur maximale d'un entier non signé,
    // cela signifie que le système nous impose la taille de la fenêtre.
    if (capabilities.currentExtent.width != std::numeric_limits<uint32_t>::max()) {
        return capabilities.currentExtent;
    } else {
        // Sinon, nous devons interroger la taille réelle du framebuffer de la fenêtre
        int width, height;
        glfwGetFramebufferSize(window, &width, &height);

        VkExtent2D actualExtent = {
            static_cast<uint32_t>(width),
            static_cast<uint32_t>(height)
        };

        // On s'assure que la taille choisie respecte les limites matérielles du GPU
        actualExtent.width = std::clamp(actualExtent.width, 
                                        capabilities.minImageExtent.width, 
                                        capabilities.maxImageExtent.width);
        actualExtent.height = std::clamp(actualExtent.height, 
                                         capabilities.minImageExtent.height, 
                                         capabilities.maxImageExtent.height);

        return actualExtent;
    }
}
```

### 3.4 Création de la Swapchain
Nous assemblons maintenant ces briques logiques pour initialiser l'objet `VkSwapchainKHR`.

```cpp
// Variables globales ou membres de classe requis pour la création
VkDevice device; // Créé au Module 1.1
VkSurfaceKHR surface; // Créée au Module 1.2
GLFWwindow* window;

VkSwapchainKHR swapChain;
std::vector<VkImage> swapChainImages;
VkFormat swapChainImageFormat;
VkExtent2D swapChainExtent;

void createSwapChain() {
    SwapChainSupportDetails swapChainSupport = querySwapChainSupport(device, surface);

    VkSurfaceFormatKHR surfaceFormat = chooseSwapSurfaceFormat(swapChainSupport.formats);
    VkPresentModeKHR presentMode = chooseSwapPresentMode(swapChainSupport.presentModes);
    VkExtent2D extent = chooseSwapExtent(swapChainSupport.capabilities, window);

    // Déterminer le nombre d'images dans notre swapchain.
    // Il est recommandé de demander au moins une image de plus que le minimum requis
    // pour éviter d'attendre que le pilote termine ses opérations internes.
    uint32_t imageCount = swapChainSupport.capabilities.minImageCount + 1;
    
    // On s'assure de ne pas dépasser le nombre maximum d'images supporté (0 signifie pas de limite)
    if (swapChainSupport.capabilities.maxImageCount > 0 && 
        imageCount > swapChainSupport.capabilities.maxImageCount) {
        imageCount = swapChainSupport.capabilities.maxImageCount;
    }

    VkSwapchainCreateInfoKHR createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR;
    createInfo.surface = surface;
    createInfo.minImageCount = imageCount;
    createInfo.imageFormat = surfaceFormat.format;
    createInfo.imageColorSpace = surfaceFormat.colorSpace;
    createInfo.imageExtent = extent;
    createInfo.imageArrayLayers = 1; // Toujours 1 sauf pour les applications 3D stéréoscopiques (VR)
    createInfo.imageUsage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT; // Rendu direct sur l'image

    // Gestion du partage des images entre les files d'attente (Queue Families)
    // (Voir Module 1.2 pour la sélection des indices de familles de files d'attente)
    uint32_t queueFamilyIndices[] = { graphicsFamilyIndex, presentFamilyIndex };

    if (graphicsFamilyIndex != presentFamilyIndex) {
        // Si les files de rendu et de présentation sont différentes, on partage les images
        createInfo.imageSharingMode = VK_SHARING_MODE_CONCURRENT;
        createInfo.queueFamilyIndexCount = 2;
        createInfo.pQueueFamilyIndices = queueFamilyIndices;
    } else {
        // Mode exclusif pour de meilleures performances si c'est la même file d'attente
        createInfo.imageSharingMode = VK_SHARING_MODE_EXCLUSIVE;
        createInfo.queueFamilyIndexCount = 0; // Optionnel
        createInfo.pQueueFamilyIndices = nullptr; // Optionnel
    }

    createInfo.preTransform = swapChainSupport.capabilities.currentTransform;
    createInfo.compositeAlpha = VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR; // Ignorer la transparence avec l'OS
    createInfo.presentMode = presentMode;
    createInfo.clipped = VK_TRUE; // Permet d'ignorer les pixels masqués par une autre fenêtre
    createInfo.oldSwapchain = VK_NULL_HANDLE; // Utilisé lors de la re-création (voir section 6)

    if (vkCreateSwapchainKHR(device, &createInfo, nullptr, &swapChain) != VK_SUCCESS) {
        throw std::runtime_error("Échec de la création de la Swapchain !");
    }

    // Récupération des handles des images créées automatiquement par la Swapchain
    vkGetSwapchainImagesKHR(device, swapChain, &imageCount, nullptr);
    swapChainImages.resize(imageCount);
    vkGetSwapchainImagesKHR(device, swapChain, &imageCount, swapChainImages.data());

    // Sauvegarde du format et de l'étendue pour utilisation future
    swapChainImageFormat = surfaceFormat.format;
    swapChainExtent = extent;
}
```

### 3.5 Création des Vues d'Images (Image Views)
Pour chaque image de la Swapchain, nous devons créer sa `VkImageView` correspondante.

```cpp
std::vector<VkImageView> swapChainImageViews;

void createImageViews() {
    swapChainImageViews.resize(swapChainImages.size());

    for (size_t i = 0; i < swapChainImages.size(); i++) {
        VkImageViewCreateInfo createInfo{};
        createInfo.sType = VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO;
        createInfo.image = swapChainImages[i];
        createInfo.viewType = VK_IMAGE_VIEW_TYPE_2D; // Traitée comme texture 2D
        createInfo.format = swapChainImageFormat;

        // Configuration des canaux de couleur (Swizzle)
        // Ici, on garde la correspondance par défaut (identité)
        createInfo.components.r = VK_COMPONENT_SWIZZLE_IDENTITY;
        createInfo.components.g = VK_COMPONENT_SWIZZLE_IDENTITY;
        createInfo.components.b = VK_COMPONENT_SWIZZLE_IDENTITY;
        createInfo.components.a = VK_COMPONENT_SWIZZLE_IDENTITY;

        // Description des sous-ressources de l'image
        createInfo.subresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT; // Cible de couleur
        createInfo.subresourceRange.baseMipLevel = 0; // Pas de mipmapping pour la swapchain
        createInfo.subresourceRange.levelCount = 1;
        createInfo.subresourceRange.baseArrayLayer = 0;
        createInfo.subresourceRange.layerCount = 1;

        if (vkCreateImageView(device, &createInfo, nullptr, &swapChainImageViews[i]) != VK_SUCCESS) {
            throw std::runtime_error("Échec de la création d'une vue d'image !");
        }
    }
}
```

### 3.6 Nettoyage de la Mémoire
La Swapchain et ses vues d'images doivent être explicitement détruites avant la destruction du périphérique logique (`VkDevice`).

```cpp
void cleanupSwapChain() {
    // 1. Détruire d'abord les vues d'images
    for (auto imageView : swapChainImageViews) {
        vkDestroyImageView(device, imageView, nullptr);
    }
    swapChainImageViews.clear();

    // 2. Détruire la Swapchain
    // Note : Les VkImage de la Swapchain sont automatiquement détruites avec elle.
    // Il ne faut JAMAIS appeler vkDestroyImage sur les images de la Swapchain !
    if (swapChain != VK_NULL_HANDLE) {
        vkDestroySwapchainKHR(device, swapChain, nullptr);
    }
}
```

---

## 4. Pièges Fréquents et Bonnes Pratiques

1. **Le Piège des Écrans Haute Densité (Retina/High-DPI)** :
   * *Erreur* : Utiliser la taille de la fenêtre retournée par `glfwGetWindowSize` pour définir l'étendue de la Swapchain.
   * *Conséquence* : Une image floue ou un crash lors de la création de la Swapchain car la taille demandée ne correspond pas à la taille physique du framebuffer.
   * *Solution* : Toujours utiliser `glfwGetFramebufferSize`.

2. **La Destruction Incorrecte des Images** :
   * *Erreur* : Tenter d'appeler `vkDestroyImage` sur les éléments du tableau `swapChainImages`.
   * *Conséquence* : Crash critique de l'application (Violation d'accès mémoire).
   * *Explication* : Ces images appartiennent à l'implémentation de la Swapchain de l'OS. Elles sont automatiquement libérées lors de l'appel à `vkDestroySwapchainKHR`. Seules les `VkImageView` doivent être détruites manuellement par votre code.

3. **Le Blocage du GPU lors de l'Acquisition** :
   * *Erreur* : Demander exactement le nombre d'images minimal (`minImageCount`) sans ajouter de marge.
   * *Conséquence* : Le GPU peut se retrouver bloqué à attendre qu'une image soit libérée par le serveur d'affichage de l'OS avant de pouvoir commencer à dessiner la frame suivante.
   * *Solution* : Toujours demander `minImageCount + 1` tout en vérifiant que cela ne dépasse pas `maxImageCount`.

---

## 5. Synthèse Pédagogique

### 5.1 Flux de Données de Présentation
Le schéma ci-dessous résume le cycle de vie d'une image dans notre architecture graphique :

```
+-----------------------------------------------------------------+
|                         Fenêtre OS                              |
+-----------------------------------------------------------------+
                                ^
                                | Présentation (vkQueuePresentKHR)
+-----------------------------------------------------------------+
|                        VkSwapchainKHR                           |
|  [ Image 0 (Front) ]  <--  [ Image 1 (Back) ]  <-- [ Image 2 ]  |
+-----------------------------------------------------------------+
        |                           ^
        | Acquisition               | Rendu (Pipeline Graphique)
        v                           |
+-----------------------------------------------------------------+
|                        VkImageView                              |
|             (Interprétation de la texture brute)                |
+-----------------------------------------------------------------+
```

### 5.2 Résumé des Étapes de Configuration
1. **Interroger** le GPU pour obtenir les capacités, les formats et les modes de présentation supportés pour notre surface.
2. **Sélectionner** le meilleur format de couleur (idéalement sRGB).
3. **Sélectionner** le mode de présentation (idéalement Mailbox pour le triple buffering).
4. **Calculer** la résolution réelle en pixels physiques (Extent).
5. **Créer** la `VkSwapchainKHR`.
6. **Récupérer** les handles des `VkImage` générées par la Swapchain.
7. **Envelopper** chaque image dans une `VkImageView` pour la rendre exploitable par la suite de notre pipeline graphique (qui sera étudiée au Module 2).

---

## 6. Exercice Pratique d'Application

### Énoncé
Lorsqu'un utilisateur redimensionne la fenêtre de l'application, la Swapchain existante devient invalide (sa taille ne correspond plus à la surface d'affichage). Vulkan ne gère pas ce redimensionnement automatiquement. L'application doit détecter ce changement, détruire l'ancienne Swapchain et en recréer une nouvelle avec les dimensions mises à jour.

Votre objectif est d'implémenter la fonction `recreateSwapChain()` qui gère proprement cette transition sans fuite de mémoire et en gérant le cas particulier où la fenêtre est minimisée (taille de $0 \times 0$ pixels).

### Indices
1. Si la fenêtre est minimisée, la largeur ou la hauteur du framebuffer sera égale à `0`. Dans ce cas, l'application doit se mettre en pause et attendre (`glfwWaitEvents()`) jusqu'à ce que la fenêtre soit restaurée.
2. Vous devez appeler `vkDeviceWaitIdle(device)` avant de commencer la destruction pour vous assurer que le GPU a fini d'exécuter toutes ses commandes en cours.
3. Pour une transition fluide sans scintillement visuel, vous pouvez passer le handle de l'ancienne Swapchain au champ `oldSwapchain` de la structure `VkSwapchainCreateInfoKHR` lors de la création de la nouvelle.

### Correction Complète

Voici l'implémentation C++ complète et robuste de la gestion du redimensionnement :

```cpp
#include <iostream>

// Variable globale pour suivre si un redimensionnement a eu lieu
bool framebufferResized = false;

// Callback GLFW appelé automatiquement lors d'un redimensionnement
void framebufferResizeCallback(GLFWwindow* window, int width, int height) {
    framebufferResized = true;
}

// Fonction de nettoyage spécifique à la Swapchain
void cleanupSwapChain() {
    // 1. Destruction des vues d'images
    for (size_t i = 0; i < swapChainImageViews.size(); i++) {
        vkDestroyImageView(device, swapChainImageViews[i], nullptr);
    }
    swapChainImageViews.clear();

    // 2. Destruction de la Swapchain elle-même
    if (swapChain != VK_NULL_HANDLE) {
        vkDestroySwapchainKHR(device, swapChain, nullptr);
        swapChain = VK_NULL_HANDLE;
    }
}

// Fonction de re-création complète de la Swapchain
void recreateSwapChain() {
    // Gestion de la minimisation de la fenêtre
    int width = 0, height = 0;
    glfwGetFramebufferSize(window, &width, &height);
    while (width == 0 || height == 0) {
        // On attend un nouvel événement (ex: restauration de la fenêtre)
        glfwGetFramebufferSize(window, &width, &height);
        glfwWaitEvents();
    }

    // Attendre que le GPU ait fini de travailler avant de détruire les ressources actives
    vkDeviceWaitIdle(device);

    // Nettoyage de l'ancienne Swapchain
    cleanupSwapChain();

    // Recréation des ressources avec les nouvelles dimensions de la fenêtre
    createSwapChain();
    createImageViews();

    std::cout << "Swapchain re-creee avec succes ! Nouvelle taille : " 
              << swapChainExtent.width << "x" << swapChainExtent.height << std::endl;
}

// Exemple d'intégration dans la boucle de rendu principale
void drawFrame() {
    // [Étape de rendu - Sera détaillée au Module 3.3]
    
    // Si la présentation de l'image échoue ou si GLFW signale un redimensionnement :
    // (Simulé ici par notre variable booléenne)
    if (framebufferResized) {
        framebufferResized = false;
        recreateSwapChain();
    }
}
```