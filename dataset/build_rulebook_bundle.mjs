import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const source=new URL('./planting-plan-rules.v0.1.json',import.meta.url);
const rules=JSON.parse(await readFile(source,'utf8'));
if(rules.rules.length!==19)throw new Error('Unexpected approved rule count');
const bundle='/* Generated from dataset/planting-plan-rules.v0.1.json; preserve the separate trait-validation status. */\nwindow.PLANTSCAPES_RULEBOOK = '+JSON.stringify(rules,null,2)+';\n';
await writeFile(new URL('../website/data/planting-plan-rules.v0.1.js',import.meta.url),bundle);
await writeFile(new URL('../website/data/planting-plan-rules.v0.1.json',import.meta.url),JSON.stringify(rules,null,2)+'\n');
console.log('Bundled '+rules.rules.length+' approved design rules for local/file browser use: '+fileURLToPath(source));
