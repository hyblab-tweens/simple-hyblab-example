// when the document is fully loaded    
$( document ).ready(function() {
    console.log( "document ready!" );
    
    // really nice in theory, but not that useful in practice as browsers have strict restricted policies about cross domain requests
    //$.get( "http://data.nantes.fr/api/getDisponibiliteParkingsPublics/1.0/39W9VSNCSASEOGV/?output=json", function(data){
    //     var datanantes = JSON.parse(data);
    //     $('body').append('<ul>Liste des parkings de Nantes</ul>')
    //     datanantes.opendata.answer.data.Groupes_Parking.Groupe_Parking.forEach( function(elem) {
    //          $('body').append('<li>'+elem.Grp_nom+'</li>')
    //     })
    //})
    
    // Ask server to load data from Nantes opendata and send it to us
    // then we add some of this data into our app
    console.log( "loading data from server..." );
    $.get('/data', function(data) { // JQuery HTTP GET request to the server
        // this code will be executed only if the request is successful
        var datanantes = JSON.parse(data); // parse json string answer to get a javascript object
        var myData = datanantes.opendata.answer.data.Groupes_Parking.Groupe_Parking; // get only the part of the json object that we need
        
        // add textual information to the page
        $('#texte').append('<ul id="parkings"></ul>'); // use JQuery to dynamicaly add a h3 and a list elements to the html page
        myData.forEach( function(elem) { // iterate all parkings
            // check is the parking is full
            if( parseInt(elem.Grp_disponible) <= parseInt(elem.Grp_complet)) // we use parseInt because Grp_disponible and Grp_complet are stored as string in the json structure
                status = "<del>Complet</del>"; // generate a striked text
            else
                status = "Disponible";
            $('#parkings').append('<li>'+elem.Grp_nom+': '+status+'</li>'); // add our text as list item (with JQuery)
        });
        
        // Create a simple bar graph with D3js
        buildGraph( '#graph', myData);
        
        // register a function that will be called when the window is resized
        // it will rescale our graph
        $(window).on('resize', resizeGraph); 
        $(window).on('orientationchange',resizeGraph);
    })
    .fail(function() { // in case the HTTP request fails, just write a simple error message in the page
        $('#texte').append('<p class="text-center">Impossible de récupérer les données du serveur :-(</p>');
        $('#graph').append('<p class="text-center">Impossible de récupérer les données du serveur :-(</p>');
  })
});

// Builds a simple bar chart using D3js
function buildGraph( myGraph, myData )
{
    // declare useful variables
    var margin = {top: 20, right: 20, bottom: 220, left: 30},
        width = $(myGraph).width() - margin.left - margin.right,    
        height = $(myGraph).height() - margin.top - margin.bottom;      // we use JQuery to get width and height as it is the most simple way for doing it
    
    // Generate usful data for our x and y axis    
    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1);
        
    var y = d3.scale.linear()
        .range([height, 0]);
        
   // scale x and y to the range of our data    
    x.domain(myData.map(function(d) { return d.Grp_nom; }));
    y.domain([0, d3.max(myData, function(d) { return parseInt(d.Grp_exploitation); })]);
    
    //build x and y axis with SVG
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");
        

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(10);
        
    // then add SVG container to the html page
    var svg = d3.select(myGraph).append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .attr("preserveAspectRatio", "xMidYMid meet")                                                                   //for 'simple' responsive graph
                .attr("viewBox", "0 0 " +  (width + margin.left + margin.right) + " " +  (height + margin.top + margin.bottom))  //for 'simple' responsive graph
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
                
    // add x and y axis to the SVG container
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", "-.55em")
        .attr("transform", "rotate(-90)" );
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Places libres");
        
    // add tooltip for showing bar value
    var tooltip = d3.select("body")
    	.append("div")
    	.attr("class", "bartooltip")
    	.style("position", "absolute")
    	.style("z-index", "10")
    	.style("visibility", "hidden")
    	.text("Will # of display available slot in parking");
    
    // add bars to the chart for max capacity
    svg.selectAll(".backbar")
        .data(myData)
        .enter().append("rect")
        .attr("class", "backbar")
        .attr("x", function(d) { return x(d.Grp_nom); })
        .attr("width", x.rangeBand())
        .attr("y", function(d) { return y(parseInt(d.Grp_exploitation)); })
        .attr("height", function(d) { return height - y(parseInt(d.Grp_exploitation)); });

    
    // add bars to the chart for available slots
    svg.selectAll(".bar")
        .data(myData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return x(d.Grp_nom); })
        .attr("width", x.rangeBand())
        .attr("y", function(d) { return y(parseInt(d.Grp_disponible)); })
        .attr("height", function(d) { return height - y(parseInt(d.Grp_disponible)); });
        
    // and add event listener for tooltips to both bars
    svg.selectAll('.bar, .backbar')
        .on("mouseover", function(d){return tooltip.style("visibility", "visible").text(d.Grp_disponible + " places disponibles sur " + d.Grp_exploitation);})
        .on("mousemove", function(){return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");})
        .on("mouseout", function(){return tooltip.style("visibility", "hidden");});
}

// This function will be called to resize the svg chart when the browser window is resized
// or mobile device orientation is changed
function resizeGraph() {
    // this is the simplest way of having a responsive graph
    // an alternative is to recalc the whole graph (whitout doing a new data request)
    // but we won't do this for that simple demo
    $('#graph > svg').width($('#graph').width())
}
