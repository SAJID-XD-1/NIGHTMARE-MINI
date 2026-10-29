<div align="center">🇦🇱 NIGHTMARE-MINI 🕷️

"𖤐 ENTER THE SHADOWS 𖤐"

A futuristic WhatsApp automation project.

""Project" (https://img.shields.io/badge/PROJECT-NIGHTMARE--MINI-ff2449?style=for-the-badge&logo=github&logoColor=white)" (https://github.com/)
""Node.js" (https://img.shields.io/badge/NODE.JS-JAVASCRIPT-111111?style=for-the-badge&logo=nodedotjs&logoColor=green)" (https://nodejs.org/)
""Database" (https://img.shields.io/badge/DATABASE-MONGODB-111111?style=for-the-badge&logo=mongodb&logoColor=47A248)" (https://www.mongodb.com/)
""Status" (https://img.shields.io/badge/STATUS-IN%20DEVELOPMENT-8B0000?style=for-the-badge)" (#-development-status)

<br><img src="https://capsule-render.vercel.app/api?type=waving&color=0:080609,50:680018,100:ff2449&height=180&section=header&text=NIGHTMARE-MINI&fontSize=38&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=ADVANCED%20WHATSAPP%20CONNECTION%20SYSTEM&descAlignY=60&descSize=12" width="100%" alt="NIGHTMARE-MINI Banner"/><br>«"Born in the shadows. Built for performance."»

🕷️ Stylish Interface • 🕸️ Modular Plugins • 🇦🇱 NIGHTMARE Identity

</div>---

𖤐 About The Project

NIGHTMARE-MINI is a lightweight WhatsApp bot project designed around a modular plugin architecture, a futuristic web interface, and persistent authentication.

The project aims to provide a clean foundation for WhatsApp automation, command management, and convenient pairing through a dedicated dashboard.

Built with a focus on simplicity, customization, and the NIGHTMARE cyber aesthetic.

🕸️ Features

Feature| Description| Status
🕷️ Modular Plugins| Individual files for bot commands| 🟡 In progress
🔗 Pairing Dashboard| Web interface for requesting a pairing code| 🟡 Frontend created
🔴 3D Cyber UI| Animated red-and-black interface| ✅ Frontend created
⚡ Ping Command| Check bot response| 🟡 Integration pending
💀 Alive Command| Display bot status and uptime| 🟡 Integration pending
🗄️ MongoDB| Persistent database integration| ⏳ Planned
🔐 Session Persistence| Restore authentication after restarts| ⏳ Planned
☁️ Heroku Deployment| Cloud hosting configuration| ⏳ Planned
📱 Mobile-Friendly UI| Responsive dashboard design| ✅ Frontend created

Note: Frontend completion does not mean that WhatsApp pairing or bot commands are already operational. These features require backend integration and testing.

---

🧬 Technology Stack

<div align="center">"JavaScript" (https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
"Node.js" (https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
"Express" (https://img.shields.io/badge/Express-111111?style=flat-square&logo=express&logoColor=white)
"MongoDB" (https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
"HTML5" (https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
"CSS3" (https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)

</div>- Node.js — JavaScript runtime.
- Baileys — WhatsApp Web connection library.
- Express — Web server and dashboard backend.
- MongoDB — Planned persistent storage.
- HTML, CSS and JavaScript — Dashboard interface.

---

📂 Project Structure

NIGHTMARE-MINI/
│
├── config.js
├── nightmare.js
├── package.json
├── README.md
│
├── index.js
├── main.js
├── Procfile
├── app.json
├── .env
├── .gitignore
│
├── plugins/
│   ├── ping.js
│   ├── alive.js
│   ├── menu.js
│   ├── owner.js
│   ├── repo.js
│   └── runtime.js
│
├── lib/
│   ├── database.js
│   ├── functions.js
│   └── fakevCard.js
│
└── public/
    ├── index.html
    ├── style.css
    └── script.js

Important: This is the planned project structure. Files not yet created or implemented will be added as development progresses.

---

⚙️ Installation

1. Clone the repository

Replace "YOUR_USERNAME" with your GitHub username.

git clone https://github.com/YOUR_USERNAME/NIGHTMARE-MINI.git

2. Enter the project folder

cd NIGHTMARE-MINI

3. Install dependencies

npm install

4. Configure environment variables

Create a ".env" file and add the configuration required by the implemented backend.

Example:

BOT_NAME=NIGHTMARE-MINI
OWNER_NAME=NIGHTMARE
OWNER_NUMBER=
PREFIX=.
MODE=public
PORT=8000
MONGODB_URI=

Security: Keep your MongoDB URI, passwords, and WhatsApp session credentials private. Never commit ".env" to GitHub.

5. Start the application

After "index.js" and the required backend modules have been implemented:

npm start

The dashboard and bot will only work as intended after their corresponding backend components are complete.

---

🕷️ Command System

NIGHTMARE-MINI is designed to support a modular command system.

Command| Purpose
".ping"| Check bot response
".speed"| Alias for ping
".alive"| Display bot status
".status"| Alias for alive
".live"| Alias for alive
".menu"| Planned command menu

Commands marked as implemented still require integration with the actual WhatsApp message handler before they can be used in a live conversation.

---

🔗 Pairing Dashboard

The NIGHTMARE-MINI dashboard is designed with:

- 🔴 Crimson-red and black aesthetics.
- 🧊 Animated 3D-inspired holographic core.
- 🌌 Floating particles and ambient lighting.
- 📱 Responsive mobile layout.
- ⛓️ Phone-number input interface.
- 📋 Pairing-code display and copy controls.
- ⚡ Connection-status indicators.

Planned connection flow

1. Open the dashboard.
2. Enter your WhatsApp number with its country code.
3. Request a pairing code.
4. Open WhatsApp on your phone.
5. Navigate to Linked Devices.
6. Select the option to link using a phone number, if available.
7. Enter the pairing code provided by the backend.

The dashboard currently needs a working backend endpoint to generate real pairing codes.

---

🗄️ Database & Authentication

MongoDB integration is planned to support persistent authentication and application data.

The intended implementation will:

- Connect to MongoDB securely.
- Store authentication data using a compatible Baileys authentication-storage implementation.
- Restore the session after supported application restarts.
- Keep sensitive credentials out of source control.

Session persistence must be implemented and tested before the project can be considered ready for reliable cloud deployment.

---

☁️ Deployment

Heroku deployment is planned for a later development stage.

Before deploying, the project needs:

- A working application entry point.
- A functional WhatsApp connection handler.
- A secure pairing endpoint.
- MongoDB connection and persistent authentication.
- Correct process configuration.
- Environment variables configured in the hosting platform.
- Testing to prevent multiple instances from conflicting over the same WhatsApp session.

Deployment status: Not yet confirmed.

---

🔐 Security Guidelines

- Never share your WhatsApp pairing code.
- Never publish your session credentials.
- Never commit ".env" to a public repository.
- Protect pairing endpoints against unauthorized requests and abuse.
- Keep database credentials private.
- Use a trusted, updated dependency set.
- Only connect WhatsApp accounts you own or are authorized to manage.

---

📈 Development Status

[✓] Initial project structure
[✓] Command registry foundation
[✓] Ping plugin file
[✓] Alive plugin file
[✓] Pairing dashboard HTML
[✓] Animated CSS interface
[✓] Dashboard JavaScript foundation
[ ] Express application server
[ ] Real WhatsApp pairing endpoint
[ ] Complete WhatsApp message handler
[ ] MongoDB integration
[ ] Persistent authentication
[ ] Full plugin loader
[ ] End-to-end testing
[ ] Cloud deployment

---

🕸️ Project Philosophy

<div align="center">🇦🇱 THINK DIFFERENT. BUILD BETTER. STAY IN THE SHADOWS.

"𖤐 NIGHTMARE-MINI 𖤐"

Minimal footprint. Modular architecture. Distinct identity.

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:ff2449,50:680018,100:080609&height=100&section=footer" width="100%" alt="NIGHTMARE Footer"/></div>
