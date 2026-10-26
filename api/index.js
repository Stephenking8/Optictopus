import mongoose from 'mongoose';
import {createApp} from '../server/src/app.js';
let connection;
let app;
export default async function handler(req,res){
 try{
  const mongoUrl=process.env.MONGODB_URI;
  if(!mongoUrl||!process.env.SESSION_SECRET)throw Error('MONGODB_URI and SESSION_SECRET must be configured.');
  if(!connection){
   connection=mongoose.connect(mongoUrl,{maxPoolSize:5,minPoolSize:0,serverSelectionTimeoutMS:10000}).catch(error=>{connection=undefined;throw error;});
  }
  await connection;
  app ||= createApp({mongoUrl,secret:process.env.SESSION_SECRET,production:process.env.NODE_ENV==='production',mongoUploads:true});
  return app(req,res);
 }catch(error){console.error('Vercel initialization failed:',error.message);res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:'Server initialization failed. Check database access and server environment settings.'}));}
}
