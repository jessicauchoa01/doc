// Define the blue water mask to identify water pixels in the Global Surface Water dataset
var BB_mask = ee.Image("JRC/GSW1_1/GlobalSurfaceWater").select('seasonality').eq(12);

// Define the geometry of the area of interest
var geometry = geometry; // Make sure to define the geometry

// Load the Sentinel-2 image collection
var s2 = ee.ImageCollection("COPERNICUS/S2_SR");

// Define the visualization for the red (B4), green (B3), and blue (B2) bands
var vis = {bands: ['B4', 'B3', 'B2'], max: 2000, gamma: 1.5};

// Create a FeatureCollection for the area of interest
var area = ee.FeatureCollection(geometry);

// Set the opacity of layers on the map
var opacity = 0.5;

// Center the map on the area of interest
Map.centerObject(area, 15);

// Filter the Sentinel-2 image collection for a specific date
var ImCol = ee.ImageCollection(s2.filterDate('2024-04-24','2024-04-25').filterBounds(area)); 

// Function to add bands to the images
var addBands = function(image) {
  var Ultrablue = image.select(['B2']).divide(10000);
  var Blue = image.select(['B2']).divide(10000);
  var Green = image.select(['B3']).divide(10000);
  var Red = image.select(['B4']).divide(10000);
  var RedEdge1 = image.select(['B5']).divide(10000);
  var RedEdge2 = image.select(['B6']).divide(10000);
  var RedEdge3 = image.select(['B7']).divide(10000);
  var NIR = image.select(['B8']).divide(10000);
  var RedEdge4 = image.select(['B8A']).divide(10000);
  var SWIR1 = image.select(['B11']).divide(10000);
  var SWIR2 = image.select(['B12']).divide(10000);
  
  // Calculate the Distribution of dissolved organic carbon (DOC)
  var glint = image.subtract(image.select('B12'));
  
  // Add the calculated band to the image's band set
  return image.addBands(glint.expression('432 * exp(-2.24 * Green/Red)', //https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/se2waq/
  {Blue: Blue,
  Green: Green,Red: Red,
  RedEdge1: RedEdge1,
  RedEdge2: RedEdge2,
  RedEdge3: RedEdge3,
  NIR: NIR,
  RedEdge4: RedEdge4,
  SWIR1: SWIR1,
  SWIR2: SWIR2, 
  glint: glint, 
  Ultrablue: Ultrablue
}).rename('doc')).updateMask(BB_mask);
 };

// Add bands to the images in the collection
var doc_ImCol = ImCol.map(addBands);

// Calculate the mean of the images and clip to the area of interest
var doc_vv = doc_ImCol.mean().clip(area).select('doc');

// Define the palette for NDVI
var ndvi_pal = ["001219","005f73","0a9396","94d2bd","e9d8a6","ee9b00","ca6702","bb3e03","ae2012","9b2226"];

var GRAYMAP = [
{   // Dial down the map saturation.
stylers: [ { saturation: -100 } ]
},{ // Dial down the label darkness.
elementType: 'labels',
stylers: [ { lightness: 20 } ]
},{ // Simplify the road geometries.
featureType: 'road',
elementType: 'geometry',
stylers: [ { visibility: 'simplified' } ]
},{ // Turn off road labels.
featureType: 'road',
elementType: 'labels',
stylers: [ { visibility: 'off' } ]
},{ // Turn off all icons.
elementType: 'labels.icon',
stylers: [ { visibility: 'off' } ]
},{ // Turn off all POIs.
featureType: 'poi',
elementType: 'all',
stylers: [ { visibility: 'off' }]
}
];
 
Map.setOptions('Gray', {'Gray': GRAYMAP});

// Create a control panel
var panel = ui.Panel();
panel.style().set('width', '380px');

// Create a header for the panel
var header = ui.Panel({
  widgets: [
    ui.Label({
      value: 'Dissolved Organic Carbon (DOC)',
      style: {fontSize: '20px', fontWeight: 'bold', backgroundColor:"orange", color: 'white'}
    })
  ],
  style: {backgroundColor:"orange", textAlign:'center'},
  layout: ui.Panel.Layout.flow('horizontal')
});
// Create a header for the panel
var header_ = ui.Panel({
  widgets: [
    
    ui.Label({
      value: 'powered by Jéssica Uchôa',
      style: {fontSize: '16px', fontWeight: 'bold', backgroundColor: "orange", color:'lightgrey'},
      targetUrl: 'https://github.com/jessicauchoa01/doc'
    })
  ],
  style: {backgroundColor:"orange", textAlign:'center'},
  layout: ui.Panel.Layout.flow('horizontal')
});


panel.add(header);

// Add an introduction to the panel
var intro = ui.Panel([
  ui.Label('In recent months, in the city of Vila Velha, ' + 
  'in Espírito Santo, Brazil, residents have complained about the odor and presence of a stain near the sea. In the map you can ' +
  'see the Distribution of Dissolved Organic Carbon (DOC) using Sentinel-2.'),
]);

// Add a link for more information
var bottom = ui.Panel({
  widgets: [
    ui.Label({
      value: 'Click here for more information',
      style: {fontSize: '15px', fontWeight: 'bold', backgroundColor: 'white'},
      targetUrl: 'https://www.agazeta.com.br/es/cotidiano/mancha-de-esgoto-no-mar-causa-mau-cheiro-e-chama-atencao-em-vila-velha-0424'
    })
  ],
  style: {backgroundColor: "white"}
});

// Insert widgets into the panel
ui.root.insert(0, panel);

// Define the palette for the legend
var vis = {min: 15, max: 70, palette:["001219","005f73","0a9396","94d2bd","e9d8a6","ee9b00","ca6702","bb3e03","ae2012","9b2226"]}

// Function to create color bar parameters
function makeColorBarParams(palette) {
  return {
    bbox: [0, 0, 40, 10],
    dimensions: '100x10',
    format: 'png',
    min: 0,
    max: 40,
    palette: palette,
  };
}

// Create the color bar for the legend
var colorBar = ui.Thumbnail({
  image: ee.Image.pixelLonLat().select(0),
  params: makeColorBarParams(vis.palette),
  style: {stretch: 'horizontal', margin: '0px 8px', maxHeight: '24px'},
});

// Create the labels for the legend
var legendLabels = ui.Panel({
  widgets: [
    ui.Label(vis.min, {margin: '4px 8px'}),
    ui.Label(
      (vis.min+ ((vis.max - vis.min)/ 2)),
      {margin: '4px 8px', textAlign: 'center', stretch: 'horizontal'}),
    ui.Label(vis.max, {margin: '4px 8px'})
  ],
  layout: ui.Panel.Layout.flow('horizontal')
});

// Define the legend title
var legendTitle = ui.Label({
  value: 'Legend: ',
  style: {fontWeight: 'bold'}
});

// Add the logo of the news about the sewage stain
var logo = image.visualize({
    bands:  ['b1', 'b2', 'b3'],
    min: 0,
    max: 255
});
var thumb = ui.Thumbnail({
    image: logo,
    params: {
        dimensions: '642x291',
        format: 'png'
    },
    style: {height: '180px', width: '350px',padding :'0'}
});

// Create the legend panel
var legendPanel = ui.Panel([header_,intro, legendTitle, colorBar, legendLabels, bottom, thumb]);

// Update the panel with the legend
panel.widgets().set(1, legendPanel);

// Load the harmonized Sentinel-2 image collection and add to the map
var Sentinel = ee.ImageCollection("COPERNICUS/S2_HARMONIZED")
        .filterDate('2024-04-24','2024-04-25')
        .select(['B4', 'B3', 'B2'])
        .filterBounds(geometry);
        
var rgbVis = {
        min: 300,
        max: 1300,
        bands: ['B4', 'B3', 'B2'],
};

Map.addLayer(Sentinel, rgbVis, 'Sentinel RGB', false); // Add the Sentinel RGB layer to the map
Map.addLayer(doc_vv.clip(geometry), {min:15, max:70, palette: ndvi_pal}, 'DOC'); // Add the doc layer to the map
