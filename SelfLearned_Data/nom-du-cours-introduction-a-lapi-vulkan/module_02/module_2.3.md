# Module 2.3 : Passes de rendu (Render Passes) et Framebuffers

Dans les modules précédents, nous avons configuré l'instance Vulkan, sélectionné notre carte graphique (Module 1.1), mis en place la Swapchain pour obtenir des images d'affichage (Module 1.3), compilé nos shaders en SPIR-V (Module 2.1) et configuré les fonctions fixes de notre pipeline graphique (Module 2.2). 

Cependant, une question fondamentale demeure : **où et comment le pipeline doit-il dessiner ?** 

Pour y répondre, Vulkan sépare strictement la définition logique des cibles de rendu et les ressources mémoire réelles qui recevront les pixels. C'est le rôle respectif des **Passes de rendu (Render Passes)** et des **Framebuffers**. Ce module détaille ces deux concepts indispensables pour franchir l'étape de l'affichage.

---

## 1. Introduction Conceptuelle

Pour comprendre pourquoi Vulkan introduit ces objets, comparons sa philosophie avec celle d'anciennes API comme OpenGL.

### Le "Pourquoi" : L'optimisation matérielle
En OpenGL, vous liiez un framebuffer, effaciez l'écran, dessiniez, puis affichiez le résultat. Le pilote graphique devait deviner vos intentions à la volée. 
Sur les architectures GPU modernes (en particulier les puces mobiles et les GPU de bureau à architecture *Tile-Based Rendering*), la mémoire vidéo globale (VRAM) est lente et énergivore par rapport à la mémoire cache ultra-rapide située directement sur la puce du GPU (SRAM).

Pour maximiser les performances, le GPU divise l'écran en tuiles (*tiles*). Il charge les données d'une tuile dans son cache ultra-rapide, effectue tous les calculs de dessin, puis réécrit le résultat final dans la VRAM. 

Pour optimiser ce processus, le GPU a besoin de savoir **à l'avance** :
1. Quelles images vont être lues ou écrites.
2. Si nous devons effacer l'image avant de dessiner (inutile de charger l'ancien contenu de la VRAM vers le cache si on l'écrase).
3. Si nous devons sauvegarder le résultat en VRAM à la fin ou s'il s'agit d'une image temporaire (comme un tampon de profondeur intermédiaire).

C'est exactement le rôle de la **Render Pass** : elle fournit au GPU un plan d'action complet et statique de l'opération de rendu.

### Analogie pédagogique
* **La Render Pass (Passe de rendu)** est le **plan d'architecture**. Elle définit la structure : *"Nous allons avoir besoin d'une feuille de papier au format A4 (Format d'image), nous allons d'abord la gommer entièrement (Load Op: Clear), dessiner dessus, puis la ranger dans un classeur (Store Op: Store)"*. Le plan ne contient pas la feuille physique.
* **Le Framebuffer** est le **classeur physique** contenant la vraie feuille de papier (les `VkImageView` créées à partir de la Swapchain). Il instancie le plan d'architecture en y liant de vraies ressources mémoire.

```
+-------------------------------------------------------------------+
|                           RENDER PASS                             |
|  (Le Plan : Spécifie les formats, opérations de chargement/sauve) |
+-------------------------------------------------------------------+
                                  ^
                                  | Instancie / Remplit
                                  v
+-------------------------------------------------------------------+
|                           FRAMEBUFFER                             |
|  (Le Conteneur : Lie les images physiques réelles aux slots)      |
|                                                                   |
|   +-------------------+       +-------------------------------+   |
|   |  Image de Couleur |  -->  |  VkImageView (Swapchain)      |   |
|   +-------------------+       +-------------------------------+   |
+-------------------------------------------------------------------+
```

---

## 2. Fondations Théoriques

### 2.1 La Passe de Rendu (`VkRenderPass`)
Une passe de rendu est composée de trois éléments principaux :
1. **Les Attachements (Attachments)** : Les descriptions des images de destination (couleur, profondeur, stencil, etc.).
2. **Les Sous-passes (Subpasses)** : Les étapes successives du rendu qui utilisent ces attachements.
3. **Les Dépendances de sous-passes (Subpass Dependencies)** : Les règles de synchronisation entre les sous-passes ou avec les opérations extérieures.

#### A. Les Attachements (`VkAttachmentDescription`)
Pour chaque image utilisée durant la passe, nous devons spécifier :
* **Format** : Le format de pixel (doit correspondre exactement au format de la Swapchain, ex: `VK_FORMAT_B8G8R8A8_SRGB`).
* **Samples** : Le nombre d'échantillons pour l'anti-crénelage (MSAA). Nous utiliserons `VK_SAMPLE_COUNT_1_BIT` (pas de MSAA) pour notre premier triangle.
* **Load Op** : Ce que l'on fait des pixels existants au début de la passe :
  * `VK_ATTACHMENT_LOAD_OP_CLEAR` : Efface l'image avec une couleur unie (très performant).
  * `VK_ATTACHMENT_LOAD_OP_LOAD` : Conserve le contenu existant (nécessite une lecture VRAM coûteuse).
  * `VK_ATTACHMENT_LOAD_OP_DONT_CARE` : Le contenu existant est ignoré/écrasé (le plus rapide, idéal si on redessine sur tout l'écran).
* **Store Op** : Ce que l'on fait des pixels générés à la fin de la passe :
  * `VK_ATTACHMENT_STORE_OP_STORE` : Sauvegarde le résultat en mémoire pour affichage ou lecture ultérieure.
  * `VK_ATTACHMENT_STORE_OP_DONT_CARE` : Jette le contenu (très utile pour un tampon de profondeur après que le rendu soit fini).
* **Layouts d'image (Transitions de Layout)** : Les GPU stockent les pixels différemment selon l'usage (optimisé pour l'écriture, pour la lecture de texture, ou pour l'affichage). Vulkan requiert de spécifier :
  * `initialLayout` : Le layout dans lequel se trouve l'image avant le début de la passe (ex: `VK_IMAGE_LAYOUT_UNDEFINED` si on s'en fiche et qu'on va l'effacer).
  * `finalLayout` : Le layout vers lequel Vulkan doit automatiquement transitionner l'image à la fin de la passe (ex: `VK_IMAGE_LAYOUT_PRESENT_SRC_KHR` pour que l'image soit prête à être envoyée à l'écran).

#### B. Les Sous-passes (`VkSubpassDescription`)
Une seule passe de rendu peut enchaîner plusieurs opérations successives appelées sous-passes. Par exemple, en rendu différé (*Deferred Shading*) :
* Sous-passe 1 : Écriture des positions, normales et couleurs dans des textures intermédiaires (G-Buffer).
* Sous-passe 2 : Lecture de ces textures pour calculer l'éclairage final.

Pour notre premier triangle, nous n'aurons besoin que d'**une seule sous-passe** de type graphique.

#### C. Les Dépendances de sous-passes (`VkSubpassDependency`)
Le GPU est une machine massivement parallèle qui exécute des tâches de manière asynchrone. Nous devons lui indiquer explicitement quand il a le droit de commencer à écrire sur notre image de la Swapchain. 

L'image de la Swapchain est acquise depuis le système de présentation de l'OS. Nous devons nous assurer que le GPU n'essaie pas d'écrire dessus avant que l'OS ait fini de la lire. Cette synchronisation est gérée par une dépendance de sous-passe.

---

### 2.2 Le Framebuffer (`VkFramebuffer`)
Le Framebuffer est un objet extrêmement simple. Il s'agit d'un tableau de vues d'images (`VkImageView`) qui viennent s'associer un-à-un aux attachements décrits par la Render Pass.

Si votre Render Pass décrit :
* Attachement 0 : Image de Couleur.
* Attachement 1 : Image de Profondeur.

Votre Framebuffer devra contenir exactement deux `VkImageView` : la première pointant vers une image de couleur, la seconde vers une image de profondeur.

> **Règle d'or de la Swapchain :** Comme la Swapchain contient plusieurs images (généralement 2 pour le Double Buffering ou 3 pour le Triple Buffering) pour éviter les déchirures d'écran, nous devons créer **un Framebuffer distinct pour chaque image de la Swapchain**.

---

## 3. Implémentation Pratique Pas-à-Pas

Nous allons maintenant écrire le code C++ permettant d'initialiser ces objets. Nous utiliserons l'API C standard de Vulkan (`<vulkan/vulkan.h>`).

### 3.1 Création de la Passe de Rendu

Voici la fonction complète pour créer notre `VkRenderPass`.

```cpp
#include <vulkan/vulkan.h>
#include <stdexcept>
#include <vector>

VkRenderPass createRenderPass(VkDevice device, VkFormat swapChainImageFormat) {
    VkRenderPass renderPass;

    // 1. Description de l'attachement de couleur (notre écran)
    VkAttachmentDescription colorAttachment{};
    colorAttachment.format = swapChainImageFormat;             // Doit correspondre à la swapchain
    colorAttachment.samples = VK_SAMPLE_COUNT_1_BIT;           // Pas de multisampling (MSAA)
    colorAttachment.loadOp = VK_ATTACHMENT_LOAD_OP_CLEAR;      // Effacer l'écran avant de dessiner
    colorAttachment.storeOp = VK_ATTACHMENT_STORE_OP_STORE;    // Sauvegarder le dessin pour l'afficher
    colorAttachment.stencilLoadOp = VK_ATTACHMENT_LOAD_OP_DONT_CARE; // Pas de stencil
    colorAttachment.stencilStoreOp = VK_ATTACHMENT_STORE_OP_DONT_CARE;
    colorAttachment.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED; // Layout d'origine non important
    colorAttachment.finalLayout = VK_IMAGE_LAYOUT_PRESENT_SRC_KHR; // Prêt pour la présentation écran

    // 2. Référence de l'attachement pour la sous-passe
    // Une sous-passe fait référence à un attachement par son index dans le tableau des descriptions.
    VkAttachmentReference colorAttachmentRef{};
    colorAttachmentRef.attachment = 0; // Index 0 (notre unique colorAttachment)
    colorAttachmentRef.layout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL; // Layout durant la sous-passe

    // 3. Description de la sous-passe unique
    VkSubpassDescription subpass{};
    subpass.pipelineBindPoint = VK_PIPELINE_BIND_POINT_GRAPHICS; // Sous-passe graphique
    subpass.colorAttachmentCount = 1;
    subpass.pColorAttachments = &colorAttachmentRef; // Pointeur vers notre référence d'attachement

    // 4. Dépendance de sous-passe pour la synchronisation
    // Nous devons attendre que l'image soit disponible avant d'écrire la couleur.
    VkSubpassDependency dependency{};
    dependency.srcSubpass = VK_SUBPASS_EXTERNAL; // Opération externe (la présentation de l'OS)
    dependency.dstSubpass = 0;                   // Notre sous-passe (index 0)
    
    // Étape d'attente : Attendre que l'étape de sortie des couleurs soit atteinte
    dependency.srcStageMask = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT;
    dependency.srcAccessMask = 0;

    // Étape de blocage : Bloquer l'écriture des couleurs tant que l'image n'est pas prête
    dependency.dstStageMask = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT;
    dependency.dstAccessMask = VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT;

    // 5. Création de la Render Pass
    VkRenderPassCreateInfo renderPassInfo{};
    renderPassInfo.sType = VK_STRUCTURE_TYPE_RENDER_PASS_CREATE_INFO;
    renderPassInfo.attachmentCount = 1;
    renderPassInfo.pAttachments = &colorAttachment;
    renderPassInfo.subpassCount = 1;
    renderPassInfo.pSubpasses = &subpass;
    renderPassInfo.dependencyCount = 1;
    renderPassInfo.pDependencies = &dependency;

    if (vkCreateRenderPass(device, &renderPassInfo, nullptr, &renderPass) != VK_SUCCESS) {
        throw std::runtime_error("Erreur : Impossible de creer la passe de rendu !");
    }

    return renderPass;
}
```

---

### 3.2 Création des Framebuffers

Maintenant que la Render Pass est définie, nous devons créer un Framebuffer pour chaque image de notre Swapchain. 

Supposons que nous ayons stocké nos `VkImageView` de la Swapchain dans un `std::vector<VkImageView> swapChainImageViews` et que nous connaissions les dimensions de la Swapchain via un `VkExtent2D swapChainExtent`.

```cpp
std::vector<VkFramebuffer> createFramebuffers(
    VkDevice device, 
    VkRenderPass renderPass, 
    const std::vector<VkImageView>& swapChainImageViews, 
    VkExtent2D swapChainExtent) 
{
    std::vector<VkFramebuffer> framebuffers(swapChainImageViews.size());

    // Boucle sur chaque image view de la swapchain
    for (size_t i = 0; i < swapChainImageViews.size(); i++) {
        // Liste des attachements liés au framebuffer.
        // L'ordre doit correspondre EXACTEMENT aux attachements de la Render Pass.
        VkImageView attachments[] = {
            swapChainImageViews[i]
        };

        VkFramebufferCreateInfo framebufferInfo{};
        framebufferInfo.sType = VK_STRUCTURE_TYPE_FRAMEBUFFER_CREATE_INFO;
        framebufferInfo.renderPass = renderPass;             // La Render Pass compatible
        framebufferInfo.attachmentCount = 1;                 // Nombre d'attachements
        framebufferInfo.pAttachments = attachments;          // Pointeur vers les images physiques
        framebufferInfo.width = swapChainExtent.width;       // Largeur de la swapchain
        framebufferInfo.height = swapChainExtent.height;     // Hauteur de la swapchain
        framebufferInfo.layers = 1;                          // Nombre de couches (1 pour de la 2D classique)

        if (vkCreateFramebuffer(device, &framebufferInfo, nullptr, &framebuffers[i]) != VK_SUCCESS) {
            throw std::runtime_error("Erreur : Impossible de creer le framebuffer " + std::to_string(i) + " !");
        }
    }

    return framebuffers;
}
```

---

### 3.3 Libération des Ressources (Cleanup)

En C++, la gestion de la mémoire dans Vulkan est entièrement manuelle. Tout objet créé avec une fonction `vkCreate...` doit être détruit avec son équivalent `vkDestroy...` lorsque l'application se ferme.

L'ordre de destruction est crucial : **les Framebuffers dépendent de la Render Pass et des Image Views**. Ils doivent donc être détruits en premier.

```cpp
void cleanupRenderingResources(
    VkDevice device, 
    VkRenderPass renderPass, 
    std::vector<VkFramebuffer>& framebuffers) 
{
    // 1. Détruire d'abord tous les framebuffers
    for (auto framebuffer : framebuffers) {
        vkDestroyFramebuffer(device, framebuffer, nullptr);
    }
    framebuffers.clear(); // Vider le tableau

    // 2. Détruire ensuite la Render Pass
    vkDestroyRenderPass(device, renderPass, nullptr);
}
```

---

## 4. Pièges Fréquents et Bonnes Pratiques

### 1. Incompatibilité entre Render Pass et Framebuffer
* **Le Piège** : Essayer d'utiliser un Framebuffer créé avec une Render Pass "A" dans une Render Pass "B".
* **La Règle** : Un Framebuffer n'est utilisable qu'avec la Render Pass qui a servi à sa création, ou avec une Render Pass **compatible**. Deux passes de rendu sont compatibles si elles possèdent le même nombre d'attachements avec les mêmes formats et le même nombre d'échantillons (MSAA).

### 2. Incohérence des dimensions
* **Le Piège** : Spécifier des dimensions de Framebuffer supérieures à celles de l'image de la Swapchain. Cela provoque un crash immédiat du pilote ou un comportement indéfini.
* **La Règle** : Assurez-vous que `framebufferInfo.width` et `framebufferInfo.height` correspondent exactement aux dimensions actuelles de vos images de Swapchain (`swapChainExtent`).

### 3. Mauvais ordre des attachements
* **Le Piège** : Déclarer la couleur en attachement 0 et la profondeur en attachement 1 dans la Render Pass, mais passer la vue de profondeur en premier dans le tableau `attachments[]` du Framebuffer.
* **La Règle** : L'indexation est stricte. L'ordre physique des `VkImageView` dans le tableau du Framebuffer doit correspondre au pixel près à l'ordre sémantique des `VkAttachmentDescription` de la Render Pass.

---

## 5. Synthèse Pédagogique

| Concept | Rôle Principal | Durée de vie typique | Lien avec les autres objets |
| :--- | :--- | :--- | :--- |
| **`VkRenderPass`** | Décrit la structure logique du rendu (Quels formats ? Quelles opérations ?). | Créée une fois au démarrage de l'application. | Référencée par la Pipeline Graphique et le Framebuffer. |
| **`VkFramebuffer`** | Lie les ressources mémoire réelles (`VkImageView`) à la structure de la Render Pass. | Recréée à chaque fois que la fenêtre est redimensionnée (car la Swapchain change). | Contient les Image Views de la Swapchain. |

### Flux de données simplifié :
```
[ Pipeline Graphique ] 
       |
       v (S'exécute dans)
[ Render Pass (Plan) ] <--- (Instanciée par) --- [ Framebuffer (Images réelles) ]
                                                       |
                                                       v
                                            [ Écran de l'utilisateur ]
```

---

## 6. Exercice Pratique d'Application

### Énoncé : Ajouter un tampon de profondeur (Depth Buffer)
Pour préparer notre moteur à afficher de la 3D, nous devons ajouter un **tampon de profondeur** (*Depth Buffer* ou *Z-Buffer*). Le tampon de profondeur permet d'éviter qu'un objet situé derrière un autre ne soit dessiné par-dessus.

Votre objectif est de modifier la fonction de création de la Render Pass pour intégrer un deuxième attachement : un attachement de profondeur.

#### Spécifications requises :
1. **Format de profondeur** : `VK_FORMAT_D32_SFLOAT` (Float 32-bits pour la précision).
2. **Load Op** : `VK_ATTACHMENT_LOAD_OP_CLEAR` (Nous voulons réinitialiser la profondeur à chaque image).
3. **Store Op** : `VK_ATTACHMENT_STORE_OP_DONT_CARE` (Une fois l'image dessinée, nous n'avons plus besoin de conserver la carte des profondeurs en mémoire).
4. **Layout de transition** :
   * `initialLayout` : `VK_IMAGE_LAYOUT_UNDEFINED`.
   * `finalLayout` : `VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL`.

---

### Indices pour vous aider
1. Vous devez déclarer un deuxième `VkAttachmentDescription` pour la profondeur.
2. Vous devez créer un `VkAttachmentReference` pour cet attachement de profondeur. Son `layout` doit être `VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL`.
3. Dans `VkSubpassDescription`, vous devez lier cette référence au pointeur `pDepthStencilAttachment`.
4. N'oubliez pas de passer la taille du tableau d'attachements à `2` dans `VkRenderPassCreateInfo`.

---

### Correction complète de l'exercice

Voici le code C++ corrigé permettant de créer une Render Pass gérant à la fois la couleur et la profondeur.

```cpp
#include <vulkan/vulkan.h>
#include <stdexcept>
#include <array>

VkRenderPass createRenderPassWithDepth(VkDevice device, VkFormat swapChainImageFormat) {
    VkRenderPass renderPass;

    // 1. Attachement Couleur
    VkAttachmentDescription colorAttachment{};
    colorAttachment.format = swapChainImageFormat;
    colorAttachment.samples = VK_SAMPLE_COUNT_1_BIT;
    colorAttachment.loadOp = VK_ATTACHMENT_LOAD_OP_CLEAR;
    colorAttachment.storeOp = VK_ATTACHMENT_STORE_OP_STORE;
    colorAttachment.stencilLoadOp = VK_ATTACHMENT_LOAD_OP_DONT_CARE;
    colorAttachment.stencilStoreOp = VK_ATTACHMENT_STORE_OP_DONT_CARE;
    colorAttachment.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED;
    colorAttachment.finalLayout = VK_IMAGE_LAYOUT_PRESENT_SRC_KHR;

    VkAttachmentReference colorAttachmentRef{};
    colorAttachmentRef.attachment = 0; // Index 0 dans le tableau des attachements
    colorAttachmentRef.layout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL;

    // 2. NOUVEAU : Attachement Profondeur (Z-Buffer)
    VkAttachmentDescription depthAttachment{};
    depthAttachment.format = VK_FORMAT_D32_SFLOAT; // Format haute précision pour la profondeur
    depthAttachment.samples = VK_SAMPLE_COUNT_1_BIT;
    depthAttachment.loadOp = VK_ATTACHMENT_LOAD_OP_CLEAR; // Effacer à chaque frame
    depthAttachment.storeOp = VK_ATTACHMENT_STORE_OP_DONT_CARE; // Pas besoin de le lire après le rendu
    depthAttachment.stencilLoadOp = VK_ATTACHMENT_LOAD_OP_DONT_CARE;
    depthAttachment.stencilStoreOp = VK_ATTACHMENT_STORE_OP_DONT_CARE;
    depthAttachment.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED;
    depthAttachment.finalLayout = VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL;

    VkAttachmentReference depthAttachmentRef{};
    depthAttachmentRef.attachment = 1; // Index 1 dans le tableau des attachements
    depthAttachmentRef.layout = VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL;

    // 3. Sous-passe associant Couleur ET Profondeur
    VkSubpassDescription subpass{};
    subpass.pipelineBindPoint = VK_PIPELINE_BIND_POINT_GRAPHICS;
    subpass.colorAttachmentCount = 1;
    subpass.pColorAttachments = &colorAttachmentRef;
    subpass.pDepthStencilAttachment = &depthAttachmentRef; // Liaison de l'attachement de profondeur

    // 4. Synchronisation
    VkSubpassDependency dependency{};
    dependency.srcSubpass = VK_SUBPASS_EXTERNAL;
    dependency.dstSubpass = 0;
    dependency.srcStageMask = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT | VK_PIPELINE_STAGE_EARLY_FRAGMENT_TESTS_BIT;
    dependency.srcAccessMask = 0;
    dependency.dstStageMask = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT | VK_PIPELINE_STAGE_EARLY_FRAGMENT_TESTS_BIT;
    dependency.dstAccessMask = VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT | VK_ACCESS_DEPTH_STENCIL_ATTACHMENT_WRITE_BIT;

    // 5. Regroupement des attachements dans un tableau
    std::array<VkAttachmentDescription, 2> attachments = { colorAttachment, depthAttachment };

    VkRenderPassCreateInfo renderPassInfo{};
    renderPassInfo.sType = VK_STRUCTURE_TYPE_RENDER_PASS_CREATE_INFO;
    renderPassInfo.attachmentCount = static_cast<uint32_t>(attachments.size());
    renderPassInfo.pAttachments = attachments.data();
    renderPassInfo.subpassCount = 1;
    renderPassInfo.pSubpasses = &subpass;
    renderPassInfo.dependencyCount = 1;
    renderPassInfo.pDependencies = &dependency;

    if (vkCreateRenderPass(device, &renderPassInfo, nullptr, &renderPass) != VK_SUCCESS) {
        throw std::runtime_error("Erreur : Impossible de creer la passe de rendu avec profondeur !");
    }

    return renderPass;
}
```

> **Note d'architecture pour le futur :** Si vous utilisez cette Render Pass avec profondeur, n'oubliez pas que vos **Framebuffers** devront eux aussi être modifiés pour recevoir un tableau de deux `VkImageView` (l'image de la Swapchain pour la couleur, et une image de texture de profondeur créée en VRAM). Nous aborderons la création des textures et de la mémoire GPU dans les modules de gestion des ressources.