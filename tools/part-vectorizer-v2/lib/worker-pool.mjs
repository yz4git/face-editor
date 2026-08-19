import { Worker } from 'node:worker_threads';

export class CandidateWorkerPool{
  constructor(size){
    this.size=Math.max(1,Math.floor(size));
    this.workers=[];this.idle=[];this.queue=[];this.pending=new Map();this.nextId=1;this.closed=false;
    for(let i=0;i<this.size;i++)this.#spawn();
  }

  #spawn(){
    const worker=new Worker(new URL('./candidate-worker.mjs',import.meta.url));
    worker.on('message',message=>this.#onMessage(worker,message));
    worker.on('error',error=>this.#onWorkerError(worker,error));
    worker.on('exit',code=>{if(code!==0&&!this.closed)this.#onWorkerError(worker,new Error(`Candidate worker exited with code ${code}`));});
    this.workers.push(worker);this.idle.push(worker);this.#drain();
  }

  #onMessage(worker,message){
    const pending=this.pending.get(message.id);if(!pending)return;
    this.pending.delete(message.id);this.idle.push(worker);
    if(message.error){const error=new Error(message.error.message);if(message.error.stack)error.stack=message.error.stack;pending.reject(error);}else pending.resolve(message.result);
    this.#drain();
  }

  #onWorkerError(worker,error){
    const active=[...this.pending.entries()].find(([,value])=>value.worker===worker);
    if(active){const[id,pending]=active;this.pending.delete(id);pending.reject(error);}
    this.idle=this.idle.filter(value=>value!==worker);this.workers=this.workers.filter(value=>value!==worker);
    if(!this.closed)this.#spawn();
  }

  #drain(){
    while(this.idle.length&&this.queue.length){
      const worker=this.idle.pop(),task=this.queue.shift();
      task.worker=worker;this.pending.set(task.id,task);
      worker.postMessage({id:task.id,job:task.job});
    }
  }

  run(job){
    if(this.closed)return Promise.reject(new Error('CandidateWorkerPool is closed'));
    return new Promise((resolve,reject)=>{this.queue.push({id:this.nextId++,job,resolve,reject,worker:null});this.#drain();});
  }

  async close(){
    this.closed=true;
    const error=new Error('CandidateWorkerPool closed before queued work completed');
    for(const task of this.queue.splice(0))task.reject(error);
    for(const pending of this.pending.values())pending.reject(error);
    this.pending.clear();
    await Promise.all(this.workers.map(worker=>worker.terminate().catch(()=>undefined)));
    this.workers=[];this.idle=[];
  }
}
