/** Local-only deployment materializer. Never starts a service, authenticates or uploads. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const SHA = value => crypto.createHash('sha256').update(value).digest('hex');
export function validate(input) {
  const fields=['origin','tunnelId','credentialsFile','runtimeRoot','nodeBinary','dependenciesDir','cloudflaredBinary','backendDir','webDir','gameDir','modsDir','presentationDir','discPath','motherMailAssetsDir','itemIconsDir','uiFontDir','uiHandDir','packageHandoff'];
  if(!input||Object.keys(input).some(k=>![...fields,'port'].includes(k))||fields.some(k=>typeof input[k]!=='string'||!input[k]))throw Error('Exact deployment inputs are required.');
  const url=new URL(input.origin);if(url.protocol!=='https:'||url.origin!==input.origin||url.username||url.password||url.hostname==='localhost'||url.hostname.endsWith('.example'))throw Error('Use the real HTTPS origin without path/credentials.');
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.tunnelId))throw Error('Invalid named tunnel UUID.');
  for(const k of fields.filter(x=>!['origin','tunnelId'].includes(x)))if(!path.isAbsolute(input[k])||/[\r\n\0]/.test(input[k]))throw Error(`Absolute local path required: ${k}`);
  const port=input.port??3450;if(!Number.isSafeInteger(port)||port<1024||port>65535||[3443,3448,3449].includes(port))throw Error('Select a dedicated unprivileged release port, separate from QA/MAIN.');
  return {...input,nodeBinary:fs.realpathSync(input.nodeBinary),cloudflaredBinary:fs.realpathSync(input.cloudflaredBinary),port,hostname:url.hostname};
}
function requireFile(file){const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error(`Regular file required: ${file}`);return stat;}
// Current Root-admitted private manifests. A different asset set requires explicit release preparation.
const providers = [
 { field: 'itemIconsDir', env: 'ITEM_ICONS_DIR', module: 'item-icons', factory: 'createItemIconsReader', manifestSHA256: 'bbe6b826d67df6d01a2f898b0d4726bc727cf108a24f0e85a73ec6ea997afade' },
 { field: 'uiFontDir', env: 'UI_FONT_DIR', module: 'ui-font', factory: 'createUIFontReader', manifestSHA256: '5167594cfcca7c99a244d52fbf713ae75667b3f7fbfd27fa833e3a56d3dab273' },
 { field: 'uiHandDir', env: 'UI_HAND_DIR', module: 'ui-hand', factory: 'createUIHandReader', manifestSHA256: '954f18bbfbad979daa9499c99e9379309252f48f3ed1cc4900eabfd3c03ba08c' },
];
const contained = (root, file) => { const relative = path.relative(root, file); return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`)); };
/** Read-only: reuse the closed backend's existing validators, not a second PNG/schema implementation. */
export function inspectProviders(config) {
 const backendEntry = fs.readFileSync(path.join(config.backendDir, 'server/index.ts'), 'utf8');
 const admitted = providers.map(provider => {
  const directory = path.resolve(config[provider.field]), stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || fs.realpathSync(directory) !== directory) throw Error(`Canonical private directory required: ${provider.field}`);
  if (['webDir', 'gameDir', 'modsDir', 'presentationDir'].some(field => contained(fs.realpathSync(config[field]), directory))) throw Error(`Private provider is inside a served directory: ${provider.field}`);
  if (!backendEntry.includes(`process.env.${provider.env}`)) throw Error(`Backend does not consume ${provider.env}.`);
  const manifestPath = path.join(directory, 'manifest.json'), manifestStat = requireFile(manifestPath);
  if (manifestStat.size < 1 || manifestStat.size > 16_384) throw Error(`Private provider manifest size invalid: ${provider.field}`);
  const bytes = fs.readFileSync(manifestPath);
  if (SHA(bytes) !== provider.manifestSHA256) throw Error(`Private provider manifest pin mismatch: ${provider.field}`);
  const modulePath = path.join(config.backendDir, 'server', `${provider.module}.ts`); requireFile(modulePath);
  return { provider, directory, modulePath, manifest: { path: manifestPath, bytes: bytes.length, sha256: SHA(bytes) } };
 });
 const tsxPackage = path.join(config.dependenciesDir, 'tsx/package.json'); requireFile(tsxPackage);
 const scope = createRequire(tsxPackage)('tsx/cjs/api').register({ namespace: crypto.randomUUID() });
 try { return admitted.map(({ provider, directory, modulePath, manifest: pin }) => {
  const factory = scope.require(modulePath, import.meta.url)[provider.factory];
  if (typeof factory !== 'function') throw Error(`Provider reader missing: ${provider.module}`);
  // manifest() validates the entire finite set, including the PNG headers and content hashes.
  const manifest = factory(directory).manifest();
  if (manifest.private !== true) throw Error(`Provider must be private: ${provider.field}`);
  return { field: provider.field, env: provider.env, directory, manifest: pin, version: manifest.version,
   validatedFiles: provider.module === 'item-icons' ? ['manifest.json', ...Object.keys(manifest.files).map(id => `${id}.png`)] : provider.module === 'ui-font' ? ['manifest.json', 'atlas.png'] : ['manifest.json', ...manifest.atlases.map(atlas => `atlas-${atlas.factor}.png`)] };
 }); } finally { scope.unregister(); }
}
export function inspectPackage(config){
 const pinPath=config.packageHandoff;requireFile(pinPath);const bytes=fs.readFileSync(pinPath),handoff=JSON.parse(bytes);
 if(!handoff.packageClosed||!handoff.packageQuiescent||!handoff.manifest?.path)throw Error('A closed package handoff is required.');
 const manifestBytes=fs.readFileSync(handoff.manifest.path);if(manifestBytes.length!==handoff.manifest.bytes||SHA(manifestBytes)!==handoff.manifest.sha256)throw Error('Package manifest pin mismatch.');
 const groups=JSON.parse(manifestBytes),checks=[];
 for(const group of ['native','web','backend','mods'])for(const [name,pin]of Object.entries(groups[group]??{})){
  requireFile(pin.path);const file=fs.readFileSync(pin.path);if(file.length!==pin.bytes||SHA(file)!==pin.sha256)throw Error(`Artifact mismatch: ${group}/${name}`);checks.push({group,name,bytes:file.length,sha256:pin.sha256});
 }
 if(checks.length!==handoff.artifactCount)throw Error('Artifact count mismatch.');
 const directories=handoff.directories;for(const [k,g]of [['backendDir','backend'],['webDir','web'],['gameDir','native'],['modsDir','mods']])if(path.resolve(config[k])!==path.resolve(directories[g]))throw Error(`Configured ${k} differs from verified package.`);
 for(const file of [config.discPath,path.join(config.motherMailAssetsDir,'manifest.json'),path.join(config.backendDir,'server/index.ts'),path.join(config.backendDir,'server/admin.ts'),config.nodeBinary,config.cloudflaredBinary,path.join(config.dependenciesDir,'tsx/dist/loader.mjs')])requireFile(file);
 const backend=fs.readFileSync(path.join(config.backendDir,'server/app.ts'),'utf8'),rooms=fs.readFileSync(path.join(config.backendDir,'rooms/index.ts'),'utf8');
 if(!backend.includes("app.use('/presentation', authenticate);"))throw Error('Release blocked: presentation runtime/disc must require the existing session gate.');
 if(!backend.includes("app.use('/game', authenticate")||!backend.includes("app.use('/api', authenticate")||!rooms.includes('beforeUpgrade:')||!rooms.includes('sameOrigin(context.headers'))throw Error('Expected auth/origin gates absent.');
 const backendPins = Object.values(groups.backend ?? {});
 for (const provider of providers) for (const folder of ['server', 'shared']) {
  const file = path.join(config.backendDir, folder, `${provider.module}.ts`);
  if (!backendPins.some(pin => path.resolve(pin.path) === path.resolve(file))) throw Error(`Provider Source is outside the closed package: ${folder}/${provider.module}.ts`);
 }
 return {handoff:{path:pinPath,bytes:bytes.length,sha256:SHA(bytes)},artifactCount:checks.length,nativeBuildId:handoff.nativeBuildId,artifacts:checks,privateProviders:inspectProviders(config)};
}
export function render(raw){
 const c=validate(raw),root=c.runtimeRoot;
 const ingress={tunnel:c.tunnelId,'credentials-file':c.credentialsFile,'no-autoupdate':true,metrics:'127.0.0.1:20247',ingress:[
  {hostname:c.hostname,path:'^/(?:game|presentation/assets)/textures(?:/.*)?$',service:'http_status:403'},
  {hostname:c.hostname,service:`http://127.0.0.1:${c.port}`},
  {service:'http_status:404'}]};
 const env={NODE_ENV:'production',HOST:'127.0.0.1',PORT:String(c.port),PUBLIC_ORIGIN:c.origin,DATA_DIR:path.join(root,'data'),DISC_PATH:c.discPath,GAME_DIR:c.gameDir,WEB_DIR:c.webDir,MODS_DIR:c.modsDir,MOTHER_MAIL_ASSETS_DIR:c.motherMailAssetsDir,ITEM_ICONS_DIR:c.itemIconsDir,UI_FONT_DIR:c.uiFontDir,UI_HAND_DIR:c.uiHandDir,PRESENTATION_DIR:c.presentationDir,TEXTURES_DIR:path.join(root,'textures-disabled')};
 const launch=(label,args,extra={})=>({Label:label,ProgramArguments:args,WorkingDirectory:root,EnvironmentVariables:env,RunAtLoad:true,KeepAlive:true,ThrottleInterval:15,ProcessType:'Background',StandardOutPath:path.join(root,'logs',`${label}.out.log`),StandardErrorPath:path.join(root,'logs',`${label}.err.log`),...extra});
 const app=launch('com.elysiumcrossing.friends.node',[c.nodeBinary,'--import',path.join(c.dependenciesDir,'tsx/dist/loader.mjs'),path.join(c.backendDir,'server/index.ts')]);
 const tunnel=launch('com.elysiumcrossing.friends.tunnel',[c.cloudflaredBinary,'--config',path.join(root,'cloudflared.json'),'tunnel','run',c.tunnelId],{EnvironmentVariables:{}});
 return {config:c,env,ingress,launchd:{app,tunnel},nodeArgs:app.ProgramArguments};
}
export function plist(value){const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));const item=v=>Array.isArray(v)?`<array>${v.map(item).join('')}</array>`:v&&typeof v==='object'?`<dict>${Object.entries(v).map(([k,x])=>`<key>${esc(k)}</key>${item(x)}`).join('')}</dict>`:typeof v==='boolean'?v?'<true/>':'<false/>':typeof v==='number'?`<integer>${v}</integer>`:`<string>${esc(v)}</string>`;return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">${item(value)}</plist>\n`;}
export function prepare(input,destination){const result=render(input),proof=inspectPackage(result.config);if(fs.existsSync(destination))throw Error('Destination already exists; preserve it.');fs.mkdirSync(destination,{recursive:true,mode:0o700});const write=(name,bytes)=>{const fd=fs.openSync(path.join(destination,name),'wx',0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}};write('cloudflared.json',JSON.stringify(result.ingress,null,2)+'\n');write('runtime-env.json',JSON.stringify(result.env,null,2)+'\n');for(const [key,value]of Object.entries(result.launchd))write(`${value.Label}.plist`,plist(value));write('verification.json',JSON.stringify({...proof,generatedOnly:true,servicesStarted:false,gate:'ROOT_DEPLOY_GO_AND_RESOURCE_PERMISSIONS_REQUIRED'},null,2)+'\n');return {destination,nativeBuildId:proof.nativeBuildId,artifactsVerified:proof.artifactCount,servicesStarted:false};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const [configFile,destination]=process.argv.slice(2);if(!configFile||!destination)throw Error('Usage: node prepare.mjs config.json NEW_DESTINATION');console.log(JSON.stringify(prepare(JSON.parse(fs.readFileSync(configFile,'utf8')),path.resolve(destination)),null,2));}
