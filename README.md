# SUPER.MD

A virtual filesystem that attaches computable metadata and execution layers to Markdown files.

super.md Node mounts a directory via FUSE and intercepts file read operations. Content is processed on-demand by executing embedded code blocks.

## Usage

### Prerequisites
- Node.js >= 14
- FUSE

### Start
```bash
node index.js <project_directory>
```
If it is the first time you open this project, it will ask for the path where you want your virtual files to live

## State Management
- **Edit Mode (1/e):** Standard source text.
- **Exec Mode (2/x):** Process output.

## Execution Blocks

### run-node
````markdown
```run-node
console.log(1 + 1);
```
````

### run
````markdown
```run
echo "hello"
```
````

### script
````markdown
```script
./my-script
```
````

### Caching
Append a duration to a block tag. Syntax: `:time` (e.g., `:1h`).
time units supported:
- seconds: s
- minutes: m
- hours: h
- days: d
</br>
This block stores its result for 10 minutes. If 10 minutes have passed when reading the file, the code will execute again.
</br>
````markdown
```run:10m
echo "cached result"
```
````
