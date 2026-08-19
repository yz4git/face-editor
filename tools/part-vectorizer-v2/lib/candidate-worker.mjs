import { parentPort } from 'node:worker_threads';
import { traceCandidate } from './candidate.mjs';

if(!parentPort)throw new Error('candidate-worker must run inside a worker thread');

parentPort.on('message',async message=>{
  const{id,job}=message;
  try{
    const crop=Buffer.from(job.cropBuffer);
    const sourceRaw=Buffer.from(job.sourceBuffer);
    const result=await traceCandidate(crop,{raw:sourceRaw,width:job.width,height:job.height,background:job.background},job.profile,job.item,job.manifest);
    parentPort.postMessage({id,result});
  }catch(error){
    parentPort.postMessage({id,error:{message:String(error?.message??error),stack:String(error?.stack??'')}});
  }
});
