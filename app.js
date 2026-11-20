(function () {
  const data = window.PROGRAMME;
  const byId = (id) => document.getElementById(id);
  const favoritesKey = "acedle-2027-favorites";
  let favoris = new Set();
  try {
    favoris = new Set(JSON.parse(localStorage.getItem(favoritesKey) || "[]"));
  } catch {
    favoris = new Set();
  }
  const state = { jour: "tous", recherche: "", salle: "", vue: "sessions", favorisSeulement: false };

  const parseDate = (value) => new Date(`${value}T12:00:00`);
  const formatDate = (value, options) =>
    parseDate(value).toLocaleDateString("fr-FR", options);
  const formatHeure = (value) => (value || "").replace(/^0(?=\d)/, "");
  const normaliser = (value) =>
    (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const echapper = (value) =>
    (value ?? "").toString().replace(/[&<>"']/g, (caractere) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[caractere]);
  const lienMaps = (lieu, adresse = data.colloque.adresse) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([lieu, adresse].filter(Boolean).join(", "))}`;
  const afficherSalle = (salle) =>
    (salle || "").replace(/^(Patio, bâtiment 3) · (Salle 3R-E\d+)$/, "$2 · $1");
  const identifiantConference = (jour, session, conference) =>
    `${jour.date}|${session.salle || session.titre}|${conference.debut}|${conference.titre}`;

  function boutonFavori(jour, session, conference) {
    const id = identifiantConference(jour, session, conference);
    const actif = favoris.has(id);
    const libelle = actif ? "Retirer des favoris" : "Ajouter aux favoris";
    return `<button type="button" class="favorite-button${actif ? " is-favorite" : ""}" data-favori="${echapper(id)}" aria-label="${libelle}" aria-pressed="${actif}" title="${libelle}"><span aria-hidden="true">${actif ? "★" : "☆"}</span></button>`;
  }

  function enregistrerFavoris() {
    try {
      localStorage.setItem(favoritesKey, JSON.stringify([...favoris]));
    } catch {
    }
  }

  function afficherEntete() {
    const colloque = data.colloque;
    document.title = `Programme — ${colloque.titre}`;
    byId("titre").textContent = colloque.titre;
    byId("sous-titre").textContent = colloque.sousTitre || "Programme du colloque";
    const lieuComplet = [colloque.lieu, colloque.adresse].filter(Boolean).join(", ");
    byId("lieu").innerHTML = `<a href="${lienMaps(colloque.lieu, colloque.adresse)}" target="_blank" rel="noopener">${echapper(lieuComplet)}</a>`;
    if (colloque.organisateurs) {
      byId("organisateurs").textContent = colloque.organisateurs;
    } else {
      byId("orga-bloc").remove();
    }
    if (colloque.contact) {
      byId("contact").innerHTML = `Contact : <a href="mailto:${echapper(colloque.contact)}">${echapper(colloque.contact)}</a>`;
    }

    const jours = [...data.jours].sort((a, b) => a.date.localeCompare(b.date));
    if (!jours.length) return jours;
    const premier = parseDate(jours[0].date);
    const dernier = parseDate(jours[jours.length - 1].date);
    const memeMois = premier.getMonth() === dernier.getMonth();
    const dateDebut = formatDate(jours[0].date, {
      day: "numeric", month: memeMois ? undefined : "long",
    });
    const dateFin = formatDate(jours[jours.length - 1].date, {
      day: "numeric", month: "long", year: "numeric",
    });
    byId("dates").textContent = jours.length === 1 ? dateFin : `Du ${dateDebut} au ${dateFin}`;
    return jours;
  }

  const jours = afficherEntete();

  function configurerFiltres() {
    const salles = new Set();
    jours.forEach((jour) => jour.sessions.forEach((session) => {
      if (session.pause) return;
      if (session.salle) salles.add(session.salle);
      (session.conferences || []).forEach((conference) => {
        if (conference.salle) salles.add(conference.salle);
      });
    }));
    [...salles].sort((a, b) => a.localeCompare(b, "fr", { numeric: true })).forEach((salle) => {
      const option = document.createElement("option");
      option.value = salle;
      option.textContent = afficherSalle(salle);
      byId("filtre-salle").append(option);
    });

    const onglets = [{ id: "tous", titre: "Tout le colloque", sousTitre: `${jours.length} jours` }];
    jours.forEach((jour, index) => onglets.push({
      id: jour.date,
      titre: `Jour ${index + 1}`,
      sousTitre: formatDate(jour.date, { weekday: "short", day: "numeric", month: "short" }),
    }));
    byId("onglets").innerHTML = onglets.map((onglet) =>
      `<button type="button" role="tab" aria-selected="false" data-jour="${echapper(onglet.id)}"><strong>${echapper(onglet.titre)}</strong><span>${echapper(onglet.sousTitre)}</span></button>`
    ).join("");

    byId("onglets").addEventListener("click", (event) => {
      const bouton = event.target.closest("button[data-jour]");
      if (!bouton) return;
      state.jour = bouton.dataset.jour;
      afficherProgramme();
    });
    byId("recherche").addEventListener("input", (event) => {
      state.recherche = normaliser(event.target.value.trim());
      afficherProgramme();
    });
    byId("filtre-salle").addEventListener("change", (event) => {
      state.salle = event.target.value;
      afficherProgramme();
    });
    document.querySelectorAll("[data-vue]").forEach((bouton) => {
      bouton.addEventListener("click", () => {
        state.vue = bouton.dataset.vue;
        afficherProgramme();
      });
    });
    byId("favoris-seuls").addEventListener("change", (event) => {
      state.favorisSeulement = event.target.checked;
      afficherProgramme();
    });
    byId("programme").addEventListener("click", (event) => {
      const bouton = event.target.closest("button[data-favori]");
      if (!bouton) return;
      const id = bouton.dataset.favori;
      if (favoris.has(id)) favoris.delete(id);
      else favoris.add(id);
      enregistrerFavoris();
      afficherProgramme();
    });
  }

  function correspond(session, conference, jour) {
    const salle = conference.salle || session.salle || "";
    if (state.salle && salle !== state.salle) return false;
    if (state.favorisSeulement && !favoris.has(identifiantConference(jour, session, conference))) return false;
    if (!state.recherche) return true;
    const intervenants = (conference.intervenants || [conference]).flatMap((personne) =>
      [personne.prenom, personne.nom]
    );
    const contenu = normaliser([
      conference.titre, ...intervenants, session.titre, session.president, salle,
    ].join(" "));
    return contenu.includes(state.recherche);
  }

  function afficherPause(session) {
    if (state.recherche || state.salle) return "";
    const lieu = session.salle
      ? `<a href="${lienMaps(session.salle, session.adresse || data.colloque.adresse)}" target="_blank" rel="noopener">${echapper(afficherSalle(session.salle))}</a>`
      : "";
    return `<div class="pause"><span class="pause-time">${echapper(formatHeure(session.debut))}${session.fin ? ` - ${echapper(formatHeure(session.fin))}` : ""}</span><span class="pause-title">${echapper(session.titre)}</span>${lieu ? `<span class="pause-room">${lieu}</span>` : ""}</div>`;
  }

  function afficherSession(session, jour) {
    if (session.pause) return afficherPause(session);
    const conferences = (session.conferences || []).filter((conference) => correspond(session, conference, jour));
    if (!conferences.length) return "";
    const listeComplete = [...(session.conferences || [])].sort((a, b) => a.debut.localeCompare(b.debut));
    const debut = session.debut || listeComplete[0]?.debut || "";
    const fin = session.fin || listeComplete[listeComplete.length - 1]?.fin || "";
    const interventions = conferences.map((conference) => {
      const salle = conference.salle && conference.salle !== session.salle
        ? `<span class="room room-alt">${echapper(conference.salle)}</span>` : "";
      const intervenants = (conference.intervenants || [conference])
        .filter((personne) => personne.prenom || personne.nom)
        .map((personne) => `${personne.prenom || ""} ${personne.nom || ""}`.trim());
      const noms = intervenants.length ? intervenants.join(" · ") : "Intervenant·e à préciser";
      return `<li class="talk"><span class="talk-time">${echapper(formatHeure(conference.debut))} - ${echapper(formatHeure(conference.fin))}</span><div class="talk-body"><p class="talk-title">${echapper(conference.titre)}</p><p class="speaker">${echapper(noms)}</p></div>${salle}${boutonFavori(jour, session, conference)}</li>`;
    }).join("");

    const lienSalle = session.salle
      ? `<a class="room" href="${lienMaps(session.salle, session.adresse || data.colloque.adresse)}" target="_blank" rel="noopener">${echapper(afficherSalle(session.salle))}</a>`
      : `<span class="room">À préciser</span>`;
    return `<article class="session"><header class="session-head"><div class="session-heading"><p class="session-time">${echapper(formatHeure(debut))} - ${echapper(formatHeure(fin))}</p><h3>${echapper(session.titre)}</h3></div><dl class="session-meta"><div><dt>Présidence</dt><dd>${echapper(session.president || "À préciser")}</dd></div><div><dt>Salle</dt><dd>${lienSalle}</dd></div></dl></header><ol class="talks">${interventions}</ol></article>`;
  }

  function afficherPlanning(jour) {
    const sessions = jour.sessions.filter((session) => !session.pause);
    const salles = [...new Set(sessions.flatMap((session) =>
      (session.conferences || []).map((conference) => conference.salle || session.salle).filter(Boolean)
    ))].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
    const lignes = new Map();

    sessions.forEach((session) => (session.conferences || []).forEach((conference) => {
      if (!correspond(session, conference, jour)) return;
      const cle = `${conference.debut}|${conference.fin}`;
      if (!lignes.has(cle)) lignes.set(cle, { debut: conference.debut, fin: conference.fin, interventions: new Map() });
      lignes.get(cle).interventions.set(conference.salle || session.salle, { session, conference });
    }));

    if (!state.recherche && !state.salle && !state.favorisSeulement) {
      jour.sessions.filter((session) => session.pause).forEach((session) => {
        const cle = `pause|${session.debut}|${session.fin || ""}|${session.titre}`;
        lignes.set(cle, { debut: session.debut, fin: session.fin || "", pause: session });
      });
    }

    const ordreLignes = [...lignes.values()].sort((a, b) =>
      a.debut.localeCompare(b.debut) || a.fin.localeCompare(b.fin)
    );
    if (!ordreLignes.length) return "";

    const entetes = salles.map((salle) =>
      `<th scope="col"><a href="${lienMaps(salle, data.colloque.adresse)}" target="_blank" rel="noopener">${echapper(afficherSalle(salle))}</a></th>`
    ).join("");
    const corps = ordreLignes.map((ligne) => {
      const horaire = `${formatHeure(ligne.debut)}${ligne.fin ? ` - ${formatHeure(ligne.fin)}` : ""}`;
      if (ligne.pause) {
        const lieu = ligne.pause.salle
          ? `<a href="${lienMaps(ligne.pause.salle, ligne.pause.adresse || data.colloque.adresse)}" target="_blank" rel="noopener">${echapper(ligne.pause.salle)}</a>`
          : "";
        return `<tr class="planning-break"><th scope="row">${echapper(horaire)}</th><td colspan="${Math.max(salles.length, 1)}"><div class="planning-break-content"><strong>${echapper(ligne.pause.titre)}</strong>${lieu ? `<span>${lieu}</span>` : ""}</div></td></tr>`;
      }

      const cellules = salles.map((salle) => {
        const element = ligne.interventions.get(salle);
        if (!element) return '<td class="planning-empty"></td>';
        const { session, conference } = element;
        const intervenants = (conference.intervenants || [conference])
          .filter((personne) => personne.prenom || personne.nom)
          .map((personne) => `${personne.prenom || ""} ${personne.nom || ""}`.trim());
        const noms = intervenants.length ? intervenants.join(" · ") : "Intervenant·e à préciser";
        return `<td><div class="planning-talk"><p class="planning-session">${echapper(session.titre)}</p><p class="planning-title">${echapper(conference.titre)}</p><p class="speaker">${echapper(noms)}</p>${boutonFavori(jour, session, conference)}</div></td>`;
      }).join("");
      return `<tr><th scope="row">${echapper(horaire)}</th>${cellules}</tr>`;
    }).join("");

    return `<div class="planning-scroll"><table class="planning-table"><thead><tr><th scope="col">Horaire</th>${entetes}</tr></thead><tbody>${corps}</tbody></table></div>`;
  }

  function afficherProgramme() {
    byId("onglets").querySelectorAll("button[data-jour]").forEach((bouton) => {
      const actif = bouton.dataset.jour === state.jour;
      bouton.classList.toggle("active", actif);
      bouton.setAttribute("aria-selected", String(actif));
    });
    document.querySelectorAll("[data-vue]").forEach((bouton) => {
      bouton.setAttribute("aria-pressed", String(bouton.dataset.vue === state.vue));
    });

    const joursVisibles = state.jour === "tous" ? jours : jours.filter((jour) => jour.date === state.jour);
    const sections = joursVisibles.map((jour) => {
      const index = jours.indexOf(jour) + 1;
      const evenements = state.vue === "grille"
        ? afficherPlanning(jour)
        : [...jour.sessions]
          .sort((a, b) => (a.pause ? a.debut : a.debut || a.conferences?.[0]?.debut || "").localeCompare(b.pause ? b.debut : b.debut || b.conferences?.[0]?.debut || ""))
          .map((session) => afficherSession(session, jour))
          .join("");
      if (!evenements) return "";
      const classe = state.vue === "grille" ? "planning-view" : "sessions";
      return `<section class="day" aria-labelledby="jour-${index}"><div class="day-heading"><span class="day-number">0${index}</span><h2 id="jour-${index}">Jour ${index}<span>${echapper(formatDate(jour.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}</span></h2></div><div class="${classe}">${evenements}</div></section>`;
    }).join("");
    byId("programme").innerHTML = sections || `<p class="empty">Aucune conférence ne correspond à votre recherche.</p>`;
  }

  configurerFiltres();
  afficherProgramme();
})();