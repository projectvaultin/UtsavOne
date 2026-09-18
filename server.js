const http=require("http"),fs=require("fs"),path=require("path"),{exec}=require("child_process");
const root=path.join(__dirname,"public");
const preferred=Number(process.env.PORT||4310);
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml"};
function start(port){
 const server=http.createServer((req,res)=>{
   let pathname=decodeURIComponent((req.url||"/").split("?")[0]);
   if(pathname==="/") pathname="/index.html";
   const file=path.join(root,pathname);
   if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end("Not Found")}
   res.writeHead(200,{"Content-Type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});
   fs.createReadStream(file).pipe(res);
 });
 server.on("error",e=>{if(e.code==="EADDRINUSE") start(port+1); else {console.error(e);process.exit(1)}});
 server.listen(port,"127.0.0.1",()=>{const url=`http://localhost:${port}`;console.log(`Festival OS running at ${url}`);if(process.env.NO_BROWSER!=="1"){const cmd=process.platform==="win32"?`start "" "${url}"`:process.platform==="darwin"?`open "${url}"`:`xdg-open "${url}"`;exec(cmd,()=>{})}});
}
start(preferred);
