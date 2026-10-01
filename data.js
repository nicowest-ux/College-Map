(() => {
const dep={admin:'#737b88',business:'#16a5c7',english:'#f47b20',humanities:'#ef8e72',sport:'#a12f69',maths:'#c79a13',arts:'#4d5bd8',science:'#df74a6',social:'#7a50c7',visual:'#e77a16',learning:'#4aa8d8'};
const floorViews={
 'Ribble|G':{bounds:[[255,430],[1090,700]]},'Ribble|1':{bounds:[[610,125],[1320,460]]},'Ribble|2':{bounds:[[900,0],[1527,250]]},
 'Calder|G':{bounds:[[750,430],[1125,1130]]},'Calder|1':{bounds:[[1070,180],[1415,930]]},'Calder|2':{bounds:[[1300,170],[1527,780]]},
 'Medlock|G':{bounds:[[760,1040],[1130,1610]]},'Medlock|1':{bounds:[[1060,900],[1410,1420]]},'Medlock|2':{bounds:[[1300,700],[1527,1165]]},
 'Alt|G':{bounds:[[400,800],[850,1380]]},'Alt|1':{bounds:[[200,760],[650,970]]},
 'Brock|G':{bounds:[[380,1080],[880,1810]]},'Brock|1':{bounds:[[0,1450],[550,2020]]},
 'Holland|LG':{bounds:[[0,1200],[240,1510]]},'Holland|G':{bounds:[[40,950],[390,1510]]},
 'Wyre|G':{bounds:[[500,1500],[1120,1870]]},'Wyre|1':{bounds:[[0,1740],[790,2145]]},'Wyre|2':{bounds:[[0,1930],[520,2260]]},
 'Sports Hall|G':{bounds:[[760,1880],[1320,2260]]},'Sports Hall|1':{bounds:[[760,1870],[1320,2040]]}
};
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
window.CAMPUS_V5={image:{width:2560,height:1527,src:'floorplan.png'},floorViews,rooms,specialRoutes,departments:dep};
})();
