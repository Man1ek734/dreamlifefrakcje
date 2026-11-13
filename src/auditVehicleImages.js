import sharp from 'sharp';
import catalogue from '../data/product_gallery.json' with {type:'json'};

// Audit only: does not send messages or edit/delete channels.
// User-supplied placeholder has pixel rgb(0,14,27) as the whole background.
const CHANNEL_IDS = Object.freeze({
  'off-road':'1570875064482668581',
  'sedany':'1570875066906972180',
  'coupe':'1570875067813072946',
  'musclecar':'1570875068819579071',
  'pojazdy-sportowe':'1570875069821882661',
  'pojazdy-transportowe':'1570875070773985320'
});
const prefix=(name)=>String.fromCharCode(96).repeat(3)+'\n'+name+'\n';

async function inspectImage(url){
  const u=new URL(url);
  if(!['cdn.discordapp.com','media.discordapp.net','dunb17ur4ymx4.cloudfront.net'].includes(u.hostname)) {
    return {error:'unapproved host'};
  }
  const response=await fetch(url,{signal:AbortSignal.timeout(22000)});
  if(!response.ok) return {error:'HTTP '+response.status};
  const bytes=Buffer.from(await response.arrayBuffer());
  const image=sharp(bytes,{limitInputPixels:35_000_000,failOn:'error'});
  const meta=await image.metadata();
  const {data, info}=await image.resize(64,36,{fit:'fill'}).flatten({background:'#ffffff'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  let navy=0;
  let white=0;
  for(let i=0;i<data.length;i+=info.channels){
    const [r,g,b]=[data[i],data[i+1],data[i+2]];
    if(r<12 && g>=6 && g<25 && b>=17 && b<39)navy++;
    if(r>210&&g>210&&b>210)white++;
  }
  const pixels=data.length/info.channels;
  return {
    dimension:meta.width+'x'+meta.height,
    navy:Math.round(navy/pixels*100),
    white:Math.round(white/pixels*100),
    placeholder:navy/pixels>0.45
  };
}

export async function auditVehicleImages(guild){
  const found=[];
  const errors=[];
  let examined=0;
  const grouped=new Map();
  for(const product of catalogue.products){
    if(product.name==='Alamo 2700LX')continue;
    const items=grouped.get(product.category)||[];
    items.push(product);
    grouped.set(product.category,items);
  }
  for(const [category,items] of grouped.entries()){
    const channel=await guild.channels.fetch(CHANNEL_IDS[category]).catch(()=>null);
    if(!channel){errors.push(category+': no channel');continue;}
    let messages;
    try{messages=await channel.messages.fetch({limit:100})}
    catch(e){errors.push(category+': '+e.message);continue;}
    for(const product of items){
      const match=messages.find(m=>m.author.id===guild.client.user.id&&m.content.startsWith(prefix(product.name)));
      if(!match){errors.push(product.name+': message missing');continue;}
      const media=[
        ...[...match.attachments.values()].map(a=>({url:a.url,source:'attachment'})),
        ...match.embeds.filter(e=>e.image?.url).map(e=>({url:e.image.url,source:'embed'}))
      ];
      for(const item of media){
        try{
          const details=await inspectImage(item.url);
          examined++;
          if(details.placeholder){
            const record={name:product.name,category,channel:channel.id,messageId:match.id,source:item.source,details};
            found.push(record);
            console.log('[PLACEHOLDER FOUND] '+JSON.stringify(record));
          } else if(details.error){
            errors.push(product.name+': '+details.error);
          }
        }catch(e){errors.push(product.name+': '+e.message)}
      }
    }
  }
  console.log('[PLACEHOLDER AUDIT COMPLETE] '+JSON.stringify({products:52,mediaExamined:examined,found,errors}));
  return {examined,found,errors};
}
