# API-Dokumentation Listly

## Format & Technologie

Die API ist als **OpenAPI 3.0** (ehemals Swagger) spezifiziert:

- **Spezifikation:** `public/openapi.yaml` (YAML)
- **Interaktive Ansicht:** Im Browser unter **[/api-docs](/api-docs)** (Swagger UI)
- **Roh-Spec:** [/openapi.yaml](/openapi.yaml) (wird von der App ausgeliefert)

### Warum OpenAPI?

- **Standard:** Weit verbreitet, viele Tools (Editoren, Code-Generatoren, Tests)
- **Lesbar:** YAML/JSON, gut versionierbar und im Repo pflegbar
- **Swagger UI:** Direkt „Try it out“ und übersichtliche Darstellung
- **Erweiterbar:** Später z. B. Codegen für Clients oder automatische Tests (z. B. Dredd) möglich

### Alternative Formate (nicht umgesetzt)

| Format        | Vorteil              | Nachteil                    |
|---------------|----------------------|-----------------------------|
| API Blueprint | Markdown-nah         | Weniger Tooling als OpenAPI |
| ReDoc         | Schöne statische Doku| Kein „Try it out“           |
| Reines Markdown | Einfach            | Keine interaktive Nutzung   |

---

## Nutzung

1. **Doku im Browser ansehen:** App starten, dann [http://localhost:3000/api-docs](http://localhost:3000/api-docs) öffnen.
2. **Production:** Unter `NODE_ENV=production` sind `/api-docs` und `/openapi.yaml` deaktiviert (404), damit die API-Struktur nicht öffentlich einsehbar ist.
3. **Spec bearbeiten:** `public/openapi.yaml` anpassen; Swagger UI lädt die Spec von `/openapi.yaml`.
4. **Externe Tools:** Die URL zu `openapi.yaml` (z. B. `https://deine-app.de/openapi.yaml`) in [Swagger Editor](https://editor.swagger.io) oder andere OpenAPI-Tools einbinden.

---

## Authentifizierung

Die meisten Endpoints erwarten eine **Session per Cookie** (nach Login über `POST /api/auth/verify`). In Swagger UI werden Cookies bei „Try it out“ mitgesendet, wenn du zuvor in derselben Origin eingeloggt bist.

---

## Überblick Endpoints (siehe OpenAPI für Details)

- **Auth:** `GET /api/auth/me`, `POST /api/auth/request-code`, `POST /api/auth/verify`, `POST /api/auth/logout`
- **Items:** `GET/POST /api/items`, `GET/PUT/DELETE /api/items/:id`, `GET/POST /api/items/:id/comments` (Nachrichten/Chat pro Eintrag)
- **Tags:** `GET/POST /api/tags`, `PUT/DELETE /api/tags/:id`
- **Activities:** `GET /api/activities` (Filter: `action`, `userId`, `search`, Pagination)

SSE (`/api/events`), Presence und Admin-Endpoints sind in der aktuellen Spec nicht beschrieben.
