const http = require('http');
const fs = require('fs');
const path = require('path');

const stats = { online:true, membersOnline:12548, totalMembers:28560, voiceChannels:312, uptime:99.9,
  trend:[40,55,45,60,58,70,65,80,75,90,85,95,88,100,92,105,98,110,102,115,108,120,112,118] };
const events = [
  {id:1,title:'Hawks Championship',subtitle:'Valorant Tournament',day:'24',month:'JUN',icon:'trophy'},
  {id:2,title:'Minecraft Build Battle',subtitle:'Creative Challenge',day:'28',month:'JUN',icon:'block'},
  {id:3,title:'Night Hawks Giveaway',subtitle:'Nitro + Game Keys',day:'05',month:'JUL',icon:'gift'}
];
const activity = [
  {id:1,text:'Phoenix just joined the server',time:'2 minutes ago',icon:'join'},
  {id:2,text:'Solaris sent a message in #general',time:'5 minutes ago',icon:'message'},
  {id:3,text:'Raven earned the level 10 role',time:'10 minutes ago',icon:'role'},
  {id:4,text:'Viper just joined the server',time:'12 minutes ago',icon:'join'}
];
const topMembers = [
  {rank:1,name:'! Aʀᴘɪᴛ | Owner 👑',tag:'Owner'},
  {rank:2,name:'Storm',tag:'Admin'},
  {rank:3,name:'Ataku',tag:'Moderator'},
  {rank:4,name:'Worix',tag:'Moderator'}
];
const announcements = [
  {id:1,tag:'NEW',title:'Welcome to Night Hawks 2.0',body:'Upgraded server experience.',time:'2 days ago'},
  {id:2,title:'Double XP Event This Weekend!',time:'4 days ago'},
  {id:3,title:'New Giveaway Live Now',time:'5 days ago'}
];

const routes = {
  '/api/stats': () => stats,
  '/api/events': () => events,
  '/api/activity': () => activity,
  '/api/members/top': () => topMembers,
  '/api/announcements': () => announcements
};

const mime = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml' };

http.createServer((req, res) => {
  if (routes[req.url]) {
    res.writeHead(200, {'Content-Type':'application/json'});
    return res.end(JSON.stringify(routes[req.url]()));
  }
  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    const ext = path.extname(filePath);
    res.writeHead(200, {'Content-Type': mime[ext] || 'application/octet-stream'});
    res.end(data);
  });
}).listen(3000, () => console.log('preview server on :3000'));
