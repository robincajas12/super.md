# Virtual FS Node - Guia Hibrida

Este proyecto ha sido actualizado a un sistema **Hibrido** que permite desarrollar de forma aumentada.

## Nuevas Caracteristicas

### 1. Sistema Hibrido
El sistema ahora combina dos directorios en un solo punto de montaje:
- **`PROJECT_DIR`**: Tu codigo real (archives).
- **`SOURCE_DIR`**: Tus archivos de diagnostico (`.super.md`).

### 2. Modos de Operacion
Puedes cambiar entre dos modos en tiempo real:
- **Modo EDICION (`edit`)**: Permite crear y editar todos los archivos, incluyendo los `.super.md`.
- **Modo EJECUCION (`exec`)**: Los archivos `.super.md` se vuelven ejecutables y de solo lectura. Al leerlos, veras el resultado de su codigo.

### 3. Controles de Teclado
Directamente en la terminal donde corre el sistema:
- Presiona **`1`** o **`e`** para modo **EDICION**.
- Presiona **`2`** o **`x`** para modo **EJECUCION**.
- Presiona **`Ctrl+C`** para desmontar y salir.

### 4. Gestion de Archivos Inteligente
- Si creas un archivo `.super.md` en `mnt/`, se guarda en la carpeta de diagnosticos.
- Si creas cualquier otro archivo o carpeta, se guarda en la carpeta del proyecto real.
- Soporte completo para `mkdir`, `unlink` (borrar) y `rmdir`.

### 5. Herramienta de Gestion de Montajes
Usa `npm run manage-mounts list` para ver montajes activos y `close-all` para cerrarlos si se quedan bloqueados.
