# 🕒 AFD Control ID

<img align="center" alt="Node.js" src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white"/>

- This repository contains a full-stack system to **collect AFD files (Arquivo Fonte de Dados)** from multiple Control iD time clocks on the same internal network.
- The app logs into each clock using its IP address, requests the AFD file via Control iD’s REST API, and returns a downloadable `.txt` file for each device.
- It includes a frontend interface and a Node.js backend that uses `curl` to communicate with the clocks.

---

## Features

- Automatic login to multiple Control iD clocks using static IPs  
- Fetches AFD data for a selected date  
- Generates a `.txt` file for each clock (by IP)  
- Forces automatic download in the browser  
- Cleans up temporary files after download  
- Built for local network use with Ubuntu Server

---

## How to Use

1. Clone this repository to your server:

```bash
git clone https://github.com/GuilhermeeeS/AFD-Control-ID.git
cd AFD-Control-ID
npm install
```
2. Start the app:
```bash
node index.js
```
3. Open in your browser:
  
  - From the same server:
  ```bash
  http://localhost:3000
  ```
  - From another computer on the same network:
  ```bash
  http://your-server-ip:3000
  ```
---

## ⚙️ IP Configuration
In ```index.js```, edit the array below to match the IPs of your Control iD clocks:
```js
const ips = ['10.119.82.31', '10.119.82.32'];
```
## 📋 Requirements
- Node.js 18.x or higher
- ```curl``` installed on the system
- Internal network access to Control iD devices
- Ubuntu Server (recommended for production)

## 🛠️ Customization
- You can change the output file name format inside ```index.js```
- You can also add:
  - Basic authentication
  - IP-based access filtering
  - HTTPS reverse proxy (using nginx, for example)

## 🐧 Ubuntu Server Deployment (with PM2)
To keep the app running in the background and after reboots:

```bash
sudo npm install -g pm2

pm2 start index.js --name afd-controlid
pm2 save
pm2 startup
```


