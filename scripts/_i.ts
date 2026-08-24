import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
async function main(){
  const y=canliYapilandirma(); if(!y.tamam) return;
  process.env.DATABASE_URL=betikAdresi(y.veri.ham);
  const {prisma}=await import("../src/lib/prisma");
  const i=await prisma.auditLog.findMany({
    where:{OR:[{action:{contains:"HAKEDIS"}},{action:{contains:"ESLE"}}]},
    select:{action:true,createdAt:true,detail:true},
    orderBy:{createdAt:"desc"},take:3});
  if(i.length===0) console.log("IZ YOK — betik AuditLog yazmiyor");
  for(const x of i) console.log(`  ${x.createdAt.toISOString().slice(0,16)} ${x.action} · ${(x.detail??"").slice(0,90)}`);
}
main();
