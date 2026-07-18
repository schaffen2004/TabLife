# TabLife

## Requirements

- Node.js `22.12.0` or newer
- npm `10+`

This project uses Vite `7`, which does not run on Node `18`.

## Run on a server

```bash
nvm use
npm install
npm run build
HOST=0.0.0.0 PORT=3000 npm run start
```

## Run in development and allow access from another machine

```bash
nvm use
npm install
PORT=3000 npm run dev
```
