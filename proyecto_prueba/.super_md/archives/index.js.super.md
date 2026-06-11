# Diagnostico de index.js

```run
node -c index.js && echo "[x] Sintaxis correcta"
```

```run-node
const mod = require("./index.js");
console.log("Estado del modulo: " + mod.status);
```
