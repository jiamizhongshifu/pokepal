// Explicit roster sync; preserves existing entries and caches PokéAPI responses.
// The roster is the explicit national-dex range supported by this project.
import { execFileSync } from 'node:child_process';
execFileSync('python3', [new URL('./sync-pokemon-data.py', import.meta.url).pathname], { stdio: 'inherit' });
