# Exercices d'Application : Typologie des Quais et Configurations d'Amarrage

## Exercice 1 : Géométrie de l'Amarrage et Calcul de Marnage (Quai Fixe)

### Énoncé
Vous êtes le chef de bord d'un voilier de 12 mètres amarré de longside le long d'un quai fixe en pierre dans le port de Cherbourg. Vous arrivez à la pleine mer (hauteur d'eau maximale). Les prévisions de marée indiquent un marnage exceptionnel de $\Delta H = 6\text{ mètres}$ pour la basse mer à venir. 

Le taquet d'amarrage de votre voilier et le bollard en pierre du quai sont séparés par une distance horizontale fixe $D = 8\text{ mètres}$ (mesurée parallèlement à la surface de l'eau à la pleine mer).

```
Pleine Mer (PM) :
+-------------------------------------------------------------+ <--- Haut du quai
|                                                             |
|  o (Bollard)                                                |
|  | \                                                        |
|  |   \  L (Longueur de l'amarre)                            |
|  |     \                                                    |
|--|-------o (Taquet du voilier)------------------------------+ <--- Niveau PM
|  |       |                                                  |
|  |       | Voilier                                          |
|  |       +--------------------------------------------------+
|  | <---> D = 8 m                                            |
```

1. **Calcul de la longueur minimale :** En utilisant la formule de sécurité géométrique, calculez la longueur minimale théorique $L$ que doit avoir votre amarre (pointe ou garde) pour que le voilier puisse descendre jusqu'à la basse mer sans se retrouver suspendu au quai.
2. **Analyse de risque (Le piège du "Tidal Hang") :** Un équipier inexpérimenté décide d'utiliser une amarre de $9\text{ mètres}$ et la souque (tend) au maximum à la pleine mer, réduisant la distance horizontale $D$ à $6.5\text{ mètres}$. Calculez la longueur minimale requise dans cette nouvelle configuration. Que va-t-il se passer à la basse mer ?
3. **Recommandation pratique :** Proposez deux solutions concrètes pour sécuriser l'amarrage si la longueur de vos amarres est insuffisante ou si vous souhaitez limiter le mouvement latéral du bateau à basse mer.

### Indices
*   *Indice 1 :* Pour la question 1, appliquez directement le théorème de Pythagore dans le plan vertical : $L \ge \sqrt{\Delta H^2 + D^2}$. Ici, la hauteur d'eau à perdre est la variation totale de hauteur ($\Delta H = 6\text{ m}$).
*   *Indice 2 :* Pour la question 2, recalculez la longueur minimale requise avec la nouvelle valeur de $D = 6.5\text{ m}$ et comparez-la à la longueur réelle de l'amarre utilisée ($9\text{ m}$). Si la longueur réelle est inférieure à la longueur minimale requise, le bateau ne pourra pas atteindre le niveau de la basse mer physiquement.

### Correction Détaillée

1. **Calcul de la longueur minimale théorique $L$ :**
   *   Nous appliquons la formule de sécurité géométrique :
       $$L \ge \sqrt{\Delta H^2 + D^2}$$
   *   En remplaçant par les valeurs de l'énoncé :
       $$L \ge \sqrt{6^2 + 8^2}$$
       $$L \ge \sqrt{36 + 64}$$
       $$L \ge \sqrt{100} = 10\text{ mètres}$$
   *   **Conclusion :** L'amarre doit mesurer au minimum **10 mètres** de long (entre le taquet et le bollard) pour permettre au voilier d'atteindre la basse mer sans tension destructive.

2. **Analyse de risque avec l'amarre de 9 mètres ($D = 6.5\text{ m}$) :**
   *   Calculons d'abord la longueur minimale requise $L_{req}$ pour cette nouvelle configuration :
       $$L_{req} \ge \sqrt{6^2 + 6.5^2}$$
       $$L_{req} \ge \sqrt{36 + 42.25}$$
       $$L_{req} \ge \sqrt{78.25} \approx 8.85\text{ mètres}$$
   *   L'amarre utilisée mesure $9\text{ mètres}$. Comme $9\text{ m} > 8.85\text{ m}$, l'amarre est théoriquement assez longue pour atteindre la basse mer. 
   *   **Cependant, analysons la marge de sécurité :** La marge n'est que de $9 - 8.85 = 0.15\text{ m}$ (15 cm). À basse mer, l'amarre sera extrêmement tendue. Le moindre clapot ou la moindre variation de vent va générer des tensions dynamiques colossales (proches de l'infini en raison de la verticalité de l'amarre). 
   *   **Risque réel :** Le bateau risque de se retrouver "suspendu" par le flanc contre le quai en pierre, provoquant une gîte importante, l'arrachement du taquet, ou le coincement des pare-battages qui finiront par éclater sous la pression.

3. **Recommandations pratiques :**
   *   **Solution A (Augmenter la distance horizontale) :** Rallonger les amarres en allant chercher des bollards plus lointains sur le quai (augmenter artificiellement $D$ pour adoucir l'angle vertical).
   *   **Solution B (Utilisation d'une sentinelle / poids suspendu) :** Frapper un poids (un plomb de plongée ou une gueuse) au milieu de l'amarre. Ce poids va créer une courbe (caténaire) dans le cordage, agissant comme un amortisseur mécanique qui donne du mou à mesure que la tension augmente.
   *   **Solution C (Garde montante/descendante croisée) :** Privilégier des gardes très longues qui se croisent sur toute la longueur du bateau plutôt que des traversiers courts.

---

## Exercice 2 : Analyse Trigonométrique des Forces (Vent de Face)

### Énoncé
Un voilier de 10 tonnes est amarré de longside. Un fort vent de face génère une force de traînée aérodynamique longitudinale sur le gréement et la coque évaluée à $F_x = 2000\text{ Newtons}$ (environ $200\text{ kgf}$).

Pour contrer ce mouvement de recul, le skipper utilise une pointe avant frappée sur un taquet du quai.

```
          Axe longitudinal du voilier
  -----------------------------------------> F_x = 2000 N
         \  theta
          \
           \  T (Tension dans l'amarre)
            \
             v  Point d'ancrage au quai
```

On étudie deux configurations d'amarrage différentes pour cette pointe avant :
*   **Configuration A :** La pointe est longue et bien orientée, faisant un angle $\theta_A = 15^\circ$ avec l'axe longitudinal du voilier.
*   **Configuration B :** En raison de l'encombrement du quai, la pointe est frappée sur un bollard très proche, formant un angle très ouvert $\theta_B = 60^\circ$ avec l'axe longitudinal.

1. **Calcul des tensions :** Calculez la tension mécanique ($T_A$ et $T_B$) subie par l'amarre dans les deux configurations.
2. **Analyse mécanique :** Comparez les résultats. Quel est le pourcentage d'augmentation de la force subie par le taquet du bateau dans la Configuration B par rapport à la Configuration A ?
3. **Interprétation physique :** Expliquez pourquoi un angle important ($\theta \to 90^\circ$) est dangereux pour l'échantillonnage (la solidité) du pont du voilier.

### Indices
*   *Indice 1 :* Utilisez la formule de décomposition des forces issue du cours : $T = \frac{F_x}{\cos(\theta)}$.
*   *Indice 2 :* Assurez-vous que votre calculatrice est bien configurée en degrés (deg) pour calculer $\cos(15^\circ)$ et $\cos(60^\circ)$. Rappel : $\cos(60^\circ) = 0.5$.

### Correction Détaillée

1. **Calcul des tensions $T_A$ et $T_B$ :**

   *   **Pour la Configuration A ($\theta_A = 15^\circ$) :**
       $$T_A = \frac{F_x}{\cos(15^\circ)}$$
       $$\cos(15^\circ) \approx 0.9659$$
       $$T_A = \frac{2000}{0.9659} \approx 2070.6\text{ Newtons}$$

   *   **Pour la Configuration B ($\theta_B = 60^\circ$) :**
       $$T_B = \frac{F_x}{\cos(60^\circ)}$$
       $$\cos(60^\circ) = 0.5$$
       $$T_B = \frac{2000}{0.5} = 4000\text{ Newtons}$$

2. **Comparaison et pourcentage d'augmentation :**
   *   La tension passe de $2070.6\text{ N}$ à $4000\text{ N}$.
   *   Calcul du pourcentage d'augmentation :
       $$\text{Augmentation} = \frac{T_B - T_A}{T_A} \times 100$$
       $$\text{Augmentation} = \frac{4000 - 2070.6}{2070.6} \times 100 \approx 93.2\%$$
   *   **Conclusion :** En ouvrant l'angle à $60^\circ$, la tension dans l'amarre (et donc l'effort sur le taquet d'amarrage) est presque **doublée** ($+93.2\%$) pour contrer exactement la même force de vent.

3. **Interprétation physique :**
   *   Plus l'angle $\theta$ augmente (se rapproche de $90^\circ$), plus la composante utile de l'amarre pour contrer la force longitudinale $F_x$ diminue. 
   *   Pour compenser cette perte d'efficacité géométrique, l'amarre doit développer une tension globale extrêmement élevée. 
   *   À $90^\circ$ (traversier pur), $\cos(90^\circ) = 0$. La tension théorique nécessaire pour contrer une force longitudinale tend vers l'infini ($T \to \infty$). En pratique, le bateau va reculer jusqu'à ce que l'angle diminue, ou le taquet s'arrachera sous l'effet de cette force démultipliée. C'est pourquoi les traversiers ne doivent jamais être utilisés seuls pour retenir un bateau longitudinalement.

---

## Exercice 3 : Conception d'un Amarrage "Cul au Quai" (Méditerranéen)

### Énoncé
Vous devez amarrer votre voilier de 12 tonnes "cul au quai" dans une marina de Méditerranée. Un vent de travers (perpendiculaire à l'axe du bateau) de $25\text{ nœuds}$ souffle de la gauche (babord), exerçant une force latérale continue sur la coque évaluée à $F_{vent} = 3500\text{ N}$.

```
  +-------------------------------------------------------------------------+
  |  QUAI DE MARINA                                                         |
  +-------------------------------------------------------------------------+
         o (Taquet Quai)                                     o (Taquet Quai)
          \                                                 /
           \  T_g (Amarre gauche)                          / T_d (Amarre droite)
            \                                             /
             +------------------[ TABLEAU ]--------------+
             | [Taquet Babord]              [Taquet Tribord]
             |                                           |
             |                 VOILIER                   |  <=== VENT LATERALE
             |                                           |       (F_vent = 3500 N)
             |                                           |
             +------------------[ ÉTRAVE ]---------------+
                                    |
                                    | (Pendille avant tendue)
                                    v
```

Le dispositif d'amarrage comprend :
1. Une **pendille avant** reprise sur le taquet d'étrave, tendue vers l'avant.
2. Deux **amarres arrière** (pointes) frappées sur les taquets de quai : l'amarre arrière babord (gauche) et l'amarre arrière tribord (droite).

On suppose dans cet exercice simplifié que la pendille avant est parfaitement étriquée (tendue) et empêche tout mouvement d'avance ou de recul.

1. **Analyse du rôle des lignes :** Lorsque le vent souffle de la droite (tribord) vers la gauche (babord) :
   *   Quelle amarre arrière travaille principalement en tension ?
   *   Quel est le risque pour le bateau si la pendille avant est laissée complètement molle ?
2. **Calcul de la force de rappel :** Si le vent pousse le bateau latéralement et que l'amarre arrière au vent (tribord) fait un angle de $45^\circ$ avec le tableau arrière du bateau, calculez la tension $T_d$ nécessaire dans cette amarre pour équilibrer la force du vent $F_{vent} = 3500\text{ N}$.
3. **Plan de prévention du ragage :** Le quai de la marina est en béton brut abrasif. Décrivez précisément trois actions à mener lors de l'installation de vos amarres arrière pour éviter leur rupture par ragage sur une période de 48 heures.

### Indices
*   *Indice 1 :* Le vent pousse le bateau vers la gauche (babord). Le bateau veut donc s'écarter vers la gauche. C'est l'amarre opposée (située au vent, donc à droite/tribord) qui va se tendre pour retenir le bateau.
*   *Indice 2 :* Pour la question 2, la force du vent est latérale ($F_{vent}$). L'amarre au vent travaille avec un angle de $45^\circ$. La composante de tension de l'amarre qui s'oppose à la dérive latérale est $T_d \cdot \sin(45^\circ)$ ou $T_d \cdot \cos(45^\circ)$ (puisque $\sin(45^\circ) = \cos(45^\circ) \approx 0.707$). Posez l'équation d'équilibre : $T_d \cdot \sin(45^\circ) = F_{vent}$.

### Correction Détaillée

1. **Analyse qualitative du système :**
   *   **Amarre active :** Le vent soufflant de tribord (droite) pousse le voilier vers babord (gauche). C'est l'**amarre arrière tribord** (au vent) qui travaille en tension pour empêcher le bateau de dériver et de percuter son voisin de babord. L'amarre babord (sous le vent) devient molle.
   *   **Risque si la pendille est molle :** Si la pendille avant n'est pas tendue, le voilier n'a plus de point de pivot rigide à l'avant. Sous l'effet du vent de travers, l'étrave va abattre (tourner) sans retenue vers babord. Le bateau va pivoter autour de ses taquets arrière, se mettre en travers de la place de port, et venir percuter violemment les voiliers voisins ou les pendilles des autres usagers.

2. **Calcul de la tension $T_d$ dans l'amarre au vent :**
   *   Pour maintenir le bateau en équilibre statique, la composante latérale de la tension de l'amarre tribord doit être égale et opposée à la force du vent :
       $$T_d \cdot \sin(45^\circ) = F_{vent}$$
   *   On isole $T_d$ :
       $$T_d = \frac{F_{vent}}{\sin(45^\circ)}$$
       $$\sin(45^\circ) \approx 0.7071$$
       $$T_d = \frac{3500}{0.7071} \approx 4949.8\text{ Newtons}$$
   *   **Conclusion :** L'amarre arrière tribord subit une tension d'environ **4950 N** (soit près de $500\text{ kgf}$). Cela démontre l'importance d'utiliser des cordages de diamètre adapté (minimum 14 à 16 mm pour cette taille de bateau) et en bon état.

3. **Plan de prévention du ragage (3 actions clés) :**
   *   **Action 1 : Installation de gaines de protection.** Enfiler des tuyaux d'arrosage armés ou des gaines en polyester/cuir autour des amarres aux endroits précis où elles frottent contre l'angle en béton du quai.
   *   **Action 2 : Utilisation d'amortisseurs d'amarrage.** Installer des ressorts métalliques ou des amortisseurs en élastomère (caoutchouc) sur les amarres arrière. Ils absorbent les pics de tension dynamiques dus au clapot, réduisant ainsi les micro-mouvements de va-et-vient qui causent l'échauffement et l'usure par friction du cordage.
   *   **Action 3 : Modification de la hauteur de tirage (Amarrage à double hauteur).** Si possible, passer l'amarre dans un chaumard bas ou régler la tension pour que le point de contact avec le béton soit fixe et ne frotte pas continuellement, ou doubler l'amarre avec une chaîne de protection sur la section en contact direct avec le quai.