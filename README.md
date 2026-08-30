# Flute Calculator

Calculateur d'emplacement des trous d'une flûte, basé sur les formules de [l'article "Placement des trous"](https://www.vents-sauvages.fr/bruicolage/placement-des-trous.html) du site Vents Sauvages.

L'application est disponible ici : [flute-calculator sur GitHub Pages](https://qkrempp.github.io/flute-calculator/)

## Libertés prises par rapport à l'article

Les formules (épaisseur acoustique, corrections des trous ouverts/fermés, fréquence de coupure, correction de terminaison) sont reprises telles quelles de l'article. En revanche, la démarche s'en écarte à plusieurs endroits, délibérément et pour les raisons suivantes.

### Résolution par point fixe plutôt que corrections séquentielles

L'article applique les corrections « en remontant » trou par trou, puis conseille d'itérer le processus « environ 5 fois », tout en soupçonnant qu'il n'est « pas convergent ». Le code (`instrument.ts`) remplace ce schéma par une **itération de point fixe** : chaque tour recalcule **toutes** les corrections à partir des positions du tour précédent, puis repositionne chaque trou d'un coup par rapport à sa longueur théorique (`position = longueur théorique − correction(position)`).

Justification :

- la soustraction cumulée séquentielle diverge sur les trous serrés : les trous se croisent, les espacements deviennent négatifs et les fréquences de coupure partent en `NaN` (bug constaté puis corrigé, voir le commit `ac257ad`) ;
- mettre à jour un trou avant son voisin du dessus peut le faire sauter au-delà de ce dernier, alors qu'il n'a pas encore été corrigé ;
- le point fixe traduit directement la physique : le trou sonne là où sa position plus son prolongement acoustique égale la longueur cible. Le premier tour des deux schémas coïncide, donc les résultats correspondent à un calcul à la main suivant l'article ;
- le nombre d'itérations reste 5, comme le préconise l'article.

### Diamètres des trous résolus automatiquement

L'article laisse le lecteur « décider au départ d'un diamètre pour chaque trou » de façon à homogénéiser les fréquences de coupure. Le code (`design.ts`) automatise ce choix : pour chaque trou, le diamètre est résolu **par dichotomie** (la fréquence de coupure croît de façon monotone avec le diamètre) afin d'atteindre exactement la fréquence de coupure cible.

La cible est fixée à `4 × f` où `f` est la fréquence de la note la plus grave. L'article recommande « le double de la fréquence de changement de registre » ; pour une flûte (résonateur ouvert), le changement de registre est l'octave supérieure, soit `2 × f`, d'où `4 × f`.

De plus, positions et diamètres sont couplés : la fréquence de coupure d'un trou dépend de son espacement au trou du dessous, qui dépend lui-même des positions corrigées. L'article traite le choix des diamètres comme une étape initiale distincte ; le code alterne résolution des diamètres puis des positions sur quelques tours, jusqu'à stabilisation.

### Conception à partir d'un tube existant

L'article part de la note grave souhaitée pour en déduire la longueur du tube. L'application inverse le point de départ, fidèle à l'usage de bricolage : on possède déjà un tube. La note grave est donc déduite de la longueur physique du tube (correction de terminaison comprise), ou mesurée directement au micro si l'utilisateur en fournit une fréquence — les tubes réels s'écartant des formules (couche limite, viscosité, pertes thermiques). La correction de terminaison est appliquée comme l'article le préconise : en fin de conception, sur la longueur à couper.

### Garde-fous de faisabilité

L'article ne traite pas le cas de layouts serrés où les corrections feraient se croiser les trous. Le code ajoute :

- un diamètre minimum garantissant que la correction d'interaction d'un trou reste dans l'espacement sous ce trou ;
- un écart minimal de 1 mm entre trous adjacents, pour garder un plan perçable ;
- un plancher numérique d'espacement (0,1 mm) pour éviter les divisions par zéro ;
- un arrondi des diamètres au pas de foret de 0,5 mm, borné au diamètre de la perce.

Ces garde-fous ne changent pas les formules : ils bornent leurs extrapolations lorsque les hypothèses de l'article ne tiennent plus.

### Effet d'embouchure ignoré, gamme tempérée

Comme l'article, qui renvoie ce point « à un prochain document », l'effet d'embouchure n'est pas modélisé : toutes les positions sont mesurées depuis l'embouchure. Les conversions nom de note ↔ fréquence utilisent la gamme tempérée (référence La configurable, 440 Hz par défaut), alors que l'article n'impose aucun tempérament.
