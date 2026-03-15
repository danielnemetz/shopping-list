# Listly - The Shared Family Shopping List 🛒

Listly is a modern, fast, and simple shared shopping list application designed for families. It features passwordless authentication, an intuitive mobile-first interface, drag & drop sorting, and a clean Progressive Web App (PWA) experience.

## ✨ Features

- **🪄 Passwordless Auth:** Secure login via Magic Links sent straight to your email.
- **📱 PWA Ready:** Installable on iOS and Android for a native app-like experience.
- **🔄 Shared & Synced:** Add, toggle, and manage items together with your family.
- **🏷️ Tagging System:** Organize items by categories or stores with inline colored tags.
- **💬 Nachrichten pro Eintrag:** Zu jedem Eintrag einen Chat mit Nachrichten.
- **📖 Activity Log:** Keep track of who added, completed, or deleted items.
- **✋ Drag & Drop:** Easily reorder your open items.
- **👑 Admin Dashboard:** Manage users, invite new family members, and manage global tags.

## 🛠️ Tech Stack

- **Framework:** [Nuxt 3](https://nuxt.com/) (Vue 3, Nitro)
- **Styling:** Vanilla CSS (Custom Design System)
- **Database:** SQLite with [Drizzle ORM](https://orm.drizzle.team/)
- **Icons:** [Lucide](https://lucide.dev/)
- **Deployment:** Docker, Traefik, GitHub Actions

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm, pnpm, or yarn
- Docker (for production deployment)

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/shopping-list.git
cd shopping-list
```

### 2. Configure Environment Variables

Copy the `.env.example` file to `.env` and fill in your secure details:

```bash
cp .env.example .env
```

_(Make sure to set a strong `NUXT_AUTH_SECRET` and configure your SMTP credentials otherwise Magic Links will not be sent)._

### 3. Install Dependencies & Initialize Database

```bash
npm install
npm run db:push
```

### 4. Create your Admin User

To get started, seed the database with your initial admin account:

```bash
npx tsx scripts/seed-admin.js <your-email> <your-name>
```

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

## 🐳 Production Deployment (Docker)

Listly is prepared for easy self-hosting using Docker and Traefik.

1. Ensure your `.env` file is fully configured, including the Traefik settings (`APP_DOMAIN`, `TRAEFIK_CERT_RESOLVER`, etc.).
2. Start the container:

```bash
docker compose up -d --build
```

The app will be available at your specified domain with automatic Let's Encrypt HTTPS via Traefik. All SQLite data is safely persisted in the locally mounted `./data` volume.

## 🐙 Continuous Deployment (GitHub Actions)

A fully configured GitHub Actions workflow is provided in `.github/workflows/deploy.yml`. It automatically deploys every push on `main` to your server via SSH, without overwriting your database or `.env` files.

To enable this, configure the following **Secrets** in your GitHub repository:

- `HOST`: Your server IP or domain.
- `USERNAME`: Your server SSH user.
- `SSH_KEY`: Your private SSH key.

## 📄 License

This project is open-source and available under the [MIT License](https://opensource.org/licenses/MIT).
