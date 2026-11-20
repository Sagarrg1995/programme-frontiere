# Programme du colloque

Site statique sur une seule page. Pour modifier le contenu, éditez uniquement
`programme.js` : titre, lieu, dates, sessions et conférences y sont regroupés.

Le programme initial reprend le PDF « Programme Acedle 2027 V5 » lié sur le site
ScienceConf. Vérifiez que ce document est toujours la version de référence avant
publication. Les présidences n'y étant pas renseignées, elles sont à compléter.

Chaque journée contient une liste de sessions. Une session renseigne son titre,
son président, sa salle et ses conférences. Chaque conférence contient son
intitulé, son horaire et une liste `intervenants` avec un prénom et un nom par
personne. Une salle renseignée au niveau d'une conférence remplace celle de sa
session.

La barre de navigation permet de choisir l'affichage par session ou la grille
par salle. Les étoiles ajoutent des interventions aux favoris; ceux-ci sont
conservés dans le navigateur et filtrables avec « Mes favoris ». Les lieux
cliquables ouvrent une recherche Google Maps.

Les dates utilisent le format `AAAA-MM-JJ` et les heures `HH:MM`. Pour ajouter
une journée, copiez un objet de journée dans `programme.js`; l'interface génère
automatiquement son onglet.

Ouvrez `index.html` dans un navigateur pour consulter le site. Aucune compilation
ni installation n'est nécessaire.