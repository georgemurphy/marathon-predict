// wait until everything on page loads
document.addEventListener("DOMContentLoaded", function() {
	
	raceFile  = window.location.search == '?18M' ? 'data_18M.csv' : 'data.csv';

	// read data files
	Promise.all([
		d3.csv('data/' + raceFile)
	]).then(function(files){

		if (window.location.search == '?18M') {
			d3.selectAll('span.race').html('Central Park 18M');
		}

		csv = files[0];

		csv = csv.filter(function(d) { return d.bronx_pace_bkt < '12:10' && d.bronx_pace_bkt >= '06:00'});

		dataGrouped = d3.groups(csv, d => d.bronx_pace_bkt);
		dataGrouped = dataGrouped.sort(function(a,b){
			return a[0] < b[0] ? -1 : 1
		});

		sampleSizeLookup = d3.rollup(csv, v => d3.sum(v, d => +d.runners), d => d.bronx_pace_bkt);

		bronxTimeGroups = d3.select('div#vizCont').selectAll('div')
			.data(dataGrouped)
			.enter()
			.append('div')
			.attr('class', 'timeGroup');

		// bronxTimeGroups.append('p')
		// 	.attr('class','timeBX')
		// 	.html(d => d[0]);

		// bronxTimeGroups.append('p')
		// 	.attr('class','timeBX')
		// 	.html(function(d) {
		// 		if (d[1][0].p50 < 0) {
		// 			return d[1][0].p50 * -1 + ' seconds slower'
		// 		} else {
		// 			return d[1][0].p50 + 'seconds faster'
		// 		}
		// 	});

		histX = d3.scaleLinear()
			.domain([-240,240])
			.range([0,480])
			// .clamp(true);

		histY = d3.scaleLinear()
			.domain([0,100]) // to be reset for each small multiple
			.range([0,100])
			.clamp(true);

		dataGrouped.forEach(function(g){
			histY = d3.scaleLinear()
						.domain([0,1])
						.range([0,50])
						.clamp(true);
		});

		piYg = d3.scaleSequential(d3.interpolatePiYG).clamp(true);

		colorScale = function(paceDiff) {
			var diff = paceDiff / 240;
			return piYg(.5 + diff);
			// return '#ccc';
		}

		hists = bronxTimeGroups.append('svg')
			.attr('width', '488px')
			.attr('height', '114px')
			.on('mouseover', function(){
				d3.selectAll('g.poles').style('opacity', 0);
				d3.select(this).select('g.poles').style('opacity', 1);
			})
			.on('touchstart', function(){
				d3.selectAll('g.poles').style('opacity', 0);
				d3.select(this).select('g.poles').style('opacity', 1);
			})

		hists.append('text')
			.attr('class', 'paceTitle')
			.attr('y', 38)
			.html(d => d[0]);

		hists.append('text')
			.attr('class', 'subTitle')
			.attr('y', 49)
			.html(function(){
				if (window.location.search == '?18M') {
					return '18M pace'
				} else {
					return 'Bronx pace'
				}
			});

		hists.selectAll('rect')
			.data( d => d[1])
			.enter()
			.append('rect')
			.attr('width', 8)
			.attr('height', function(d) {
				var localMax = d3.max(d3.select(this.parentNode).data()[0][1], d => +d.runners);
				histY.domain([0, localMax]);
				return histY(+d.runners);
			})
			.attr('y', function(d) {
			var localMax = d3.max(d3.select(this.parentNode).data()[0][1], d => +d.runners);
				histY.domain([0, localMax]);
				return 100 - histY(+d.runners);	
			})
			.attr('x', d => histX(d.pace_diff_bkt))
			// .attr('y', d => histY(1 - +d.runners / sampleSizeLookup.get(d.bronx_pace_bkt)))
			.attr('fill', d => colorScale(d.pace_diff_bkt));

		hists.append('line')
			.attr('class', 'histBaseline')
			.attr('x1', histX(-240))
			.attr('x2', histX(240) + 8)
			.attr('y1', 100)
			.attr('y2', 100);

		hists.selectAll('text.baselineLabels')
			.data([
				{label: '+4min', time: -240, textanchor: 'start'},
				{label: '+2min', time: -120, textanchor: 'middle'},
				{label: '< slower', time: 0, textanchor: 'end'},
				{label: 'faster >', time: 10, textanchor: 'start'},
				// {label: '1min', time: 60},
				{label: '-2min', time: 120, textanchor: 'middle'},
				{label: '-4min', time: 247, textanchor: 'end'}
				])
			.enter()
			.append('text')
			.attr('class', 'baselineLabels')
			.html( d => d.label)
			.attr('y', 112)
			.attr('x', (d) => histX(d.time))
			.attr('text-anchor', (d) => d.textanchor);

		hists.append('text')
			.attr('class', 'paceDiffText')
			.text( d => `${Math.abs(d[1][0].p50)}sec slower`)
			.attr('x', d => histX(d[1][0].p50))
			.attr('dx', 7)
			.attr('y', 33);

		hists.append('text')
			.attr('class', 'paceDiffTextSub')
			.text('marathon pace median')
			.attr('x', d => histX(d[1][0].p50))
			.attr('dx', 7)
			.attr('y', 43);

		hists.append('line')
			.attr('class', 'medianPole pole')
			.attr('x1', d => histX(d[1][0].p50) + 4)
			.attr('x2', d => histX(d[1][0].p50) + 4)
			.attr('y1', 24)
			.attr('y2', 100);

		// P10 POLE

		secondaryPoles = hists.append('g')
			.attr('class', 'poles');

		secondaryPoles.append('line')
			.attr('class', 'poleSecondary pole')
			.attr('x1', d => histX(d[1][0].p10) + 4)
			.attr('x2', d => histX(d[1][0].p10) + 4)
			.attr('y1', 50)
			.attr('y2', 100);

		secondaryPoles.append('text')
			.attr('class', 'paceDiffText secondary')
			.text( d => `${Math.abs(d[1][0].p10)}s`)
			.attr('x', d => histX(d[1][0].p10))
			.attr('dx', 6)
			.attr('y', 59);

		secondaryPoles.append('text')
			.attr('class', 'paceDiffTextSub secondarySub')
			.text('bottom 10%')
			.attr('x', d => histX(d[1][0].p10))
			.attr('dx', 7)
			.attr('y', 68);

		// P90 POLE
		secondaryPoles.append('line')
			.attr('class', 'poleSecondary pole')
			.attr('x1', d => histX(d[1][0].p90) + 4)
			.attr('x2', d => histX(d[1][0].p90) + 4)
			.attr('y1', 50)
			.attr('y2', 100);

		secondaryPoles.append('text')
			.attr('class', 'paceDiffText secondary')
			.text( d => `${Math.abs(d[1][0].p90)}s`)
			.attr('x', d => histX(d[1][0].p90))
			.attr('dx', 6)
			.attr('y', 59);

		secondaryPoles.append('text')
			.attr('class', 'paceDiffTextSub secondarySub')
			.text('top 10%')
			.attr('x', d => histX(d[1][0].p90))
			.attr('dx', 7)
			.attr('y', 68);
	});

});
