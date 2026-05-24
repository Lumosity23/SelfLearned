# Exercices d'Application : Effets de l'Aérodynamisme et de l'Hydrodynamisme (Vent et Courant)

Ce cahier d'exercices pratiques a pour objectif de consolider vos compétences en physique amusante et en cinématique navale appliquées aux manœuvres de port. À travers des calculs de forces, des résolutions vectorielles et des analyses de cas concrets, vous apprendrez à anticiper scientifiquement le comportement de votre voilier.

---

## Exercice 1 : Évaluation quantitative des forces (Vent vs. Courant)

### Énoncé
Vous êtes le skipper d'un voilier de voyage moderne de 12 mètres présentant les caractéristiques suivantes :
*   **Surface de fardage latérale ($A$)** : $16\,\text{m}^2$
*   **Coefficient de traînée aérodynamique ($C_x$)** : $1,1$
*   **Surface mouillée latérale de la carène ($A_{sub}$)** : $4,5\,\text{m}^2$
*   **Coefficient de traînée hydrodynamique ($C_d$)** : $1,2$

Données physiques :
*   Masse volumique de l'air ($\rho_{air}$) : $1,2\,\text{kg/m}^3$
*   Masse volumique de l'eau de mer ($\rho_{eau}$) : $1025\,\text{kg/m}^3$
*   Conversion de nœuds en mètres par seconde : $1\,\text{nœud} \approx 0,514\,\text{m/s}$

Vous vous présentez à l'entrée d'un port de l'Atlantique. Vous devez comparer l'impact de deux configurations environnementales distinctes pour préparer votre stratégie d'accostage :
1.  **Configuration "Vent fort"** : Un vent de travers de $16\,\text{nœuds}$ sans aucun courant.
2.  **Configuration "Courant fort"** : Un courant de travers de $1,2\,\text{nœud}$ sans aucun vent.

**Questions :**
1. Calculez la force aérodynamique ($F_a$) exercée par le vent sur le fardage du voilier en Newtons ($\text{N}$) pour la configuration 1.
2. Calculez la force hydrodynamique ($F_h$) exercée par le courant sur la carène en Newtons ($\text{N}$) pour la configuration 2.
3. Comparez ces deux forces. Quelle est la configuration qui exercera la dérive latérale la plus violente sur le navire ? Quelle conclusion physique majeure en tirez-vous ?

---

### Indices
*   *Indice 1 :* N'oubliez pas de convertir les vitesses exprimées en nœuds en mètres par seconde ($\text{m/s}$) avant d'appliquer les formules de traînée.
*   *Indice 2 :* La formule de la force est de la forme $F = \frac{1}{2} \cdot \rho \cdot C \cdot S \cdot V^2$. Attention à bien utiliser la vitesse élevée au carré.

---

### Correction Détaillée

#### Question 1 : Calcul de la force aérodynamique ($F_a$)
*   **Conversion de la vitesse du vent ($V_a$) :**
    $$V_a = 16\,\text{nœuds} \times 0,514\,\text{m/s} \approx 8,224\,\text{m/s}$$
*   **Calcul de la force :**
    $$F_a = \frac{1}{2} \cdot \rho_{air} \cdot C_x \cdot A \cdot V_a^2$$
    $$F_a = 0,5 \times 1,2 \times 1,1 \times 16 \times (8,224)^2$$
    $$F_a = 10,56 \times 67,63 \approx \mathbf{714,2\,\text{N}}$$

La force exercée par un vent de travers de 16 nœuds est d'environ **$714\,\text{N}$** (soit l'équivalent d'une poussée d'environ $73\,\text{kg}$).

#### Question 2 : Calcul de la force hydrodynamique ($F_h$)
*   **Conversion de la vitesse du courant ($V_c$) :**
    $$V_c = 1,2\,\text{nœud} \times 0,514\,\text{m/s} \approx 0,617\,\text{m/s}$$
*   **Calcul de la force :**
    $$F_h = \frac{1}{2} \cdot \rho_{eau} \cdot C_d \cdot A_{sub} \cdot V_c^2$$
    $$F_h = 0,5 \times 1025 \times 1,2 \times 4,5 \times (0,617)^2$$
    $$F_h = 2767,5 \times 0,381 \approx \mathbf{1054,4\,\text{N}}$$

La force exercée par un courant de travers de 1,2 nœud est d'environ **$1054\,\text{N}$** (soit l'équivalent d'une poussée d'environ $107\,\text{kg}$).

#### Question 3 : Comparaison et conclusion
*   **Comparaison :** $F_h \, (1054,4\,\text{N}) > F_a \, (714,2\,\text{N})$.
*   **Conclusion :** Bien que la vitesse du courant ($1,2\,\text{nœud}$) semble dérisoire par rapport à celle du vent ($16\,\text{nœuds}$), la force hydrodynamique générée sur la carène est **47% plus élevée** que la force du vent sur le fardage. 
*   **Explication physique :** Cela s'explique par la masse volumique de l'eau de mer ($\approx 1025\,\text{kg/m}^3$), qui est environ **854 fois supérieure** à celle de l'air ($\approx 1,2\,\text{kg/m}^3$). En manœuvre de port, le courant doit toujours être traité comme la force prioritaire et la plus dangereuse, car elle est invisible et extrêmement puissante.

---

## Exercice 2 : Cinématique de l'approche et dérive vectorielle

### Énoncé
Vous devez remonter un chenal rectiligne orienté au Nord vrai ($000^\circ$) pour atteindre votre place de port. 
Le chenal est balayé par un courant de travers venant de l'Ouest (provenance au $270^\circ$) d'une vitesse constante $V_c = 1,0\,\text{nœud}$.
Votre voilier avance à une vitesse surface constante $V_s = 2,0\,\text{nœuds}$ (vitesse par rapport à l'eau, lue sur le loch). On néglige ici l'effet du vent.

```
                    Nord (000°) - Direction du chenal
                        ▲
                        │
                        │      / [Voilier] (Cap Compas / Cap Surface)
                        │     /
  Courant (270°)        │    /  Angle de dérive (θ)
  ====================> │   /
  Vc = 1.0 nd           │  /
                        │ /
                        │/
                        +
```

**Questions :**
1. Pour que la trajectoire réelle du bateau sur le fond ($\vec{V}_f$) reste parfaitement alignée avec l'axe du chenal (le Nord, $000^\circ$), le skipper doit adopter un angle de correction de dérive (appelé "angle de crabe"). Calculez cet angle $\theta$ (en degrés) et déterminez le cap surface ($Cap_s$) que le barreur doit suivre.
2. Calculez la norme de la vitesse fond résultante ($\vec{V}_f$) du voilier (en nœuds).
3. Si le chenal mesure $300\,\text{mètres}$ de long, combien de temps (en minutes et secondes) durera la remontée ?

---

### Indices
*   *Indice 1 :* Représentez la somme vectorielle $\vec{V}_f = \vec{V}_s + \vec{V}_c$. Pour que $\vec{V}_f$ soit dirigé vers le Nord ($000^\circ$) alors que $\vec{V}_c$ pousse vers l'Est ($090^\circ$), le vecteur $\vec{V}_s$ doit pointer vers l'Ouest du Nord (dans le quart Nord-Ouest).
*   *Indice 2 :* Utilisez la trigonométrie dans le triangle rectangle formé par les vecteurs vitesses. On a $\sin(\theta) = \frac{\text{Côté Opposé}}{\text{Hypoténuse}}$. Quelle est l'hypoténuse dans ce triangle ?

---

### Correction Détaillée

#### Question 1 : Calcul de l'angle de crabe ($\theta$) et du cap surface ($Cap_s$)
Pour compenser le courant qui pousse le bateau vers l'Est ($090^\circ$), le voilier doit "craber" en présentant son étrave vers l'Ouest ($270^\circ$).

Le triangle des vitesses est rectangle en l'axe du chenal (Nord) :
*   L'hypoténuse est le vecteur vitesse surface : $\|\vec{V}_s\| = 2,0\,\text{nœuds}$.
*   Le côté opposé à l'angle de dérive $\theta$ est le vecteur courant : $\|\vec{V}_c\| = 1,0\,\text{nœud}$.
*   Le côté adjacent est le vecteur vitesse fond : $\|\vec{V}_f\|$.

$$\sin(\theta) = \frac{\|\vec{V}_c\|}{\|\vec{V}_s\|} = \frac{1,0}{2,0} = 0,5$$
$$\theta = \arcsin(0,5) = \mathbf{30^\circ}$$

L'angle de correction de dérive est de **$30^\circ$**. 
Puisque le courant vient de l'Ouest ($270^\circ$), le bateau doit gouverner vers l'Ouest pour contrer la dérive.
$$Cap_s = 360^\circ - 30^\circ = \mathbf{330^\circ}$$

Le barreur doit maintenir un cap compas (surface) au **$330^\circ$** pour que le bateau se déplace en ligne droite sur le fond le long du chenal au $000^\circ$.

#### Question 2 : Calcul de la vitesse fond ($V_f$)
En utilisant le théorème de Pythagore ou la trigonométrie (cosinus) :
$$V_f = V_s \cdot \cos(\theta)$$
$$V_f = 2,0 \cdot \cos(30^\circ) = 2,0 \times 0,866 \approx \mathbf{1,73\,\text{nœuds}}$$

La vitesse réelle du bateau par rapport au fond n'est plus que de **$1,73\,\text{nœuds}$**.

#### Question 3 : Temps de transit dans le chenal
*   **Conversion de la vitesse fond en m/s :**
    $$V_f = 1,73\,\text{nœuds} \times 0,514\,\text{m/s} \approx 0,89\,\text{m/s}$$
*   **Calcul du temps ($t$) :**
    $$t = \frac{\text{Distance}}{V_f} = \frac{300\,\text{m}}{0,89\,\text{m/s}} \approx 337\,\text{secondes}$$
*   **Conversion en minutes/secondes :**
    $$337\,\text{s} = 5 \times 60\,\text{s} + 37\,\text{s} = \mathbf{5\,\text{min}\,\,37\,\text{s}}$$

La remontée du chenal prendra **5 minutes et 37 secondes**.

---

## Exercice 3 : Diagnostic de manœuvre et gestion du couple CLA/CLH

### Énoncé
Vous devez accoster le long d'un ponton linéaire dans un port de plaisance. 
Le ponton est orienté Est-Ouest. Votre place se situe sur le côté Sud du ponton (le ponton est donc à votre tribord si vous arrivez par l'Ouest).

**Conditions environnementales :**
*   **Vent :** Vent de secteur Nord de $18\,\text{nœuds}$ (vent de travers perpendiculaire au ponton, qui vous pousse au large, c'est-à-dire une configuration de **vent fuyant du quai**).
*   **Courant :** Nul.

**Caractéristiques du bateau :**
*   Voilier moderne de 11 mètres, étrave haute, équipé d'une capote de descente et d'un bimini (fardage important).
*   Le CLA (Centre de Latéralité Aérodynamique) est situé nettement en avant du CLH (Centre de Latéralité Hydrodynamique).
*   Pas d'hélice : Hélice pas à droite (en marche arrière, l'arrière du bateau botte à bâbord).

```
==================== PONTON ==================== (Côté Sud du ponton)
  
   [ Place Cible ]
  
  
  
   [ Votre Voilier ]  ===> (Approche par l'Ouest)
  
  
  
  ----------------------------------------------
  ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ 
  │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ 
  Vent de Nord (18 nœuds) - Pousse vers le Sud (le large)
```

**Questions :**
1. Décrivez précisément le comportement naturel du voilier (rotation et dérive) si vous décidez d'arrêter complètement le moteur à 10 mètres du ponton pour observer la situation.
2. L'équipage propose une approche classique : arriver parallèlement au ponton à très basse vitesse ($< 1\,\text{nœud}$) pour "sécuriser" l'accostage. Pourquoi cette méthode est-elle vouée à l'échec dans cette configuration ?
3. Rédigez le protocole de manœuvre optimal pas-à-pas pour réussir cet accostage en sécurité. Précisez :
    * L'angle d'approche initial par rapport au ponton.
    * Le point de contact visé.
    * La première amarre à passer en priorité absolue (et comment l'utiliser pour plaquer le bateau).

---

### Indices
*   *Indice 1 :* Pour la question 1, relisez la section 2.3 du cours sur l'interaction CLA/CLH. Si le CLA est en avant du CLH, quelle partie du bateau le vent va-t-il pousser en premier ?
*   *Indice 2 :* Pour la question 3, étudiez la "Configuration D" du cours. Une amarre classique (pointe ou travers) ne suffira pas à contrer le vent de travers. Pensez à l'effet de levier d'une garde avant combiné à la poussée du moteur.

---

### Correction Détaillée

#### Question 1 : Comportement naturel du voilier à l'arrêt
Si le voilier est immobilisé moteur coupé :
1.  **Abattée naturelle (Pivot) :** Le CLA étant situé en avant du CLH, le vent de Nord exerce une force latérale sur l'avant supérieure à celle exercée sur l'arrière. L'étrave va immédiatement abattre (fuir le vent vers le Sud). Le bateau va pivoter sur son CLH jusqu'à présenter son tableau arrière (le cul) face au Nord (face au vent).
2.  **Dérive latérale :** En parallèle de cette rotation, le bateau va dériver rapidement vers le Sud (s'éloignant du ponton) sous l'effet de la force quadratique d'un vent de 18 nœuds s'exerçant sur un fardage important (accentué par la capote et le bimini).

#### Question 2 : Analyse de l'échec de l'approche parallèle et lente
Une approche parallèle et lente est une erreur critique ici :
*   À moins de 1,5 nœud, les appendices (quille et safran) perdent leur portance. Le skipper n'a plus de contrôle directionnel.
*   Le vent de travers de 18 nœuds va pousser latéralement le bateau vers le large à une vitesse supérieure à sa vitesse d'approche.
*   Le bateau sera repoussé au milieu du bassin avant même d'avoir pu approcher le ponton à portée de jet d'amarre. Si l'équipage tente de lancer une amarre, celle-ci sera trop courte ou impossible à étarquer à la main contre les $700\,\text{N}$ de force de dérive.

#### Question 3 : Protocole de manœuvre optimal (Configuration D - Vent fuyant)

```
==================== PONTON ====================
                     \  Garde avant frappée
                      \ 
                       \ [ Voilier ] (Angle de 45°)
                        \
                         ▲
                         │  Vent de Nord (Pousse au large)
```

1.  **Préparation :** Positionner des pare-battages bas à l'étrave et un gros pare-battage "volant" à l'épaule tribord avant. Préparer une amarre sur le taquet d'amarrage avant tribord, qui servira de **garde avant**.
2.  **Angle d'approche :** Approcher avec un angle très fermé, entre **$45^\circ$ et $60^\circ$** par rapport au ponton, en conservant une vitesse franche (environ 2 nœuds surface) pour maintenir le bateau manœuvrant et contrer la dérive.
3.  **Point de contact :** Viser directement le ponton avec l'épaule tribord de l'étrave (protégée par les défenses). 
4.  **Sécurisation (La Garde Avant) :** 
    * Dès que l'étrave est à portée du ponton, l'équipier avant descend ou frappe immédiatement la **garde avant** sur un taquet du ponton situé en arrière de l'étrave.
    * L'équipier tourne cette garde sur le taquet du bateau et l'étarque fermement (la bloque).
5.  **Plaquage hydrodynamique (Effet de levier) :**
    * Le skipper tourne la barre **toute à bâbord** (du côté opposé au ponton).
    * Il embraye le moteur en **marche avant lente**.
    * *Physique du mouvement :* Le bateau, retenu par sa garde avant, ne peut pas avancer. Le flux d'eau de l'hélice dévié par le safran vers bâbord pousse l'arrière du bateau vers tribord (vers le ponton). Le voilier vient se plaquer parallèlement au ponton contre le vent.
6.  **Finalisation :** Le moteur est maintenu embrayé en marche avant pour garder le bateau plaqué sans effort. L'équipage peut alors tranquillement passer la pointe arrière et les autres amarres en toute sécurité.