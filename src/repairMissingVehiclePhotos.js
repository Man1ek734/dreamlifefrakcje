import sharp from 'sharp';
import { AttachmentBuilder, ChannelType } from 'discord.js';

const JOBS = Object.freeze([
  {
    name: 'Granger 3700LX',
    channelId: '1570875064482668581',
    messageId: '1570875122192220270',
    images: [
      'https://dunb17ur4ymx4.cloudfront.net/packages/images/a295f5626c4950a00d5f800989972ede2879885f.png'
    ],
    source: 'Cfx Marketplace — ONX Granger 3700LX Police/EMS vehicle bundle'
  },
  {
    name: 'Tempesta',
    channelId: '1570875069821882661',
    messageId: '1570875383568666765',
    images: [
      'https://dunb17ur4ymx4.cloudfront.net/packages/images/492f60af92fa6ea26c329a3fdd094a75c218351e.jpg',
      'https://dunb17ur4ymx4.cloudfront.net/packages/images/549a004ab99460b20572b8ad9da9828808a0f1c6.jpg'
    ],
    source: 'RmodCustoms — Tempesta Police'
  }
]);
const PREFIX=String.fromCharCode(96).repeat(3);
const NAVY=[0,14,27];

async function placeholderScore(bytes){
  const {data,info}=await sharp(bytes,{limitInputPixels:30_000_000})
    .resize(64,36,{fit:'fill'}).flatten({background:'#ffffff'})
    .removeAlpha().raw().toBuffer({resolveWithObject:true});
  let navy=0;
  for(let i=0;i<data.length;i+=info.channels){
    if(Math.abs(data[i]-NAVY[0])<12 &&
       Math.abs(data[i+1]-NAVY[1])<12 &&
       Math.abs(data[i+2]-NAVY[2])<16) navy++;
  }
  return navy/(data.length/info.channels);
}
async function fetchBytes(url){
  const host=new URL(url).hostname;
  if(!['dunb17ur4ymx4.cloudfront.net','cdn.discordapp.com','media.discordapp.net'].includes(host)){
    throw new Error('Nieautoryzowane zrodlo: '+host);
  }
  const r=await fetch(url,{signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw new Error('HTTP '+r.status+' ('+host+')');
  const length=Number(r.headers.get('content-length')||0);
  if(length>22_000_000)throw new Error('Za duzy obraz');
  const b=Buffer.from(await r.arrayBuffer());
  if(b.length>22_000_000)throw new Error('Za duzy obraz');
  return b;
}

async function processJob(guild,job){
  const channel=await guild.channels.fetch(job.channelId).catch(()=>null);
  if(!channel||channel.type!==ChannelType.GuildText){
    return {model:job.name,status:'channel_not_found'};
  }
  const message=await channel.messages.fetch(job.messageId).catch(()=>null);
  if(!message||message.author.id!==guild.client.user.id ||
     !message.content.startsWith(PREFIX+'\n'+job.name+'\n')){
    return {model:job.name,status:'listing_not_found'};
  }

  const existing=[...message.attachments.values()];
  if(existing.length===job.images.length &&
     existing.every(a=>a.name?.startsWith('lspd-replacement-'))){
    return {model:job.name,status:'already_done',messageId:message.id,attachments:existing.length};
  }

  // Replace only a listing that STILL contains this exact unavailable-image placeholder.
  const scores=[];
  for(const attachment of existing){
    const bytes=await fetchBytes(attachment.url);
    scores.push(Math.round(100*await placeholderScore(bytes)));
  }
  if(!scores.some(s=>s>=50)){
    return {model:job.name,status:'no_placeholder_left',scores};
  }
  // If any real image is mixed in, preserve it; avoid unintentional deletion of other photos.
  if(!scores.every(s=>s>=50)){
    return {model:job.name,status:'has_other_real_photos',scores};
  }

  const files=[];
  for(let i=0;i<job.images.length;i++){
    const bytes=await fetchBytes(job.images[i]);
    const meta=await sharp(bytes,{limitInputPixels:30_000_000}).metadata();
    if(!meta.width||meta.width<600||!meta.height||meta.height<400){
      throw new Error('Zdjecie referencyjne za male: '+job.name);
    }
    if(await placeholderScore(bytes)>0.5){
      throw new Error('Nowe zdjecie jest rowniez placeholderem: '+job.name);
    }
    const jpg=await sharp(bytes,{limitInputPixels:30_000_000})
      .rotate().resize({width:1600,height:1200,fit:'inside',withoutEnlargement:true})
      .jpeg({quality:88,mozjpeg:true}).toBuffer();
    if(jpg.length>7_500_000)throw new Error('Nowe zdjecie za duze');
    files.push(new AttachmentBuilder(jpg,{
      name:'lspd-replacement-'+job.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+(i+1)+'.jpg',
      description:job.name+' — zdjęcie poglądowe, '+job.source
    }));
  }

  // Discord.js sam przypisuje ID nowym plikom. Pusta lista oznacza:
  // usuń tylko dotychczasowe placeholdery i dodaj nowe pliki z "files".
  await message.edit({
    content:message.content,
    attachments:[],
    files,
    embeds:[],
    allowedMentions:{parse:[]}
  });
  const refreshed=await channel.messages.fetch(message.id);
  const names=[...refreshed.attachments.values()].map(a=>a.name);
  const success=names.length===files.length &&
    names.every(n=>n.startsWith('lspd-replacement-'));
  return {
    model:job.name,
    status:success?'replaced':'confirmation_failed',
    messageId:message.id,
    attachments:names,
    oldScores:scores
  };
}

export async function repairMissingVehiclePhotos(guild){
  const results=[];
  for(const job of JOBS){
    try{
      const result=await processJob(guild,job);
      results.push(result);
      console.log('[PHOTO REPAIR] '+JSON.stringify(result));
    }catch(error){
      const result={model:job.name,status:'error',reason:error.message};
      results.push(result);
      console.error('[PHOTO REPAIR] '+JSON.stringify(result));
    }
  }
  console.log('[PHOTO REPAIR COMPLETE] '+JSON.stringify(results));
  return results;
}
