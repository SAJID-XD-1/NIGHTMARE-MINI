
<div align="center">

# 🇦🇱 NIGHTMARE-MINI 🕷️

**A Lightweight WhatsApp Bot with a Modular Plugin System**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/Status-In%20Development-red?style=flat-square)](#development-status)

</div>

---

## About

NIGHTMARE-MINI is a lightweight WhatsApp bot project designed with a modular plugin architecture, persistent authentication, and a modern web-based pairing interface.

Built for simplicity, customization, and reliable performance.

## Features

- Modular command and plugin system
- WhatsApp pairing dashboard
- Modern, responsive web interface
- Animated 3D-inspired design
- MongoDB-based session persistence (planned)
- Customizable bot configuration
- Cloud deployment support (planned)

## Tech Stack

- **Runtime:** Node.js
- **WhatsApp:** Baileys
- **Backend:** Express.js
- **Database:** MongoDB
- **Frontend:** HTML, CSS, JavaScript

## Project Structure

\`\`\`text
NIGHTMARE-MINI/
├── config.js
├── nightmare.js
├── package.json
├── README.md
├── index.js
├── main.js
├── plugins/
│   ├── ping.js
│   ├── alive.js
│   ├── menu.js
│   ├── owner.js
│   ├── repo.js
│   └── runtime.js
├── lib/
│   ├── database.js
│   └── functions.js
└── public/
    ├── index.html
    ├── style.css
    └── script.js
\`\`\`

*This structure includes planned files that are still under development.*

## Installation

### 1. Clone the repository

Replace `YOUR_USERNAME` with your GitHub username.

\`\`\`bash
git clone https://github.com/YOUR_USERNAME/NIGHTMARE-MINI.git
cd NIGHTMARE-MINI
\`\`\`

### 2. Install dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Configure environment variables

Create a `.env` file in the project root.

\`\`\`env
BOT_NAME=NIGHTMARE-MINI
OWNER_NAME=NIGHTMARE
OWNER_NUMBER=
PREFIX=.
MODE=public
PORT=8000
MONGODB_URI=
\`\`\`

Add your MongoDB connection string when database integration is ready. Keep credentials private and never upload `.env` to GitHub.

### 4. Start the bot

Once the application entry point and backend are implemented:

\`\`\`bash
npm start
\`\`\`

## Commands

| Command | Description |
|---------|-------------|
| `.ping` | Check bot response |
| `.speed` | Ping command alias |
| `.alive` | Display bot status |
| `.status` | Alive command alias |
| `.live` | Alive command alias |
| `.menu` | Command menu (planned) |

Commands require integration with the WhatsApp message handler before they can work in a live chat.

## Pairing Dashboard

The web dashboard is designed to provide:

- Phone-number input
- Pairing-code generation
- Copy-code functionality
- Connection status indicators
- Responsive mobile layout
- Animated interface with a dark red theme

Real pairing requires a working backend endpoint connected to Baileys.

## Database & Session

MongoDB integration is planned for storing authentication data and restoring the WhatsApp session after supported restarts.

Proper authentication storage and session-recovery testing are required before deployment.

## Deployment

Cloud deployment is planned after the core bot, pairing endpoint, and database integration are complete.

Required before deployment:

- Working application entry point
- WhatsApp connection handler
- Secure pairing endpoint
- Persistent authentication
- Environment variables
- End-to-end testing

## Development Status

- [x] Initial project structure
- [x] Command registry
- [x] Ping and alive plugin files
- [x] Pairing dashboard frontend
- [ ] WhatsApp connection handler
- [ ] Real pairing-code endpoint
- [ ] MongoDB integration
- [ ] Persistent session storage
- [ ] Complete plugin loader
- [ ] Cloud deployment

## Security

- Never share pairing codes or session credentials.
- Never commit `.env` to a public repository.
- Protect database credentials.
- Only connect accounts you own or are authorized to manage.

## License

This project is intended to be distributed under the MIT License once a `LICENSE` file is added.

---

<div align="center">

**🇦🇱 NIGHTMARE-MINI 🕷️**

*Built with precision. Powered by NIGHTMARE.*

</div>
