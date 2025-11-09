# 🌐 ProyekSOA

**ProyekSOA** is a Node.js-based backend project developed for the Service Oriented Architecture course. It integrates flight and hotel data using external APIs and demonstrates modular service design, routing, and database interaction.

## 🧰 Tech Stack

- **Runtime**: Node.js
- **Language**: JavaScript
- **Framework**: Express.js
- **Database**: SQL (via `projectsoa_hotel_flight.sql`)
- **Tools**: Postman, Amadeus API

## 📁 Project Structure
<pre>
  ProyekSOA/ 
  ├── .idea/ # IDE configuration files 
  ├── routes/ # API route definitions 
  ├── uploads/ # Uploaded files or assets 
  ├── Amadeus for Developers.postman_collection.json # Postman API collection 
  ├── database.js # Database connection logic 
  ├── index.js # Main server entry point 
  ├── package.json # Project metadata and dependencies 
  ├── package-lock.json # Dependency lock file 
  ├── projectsoa_hotel_flight.sql # SQL schema for hotel and flight data 
  └── .gitignore # Files to ignore in version control
</pre>

## 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/CoconutWave/ProyekSOA.git
   cd ProyekSOA
2. Install dependencies:
   ```bash
   npm install
4. Set up the database:
  - Import projectsoa_hotel_flight.sql into your SQL server.
  - Update database.js with your local DB credentials.
5. Run the server:
   ```bash
   node index.js
6. Test endpoints:
   - Use Postman with the included collection: Amadeus for Developers.postman_collection.json
