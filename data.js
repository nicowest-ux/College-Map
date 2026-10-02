(() => {
const roomGuideHints=window.CAMPUS_ROOM_GUIDE_HINTS||{};
const dep={admin:'#737b88',business:'#16a5c7',english:'#f47b20',humanities:'#ef8e72',sport:'#a12f69',maths:'#c79a13',arts:'#4d5bd8',science:'#df74a6',social:'#7a50c7',visual:'#e77a16',learning:'#4aa8d8'};
const floorViews={
 'Ribble|G':{bounds:[[400,410],[815,650]]},'Ribble|1':{bounds:[[670,190],[1290,430]]},'Ribble|2':{bounds:[[880,0],[1510,225]]},
 'Calder|G':{bounds:[[760,410],[1060,1140]]},'Calder|1':{bounds:[[1060,295],[1290,850]]},'Calder|2':{bounds:[[1300,190],[1510,710]]},
 'Medlock|G':{bounds:[[760,1090],[1050,1570]]},'Medlock|1':{bounds:[[1060,880],[1270,1330]]},'Medlock|2':{bounds:[[1300,680],[1510,1120]]},
 'Alt|G':{bounds:[[470,895],[650,1340]]},'Alt|1':{bounds:[[325,755],[560,930]]},
 'Brock|G':{bounds:[[410,1305],[670,1765]]},'Brock|1':{bounds:[[35,1480],[355,1920]]},
 'Holland|LG':{bounds:[[10,1200],[225,1465]]},'Holland|G':{bounds:[[70,970],[355,1230]]},
 'Wyre|G':{bounds:[[565,1540],[1060,1775]]},'Wyre|1':{bounds:[[100,1750],[715,2015]]},'Wyre|2':{bounds:[[0,1960],[490,2225]]},
 'Sports Hall|G':{bounds:[[730,1995],[1140,2235]]},'Sports Hall|1':{bounds:[[810,1880],[1180,2005]]}
}
const defs={
 'Ribble|G':['R001','R002','R002a','R003','R004','R005','R006','R007','R008','R008a'],
 'Ribble|1':['R101','R102','R103','R104','R105','R106','R107','R108','R109','R110','R111','R112','R113','R114','R115'],
 'Ribble|2':['R201','R202','R203','R204','R205','R206','R207','R208','R209','R210','R211','R212','R213','R214','R215','R216'],
 'Calder|G':['C000','C003','C004','C005','C006','C009','C011','C012','C015','C016'],
 'Calder|1':['C101','C102','C104','C106','C108','C109','C110','C111','C111a','C112','C113'],
 'Calder|2':['C201','C202','C203','C204','C205','C206','C207','C208','C209','C210','C211','C212','C213','C214'],
 'Medlock|G':['M001','M002','M003','M005','M006','M007','M008','M009','M010','M011','M012','M013'],
 'Medlock|1':['M101','M102','M103','M104','M105','M106','M109','M110','M111','M112','M113','M114','M115'],
 'Medlock|2':['M201','M202','M204','M205','M206','M207','M208','M209','M210'],
 'Alt|G':['A001','A002','A003','A004','A005','A006','A007','A101','A102','A103','A104','A105'],
 'Alt|1':['A201','A202'],
 'Brock|G':['B001','B002','B003','B004','B005','B006','B007','B007a','B007b','B007c','B008','B010','B011','B012','B013','B014','B014a','B015','B017'],
 'Brock|1':['B101','B102','B103','B104','B105','B106','B107','B108','B109','B110','B111','B113'],
 'Holland|LG':['H001','H003','H004','H005','H006','H007','H008'],
 'Holland|G':['H101','H102','H105','H107','H108','H113'],
 'Wyre|G':['W001','W002','W003','W006','W007','W008','W009','W010','W011'],
 'Wyre|1':['W101','W102','W105','W108','W109','W110','W111','W113','W114','W115','W116','W118','W120'],
 'Wyre|2':['W201','W202','W203','W204','W205','W207','W208','W210','W211','W212','W213','W214','W215','W216'],
 'Sports Hall|G':['S001','S002','S003','S004','S010','S015','S016','S017'],
 'Sports Hall|1':['S101','S102']
};
const verified={
 B004:[438,1345],B005:[438,1390],B010:[438,1452],B011:[438,1512],B017:[490,1610],B001:[565,1312],B007:[558,1397],B008:[558,1458],B014:[562,1526],B015:[562,1582],
 R214:[1004,26],R212:[1115,26],R210:[1226,26],R208:[1338,26],R206:[1438,26],R204:[1477,26],R203:[1490,49],R201:[1490,140]
};
const aliases={B007:['tech support','technical support','it support'],B014:['exams','exams office','exam office']};
const rooms=[];
for(const [key,ids] of Object.entries(defs)){const [bldg,floor]=key.split('|');for(const id of ids){rooms.push({id,bldg,floor,name:id,aliases:aliases[id]||[],pos:verified[id]||null,verified:!!verified[id]});}}
const specialRoutes={
 'B007>B014':[
  'Leave Tech Support and go back out the way you entered.',
  'Go outside into the quad and turn left in the quad.',
  'Enter through the doors by the student lockers.',
  'Walk past the student lockers.',
  'Turn left and continue past Refill / the print room.',
  'Turn left again to reach the Exams office (B014).'
 ],
 'B014>B007':[
  'Leave Exams (B014) and turn right.',
  'Pass Refill / the print room and continue toward the student lockers.',
  'Turn right by the lockers and exit into the quad.',
  'Turn right in the quad and re-enter toward Tech Support.',
  'Continue to B007 Tech Support.'
 ]
};
const tourUrl='https://storage.net-fs.com/hosting/8161072/19/';
const places=[
 {id:'EXAMS',name:'Exams Office',kind:'Service',room:'B014',icon:'✓',keywords:['exam','exams','exam office','exam room','assessment','results'],description:'Exams and assessment support.'},
 {id:'TECH',name:'Tech Support',kind:'Service',room:'B007',icon:'⌘',keywords:['it','tech','technical','computer problem','laptop','wifi','password','technology'],description:'IT and device support.'},
 {id:'FYI',name:'FYi Library & Study Zone',kind:'Study',room:null,icon:'▤',keywords:['library','fyi','study','quiet','revision','book','learning resource','printer','computer'],description:'Library and learning resource centre with silent study, computers, printers and own-device study space.'},
 {id:'FRAME',name:'The Frame',kind:'Creative',room:null,icon:'◇',keywords:['frame','art','visual art','gallery','graphics','photography','textiles'],description:'Open-plan visual arts and exhibition space.'},
 {id:'THEATRE',name:'Theatre',kind:'Performing Arts',room:null,icon:'◈',keywords:['theatre','theater','performance','show','drama'],description:'Professional performance venue.'},
 {id:'SPORTS',name:'Sports Hall',kind:'Sport',room:'S001',icon:'◉',keywords:['sports hall','sport','pe','basketball','badminton','climbing'],description:'Sports hall and activity space.'},
 {id:'GYM',name:'Gymnasium',kind:'Sport',room:null,icon:'↗',keywords:['gym','gymnasium','fitness','weights'],description:'On-site gymnasium.'},
 {id:'FOCUS',name:'Focus Centre',kind:'Support',room:null,icon:'♥',keywords:['focus','additional learning support','als','support','learning support','sensory','quiet support'],description:'Additional Learning Support base and staffed support zone.'},
 {id:'FOOD',name:'Food & Drink',kind:'Food',room:null,icon:'☕',keywords:['food','drink','lunch','coffee','costa','cafe','cafe 6','relish','deli','store','hungry'],description:'Campus catering including Relish, Cafe 6, Costa, Deli Counter, Cafe+ and The Store.'},
 {id:'SCIENCE',name:'Science Labs',kind:'Learning',room:null,icon:'⌬',keywords:['science','lab','laboratory','chemistry','biology','physics'],description:'Science teaching laboratories.'},
 {id:'DIGITAL',name:'Digital Lab',kind:'Learning',room:null,icon:'◫',keywords:['digital lab','digital','computing','media','film','tv','green room'],description:'Digital, film and TV facilities.'},
 {id:'FAITH',name:'Faith & Sensory Space',kind:'Wellbeing',room:null,icon:'○',keywords:['faith','prayer','sensory','quiet space','wellbeing'],description:'Faith and sensory space.'},
 {id:'RECEPTION',name:'Reception / Main Entrance',kind:'Service',room:null,icon:'⌂',keywords:['reception','entrance','main entrance','visitor','sign in'],description:'Main campus arrival and visitor sign-in point.'},
 {id:'CAREERS',name:'Futures Careers & Guidance',kind:'Support',room:null,icon:'↗',keywords:['careers','career','futures','university','apprenticeship','job','guidance'],description:'Careers and guidance team based at the back of the FYi computer area.'},
 {id:'TOILETS',name:'Toilets',kind:'Facilities',room:null,icon:'WC',keywords:['toilet','toilets','loo','bathroom','wc'],description:'Find the nearest toilet using the visual campus guide while exact amenity pins are being verified.'},
 {id:'LIFT',name:'Lift / Step-free access',kind:'Accessibility',room:null,icon:'↕',keywords:['lift','elevator','wheelchair','step free','step-free','accessible'],description:'The campus states wheelchair access throughout; exact lift-to-lift route geometry is being verified.'},
 {id:'WATER',name:'Water refill',kind:'Facilities',room:null,icon:'◌',keywords:['water','refill','bottle','fountain'],description:'Water fountains are available around the college; exact refill pins are being verified.'}
];
const tourScenes={
 FYI:{mediaName:'The FYi - Ground Floor',exact:true},
 FRAME:{mediaName:'The Frame',exact:true},
 THEATRE:{mediaName:'Theatre',exact:true},
 SPORTS:{mediaName:'Sports Hall',exact:true},
 GYM:{mediaName:'The Gym',exact:true},
 FOCUS:{mediaName:'Focus Centre',exact:true},
 FOOD:{mediaName:'Relish',exact:false,note:'This opens Relish as a representative food location; Food & Drink includes several outlets.'},
 SCIENCE:{mediaName:'Science Lab',exact:true},
 DIGITAL:{mediaName:'Media Room - Film and Television',exact:false,note:'This is a representative digital/media teaching space, not a room-number match.'},
 FAITH:{mediaName:'Reflect - The Faith Space',exact:true},
 RECEPTION:{mediaName:'Reception',exact:true},
 CAREERS:{mediaName:'The FYi',exact:false,note:'Futures Careers & Guidance is based at the back of the FYi; this opens the FYi panorama.'}
};
const roomTourScenes={
 S001:{mediaName:'Sports Hall',exact:true}
};
const tourMedia=[
 'Back foyer','Cafe Six','Committee Room','Costa','Drama Studio','Electronics Classroom','Engineering','Engineering 1','Engineering 2','Engineering 3',
 'Focus Centre','Focus Centre1','Front foyer','Graphic Design Classroom','Health and Social Care Classroom','History Classroom','Holland','Holland - Performing Room',
 'Holland - Performing Room 1','Holland - Performing Room 2','Holland - Performing Room(1)','Holland - Recording Studio','IT Classroom','Media Room - Film and Television',
 'Photography Classroom','Photography Studio','Reception','Reflect - The Faith Space','Relish','Relish1','Science Lab','Spanish Classroom','Sports Hall','T Level Digital Room',
 'T Level Health Ward','The Deli','The FYi','The FYi - Ground Floor','The FYi 1','The FYi 2','The Frame','The Frame - Fashion and Textiles',
 'The Frame - Fashion and Textiles 1','The Frame - Fine Art 1','The Frame - Fine Art 2','The Frame 1','The Green Room - Film and Television','The Gym',
 'The Gym 1','The Gym 2','The Link','The Poly Tunnel and Allotment','The Quad','The Quad 1','The Store','The Store 1','The frame 2','The link1',
 'Theatre','Theatre - Top view','Travel and Tourism Classroom'
];
const intentGroups=[
 {id:'it-help',label:'I need IT help',keywords:['it help','computer problem','laptop problem','wifi','password','technical support'],place:'TECH'},
 {id:'exam-help',label:'I have an exam',keywords:['exam','exams','assessment'],place:'EXAMS'},
 {id:'study',label:'I need somewhere to study',keywords:['study','quiet','revision','library'],place:'FYI'},
 {id:'food',label:'I want food or a drink',keywords:['food','drink','lunch','coffee','hungry'],place:'FOOD'},
 {id:'support',label:'I need student support',keywords:['support','additional learning','als','sensory','help me'],place:'FOCUS'},
 {id:'sport',label:'I need sport facilities',keywords:['sport','gym','fitness','sports hall'],place:'SPORTS'},
 {id:'arts',label:'I need arts / performance',keywords:['art','theatre','drama','dance','frame'],place:'FRAME'},
 {id:'toilet',label:'I need a toilet',keywords:['toilet','toilets','loo','bathroom','wc'],place:'TOILETS'},
 {id:'access',label:'I need step-free access',keywords:['lift','elevator','wheelchair','step free','step-free','accessible'],place:'LIFT'},
 {id:'careers',label:'I need careers help',keywords:['careers','career','university','apprenticeship','job','futures'],place:'CAREERS'}
];

const annotatedSource=window.CAMPUS_ANNOTATED_NAV||null;
const annotatedCheckpoints=[],annotatedEdges=[];
if(annotatedSource){
 for(const [key,g] of Object.entries(annotatedSource.floors||{})){
  const [bldg,floor]=key.split('|');
  (g.p||[]).forEach((pos,i)=>annotatedCheckpoints.push({id:'ANN_'+key.replace(/[^A-Za-z0-9]+/g,'_')+'_'+i,name:'Surveyed corridor',type:'corridor',bldg,floor,pos,verified:true,source:'annotated-corridor'}));
  (g.e||[]).forEach(([a,b])=>annotatedEdges.push({from:'ANN_'+key.replace(/[^A-Za-z0-9]+/g,'_')+'_'+a,to:'ANN_'+key.replace(/[^A-Za-z0-9]+/g,'_')+'_'+b,mode:'corridor',access:'public',stepFree:true,source:'annotated-corridor'}));
 }
 for(const t of annotatedSource.toilets||[]){const [id,y,x,bldg,floor]=t;annotatedCheckpoints.push({id,name:'Toilets',type:'toilet',bldg,floor,pos:[y,x],verified:true,source:'user-highlighted-toilet',keywords:['toilet','toilets','wc','loo']})}
 for(const l of annotatedSource.landmarks||[]){const [id,name,y,x,bldg,floor]=l;annotatedCheckpoints.push({id:'LANDMARK_'+id,name,type:'landmark',bldg,floor,pos:[y,x],verified:true,source:'user-labelled-landmark',keywords:[name.toLowerCase()]})}
}
const checkpoints=[...annotatedCheckpoints,
 {id:'WYRE_LIFT_G',name:'Wyre lift — Ground Floor',type:'lift',bldg:'Wyre',floor:'G',pos:[874,1610],verified:true,source:'floorplan-lift-symbol',keywords:['wyre lift','lift','elevator','w002','w003']},
 {id:'WYRE_LIFT_1',name:'Wyre lift — First Floor',type:'lift',bldg:'Wyre',floor:'1',pos:[530,1861],verified:true,source:'floorplan-lift-symbol',keywords:['wyre lift','lift','elevator','w105','w11ss']},
 {id:'B007_DOOR',name:'Tech Support doorway',type:'room',room:'B007',bldg:'Brock',floor:'G',pos:[558,1397],verified:true,keywords:['tech support','b007','it support']},
 {id:'B014_DOOR',name:'Exams doorway',type:'room',room:'B014',bldg:'Brock',floor:'G',pos:[562,1526],verified:true,keywords:['exams','b014','exam office']},
 {id:'BROCK_QUAD_EXIT_TECH',name:'Doors from Tech Support to the quad',type:'entrance',bldg:'Brock',floor:'G',pos:null,verified:false,keywords:['quad doors','tech doors','outside']},
 {id:'BROCK_QUAD_LEFT',name:'Left turn in the quad',type:'junction',bldg:'Brock',floor:'G',pos:null,verified:false,keywords:['quad','outside','left in quad']},
 {id:'BROCK_LOCKER_DOORS',name:'Doors by the student lockers',type:'entrance',bldg:'Brock',floor:'G',pos:null,verified:false,keywords:['lockers','student lockers','locker doors']},
 {id:'BROCK_LOCKERS',name:'Student lockers',type:'landmark',bldg:'Brock',floor:'G',pos:null,verified:false,keywords:['lockers','student lockers']},
 {id:'BROCK_REFILL',name:'Refill / print room',type:'printer',bldg:'Brock',floor:'G',pos:null,verified:false,keywords:['refill','print room','printer','printing']},
 {id:'BROCK_EXAMS_TURN',name:'Final turn to Exams',type:'junction',bldg:'Brock',floor:'G',pos:null,verified:false,keywords:['exams turn','final turn']}
];
const routeTemplates={
 'B007>B014':{
   name:'Tech Support to Exams',audience:'student',precision:'landmark-verified',public:true,stepFree:null,
   note:'Uses the public student route. The direct indoor corridor is staff-only.',
   steps:[
    {action:'exit',icon:'↗',text:'Leave Tech Support and go back out the way you entered.',anchor:'B007_DOOR',confirm:'You are leaving B007 Tech Support.'},
    {action:'outside',icon:'↑',text:'Go outside into the quad.',anchor:'BROCK_QUAD_EXIT_TECH',confirm:'You should now be in the quad.'},
    {action:'left',icon:'↰',text:'Turn left in the quad and continue to the next set of doors.',anchor:'BROCK_QUAD_LEFT',confirm:'Keep the building on your left as you cross.'},
    {action:'enter',icon:'↗',text:'Go through the doors by the student lockers.',anchor:'BROCK_LOCKER_DOORS',confirm:'You should see student lockers immediately after entering.'},
    {action:'straight',icon:'↑',text:'Walk past the student lockers.',anchor:'BROCK_LOCKERS',confirm:'The lockers should be beside you.'},
    {action:'left',icon:'↰',text:'Turn left and go past Refill / the print room.',anchor:'BROCK_REFILL',confirm:'Look for Refill / the print room as your landmark.'},
    {action:'left',icon:'↰',text:'Turn left again. Exams is B014.',anchor:'BROCK_EXAMS_TURN',confirm:'B014 should now be ahead.'},
    {action:'arrive',icon:'✓',text:'Arrive at the Exams office, B014.',anchor:'B014_DOOR',confirm:'You have reached Exams.'}
   ]
 },
 'B014>B007':{
   name:'Exams to Tech Support',audience:'student',precision:'landmark-verified',public:true,stepFree:null,
   note:'Uses the public student route rather than the staff-only internal corridor.',
   steps:[
    {action:'exit',icon:'↗',text:'Leave Exams, B014, and turn right.',anchor:'B014_DOOR',confirm:'You are leaving the Exams office.'},
    {action:'straight',icon:'↑',text:'Continue past Refill / the print room toward the student lockers.',anchor:'BROCK_REFILL',confirm:'You should pass Refill / the print room.'},
    {action:'right',icon:'↱',text:'Turn right by the lockers and continue to the doors.',anchor:'BROCK_LOCKERS',confirm:'The student lockers should be beside you.'},
    {action:'outside',icon:'↗',text:'Exit through the doors into the quad.',anchor:'BROCK_LOCKER_DOORS',confirm:'You should now be outside in the quad.'},
    {action:'right',icon:'↱',text:'Turn right in the quad and head back toward Tech Support.',anchor:'BROCK_QUAD_LEFT',confirm:'Follow the outside route back toward Tech Support.'},
    {action:'enter',icon:'↗',text:'Re-enter the building toward Tech Support.',anchor:'BROCK_QUAD_EXIT_TECH',confirm:'You should be back by the Tech Support entrance.'},
    {action:'arrive',icon:'✓',text:'Arrive at B007 Tech Support.',anchor:'B007_DOOR',confirm:'You have reached Tech Support.'}
   ]
 }
};
const verticalEdges=[
 // Brock/Wyre east stair core: Ground -> Wyre First Floor.
 // These nodes sit immediately beside the stair landings shown on the college floorplan.
 {from:'ANN_Brock_G_21',to:'ANN_Brock_G_23',mode:'corridor',access:'public',stepFree:null,source:'floorplan-connector',instruction:'Continue to the stairwell beside W006.'},
 {from:'ANN_Brock_G_23',to:'ANN_Wyre_1_0',mode:'stairs',access:'public',stepFree:false,source:'floorplan-stair-core',instruction:'Take the stairs to the First Floor.',reverseInstruction:'Take the stairs down to the Ground Floor.'},
 {from:'ANN_Wyre_1_1',to:'ANN_Wyre_1_4',mode:'corridor',access:'public',stepFree:null,source:'floorplan-connector',instruction:'Leave the stair landing and join the Wyre First Floor corridor.',reverseInstruction:'Continue to the stair landing.'}
 {from:'ANN_Wyre_G_5',to:'WYRE_LIFT_G',mode:'corridor',access:'public',stepFree:true,source:'floorplan-connector',instruction:'Continue through FYi to the lift beside W002 / W003.',reverseInstruction:'Leave the lift and continue through FYi toward Brock.'},
 {from:'WYRE_LIFT_G',to:'WYRE_LIFT_1',mode:'lift',access:'public',stepFree:true,source:'floorplan-lift-core',instruction:'Take the lift to the First Floor.',reverseInstruction:'Take the lift down to the Ground Floor.'},
 {from:'WYRE_LIFT_1',to:'ANN_Wyre_1_15',mode:'corridor',access:'public',stepFree:true,source:'floorplan-connector',instruction:'Leave the lift and join the Wyre First Floor corridor.',reverseInstruction:'Continue to the Wyre lift.'}
];
const edges=[...annotatedEdges,...verticalEdges];
const restrictions=[
 {from:'B007',to:'B014',type:'staff-only',description:'The direct internal corridor between the Tech Support and Exams side is staff-only for students.'}
];
const surveyTypes=[
 {id:'entrance',label:'Entrance / door',icon:'↗'},
 {id:'junction',label:'Corridor junction',icon:'⌁'},
 {id:'stairs',label:'Stairs',icon:'⇅'},
 {id:'lift',label:'Lift',icon:'↕'},
 {id:'toilet',label:'Toilet',icon:'WC'},
 {id:'printer',label:'Printer / Refill',icon:'▣'},
 {id:'water',label:'Water refill',icon:'◌'},
 {id:'landmark',label:'Landmark',icon:'◉'}
];

window.CAMPUS_V6={image:{width:2560,height:1527,src:'floorplan.png',sourceDate:'September 2017'},floorViews,rooms,specialRoutes,routeTemplates,checkpoints,edges,restrictions,surveyTypes,departments:dep,places,intentGroups,tourUrl,tourScenes,roomTourScenes,tourMedia,annotatedSource,roomGuideHints};
window.CAMPUS_V5=window.CAMPUS_V6;
})();
