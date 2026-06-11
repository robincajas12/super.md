#!/usr/bin/env node

const { execSync } = require('child_process');

const PROTECTED_PATHS = [
  '/sys/fs/fuse/connections'
];

function getMounts() {
  try {
    const output = execSync('mount | grep fuse', {
      encoding: 'utf8'
    });

    return output
      .split(/\r?\n/)
      .filter(line => line.trim() !== '');
  } catch (err) {
    return [];
  }
}

function unmount(mountPath) {
  if (PROTECTED_PATHS.includes(mountPath)) {
    console.log(`⚠️ Ignorando ruta protegida del sistema: ${mountPath}`);
    return;
  }

  try {
    console.log(`Intentando desmontar: ${mountPath}...`);

    execSync(`fusermount -u "${mountPath}"`, {
      stdio: 'inherit'
    });

    console.log('✅ Desmontado exitosamente.');
  } catch (err) {
    try {
      console.log('fusermount falló, intentando con umount...');

      execSync(`umount "${mountPath}"`, {
        stdio: 'inherit'
      });

      console.log('✅ Desmontado exitosamente (umount).');
    } catch (err2) {
      console.error(`❌ Error al desmontar: ${err2.message}`);
    }
  }
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'list') {
  const mounts = getMounts();

  if (mounts.length === 0) {
    console.log('No se encontraron montajes FUSE activos.');
  } else {
    console.log('Montajes FUSE actuales:');

    mounts.forEach((mount, index) => {
      console.log(`${index + 1}. ${mount}`);
    });
  }
} else if (command === 'close') {
  const mountPath = args[1];

  if (!mountPath) {
    console.log('Uso: node manage_mounts.js close <path>');
    process.exit(1);
  }

  unmount(mountPath);
} else if (command === 'close-all') {
  const mounts = getMounts();

  mounts.forEach(mount => {
    const match = mount.match(/ on (.*?) type /);

    if (match && match[1]) {
      unmount(match[1]);
    }
  });
} else {
  console.log('Comandos disponibles:');
  console.log('  list             - Lista todos los montajes FUSE');
  console.log('  close <path>     - Cierra un montaje específico');
  console.log('  close-all        - Intenta cerrar todos los montajes FUSE');
}