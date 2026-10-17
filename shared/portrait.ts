/** Finite native portrait transport: full RGBA frames, no gameplay state. */
export const PORTRAIT_SIDE = 192;
export const PORTRAIT_FRAMES = 32;
export const PORTRAIT_FPS = 15;
export const PORTRAIT_LIMIT = 2 * 1024 * 1024;
const signature = new Uint8Array([137,80,78,71,13,10,26,10]);
const table = Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function portraitCRC(bytes: Uint8Array): number {
  let crc=0xffffffff;for(const byte of bytes)crc=table[(crc^byte)&255]!^(crc>>>8);return (crc^0xffffffff)>>>0;
}
export function portraitConcat(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out=new Uint8Array(parts.reduce((sum,part)=>sum+part.length,0));let at=0;
  for(const part of parts){out.set(part,at);at+=part.length;}return out;
}
export function portraitChunk(type: string,data: Uint8Array): Uint8Array<ArrayBuffer> {
  const out=new Uint8Array(data.length+12),view=new DataView(out.buffer);view.setUint32(0,data.length);
  for(let i=0;i<4;i++)out[4+i]=type.charCodeAt(i);out.set(data,8);view.setUint32(data.length+8,portraitCRC(out.subarray(4,data.length+8)));return out;
}
type Chunk={type:string;data:Uint8Array};
function chunks(bytes: Uint8Array): Chunk[] {
  if(bytes.length<45||bytes.length>PORTRAIT_LIMIT||signature.some((byte,i)=>bytes[i]!==byte))throw Error('portrait_png');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),result:Chunk[]=[];let at=8;
  while(at+12<=bytes.length){
    const size=view.getUint32(at);if(size>PORTRAIT_LIMIT||at+size+12>bytes.length||result.length>=512)throw Error('portrait_chunk');
    const type=String.fromCharCode(...bytes.subarray(at+4,at+8)),data=bytes.subarray(at+8,at+8+size);
    if(!/^[A-Za-z]{4}$/.test(type)||portraitCRC(bytes.subarray(at+4,at+8+size))!==view.getUint32(at+8+size))throw Error('portrait_crc');
    result.push({type,data});at+=size+12;if(type==='IEND')break;
  }
  if(at!==bytes.length||result[0]?.type!=='IHDR'||result.at(-1)?.type!=='IEND'||result.at(-1)!.data.length)throw Error('portrait_end');
  const h=result[0]!.data;
  if(h.length!==13||new DataView(h.buffer,h.byteOffset,h.byteLength).getUint32(0)!==PORTRAIT_SIDE||
    new DataView(h.buffer,h.byteOffset,h.byteLength).getUint32(4)!==PORTRAIT_SIDE||h[8]!==8||h[9]!==6||h[10]!==0||h[11]!==0||h[12]!==0)throw Error('portrait_header');
  return result;
}
/** The only accepted animation format. Returned zlib streams are independently bounded by the server. */
export function inspectPortrait(bytes: Uint8Array): {header:Uint8Array;frames:Uint8Array<ArrayBuffer>[]} {
  const list=chunks(bytes),actl=list[1];
  if(actl?.type!=='acTL'||actl.data.length!==8)throw Error('portrait_animation');
  const av=new DataView(actl.data.buffer,actl.data.byteOffset,8);
  if(av.getUint32(0)!==PORTRAIT_FRAMES||av.getUint32(4)!==0)throw Error('portrait_count');
  const frames:Uint8Array<ArrayBuffer>[]=[];let seq=0,index=2;
  while(index<list.length-1){
    const control=list[index++];if(control?.type!=='fcTL'||control.data.length!==26)throw Error('portrait_control');
    const c=new DataView(control.data.buffer,control.data.byteOffset,26);
    if(c.getUint32(0)!==seq++||c.getUint32(4)!==PORTRAIT_SIDE||c.getUint32(8)!==PORTRAIT_SIDE||
      c.getUint32(12)!==0||c.getUint32(16)!==0||c.getUint16(20)!==1||c.getUint16(22)!==PORTRAIT_FPS||c.getUint8(24)!==0||c.getUint8(25)!==0)throw Error('portrait_frame');
    const data:Uint8Array[]=[];const first=frames.length===0;
    while(list[index]?.type===(first?'IDAT':'fdAT')){
      const part=list[index++]!.data;
      if(first){if(!part.length)throw Error('portrait_data');data.push(part);}
      else {if(part.length<=4||new DataView(part.buffer,part.byteOffset,part.byteLength).getUint32(0)!==seq++)throw Error('portrait_sequence');data.push(part.subarray(4));}
    }
    if(!data.length||frames.length>=PORTRAIT_FRAMES)throw Error('portrait_data');frames.push(portraitConcat(data));
  }
  if(frames.length!==PORTRAIT_FRAMES)throw Error('portrait_count');return {header:list[0]!.data,frames};
}
/** Canvas handles PNG compression; this code only assembles the standard APNG container. */
export function animatePortrait(pngFrames: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  if(pngFrames.length!==PORTRAIT_FRAMES)throw Error('portrait_count');
  const parsed=pngFrames.map(frame=>chunks(frame));
  const header=parsed[0]![0]!.data,animation=new Uint8Array(8);new DataView(animation.buffer).setUint32(0,PORTRAIT_FRAMES);
  const out=[signature,portraitChunk('IHDR',header),portraitChunk('acTL',animation)];let sequence=0;
  parsed.forEach((frame,index)=>{
    if(frame.some(chunk=>['acTL','fcTL','fdAT'].includes(chunk.type))||frame[0]!.data.some((byte,i)=>byte!==header[i]))throw Error('portrait_source');
    const controls=new Uint8Array(26),view=new DataView(controls.buffer);view.setUint32(0,sequence++);view.setUint32(4,PORTRAIT_SIDE);view.setUint32(8,PORTRAIT_SIDE);view.setUint16(20,1);view.setUint16(22,PORTRAIT_FPS);
    out.push(portraitChunk('fcTL',controls));const data=portraitConcat(frame.filter(chunk=>chunk.type==='IDAT').map(chunk=>chunk.data));
    if(!data.length)throw Error('portrait_data');
    if(index===0)out.push(portraitChunk('IDAT',data));
    else {const payload=new Uint8Array(data.length+4);new DataView(payload.buffer).setUint32(0,sequence++);payload.set(data,4);out.push(portraitChunk('fdAT',payload));}
  });
  out.push(portraitChunk('IEND',new Uint8Array()));const bytes=portraitConcat(out);inspectPortrait(bytes);return bytes;
}
export function portraitPoster(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const parsed=inspectPortrait(bytes);return portraitConcat([signature,portraitChunk('IHDR',parsed.header),portraitChunk('IDAT',parsed.frames[0]!),portraitChunk('IEND',new Uint8Array())]);
}
