/* Campus data layer. Keep map coordinates in Leaflet CRS.Simple [y, x]. */
window.CAMPUS_DATA = {
  image: { width: 1024, height: 610, src: 'floorplan.png' },
  buildings: {
    'Wyre': [[130, 600], [600, 880]],
    'Calder': [[50, 80], [420, 500]],
    'Medlock': [[50, 250], [420, 600]],
    'Ribble': [[10, 0], [400, 260]],
    'Brock': [[300, 510], [600, 780]],
    'Holland': [[450, 380], [600, 560]],
    'Alt': [[250, 270], [500, 500]],
    'Sports Hall': [[100, 780], [450, 880]]
  },
  departments: [
    { name: 'Business & IT', color: '#1f8fff' },
    { name: 'English & MFL', color: '#f47b20' },
    { name: 'Humanities', color: '#ef8e72' },
    { name: 'Sport & Tourism', color: '#a12f69' },
    { name: 'Mathematics', color: '#c79a13' },
    { name: 'Performing Arts', color: '#4d5bd8' },
    { name: 'Science', color: '#db6f9e' },
    { name: 'Social Sciences', color: '#7a50c7' },
    { name: 'Visual Arts', color: '#e77a16' },
    { name: 'Administration', color: '#6f7782' },
    { name: 'Learning Resources', color: '#3d9bd6' }
  ],
  rooms: [
    { id:'C213', bldg:'Calder', floor:'2', dept:'Social Sciences', color:'#7a50c7', pos:[50,140] },
    { id:'C211', bldg:'Calder', floor:'2', dept:'Social Sciences', color:'#7a50c7', pos:[50,165] },
    { id:'C209', bldg:'Calder', floor:'2', dept:'Social Sciences', color:'#7a50c7', pos:[50,190] },
    { id:'C207', bldg:'Calder', floor:'2', dept:'Social Sciences', color:'#7a50c7', pos:[50,215] },
    { id:'C205', bldg:'Calder', floor:'2', dept:'Performing Arts', color:'#4d5bd8', pos:[50,240] },
    { id:'C203', bldg:'Calder', floor:'2', dept:'Performing Arts', color:'#4d5bd8', pos:[50,260] },
    { id:'C112', bldg:'Calder', floor:'1', dept:'English & MFL', color:'#f47b20', pos:[140,200] },
    { id:'C110', bldg:'Calder', floor:'1', dept:'English & MFL', color:'#f47b20', pos:[140,225] },
    { id:'C108', bldg:'Calder', floor:'1', dept:'Business & IT', color:'#1f8fff', pos:[140,255] },
    { id:'C106', bldg:'Calder', floor:'1', dept:'Business & IT', color:'#1f8fff', pos:[140,280] },
    { id:'C016', bldg:'Calder', floor:'G', dept:'Mathematics', color:'#c79a13', pos:[260,300] },
    { id:'C015', bldg:'Calder', floor:'G', dept:'Mathematics', color:'#c79a13', pos:[260,320] },
    { id:'C011', bldg:'Calder', floor:'G', dept:'Mathematics', color:'#c79a13', pos:[260,350] },
    { id:'M202', bldg:'Medlock', floor:'2', dept:'Administration', color:'#6f7782', pos:[50,300] },
    { id:'M204', bldg:'Medlock', floor:'2', dept:'Business & IT', color:'#1f8fff', pos:[50,340] },
    { id:'M205', bldg:'Medlock', floor:'2', dept:'Business & IT', color:'#1f8fff', pos:[50,360] },
    { id:'M209', bldg:'Medlock', floor:'2', dept:'Science', color:'#db6f9e', pos:[50,390] },
    { id:'M106', bldg:'Medlock', floor:'1', dept:'Administration', color:'#6f7782', pos:[140,390] },
    { id:'M109', bldg:'Medlock', floor:'1', dept:'Business & IT', color:'#1f8fff', pos:[140,425] },
    { id:'M110', bldg:'Medlock', floor:'1', dept:'Business & IT', color:'#1f8fff', pos:[140,445] },
    { id:'M114', bldg:'Medlock', floor:'1', dept:'Business & IT', color:'#1f8fff', pos:[140,475] },
    { id:'M005', bldg:'Medlock', floor:'G', dept:'Administration', color:'#6f7782', pos:[260,435] },
    { id:'M007', bldg:'Medlock', floor:'G', dept:'Administration', color:'#6f7782', pos:[260,520] },
    { id:'M009', bldg:'Medlock', floor:'G', dept:'Visual Arts', color:'#e77a16', pos:[220,545] },
    { id:'R214', bldg:'Ribble', floor:'2', dept:'Humanities', color:'#ef8e72', pos:[210,20] },
    { id:'R212', bldg:'Ribble', floor:'2', dept:'Humanities', color:'#ef8e72', pos:[170,20] },
    { id:'R210', bldg:'Ribble', floor:'2', dept:'Humanities', color:'#ef8e72', pos:[130,20] },
    { id:'R110', bldg:'Ribble', floor:'1', dept:'Mathematics', color:'#c79a13', pos:[250,115] },
    { id:'R112', bldg:'Ribble', floor:'1', dept:'Mathematics', color:'#c79a13', pos:[290,115] },
    { id:'R001', bldg:'Ribble', floor:'G', dept:'Administration', color:'#6f7782', pos:[330,205] },
    { id:'B110', bldg:'Brock', floor:'1', dept:'Sport & Tourism', color:'#a12f69', pos:[540,715] },
    { id:'B108', bldg:'Brock', floor:'1', dept:'Sport & Tourism', color:'#a12f69', pos:[540,665] },
    { id:'B105', bldg:'Brock', floor:'1', dept:'Sport & Tourism', color:'#a12f69', pos:[540,625] },
    { id:'B005', bldg:'Brock', floor:'G', dept:'Administration', color:'#6f7782', pos:[375,550] },
    { id:'B004', bldg:'Brock', floor:'G', dept:'Administration', color:'#6f7782', pos:[375,530] },
    { id:'W215', bldg:'Wyre', floor:'2', dept:'Sport & Tourism', color:'#a12f69', pos:[580,785] },
    { id:'W212', bldg:'Wyre', floor:'2', dept:'Science', color:'#db6f9e', pos:[500,835] },
    { id:'W211', bldg:'Wyre', floor:'2', dept:'Science', color:'#db6f9e', pos:[510,790] },
    { id:'W114', bldg:'Wyre', floor:'1', dept:'Business & IT', color:'#1f8fff', pos:[485,755] },
    { id:'W113', bldg:'Wyre', floor:'1', dept:'Sport & Tourism', color:'#a12f69', pos:[485,715] },
    { id:'W105', bldg:'Wyre', floor:'1', dept:'Visual Arts', color:'#e77a16', pos:[415,715] },
    { id:'W001', bldg:'Wyre', floor:'G', dept:'Learning Resources', color:'#3d9bd6', pos:[260,635] },
    { id:'H005', bldg:'Holland', floor:'G', dept:'Performing Arts', color:'#4d5bd8', pos:[520,420] },
    { id:'H001', bldg:'Holland', floor:'LG', dept:'Performing Arts', color:'#4d5bd8', pos:[520,500] },
    { id:'A202', bldg:'Alt', floor:'1', dept:'Administration', color:'#6f7782', pos:[380,320] },
    { id:'A101', bldg:'Alt', floor:'G', dept:'Administration', color:'#6f7782', pos:[310,470] },
    { id:'S001', bldg:'Sports Hall', floor:'G', dept:'Sport & Tourism', color:'#a12f69', pos:[200,830] }
  ],
  amenities: [
    { id:'PR_BROCK', type:'PRINTER', name:'Brock IT Printing Hub', pos:[375,540], bldg:'Brock', floor:'G' },
    { id:'PR_WYRE', type:'PRINTER', name:'Wyre Library Printer', pos:[260,650], bldg:'Wyre', floor:'G' },
    { id:'WA_CALDER', type:'WATER', name:'Calder Water Station', pos:[260,280], bldg:'Calder', floor:'G' },
    { id:'LI_MEDLOCK', type:'LIFT', name:'Medlock Main Lift', pos:[140,400], bldg:'Medlock', floor:'1' },
    { id:'LI_WYRE', type:'LIFT', name:'Wyre Lift Hub', pos:[485,735], bldg:'Wyre', floor:'1' },
    { id:'ST_WYRE', type:'STUDY', name:'Learning Resources Hub', pos:[260,635], bldg:'Wyre', floor:'G' }
  ],
  graph: {
    WYRE_CORRIDOR_G: { pos:[260,715], name:'Wyre Ground Corridor', edges:[
      {node:'WYRE_CORRIDOR_1',weight:1.2,type:'STAIRS'}, {node:'WYRE_LIFT',weight:1.1,type:'LIFT'} ] },
    WYRE_CORRIDOR_1: { pos:[450,715], name:'Wyre First Floor Hall', edges:[
      {node:'WYRE_CORRIDOR_G',weight:1.2,type:'STAIRS'}, {node:'WYRE_CORRIDOR_2',weight:1.2,type:'STAIRS'},
      {node:'CALDER_CORRIDOR_1',weight:2.5,type:'WALK'}, {node:'WYRE_LIFT',weight:1.1,type:'LIFT'} ] },
    WYRE_CORRIDOR_2: { pos:[540,785], name:'Wyre Second Floor Hall', edges:[
      {node:'WYRE_CORRIDOR_1',weight:1.2,type:'STAIRS'}, {node:'WYRE_LIFT',weight:1.1,type:'LIFT'} ] },
    WYRE_LIFT: { pos:[485,735], name:'Wyre Lift', edges:[
      {node:'WYRE_CORRIDOR_G',weight:1.1,type:'LIFT'}, {node:'WYRE_CORRIDOR_1',weight:1.1,type:'LIFT'}, {node:'WYRE_CORRIDOR_2',weight:1.1,type:'LIFT'} ] },
    CALDER_CORRIDOR_1: { pos:[140,300], name:'Calder First Floor Corridor', edges:[
      {node:'WYRE_CORRIDOR_1',weight:2.5,type:'WALK'}, {node:'CALDER_CORRIDOR_2',weight:1.2,type:'STAIRS'}, {node:'MEDLOCK_CORRIDOR_1',weight:1.6,type:'WALK'} ] },
    CALDER_CORRIDOR_2: { pos:[50,200], name:'Calder Second Floor Corridor', edges:[{node:'CALDER_CORRIDOR_1',weight:1.2,type:'STAIRS'}] },
    MEDLOCK_CORRIDOR_1: { pos:[140,450], name:'Medlock First Floor Corridor', edges:[
      {node:'CALDER_CORRIDOR_1',weight:1.6,type:'WALK'}, {node:'BROCK_CORRIDOR_1',weight:2.1,type:'WALK'} ] },
    BROCK_CORRIDOR_1: { pos:[540,650], name:'Brock Corridor', edges:[{node:'MEDLOCK_CORRIDOR_1',weight:2.1,type:'WALK'}] }
  },
  roomToNode: {
    W105:'WYRE_CORRIDOR_1', W113:'WYRE_CORRIDOR_1', W114:'WYRE_CORRIDOR_1',
    W211:'WYRE_CORRIDOR_2', W212:'WYRE_CORRIDOR_2', W215:'WYRE_CORRIDOR_2', W001:'WYRE_CORRIDOR_G',
    C112:'CALDER_CORRIDOR_1', C110:'CALDER_CORRIDOR_1', C108:'CALDER_CORRIDOR_1', C106:'CALDER_CORRIDOR_1',
    C213:'CALDER_CORRIDOR_2', C211:'CALDER_CORRIDOR_2', C209:'CALDER_CORRIDOR_2', C207:'CALDER_CORRIDOR_2', C205:'CALDER_CORRIDOR_2', C203:'CALDER_CORRIDOR_2',
    C016:'CALDER_CORRIDOR_1', C015:'CALDER_CORRIDOR_1', C011:'CALDER_CORRIDOR_1',
    M109:'MEDLOCK_CORRIDOR_1', M110:'MEDLOCK_CORRIDOR_1', M114:'MEDLOCK_CORRIDOR_1', M106:'MEDLOCK_CORRIDOR_1',
    M202:'MEDLOCK_CORRIDOR_1', M204:'MEDLOCK_CORRIDOR_1', M205:'MEDLOCK_CORRIDOR_1', M209:'MEDLOCK_CORRIDOR_1',
    M005:'MEDLOCK_CORRIDOR_1', M007:'MEDLOCK_CORRIDOR_1', M009:'MEDLOCK_CORRIDOR_1',
    B105:'BROCK_CORRIDOR_1', B108:'BROCK_CORRIDOR_1', B110:'BROCK_CORRIDOR_1', B004:'BROCK_CORRIDOR_1', B005:'BROCK_CORRIDOR_1',
    R214:'CALDER_CORRIDOR_2', R212:'CALDER_CORRIDOR_2', R210:'CALDER_CORRIDOR_2', R110:'CALDER_CORRIDOR_1', R112:'CALDER_CORRIDOR_1', R001:'CALDER_CORRIDOR_1',
    H005:'WYRE_CORRIDOR_G', H001:'WYRE_CORRIDOR_G', A202:'CALDER_CORRIDOR_1', A101:'CALDER_CORRIDOR_1', S001:'WYRE_CORRIDOR_G'
  }
};