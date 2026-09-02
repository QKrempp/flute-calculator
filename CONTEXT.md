# Calculateur de flûte

Aide un facteur à placer et dimensionner les trous d'une flûte à partir d'un tuyau qu'il a déjà fabriqué et mesuré, d'après l'article « Placement des trous » de vents-sauvages.fr.

## Language

### Le tuyau

**Tuyau**:
Le tube physique déjà en possession du facteur : sa longueur, sa perce et l'épaisseur de sa paroi.
_Éviter_: tube, pipe, corps

**Perce**:
Diamètre intérieur du tuyau.
_Éviter_: canal, bore

**Pavillon**:
Extrémité ouverte du tuyau, opposée à l'embouchure ; origine de toutes les positions mesurées.
_Éviter_: bout du tuyau, sortie

**Embouchure**:
Ouverture par laquelle le facteur souffle ; elle ajoute une longueur acoustique au tuyau.

**Correction d'embouchure**:
Longueur acoustique ajoutée par l'embouchure, déduite de la note grave mesurée sur le tuyau fini.

**Facteur**:
La personne qui fabrique la flûte ; l'utilisatrice de l'application.

### Les notes

**Note grave**:
Note produite tous trous fermés ; elle pilote tout le plan de perçage.
_Éviter_: fondamentale, tonique

**Diapason**:
Fréquence de référence du La4, 440 Hz par défaut.
_Éviter_: tonalité, accordage

**Gamme**:
Preset définissant les notes des trous au-dessus de la note grave (pentatonique, diatonique, chromatique) ou saisie libre.

### Les trous

**Trou**:
Ouverture percée dans le tuyau ; découverte, elle produit sa note.
_Éviter_: trou de jeu, trou d'harmonie

**Note de trou**:
Note produite lorsqu'un trou est ouvert ; toujours plus aiguë que la note grave.

**Écart**:
Distance entre un trou et le trou suivant vers le pavillon ; pour le trou le plus grave, jusqu'au pavillon.
_Éviter_: espacement, gap

**Coupure**:
Fréquence au-dessus de laquelle un trou ne ventile plus correctement le tuyau ; chaque foret est choisi pour que la coupure atteigne la cible.
_Éviter_: cutoff, fréquence de coupure (usage courant accepté dans l'UI)

**Foret**:
Diamètre de perçage d'un trou, choisi sur la grille de perçage.
_Éviter_: diamètre du trou (ambigu avec la perce)

**Grille de perçage**:
Ensemble des diamètres de foret réellement disponibles, par pas de 0,5 mm.

### Le plan

**Plan de perçage**:
Résultat du calcul : pour chaque trou sa note, sa position depuis le pavillon, son foret et sa coupure, plus la note grave, la correction d'embouchure et la cible de coupure.
