
// Config
var DEBUG = false;

///// Globals ////

// Raw data, 1000, page width
var Data = [ [], [], [], // Radar
             [], [], [], // Geiger
             [], [], []  // Gyro
             ]

// Angular velocity
var SpinRate = [];
// All graphable data
var Series = [];

// The first value of Radar, to set position relative to 0
var offset;
// Display counter for rows processed
var rows = 0;
// For averaging multiple files
var samples = 0;
// The various scales used by the graphs
var Scales = [];
// Placeholders
var max = 0;
var min = 0;
// Debug output
if(DEBUG){ result = []; }

function radFileSelect(evt) {
        rows = 0;
        var first = true;
        if(DEBUG){ result = []; }
        var files = evt.target.files;
        // This block processes the Radar file and creates a graph for it.
        Papa.parse(files[0], {
                dynamicTyping : true,
                delimiter : "",
                step: function(row, handle) {
                        if (DEBUG) { result.push(row); }
                        // If valid, send to the aggregator
                        if (typeof (row.data[0][0]) == 'number') {
                                stepRadar(row, first);
                                first = false;
                        }
                        rows++;
                },
                complete : function(results) {
                        first = true;
                        polishRADAR();
                        // push the data and render the chart
                        Data[1] = largestTriangleThreeBuckets(Data[0], 1000);
                        Series.push({
                                name: 'RADAR Altitude',
                                data: Data[1],
                                scale: Scales[0],
                                color: 'rgba(255, 127, 0, 0.4)',
                                renderer: 'line'
                        });
                        counter.innerHTML = rows;
                        var yAxis = new Rickshaw.Graph.Axis.Y.Scaled({
                                graph: graph,
                                orientation: 'left',
                                element: document.getElementById("axis0"),
                                width: 40,
                                height: graph.height,
                                scale: Scales[0],
                                tickFormat: Rickshaw.Fixtures.Number.formatKMBT
                        });
                        updateGraph();
                }
        });
        document.getElementById('list').innerHTML = files[0].name;
}

function rocFileSelect(evt) {
        var files = evt.target.files;
        time = 0;
        rows = 0;
        if(DEBUG){ result = []; }
        samples++;
        level();
        // This block will process the Payload data
        Papa.parse(files[0], {
                dynamicTyping : true,
                delimiter : "",
                step: function(row, handle) {
                        // Clears out empty array elements left by the parser
                        row.data[0].forEach(function(obj, index, arr){if(obj == ""){arr.splice(index, 1);}});
                        if (DEBUG) { result.push(row); }
                        // If valid data, send to the aggregator
                        if (typeof (row.data[0][0]) == 'number') {
                                stepPayload(row);
                        }
                        rows++;
                },
                complete : function(results) {
                        // Render the chart
                        Data[4] = largestTriangleThreeBuckets(Data[3], 1000);
                        Scales[1] = d3.scale.linear().domain([0, 100]).nice();
                        Series.push({
                                name: 'Geiger Counts',
                                data: Data[4],
                                scale: Scales[1],
                                color: 'rgba(255, 0, 0, 0.4)',
                                renderer: 'bar',
                        });
                        var yAxis = new Rickshaw.Graph.Axis.Y.Scaled({
                                graph: graph,
                                orientation: 'left',
                                element: document.getElementById("axis1"),
                                width: 40,
                                height: graph.height,
                                scale: Scales[1],
                                tickFormat: Rickshaw.Fixtures.Number.formatKMBT
                        });
                        graph.render();
                        counter.innerHTML = rows;
                }
        });
        document.getElementById('list').innerHTML = files[0].name;
}

function stepRadar(a, first) {
        var time = Math.ceil(a.data[0][0]*10);
        if (first) {
                offset = a.data[0][3];
        }
        if (Data[0][time-1]) {
                Data[0][time-1].y += (a.data[0][3]-offset);
                Data[0][time-1].steps++;
        }
        else {
                Data[0].push({x: time/10, y: (a.data[0][3]-offset), steps: 1});
        }
}

function stepPayload(a) {
        var time = Math.ceil(a.data[0][0]/1000);
        var halfTime = Math.ceil(a.data[0][0]/500);
        if (Data[3][time-1]) {
                Data[3][time-1].y += (a.data[0][13] * (1/samples));
                if (Data[3][time-1].y > max) {
                        max = Data[3][time-1].y;
                }
        }
        else {
                Data[3].push({x: time, y: (a.data[0][13] * (1/samples))});
        }
        SpinRate.push({x: a.data[0][0]/1000, y: (a.data[0][12]/5175)});
        if (a.data[0][12]/5175 < min) {
                min = a.data[0][12]/5175;
        }
}

function level() {
        Data[3].forEach(function(obj){obj.y *= ((samples-1)/samples)});
}

function polishRADAR() {
        var max = {x : 0, y : 0};
        Data[0].forEach(function(obj){obj.y *= (0.3048/obj.steps)});
        Data[0].forEach(function(obj){
                if(obj.y > max.y){
                        max.y = obj.y;
                        max.x = obj.x;
                        }
                });
        Scales[0] = d3.scale.linear().domain([0, max.y]).nice();
        annotator.add(max.x, "RADAR Apogee");
        annotator.update();
}

function initGraph() {
        graph = new Rickshaw.Graph( {
                element: document.getElementById("chart"),
                renderer: 'multi',
                width: document.getElementById("graphContainer").offsetWidth-120,
                height: window.innerHeight-205,
                dotSize: 5,
                series: Series
        });
        
        annotator = new Rickshaw.Graph.Annotate({
                graph: graph,
                element: document.getElementById("timeline")
        });
        
        legend = new Rickshaw.Graph.Legend({
                graph: graph,
                element: document.getElementById("legend")
        });
        
        slider = new Rickshaw.Graph.RangeSlider.Preview({
                graph: graph,
                height: 100,
                element: document.getElementById("slider")
        });
        
        var xAxis = new Rickshaw.Graph.Axis.X({
                graph: graph
        });
}

function updateGraph() {
        $('#legend').empty();
        $('#slider').empty();
        legend = new Rickshaw.Graph.Legend({
                graph: graph,
                element: document.getElementById("legend")
        });
        slider = new Rickshaw.Graph.RangeSlider.Preview({
                graph: graph,
                height: 100,
                element: document.getElementById("slider")
        });
        graph.render();
}


var 	floor = Math.floor,
        ceil = Math.ceil,
        abs = Math.abs;

function largestTriangleThreeBuckets(data, threshold) {

    var data_length = data.length;
    if (threshold >= data_length || threshold === 0) {
        return data; // Nothing to do
    }

    var sampled = [],
        sampled_index = 0;

    // Bucket size. Leave room for start and end data points
    var every = (data_length - 2) / (threshold - 2);

    var a = 0,  // Initially a is the first point in the triangle
        max_area,
        area,
        next_a;

    sampled[ sampled_index++ ] = data[ a ]; // Always add the first point
            
            // Determine the boundaries for the current and next buckets
            var bucket_start	= 0,
                    bucket_center 	= ceil( every );
                    
    for (var i = 0; i < threshold - 2; i++) {
                    // Calculate the boundary of the third bucket
                    var bucket_end 		= ceil( (i + 2) * every );
                    
        // Calculate point average for next bucket (containing c)
        var avg_x = 0,
            avg_y = 0,
            avg_range_start  = bucket_center,
            avg_range_end    = bucket_end;
        avg_range_end = avg_range_end < data_length ? avg_range_end : data_length;

        var avg_range_length = avg_range_end - avg_range_start;

        for ( ; avg_range_start<avg_range_end; avg_range_start++ ) {
          avg_x += data[ avg_range_start ].x * 1; // * 1 enforces Number (value may be Date)
          avg_y += data[ avg_range_start ].y * 1;
        }
        avg_x /= avg_range_length;
        avg_y /= avg_range_length;

        // Get the range for this bucket
        var range_offs = bucket_start,
            range_to   = bucket_center;

        // Point a
        var point_a_x = data[ a ].x * 1, // enforce Number (value may be Date)
            point_a_y = data[ a ].y * 1;

        max_area = area = -1;
                    
                    // 2D Vector for A-C
                    var base_x = point_a_x - avg_x,
                            base_y = avg_y - point_a_y;
                            
        for ( ; range_offs < range_to; range_offs++ ) {
            // Calculate triangle area over three buckets
            area = abs( ( base_x ) * ( data[ range_offs ].y - point_a_y ) -
                        ( point_a_x - data[ range_offs ].x ) * ( base_y )
                      );
            if ( area > max_area ) {
                max_area = area;
                next_a = range_offs; // Next a is this b
            }
        }

        sampled[ sampled_index++ ] = data[ next_a ]; // Pick this point from the bucket
        a = next_a; // This a is the next a (chosen b)
                    
                    bucket_start 	= bucket_center;	// Shift the buckets over by one
                    bucket_center 	= bucket_end;		// Center becomes the start, and the end becomes the center
    }

    sampled[ sampled_index++ ] = data[ data_length - 1 ]; // Always add last

    return sampled;
}

var resize = function() {
        graph.configure({
                width: document.getElementById("graphContainer").offsetWidth-120,
                height: window.innerHeight-205,
        });
        graph.render();
}

function init() {
    // Handle for the counter
    counter = document.getElementById('progress');
    document.getElementById('radFiles').addEventListener('change', radFileSelect, false);
    document.getElementById('rocFiles').addEventListener('change', rocFileSelect, false);
    window.addEventListener('resize', resize); 
    initGraph();
}