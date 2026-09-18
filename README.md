# Festival OS

A configurable festival-management web application starter.

## Run on Windows

1. Install Node.js (LTS).
2. Open this folder in VS Code.
3. Double-click `START.bat`.
4. Your browser will open Festival OS automatically.

Or use the terminal:

```text
npm run check
npm start
```

The server normally uses port 4310. If that port is already occupied, it automatically tries the next available port.

## Important

Do not use the VS Code Live Server extension to run this version. It is a Node.js application and must be started through `server.js`.

Data in this starter is stored in the browser's localStorage. Cloud database/authentication, production security, real QR camera scanning, push messaging, and external payment/WhatsApp/email services are not included yet.
