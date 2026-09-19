/**
 * Comprehensive Registry of Indian Coastal Fishing Harbors,
 * Major Fish Landing Centers, and Maritime Ports.
 * Grouped across 13 Maritime States and Union Territories.
 */

export const COASTAL_STATES = [
  'All States / UTs',
  'Gujarat',
  'Maharashtra',
  'Goa',
  'Karnataka',
  'Kerala',
  'Tamil Nadu',
  'Andhra Pradesh',
  'Odisha',
  'West Bengal',
  'Puducherry',
  'Andaman & Nicobar Islands',
  'Lakshadweep',
  'Daman & Diu'
]

export const COASTAL_LOCATIONS = [
  // 1. Gujarat
  {
    id: 'veraval',
    name: 'Veraval',
    state: 'Gujarat',
    coast: 'Saurashtra Coast',
    lat: 20.9077,
    lng: 70.3679,
    type: 'Major Fishing Harbor',
    coordinatesStr: '20.9077 N · 70.3679 E',
    mapPosition: { x: 42, y: 35 }
  },
  {
    id: 'mangrol',
    name: 'Mangrol',
    state: 'Gujarat',
    coast: 'Saurashtra Coast',
    lat: 21.1215,
    lng: 70.1165,
    type: 'Fishing Harbor',
    coordinatesStr: '21.1215 N · 70.1165 E',
    mapPosition: { x: 41, y: 34 }
  },
  {
    id: 'porbandar',
    name: 'Porbandar',
    state: 'Gujarat',
    coast: 'Saurashtra Coast',
    lat: 21.6417,
    lng: 69.6293,
    type: 'Major Fishing Port',
    coordinatesStr: '21.6417 N · 69.6293 E',
    mapPosition: { x: 40, y: 32 }
  },
  {
    id: 'okha',
    name: 'Okha',
    state: 'Gujarat',
    coast: 'Gulf of Kutch',
    lat: 22.4667,
    lng: 69.0667,
    type: 'Fishing Harbor & Port',
    coordinatesStr: '22.4667 N · 69.0667 E',
    mapPosition: { x: 38, y: 30 }
  },
  {
    id: 'jakhau',
    name: 'Jakhau',
    state: 'Gujarat',
    coast: 'Kutch Coast',
    lat: 23.2386,
    lng: 68.7058,
    type: 'Major Fishing Harbor',
    coordinatesStr: '23.2386 N · 68.7058 E',
    mapPosition: { x: 37, y: 28 }
  },
  {
    id: 'dholai',
    name: 'Dholai',
    state: 'Gujarat',
    coast: 'South Gujarat Coast',
    lat: 20.8038,
    lng: 72.8797,
    type: 'Fish Landing Center',
    coordinatesStr: '20.8038 N · 72.8797 E',
    mapPosition: { x: 44, y: 36 }
  },
  {
    id: 'madhwad',
    name: 'Madhwad',
    state: 'Gujarat',
    coast: 'Saurashtra Coast',
    lat: 20.7308,
    lng: 70.5908,
    type: 'Fish Landing Center',
    coordinatesStr: '20.7308 N · 70.5908 E',
    mapPosition: { x: 42, y: 36 }
  },
  {
    id: 'dwarka',
    name: 'Dwarka',
    state: 'Gujarat',
    coast: 'Arabian Sea',
    lat: 22.2442,
    lng: 68.9685,
    type: 'Coastal Landing Center',
    coordinatesStr: '22.2442 N · 68.9685 E',
    mapPosition: { x: 39, y: 31 }
  },
  {
    id: 'mandvi',
    name: 'Mandvi',
    state: 'Gujarat',
    coast: 'Gulf of Kutch',
    lat: 22.8333,
    lng: 69.3558,
    type: 'Traditional Fishing Port',
    coordinatesStr: '22.8333 N · 69.3558 E',
    mapPosition: { x: 38, y: 29 }
  },

  // 2. Maharashtra
  {
    id: 'mumbai',
    name: 'Mumbai / Sassoon Dock',
    state: 'Maharashtra',
    coast: 'Konkan Coast',
    lat: 18.9167,
    lng: 72.8222,
    type: 'Major Fishing Harbor',
    coordinatesStr: '18.9167 N · 72.8222 E',
    mapPosition: { x: 45, y: 44 }
  },
  {
    id: 'versova',
    name: 'Versova',
    state: 'Maharashtra',
    coast: 'Konkan Coast',
    lat: 19.1353,
    lng: 72.8136,
    type: 'Major Fish Landing Center',
    coordinatesStr: '19.1353 N · 72.8136 E',
    mapPosition: { x: 45, y: 43 }
  },
  {
    id: 'karanja',
    name: 'Karanja',
    state: 'Maharashtra',
    coast: 'Konkan Coast',
    lat: 18.8647,
    lng: 72.9344,
    type: 'Fishing Harbor',
    coordinatesStr: '18.8647 N · 72.9344 E',
    mapPosition: { x: 46, y: 44 }
  },
  {
    id: 'ratnagiri',
    name: 'Ratnagiri',
    state: 'Maharashtra',
    coast: 'Konkan Coast',
    lat: 16.9902,
    lng: 73.3120,
    type: 'Major Fishing Harbor',
    coordinatesStr: '16.9902 N · 73.3120 E',
    mapPosition: { x: 46, y: 48 }
  },
  {
    id: 'jaigarh',
    name: 'Jaigarh',
    state: 'Maharashtra',
    coast: 'Konkan Coast',
    lat: 17.2989,
    lng: 73.2089,
    type: 'Coastal Fishing Port',
    coordinatesStr: '17.2989 N · 73.2089 E',
    mapPosition: { x: 46, y: 47 }
  },
  {
    id: 'dighi',
    name: 'Dighi',
    state: 'Maharashtra',
    coast: 'Konkan Coast',
    lat: 18.2833,
    lng: 72.9833,
    type: 'Fishing Harbor & Port',
    coordinatesStr: '18.2833 N · 72.9833 E',
    mapPosition: { x: 46, y: 45 }
  },
  {
    id: 'dahanu',
    name: 'Dahanu',
    state: 'Maharashtra',
    coast: 'North Konkan Coast',
    lat: 19.9729,
    lng: 72.7317,
    type: 'Fish Landing Center',
    coordinatesStr: '19.9729 N · 72.7317 E',
    mapPosition: { x: 45, y: 41 }
  },
  {
    id: 'satpati',
    name: 'Satpati',
    state: 'Maharashtra',
    coast: 'North Konkan Coast',
    lat: 19.7333,
    lng: 72.7000,
    type: 'Major Fishing Village/Harbor',
    coordinatesStr: '19.7333 N · 72.7000 E',
    mapPosition: { x: 45, y: 42 }
  },
  {
    id: 'revas',
    name: 'Revas',
    state: 'Maharashtra',
    coast: 'Konkan Coast',
    lat: 18.7833,
    lng: 72.9500,
    type: 'Fish Landing Center',
    coordinatesStr: '18.7833 N · 72.9500 E',
    mapPosition: { x: 46, y: 44 }
  },
  {
    id: 'deogad',
    name: 'Deogad',
    state: 'Maharashtra',
    coast: 'South Konkan Coast',
    lat: 16.3769,
    lng: 73.3764,
    type: 'Fishing Harbor',
    coordinatesStr: '16.3769 N · 73.3764 E',
    mapPosition: { x: 47, y: 50 }
  },
  {
    id: 'alibag',
    name: 'Alibag',
    state: 'Maharashtra',
    coast: 'Konkan Coast',
    lat: 18.6414,
    lng: 72.8722,
    type: 'Coastal Landing Center',
    coordinatesStr: '18.6414 N · 72.8722 E',
    mapPosition: { x: 45, y: 44 }
  },
  {
    id: 'malvan',
    name: 'Malvan',
    state: 'Maharashtra',
    coast: 'South Konkan Coast',
    lat: 16.0592,
    lng: 73.4686,
    type: 'Major Fishing Harbor',
    coordinatesStr: '16.0592 N · 73.4686 E',
    mapPosition: { x: 47, y: 51 }
  },

  // 3. Goa
  {
    id: 'panaji',
    name: 'Panaji',
    state: 'Goa',
    coast: 'Goa Coast',
    lat: 15.4909,
    lng: 73.8278,
    type: 'Coastal Port / Landing',
    coordinatesStr: '15.4909 N · 73.8278 E',
    mapPosition: { x: 47, y: 52 }
  },
  {
    id: 'vasco_da_gama',
    name: 'Vasco da Gama',
    state: 'Goa',
    coast: 'Goa Coast',
    lat: 15.3982,
    lng: 73.8113,
    type: 'Major Port & Fishery Base',
    coordinatesStr: '15.3982 N · 73.8113 E',
    mapPosition: { x: 47, y: 53 }
  },
  {
    id: 'cutbona',
    name: 'Cutbona',
    state: 'Goa',
    coast: 'South Goa Coast',
    lat: 15.1583,
    lng: 73.9472,
    type: 'Major Fishing Harbor',
    coordinatesStr: '15.1583 N · 73.9472 E',
    mapPosition: { x: 47, y: 53 }
  },
  {
    id: 'chapora',
    name: 'Chapora',
    state: 'Goa',
    coast: 'North Goa Coast',
    lat: 15.6047,
    lng: 73.7386,
    type: 'Fish Landing Jetty',
    coordinatesStr: '15.6047 N · 73.7386 E',
    mapPosition: { x: 47, y: 52 }
  },
  {
    id: 'betul',
    name: 'Betul',
    state: 'Goa',
    coast: 'South Goa Coast',
    lat: 15.1436,
    lng: 73.9556,
    type: 'Fishing Port',
    coordinatesStr: '15.1436 N · 73.9556 E',
    mapPosition: { x: 47, y: 53 }
  },
  {
    id: 'malim',
    name: 'Malim',
    state: 'Goa',
    coast: 'Goa Coast',
    lat: 15.5033,
    lng: 73.8378,
    type: 'Major Fish Landing Jetty',
    coordinatesStr: '15.5033 N · 73.8378 E',
    mapPosition: { x: 47, y: 52 }
  },

  // 4. Karnataka
  {
    id: 'mangalore',
    name: 'Mangalore',
    state: 'Karnataka',
    coast: 'Canara Coast',
    lat: 12.9141,
    lng: 74.8560,
    type: 'Major Fishing Harbor & Port',
    coordinatesStr: '12.9141 N · 74.8560 E',
    mapPosition: { x: 48, y: 59 }
  },
  {
    id: 'malpe',
    name: 'Malpe',
    state: 'Karnataka',
    coast: 'Canara Coast',
    lat: 13.3524,
    lng: 74.7042,
    type: 'Major All-Weather Fishing Harbor',
    coordinatesStr: '13.3524 N · 74.7042 E',
    mapPosition: { x: 48, y: 58 }
  },
  {
    id: 'gangolli',
    name: 'Gangolli',
    state: 'Karnataka',
    coast: 'Canara Coast',
    lat: 13.6333,
    lng: 74.6667,
    type: 'Major Fishing Harbor',
    coordinatesStr: '13.6333 N · 74.6667 E',
    mapPosition: { x: 48, y: 57 }
  },
  {
    id: 'bhatkal',
    name: 'Bhatkal',
    state: 'Karnataka',
    coast: 'Canara Coast',
    lat: 13.9786,
    lng: 74.5528,
    type: 'Fishing Harbor',
    coordinatesStr: '13.9786 N · 74.5528 E',
    mapPosition: { x: 48, y: 56 }
  },
  {
    id: 'karwar',
    name: 'Karwar',
    state: 'Karnataka',
    coast: 'North Canara Coast',
    lat: 14.8135,
    lng: 74.1297,
    type: 'Major Fishing Harbor & Naval Base',
    coordinatesStr: '14.8135 N · 74.1297 E',
    mapPosition: { x: 47, y: 54 }
  },
  {
    id: 'honnavar',
    name: 'Honnavar',
    state: 'Karnataka',
    coast: 'Canara Coast',
    lat: 14.2800,
    lng: 74.4500,
    type: 'Fishing Harbor',
    coordinatesStr: '14.2800 N · 74.4500 E',
    mapPosition: { x: 48, y: 55 }
  },
  {
    id: 'kundapura',
    name: 'Kundapura',
    state: 'Karnataka',
    coast: 'Canara Coast',
    lat: 13.6269,
    lng: 74.6917,
    type: 'Fish Landing Center',
    coordinatesStr: '13.6269 N · 74.6917 E',
    mapPosition: { x: 48, y: 57 }
  },
  {
    id: 'belikeri',
    name: 'Belikeri',
    state: 'Karnataka',
    coast: 'North Canara Coast',
    lat: 14.7167,
    lng: 74.2667,
    type: 'Fishing Port',
    coordinatesStr: '14.7167 N · 74.2667 E',
    mapPosition: { x: 47, y: 54 }
  },

  // 5. Kerala
  {
    id: 'kochi',
    name: 'Kochi',
    state: 'Kerala',
    coast: 'Malabar Coast',
    lat: 9.9312,
    lng: 76.2673,
    type: 'Major Fishing Harbor & Port',
    coordinatesStr: '9.9312 N · 76.2673 E',
    mapPosition: { x: 50, y: 66 }
  },
  {
    id: 'beypore',
    name: 'Beypore',
    state: 'Kerala',
    coast: 'Malabar Coast',
    lat: 11.1783,
    lng: 75.8083,
    type: 'Major Fishing Harbor',
    coordinatesStr: '11.1783 N · 75.8083 E',
    mapPosition: { x: 49, y: 63 }
  },
  {
    id: 'ponnani',
    name: 'Ponnani',
    state: 'Kerala',
    coast: 'Malabar Coast',
    lat: 10.7667,
    lng: 75.9250,
    type: 'Major Fishing Harbor',
    coordinatesStr: '10.7667 N · 75.9250 E',
    mapPosition: { x: 49, y: 64 }
  },
  {
    id: 'neendakara',
    name: 'Neendakara',
    state: 'Kerala',
    coast: 'South Malabar Coast',
    lat: 8.9333,
    lng: 76.5333,
    type: 'Major Trawling Fishing Harbor',
    coordinatesStr: '8.9333 N · 76.5333 E',
    mapPosition: { x: 50, y: 68 }
  },
  {
    id: 'vizhinjam',
    name: 'Vizhinjam',
    state: 'Kerala',
    coast: 'South Kerala Coast',
    lat: 8.3833,
    lng: 76.9833,
    type: 'International Seaport & Fishing Harbor',
    coordinatesStr: '8.3833 N · 76.9833 E',
    mapPosition: { x: 51, y: 70 }
  },
  {
    id: 'azhikode',
    name: 'Azhikode',
    state: 'Kerala',
    coast: 'Malabar Coast',
    lat: 10.1983,
    lng: 76.1617,
    type: 'Munambam-Azhikode Harbor',
    coordinatesStr: '10.1983 N · 76.1617 E',
    mapPosition: { x: 50, y: 65 }
  },
  {
    id: 'munambam',
    name: 'Munambam',
    state: 'Kerala',
    coast: 'Malabar Coast',
    lat: 10.1833,
    lng: 76.1667,
    type: 'Major Deep-Sea Fishing Harbor',
    coordinatesStr: '10.1833 N · 76.1667 E',
    mapPosition: { x: 50, y: 65 }
  },
  {
    id: 'kasaragod',
    name: 'Kasaragod',
    state: 'Kerala',
    coast: 'North Malabar Coast',
    lat: 12.5000,
    lng: 74.9833,
    type: 'Fish Landing Center',
    coordinatesStr: '12.5000 N · 74.9833 E',
    mapPosition: { x: 49, y: 60 }
  },
  {
    id: 'kollam',
    name: 'Kollam',
    state: 'Kerala',
    coast: 'South Malabar Coast',
    lat: 8.8853,
    lng: 76.5864,
    type: 'Major Fishery Base',
    coordinatesStr: '8.8853 N · 76.5864 E',
    mapPosition: { x: 50, y: 69 }
  },
  {
    id: 'alappuzha',
    name: 'Alappuzha',
    state: 'Kerala',
    coast: 'Malabar Coast',
    lat: 9.4981,
    lng: 76.3388,
    type: 'Coastal Fish Landing Center',
    coordinatesStr: '9.4981 N · 76.3388 E',
    mapPosition: { x: 50, y: 67 }
  },

  // 6. Tamil Nadu
  {
    id: 'chennai',
    name: 'Chennai / Kasimedu',
    state: 'Tamil Nadu',
    coast: 'Coromandel Coast',
    lat: 13.1256,
    lng: 80.2978,
    type: 'Major Fishing Harbor',
    coordinatesStr: '13.1256 N · 80.2978 E',
    mapPosition: { x: 55, y: 58 }
  },
  {
    id: 'cuddalore',
    name: 'Cuddalore',
    state: 'Tamil Nadu',
    coast: 'Coromandel Coast',
    lat: 11.7480,
    lng: 79.7714,
    type: 'Major Fishing Harbor',
    coordinatesStr: '11.7480 N · 79.7714 E',
    mapPosition: { x: 54, y: 61 }
  },
  {
    id: 'nagapattinam',
    name: 'Nagapattinam',
    state: 'Tamil Nadu',
    coast: 'Coromandel Coast',
    lat: 10.7672,
    lng: 79.8422,
    type: 'Major Fishing Harbor',
    coordinatesStr: '10.7672 N · 79.8422 E',
    mapPosition: { x: 54, y: 63 }
  },
  {
    id: 'pazhayar',
    name: 'Pazhayar',
    state: 'Tamil Nadu',
    coast: 'Coromandel Coast',
    lat: 11.3600,
    lng: 79.8286,
    type: 'Major Fishing Harbor',
    coordinatesStr: '11.3600 N · 79.8286 E',
    mapPosition: { x: 54, y: 62 }
  },
  {
    id: 'rameswaram',
    name: 'Rameswaram',
    state: 'Tamil Nadu',
    coast: 'Palk Bay / Gulf of Mannar',
    lat: 9.2876,
    lng: 79.3129,
    type: 'Major Fishing Base',
    coordinatesStr: '9.2876 N · 79.3129 E',
    mapPosition: { x: 53, y: 67 }
  },
  {
    id: 'mandapam',
    name: 'Mandapam',
    state: 'Tamil Nadu',
    coast: 'Gulf of Mannar',
    lat: 9.2783,
    lng: 79.1256,
    type: 'Marine Fishery Center',
    coordinatesStr: '9.2783 N · 79.1256 E',
    mapPosition: { x: 53, y: 67 }
  },
  {
    id: 'pamban',
    name: 'Pamban',
    state: 'Tamil Nadu',
    coast: 'Palk Strait',
    lat: 9.2817,
    lng: 79.2139,
    type: 'Fish Landing Center',
    coordinatesStr: '9.2817 N · 79.2139 E',
    mapPosition: { x: 53, y: 67 }
  },
  {
    id: 'thoothukudi',
    name: 'Thoothukudi',
    state: 'Tamil Nadu',
    coast: 'Gulf of Mannar',
    lat: 8.7642,
    lng: 78.1348,
    type: 'Major Fishing Harbor & Port',
    coordinatesStr: '8.7642 N · 78.1348 E',
    mapPosition: { x: 52, y: 69 }
  },
  {
    id: 'chinnamuttam',
    name: 'Chinnamuttam',
    state: 'Tamil Nadu',
    coast: 'Indian Ocean Confluence',
    lat: 8.0933,
    lng: 77.5617,
    type: 'Major Fishing Harbor',
    coordinatesStr: '8.0933 N · 77.5617 E',
    mapPosition: { x: 51, y: 71 }
  },
  {
    id: 'kanyakumari',
    name: 'Kanyakumari',
    state: 'Tamil Nadu',
    coast: 'Cape Comorin',
    lat: 8.0883,
    lng: 77.5385,
    type: 'Fish Landing Center',
    coordinatesStr: '8.0883 N · 77.5385 E',
    mapPosition: { x: 51, y: 71 }
  },
  {
    id: 'colachel',
    name: 'Colachel',
    state: 'Tamil Nadu',
    coast: 'West Coast / Arabian Sea',
    lat: 8.1764,
    lng: 77.2561,
    type: 'Major Fishing Harbor',
    coordinatesStr: '8.1764 N · 77.2561 E',
    mapPosition: { x: 51, y: 70 }
  },

  // 7. Andhra Pradesh
  {
    id: 'visakhapatnam',
    name: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    coast: 'East Coast',
    lat: 17.6868,
    lng: 83.2185,
    type: 'Major Fishing Harbor & Port',
    coordinatesStr: '17.6868 N · 83.2185 E',
    mapPosition: { x: 60, y: 47 }
  },
  {
    id: 'kakinada',
    name: 'Kakinada',
    state: 'Andhra Pradesh',
    coast: 'East Coast / Godavari Delta',
    lat: 16.9891,
    lng: 82.2475,
    type: 'Major Deep-Sea Fishing Harbor',
    coordinatesStr: '16.9891 N · 82.2475 E',
    mapPosition: { x: 59, y: 49 }
  },
  {
    id: 'uppada',
    name: 'Uppada',
    state: 'Andhra Pradesh',
    coast: 'East Coast',
    lat: 17.0867,
    lng: 82.3275,
    type: 'Major Fish Landing Center',
    coordinatesStr: '17.0867 N · 82.3275 E',
    mapPosition: { x: 59, y: 48 }
  },
  {
    id: 'machilipatnam',
    name: 'Machilipatnam',
    state: 'Andhra Pradesh',
    coast: 'Krishna Delta Coast',
    lat: 16.1800,
    lng: 81.1300,
    type: 'Major Fishing Harbor',
    coordinatesStr: '16.1800 N · 81.1300 E',
    mapPosition: { x: 58, y: 51 }
  },
  {
    id: 'nizampatnam',
    name: 'Nizampatnam',
    state: 'Andhra Pradesh',
    coast: 'Krishna Delta',
    lat: 15.9083,
    lng: 80.6722,
    type: 'Major Fishing Harbor',
    coordinatesStr: '15.9083 N · 80.6722 E',
    mapPosition: { x: 57, y: 52 }
  },
  {
    id: 'vodarevu',
    name: 'Vodarevu',
    state: 'Andhra Pradesh',
    coast: 'East Coast',
    lat: 15.7833,
    lng: 80.3667,
    type: 'Fish Landing Center',
    coordinatesStr: '15.7833 N · 80.3667 E',
    mapPosition: { x: 56, y: 52 }
  },
  {
    id: 'kothapatnam',
    name: 'Kothapatnam',
    state: 'Andhra Pradesh',
    coast: 'East Coast',
    lat: 15.4667,
    lng: 80.1333,
    type: 'Fish Landing Center',
    coordinatesStr: '15.4667 N · 80.1333 E',
    mapPosition: { x: 56, y: 53 }
  },
  {
    id: 'juvvaladinne',
    name: 'Juvvaladinne',
    state: 'Andhra Pradesh',
    coast: 'Nellore Coast',
    lat: 14.9000,
    lng: 80.0500,
    type: 'Modern Fishing Harbor',
    coordinatesStr: '14.9000 N · 80.0500 E',
    mapPosition: { x: 56, y: 54 }
  },
  {
    id: 'budagatlapalem',
    name: 'Budagatlapalem',
    state: 'Andhra Pradesh',
    coast: 'North Andhra Coast',
    lat: 18.2333,
    lng: 83.9833,
    type: 'Fish Landing Center',
    coordinatesStr: '18.2333 N · 83.9833 E',
    mapPosition: { x: 61, y: 46 }
  },
  {
    id: 'pudimadaka',
    name: 'Pudimadaka',
    state: 'Andhra Pradesh',
    coast: 'East Coast',
    lat: 17.4917,
    lng: 83.0083,
    type: 'Fishing Village / Landing Center',
    coordinatesStr: '17.4917 N · 83.0083 E',
    mapPosition: { x: 60, y: 48 }
  },

  // 8. Odisha
  {
    id: 'paradip',
    name: 'Paradip',
    state: 'Odisha',
    coast: 'Odisha Coast',
    lat: 20.3165,
    lng: 86.6115,
    type: 'Major Fishing Harbor & Port',
    coordinatesStr: '20.3165 N · 86.6115 E',
    mapPosition: { x: 64, y: 40 }
  },
  {
    id: 'dhamra',
    name: 'Dhamra',
    state: 'Odisha',
    coast: 'North Odisha Coast',
    lat: 20.8033,
    lng: 86.9633,
    type: 'Major Fishing Harbor & Port',
    coordinatesStr: '20.8033 N · 86.9633 E',
    mapPosition: { x: 65, y: 39 }
  },
  {
    id: 'gopalpur',
    name: 'Gopalpur',
    state: 'Odisha',
    coast: 'South Odisha Coast',
    lat: 19.2600,
    lng: 84.9100,
    type: 'Fishing Port & Landing Center',
    coordinatesStr: '19.2600 N · 84.9100 E',
    mapPosition: { x: 62, y: 43 }
  },
  {
    id: 'chandipur',
    name: 'Chandipur',
    state: 'Odisha',
    coast: 'Balasore Coast',
    lat: 21.4700,
    lng: 87.0200,
    type: 'Fish Landing Center',
    coordinatesStr: '21.4700 N · 87.0200 E',
    mapPosition: { x: 65, y: 37 }
  },
  {
    id: 'balasore',
    name: 'Balasore',
    state: 'Odisha',
    coast: 'North Odisha Coast',
    lat: 21.5033,
    lng: 86.9250,
    type: 'Marine Fish Hub',
    coordinatesStr: '21.5033 N · 86.9250 E',
    mapPosition: { x: 65, y: 37 }
  },
  {
    id: 'bahabalpur',
    name: 'Bahabalpur',
    state: 'Odisha',
    coast: 'North Odisha Coast',
    lat: 21.5667,
    lng: 87.0500,
    type: 'Fish Landing Center',
    coordinatesStr: '21.5667 N · 87.0500 E',
    mapPosition: { x: 65, y: 36 }
  },
  {
    id: 'kharinasi',
    name: 'Kharinasi',
    state: 'Odisha',
    coast: 'Mahanadi Estuary',
    lat: 20.4833,
    lng: 86.7333,
    type: 'Fish Landing Center',
    coordinatesStr: '20.4833 N · 86.7333 E',
    mapPosition: { x: 64, y: 40 }
  },
  {
    id: 'nuagarh',
    name: 'Nuagarh',
    state: 'Odisha',
    coast: 'Astaranga / Puri Coast',
    lat: 19.8667,
    lng: 85.8333,
    type: 'Fishing Harbor (Astaranga)',
    coordinatesStr: '19.8667 N · 85.8333 E',
    mapPosition: { x: 63, y: 41 }
  },

  // 9. West Bengal
  {
    id: 'digha',
    name: 'Digha',
    state: 'West Bengal',
    coast: 'Bengal Coast',
    lat: 21.6266,
    lng: 87.5074,
    type: 'Major Fishing Harbor',
    coordinatesStr: '21.6266 N · 87.5074 E',
    mapPosition: { x: 66, y: 36 }
  },
  {
    id: 'shankarpur',
    name: 'Shankarpur',
    state: 'West Bengal',
    coast: 'Bengal Coast',
    lat: 21.6367,
    lng: 87.5700,
    type: 'Major Fishing Harbor',
    coordinatesStr: '21.6367 N · 87.5700 E',
    mapPosition: { x: 66, y: 36 }
  },
  {
    id: 'fraserganj',
    name: 'Fraserganj',
    state: 'West Bengal',
    coast: 'Sundarbans Coast',
    lat: 21.5833,
    lng: 88.2500,
    type: 'Major Fishing Harbor',
    coordinatesStr: '21.5833 N · 88.2500 E',
    mapPosition: { x: 67, y: 36 }
  },
  {
    id: 'namkhana',
    name: 'Namkhana',
    state: 'West Bengal',
    coast: 'Sundarbans Estuary',
    lat: 21.7667,
    lng: 88.2333,
    type: 'Fish Landing Center',
    coordinatesStr: '21.7667 N · 88.2333 E',
    mapPosition: { x: 67, y: 35 }
  },
  {
    id: 'kakdwip',
    name: 'Kakdwip',
    state: 'West Bengal',
    coast: 'Hooghly Estuary',
    lat: 21.8767,
    lng: 88.1883,
    type: 'Major Fish Landing & Trawler Base',
    coordinatesStr: '21.8767 N · 88.1883 E',
    mapPosition: { x: 67, y: 35 }
  },
  {
    id: 'sagar',
    name: 'Sagar Island',
    state: 'West Bengal',
    coast: 'Hooghly Estuary',
    lat: 21.6500,
    lng: 88.0833,
    type: 'Fish Landing Center',
    coordinatesStr: '21.6500 N · 88.0833 E',
    mapPosition: { x: 67, y: 36 }
  },
  {
    id: 'diamond_harbour',
    name: 'Diamond Harbour',
    state: 'West Bengal',
    coast: 'Hooghly River Approach',
    lat: 22.1900,
    lng: 88.2000,
    type: 'Riverine Fishing Port',
    coordinatesStr: '22.1900 N · 88.2000 E',
    mapPosition: { x: 67, y: 34 }
  },

  // 10. Puducherry
  {
    id: 'puducherry',
    name: 'Puducherry',
    state: 'Puducherry',
    coast: 'Coromandel Coast',
    lat: 11.9416,
    lng: 79.8083,
    type: 'Major Fishing Harbor',
    coordinatesStr: '11.9416 N · 79.8083 E',
    mapPosition: { x: 55, y: 60 }
  },
  {
    id: 'karaikal',
    name: 'Karaikal',
    state: 'Puducherry',
    coast: 'Coromandel Coast',
    lat: 10.9254,
    lng: 79.8380,
    type: 'Major Fishing Harbor',
    coordinatesStr: '10.9254 N · 79.8380 E',
    mapPosition: { x: 54, y: 63 }
  },
  {
    id: 'mahe',
    name: 'Mahe',
    state: 'Puducherry',
    coast: 'Malabar Coast (Enclave)',
    lat: 11.7000,
    lng: 75.5333,
    type: 'Fish Landing Center',
    coordinatesStr: '11.7000 N · 75.5333 E',
    mapPosition: { x: 49, y: 62 }
  },
  {
    id: 'yanam',
    name: 'Yanam',
    state: 'Puducherry',
    coast: 'Godavari Delta (Enclave)',
    lat: 16.7333,
    lng: 82.2167,
    type: 'Estuarine Fish Landing Center',
    coordinatesStr: '16.7333 N · 82.2167 E',
    mapPosition: { x: 59, y: 49 }
  },

  // 11. Andaman & Nicobar Islands
  {
    id: 'port_blair',
    name: 'Port Blair',
    state: 'Andaman & Nicobar Islands',
    coast: 'Andaman Sea',
    lat: 11.6233,
    lng: 92.7265,
    type: 'Major Fishery Port & Island Capital',
    coordinatesStr: '11.6233 N · 92.7265 E',
    mapPosition: { x: 78, y: 62 }
  },
  {
    id: 'junglighat',
    name: 'Junglighat',
    state: 'Andaman & Nicobar Islands',
    coast: 'South Andaman',
    lat: 11.6583,
    lng: 92.7306,
    type: 'Major Fishing Jetty',
    coordinatesStr: '11.6583 N · 92.7306 E',
    mapPosition: { x: 78, y: 62 }
  },
  {
    id: 'haddo',
    name: 'Haddo',
    state: 'Andaman & Nicobar Islands',
    coast: 'South Andaman',
    lat: 11.6750,
    lng: 92.7208,
    type: 'Fishery Wharf',
    coordinatesStr: '11.6750 N · 92.7208 E',
    mapPosition: { x: 78, y: 62 }
  },
  {
    id: 'campbell_bay',
    name: 'Campbell Bay',
    state: 'Andaman & Nicobar Islands',
    coast: 'Great Nicobar',
    lat: 6.9983,
    lng: 93.9283,
    type: 'Southern Island Fishery Station',
    coordinatesStr: '6.9983 N · 93.9283 E',
    mapPosition: { x: 80, y: 74 }
  },
  {
    id: 'car_nicobar',
    name: 'Car Nicobar',
    state: 'Andaman & Nicobar Islands',
    coast: 'Nicobar Islands',
    lat: 9.1667,
    lng: 92.8167,
    type: 'Island Fish Landing Point',
    coordinatesStr: '9.1667 N · 92.8167 E',
    mapPosition: { x: 78, y: 68 }
  },
  {
    id: 'diglipur',
    name: 'Diglipur',
    state: 'Andaman & Nicobar Islands',
    coast: 'North Andaman',
    lat: 13.2667,
    lng: 92.9833,
    type: 'Fish Landing Jetty',
    coordinatesStr: '13.2667 N · 92.9833 E',
    mapPosition: { x: 79, y: 57 }
  },

  // 12. Lakshadweep
  {
    id: 'kavaratti',
    name: 'Kavaratti',
    state: 'Lakshadweep',
    coast: 'Arabian Sea / Coral Atoll',
    lat: 10.5667,
    lng: 72.6417,
    type: 'Tuna Fishery Base & UT Capital',
    coordinatesStr: '10.5667 N · 72.6417 E',
    mapPosition: { x: 44, y: 64 }
  },
  {
    id: 'agatti',
    name: 'Agatti',
    state: 'Lakshadweep',
    coast: 'Arabian Sea / Coral Atoll',
    lat: 10.8533,
    lng: 72.1917,
    type: 'Tuna Landing Harbor',
    coordinatesStr: '10.8533 N · 72.1917 E',
    mapPosition: { x: 43, y: 63 }
  },
  {
    id: 'minicoy',
    name: 'Minicoy',
    state: 'Lakshadweep',
    coast: 'Eight Degree Channel',
    lat: 8.2833,
    lng: 73.0500,
    type: 'Traditional Tuna Pole & Line Base',
    coordinatesStr: '8.2833 N · 73.0500 E',
    mapPosition: { x: 44, y: 70 }
  },
  {
    id: 'andrott',
    name: 'Andrott',
    state: 'Lakshadweep',
    coast: 'Arabian Sea / Coral Atoll',
    lat: 10.8167,
    lng: 73.6833,
    type: 'Island Fish Landing Jetty',
    coordinatesStr: '10.8167 N · 73.6833 E',
    mapPosition: { x: 45, y: 63 }
  },
  {
    id: 'kalpeni',
    name: 'Kalpeni',
    state: 'Lakshadweep',
    coast: 'Arabian Sea / Coral Atoll',
    lat: 10.0833,
    lng: 73.6500,
    type: 'Island Fish Landing Center',
    coordinatesStr: '10.0833 N · 73.6500 E',
    mapPosition: { x: 45, y: 65 }
  },
  {
    id: 'amini',
    name: 'Amini',
    state: 'Lakshadweep',
    coast: 'Amindivi Group',
    lat: 11.1250,
    lng: 72.7333,
    type: 'Island Fishery Center',
    coordinatesStr: '11.1250 N · 72.7333 E',
    mapPosition: { x: 44, y: 63 }
  },
  {
    id: 'kadmat',
    name: 'Kadmat',
    state: 'Lakshadweep',
    coast: 'Amindivi Group',
    lat: 11.2333,
    lng: 72.7833,
    type: 'Island Fishery Base',
    coordinatesStr: '11.2333 N · 72.7833 E',
    mapPosition: { x: 44, y: 62 }
  },
  {
    id: 'bangaram',
    name: 'Bangaram',
    state: 'Lakshadweep',
    coast: 'Coral Reef Lagoon',
    lat: 10.9333,
    lng: 72.2833,
    type: 'Lagoon Marine Area',
    coordinatesStr: '10.9333 N · 72.2833 E',
    mapPosition: { x: 43, y: 63 }
  },

  // 13. Daman & Diu
  {
    id: 'daman',
    name: 'Daman',
    state: 'Daman & Diu',
    coast: 'Gulf of Khambhat',
    lat: 20.4283,
    lng: 72.8397,
    type: 'Major Fishing Harbor',
    coordinatesStr: '20.4283 N · 72.8397 E',
    mapPosition: { x: 45, y: 39 }
  },
  {
    id: 'diu',
    name: 'Diu',
    state: 'Daman & Diu',
    coast: 'Saurashtra Coast',
    lat: 20.7144,
    lng: 70.9874,
    type: 'Coastal Fishing Base',
    coordinatesStr: '20.7144 N · 70.9874 E',
    mapPosition: { x: 43, y: 37 }
  },
  {
    id: 'vanakbara',
    name: 'Vanakbara',
    state: 'Daman & Diu',
    coast: 'Diu Island West',
    lat: 20.7100,
    lng: 70.8900,
    type: 'Major Trawler Fishing Harbor',
    coordinatesStr: '20.7100 N · 70.8900 E',
    mapPosition: { x: 43, y: 37 }
  }
]

export const COASTAL_LOCATIONS_MAP = Object.fromEntries(
  COASTAL_LOCATIONS.map((loc) => [
    loc.id,
    {
      ...loc,
      region: `${loc.state}, India`,
      latitude: loc.lat,
      longitude: loc.lng
    }
  ])
)

/**
 * Filter locations by state and/or search term
 */
export function filterCoastalLocations({ state = 'All States / UTs', query = '' } = {}) {
  let list = COASTAL_LOCATIONS
  if (state && state !== 'All States / UTs') {
    list = list.filter((loc) => loc.state === state)
  }
  if (query && query.trim()) {
    const q = query.trim().toLowerCase()
    list = list.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        loc.state.toLowerCase().includes(q) ||
        (loc.coast && loc.coast.toLowerCase().includes(q)) ||
        (loc.type && loc.type.toLowerCase().includes(q))
    )
  }
  return list
}

export function getLocationById(id) {
  if (!id) return COASTAL_LOCATIONS[0]
  return COASTAL_LOCATIONS_MAP[id] || COASTAL_LOCATIONS.find((l) => l.id === id) || COASTAL_LOCATIONS[0]
}
