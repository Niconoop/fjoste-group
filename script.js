document.addEventListener('DOMContentLoaded', function() {
    // --- KONFIGURATION ---
    const truckersMPVtcId = '85133'; 
    const vtlogApiKey = '1e58a1a813a0b1f13f94da3225fa9c7f3491d051c65a72c84a29dcdbfe9cae5d';
    const vtlogCompanyId = '8136'; // Ersetzen Sie dies mit Ihrer VTLog Company ID

    // API Endpunkte
    const truckersMPApiBase = `https://api.truckersmp.com/v2/vtc/${truckersMPVtcId}`;
    const vtlogApiBase = `https://api.vtlog.net/v1/vtc/${vtlogCompanyId}`;

    // --- DATENABRUF ---

    // Fahrer von TruckersMP abrufen
    function getFahrer() {
        fetch(`${truckersMPApiBase}/members`)
            .then(response => response.json())
            .then(data => {
                const fahrerListe = document.getElementById('fahrer-liste');
                fahrerListe.innerHTML = ''; // Leeren der Liste vor dem Hinzufügen neuer Daten
                if (data.error) {
                    fahrerListe.innerHTML = `<p>Fehler beim Laden der Fahrer: ${data.message}</p>`;
                    return;
                }
                data.response.members.forEach(fahrer => {
                    const fahrerElement = document.createElement('div');
                    fahrerElement.innerHTML = `
                        <p><strong>${fahrer.username}</strong> (Beigetreten: ${new Date(fahrer.joinDate).toLocaleDateString()})</p>
                    `;
                    fahrerListe.appendChild(fahrerElement);
                });
            })
            .catch(error => {
                console.error('Fehler beim Abrufen der Fahrer:', error);
                document.getElementById('fahrer-liste').innerHTML = '<p>Fahrer konnten nicht geladen werden.</p>';
            });
    }

    // News von TruckersMP abrufen
    function getNews() {
        fetch(`${truckersMPApiBase}/news`)
            .then(response => response.json())
            .then(data => {
                const newsListe = document.getElementById('news-liste');
                newsListe.innerHTML = '';
                if (data.error) {
                    newsListe.innerHTML = `<p>Fehler beim Laden der News: ${data.message}</p>`;
                    return;
                }
                data.response.news.forEach(news => {
                    const newsElement = document.createElement('article');
                    newsElement.innerHTML = `
                        <h3>${news.title}</h3>
                        <p>${news.content_summary}</p>
                        <p><small>Veröffentlicht am: ${new Date(news.published_at).toLocaleDateString()}</small></p>
                    `;
                    newsListe.appendChild(newsElement);
                });
            })
            .catch(error => {
                console.error('Fehler beim Abrufen der News:', error);
                document.getElementById('news-liste').innerHTML = '<p>News konnten nicht geladen werden.</p>';
            });
    }

    // Events von TruckersMP abrufen (Hinweis: Die API hat keinen direkten "Events"-Endpunkt für VTCs, dies ist ein Beispiel)
    function getEvents() {
        // Da die TruckersMP API keinen direkten Endpunkt für VTC-Events hat,
        // wird dieser Bereich vorerst leer bleiben. Man könnte hier manuell Events eintragen
        // oder eine andere Quelle nutzen.
        const eventsListe = document.getElementById('events-liste');
        eventsListe.innerHTML = '<p>Derzeit sind keine Events geplant.</p>';
    }

    // Aufträge von VTLog abrufen
    function getAuftraege() {
        fetch(`${vtlogApiBase}/jobs`, {
            headers: {
                'X-Api-Key': vtlogApiKey
            }
        })
        .then(response => response.json())
        .then(data => {
            const auftraegeListe = document.getElementById('auftraege-liste');
            auftraegeListe.innerHTML = '';
            if (!data.jobs || data.jobs.length === 0) {
                auftraegeListe.innerHTML = '<p>Keine Aufträge gefunden.</p>';
                return;
            }
            data.jobs.slice(0, 10).forEach(job => { // Zeigt die letzten 10 Aufträge
                const auftragElement = document.createElement('div');
                auftragElement.innerHTML = `
                    <p>
                        <strong>${job.departure_city} -> ${job.destination_city}</strong><br>
                        Fracht: ${job.cargo}<br>
                        Distanz: ${job.distance} km | Fahrer: ${job.driver.username}
                    </p>
                `;
                auftraegeListe.appendChild(auftragElement);
            });
        })
        .catch(error => {
            console.error('Fehler beim Abrufen der Aufträge:', error);
            document.getElementById('auftraege-liste').innerHTML = '<p>Aufträge konnten nicht geladen werden.</p>';
        });
    }


    // --- INITIALISIERUNG ---
    // Alle Funktionen beim Laden der Seite ausführen
    getFahrer();
    getNews();
    getEvents();
    getAuftraege();
});