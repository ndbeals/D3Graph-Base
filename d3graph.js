class D3Graph {

	X = {
		axis: null,
		domain: [0, 1],
		scale: null,
		isTime: true,
		maxTicks: 15,
		minTicks: 4,
		clamp: true,
		leftBisect: d3.bisector(data => data.x).left,
		rightBisect: d3.bisector(data => data.x).right,
	};

	Y = {
		axis: null,
		domain: [0, 1],
		scale: null,
		maxTicks: 10,
		clamp: true,
		prefix: '',
		suffix: '',
	};

	chart = {
		width: null,
		mouseArea: null,
		mouseLine: null,
	}

	legend = {
		width: 164,
		title: 'Legend',
		padding: {
			title: 32,
			top: 6,
			bottom: 4,
			left: 4,
			right: 4,
		},
		spacing: {
			itemSpacing: 2,
			itemSize: 16,
		},
		outlineColour: '#808080',
		outlineWidth: 1,
		dataNodes: {},
		base: null,
		outline: null,
		clipArea: null,
		titleNode: null,
	}


	data = [];
	smoothing = 1;
	svg = null;
	base = null;
	parent = null;
	lineGenerator;
	lines = [];

	width;
	chartWidth;
	height;

	margin = {
		top: 50,
		right: 50,
		bottom: 50,
		left: 86,
	};
	padding = {
		legendPadding: 24,
		mouseEffectPadding: 12,
	}
	transition = {
		delay: 0,
		duration: 750,
		ease: d3.easePoly.exponent(2.5),
	}

	config = {
		innerTickLineColour: '#A9A9A9',
		innerTickWidth: 0.7,
		innerTickOpacity: 0.3,
		mouseCircleWidth: 1,
		mouseCircleRadius: 4,
		mouseCircleColour: '#808080',
	}

	///////////////////////////////////////////////////////////////
	///////     METHODS
	///////////////////////////////////////////////////////////////

	/**
	 * Creates an instance of D3Graph. pass it the parent element in which you want the chart to be placed in (string or a d3.select).
	 * @param {string or d3 selection} [parent=null]
	 * @param {boolean} [isTime=true]
	 * @memberof D3Graph
	 */
	constructor(parent = null, isTime = true) {
		if (parent != null) {
			this.setParent(parent);
		}
		this.isTime = isTime;

		this.transition.trn = d3.transition().delay(this.transition.delay).duration(this.transition.duration).ease(this.transition.ease);

		this.createXScale();
		this.createYScale();

		this.createLineGenerator();
	}


	/**
	 * Creates the svg base in which all of the rest of the chart will be in.
	 *
	 * @memberof D3Graph
	 */
	createBase() {
		if (this.base != null) {
			this.base.remove();
		}

		this.base = this.parent.append('svg');
		this.svg = this.base.append('g');

		this.updateBase();

		this.createMouseArea();
		this.createLegendBase();
	}

	/**
	 * Updates the svg base width, height and margins.
	 *
	 * @memberof D3Graph
	 */
	updateBase() {
		this.base //.transition().delay(this.transition.delay).duration(this.transition.duration).ease(this.transition.ease)
			.attr('width', this.width)
			.attr('height', this.height);

		this.svg //.transition().delay(this.transition.delay).duration(this.transition.duration).ease(this.transition.ease)
			.attr('transform', `translate(${this.margin.left},${this.margin.top})`);
	}

	/**
	 * Creates the line generator
	 *
	 * @returns d3.line
	 * @memberof D3Graph
	 */
	createLineGenerator() {
		this.lineGenerator = d3.line()
			.y(data => this.Y.scale(data.y)) // set the y values for the line generator 
			.x(data => this.X.scale(data.x)) // set the x values for the line generator
			.defined(data => data.x >= this.X.scale.domain()[0] && data.x <= this.X.scale.domain()[1])
			.curve(d3.curveLinear);

		return this.lineGenerator;
	}

	/**
	 * Creates the d3 X scale object, either d3.scaleTime or d3.scaleLinear depending on whether this chart is a time series or not
	 *
	 * @returns this.X.scale - d3 continuous scale
	 * @memberof D3Graph
	 */
	createXScale() {
		if (this.isTime) {
			let year = new Date().getFullYear();
			this.X.domain = [new Date(year - 10, 0), new Date()];
			this.X.scale = d3.scaleTime();
		} else {
			this.X.domain = [0, 1];
			this.X.scale = d3.scaleLinear();
		}

		return this.X.scale;
	}

	/**
	 * Updates the chart's X scale with new domain and range. Reuses current domain if a new one isn't passed.
	 *
	 * @param {number or Date} xMin
	 * @param {number or Date} xMax
	 * @memberof D3Graph
	 */
	updateXScale(xMin = null, xMax = null) {
		this.X.domain = (xMin != null && xMax != null) ? [xMin, xMax] : this.X.domain;
		this.X.scale
			.domain(this.X.domain) // Input range
			.range([0, this.chartWidth]) // Output range
			.clamp(this.X.clamp);

		this.updateXAxis();
	}

	/**
	 * Creates the base X-Axis components on the chart, really only need to call this once
	 * 
	 * @param {boolean} [anim=false] Whether or not to animate the creation
	 * @memberof D3Graph
	 */
	createXAxis(anim = false) {
		// Create an axis component with d3.axisBottom
		this.X.axis = d3.axisBottom(this.X.scale);

		this.X.axisNode = this.svg.append('g')
			.attr('class', 'x axis')
			.attr('transform', `translate(0, ${this.chartHeight} )`);

		this.updateXAxis(anim);
	}

	/**
	 * Updates the entire X-Axis. tick values, positionining, axis width, etc.
	 *
	 * @param {boolean} [anim=true] Whether or not to animate the change
	 * @memberof D3Graph
	 */
	updateXAxis(anim = true) {
		if (!this.X.axis || !this.X.axisNode) {
			this.createXAxis(false);
			return;
		}
		this.X.axis.scale(this.X.scale);

		if (this.isTime) {
			let xmax = this.X.scale.domain()[1],
				xmin = this.X.scale.domain()[0],
				interval,
				format = '',
				endFormat = '';

			if (d3.timeYear.count(xmin, xmax) >= this.X.minTicks) {
				interval = d3.timeYear;
				format = '%Y';
				endFormat = '%Y';
				this.X.maxTicks = 15;
			} else if (d3.timeMonth.count(xmin, xmax) >= this.X.minTicks) {
				interval = d3.timeMonth;
				format = '%Y-%b';
				endFormat = '%Y-%b';
				this.X.maxTicks = 15;
			} else if (d3.timeWeek.count(xmin, xmax) >= this.X.minTicks) {
				interval = d3.timeWeek;
				format = '%m-%d';
				endFormat = '%Y-%m-%d';
				this.X.maxTicks = 15;
			} else if (d3.timeDay.count(xmin, xmax) >= this.X.minTicks) {
				interval = d3.timeDay;
				format = '%m-%d';
				endFormat = '%Y-%m-%d';
				this.X.maxTicks = 15;
			} else if (d3.timeHour.count(xmin, xmax) >= this.X.minTicks) {
				interval = d3.timeHour;
				format = '%m-%d %H';
				endFormat = '%Y-%m-%d %H';
				this.X.maxTicks = 12;
			} else if (d3.timeMinute.count(xmin, xmax) >= this.X.minTicks) {
				interval = d3.timeMinute;
				format = '%H:%M';
				endFormat = '%Y-%-m-%-d %H:%M';
				this.X.maxTicks = 12;
			} else if (d3.timeSecond.count(xmin, xmax) >= this.X.minTicks) {
				interval = d3.timeSecond;
				format = '%M:%S';
				endFormat = '%Y-%-m-%-d %H:%M:%S';
				this.X.maxTicks = 10;
			} else if (d3.timeMillisecond.count(xmin, xmax) >= this.X.minTicks) {
				interval = d3.timeMillisecond;
				format = '%S.%L';
				endFormat = '%Y-%-m-%-d %H:%M:%S';
				this.X.maxTicks = 10;
			}

			// this.X.axis.tickSizeOuter(12);
			// this.X.axis.tickPadding(16)

			let spread = interval.count(xmin, xmax),
				every = Math.ceil(spread / Math.min(this.X.maxTicks, spread)),
				formatter = d3.timeFormat(endFormat),
				endFormatter = d3.timeFormat(format);

			this.X.axis.tickValues(this.X.scale.ticks(interval.filter((date) => interval.count(date, xmax) % every === 0)));

			let tickCount = this.X.axis.tickValues().length - 1;
			this.X.axis.tickFormat((data, idx) => {
				if (idx === 0 || idx == (tickCount)) {
					return endFormatter(data);
				} else {
					return formatter(data);
				}
			});
		}

		let context = this.X.axisNode;
		if (anim) {
			context = context.transition()
				.delay(this.transition.delay)
				.duration(this.transition.duration)
				.ease(this.transition.ease);
		}

		context
			.call(this.X.axis)
			.call(g => {
				g.selectAll('line')
					.attr('pointer-events', 'none')
					.attr('stroke', this.config.innerTickLineColour)
					.attr('stroke-width', this.config.innerTickWidth) // make horizontal tick thinner and lighter so that line paths can stand out
					.attr('opacity', this.config.innerTickOpacity)
					.attr('y1', -this.chartHeight);

				g.select('.domain').attr('pointer-events', 'none');
			});
	}

	/**
	 * Creates the d3 U scale object, it is d3.scaleLinear, always continuous vertical scale
	 *
	 * @returns this.Y.scale - d3 continuous scale
	 * @memberof D3Graph
	 */
	createYScale() {
		this.Y.scale = d3.scaleLinear();

		return this.Y.scale;
	}

	/**
	 * Updates the chart's Y scale with new domain and range. Reuses current domain if a new one isn't passed.
	 *
	 * @param {number} yMin
	 * @param {number} yMax
	 * @memberof D3Graph
	 */
	updateYScale(yMin, yMax) {
		this.Y.domain = (yMin != null && yMax != null) ? [yMin, yMax] : this.Y.domain;

		this.Y.scale
			.domain(this.Y.domain).nice() // Input range
			.range([this.chartHeight, 0]) // Output range
			.clamp(this.Y.clamp);

		this.updateYAxis();
	}


	/**
	 * Creates Y-Axis base components within the svg, call only once
	 *
	 * @param {boolean} [anim=false] Whether or not to animate the creation
	 * @memberof D3Graph
	 */
	createYAxis(anim = false) {
		this.Y.axis = d3.axisLeft(this.Y.scale); //.ticks( this.Y.maxTicks );

		this.Y.axisNode = this.svg.append('g')
			.attr('class', 'y axis');

		this.updateYAxis(anim);
	}


	/**
	 * Updates the Y-Axis entirely, ticks, range, lines, etc.
	 * 
	 * @param {boolean} [anim=true] Whether or not to animate the change
	 * @returns
	 * @memberof D3Graph
	 */
	updateYAxis(anim = true) {
		if (!this.Y.axis || !this.Y.axisNode) {
			this.createYAxis(false);
			return;
		}
		this.Y.axis.scale(this.Y.scale);

		// Below math fixes d3 tick formatting when the scales are super tiny or huge
		// It fixes returning a list of: 0.00080, 0.00070, 0.00060. Instead returning 0.0008, 0.0007, 0.0006
		let domain = this.Y.scale.domain(),
			step = d3.tickStep(domain[0], domain[1], this.Y.scale.ticks(this.Y.maxTicks).length);

		// create new tick formatter
		let tickFormat = d3.format(`.${ d3.precisionFixed( round( step, d3.precisionFixed( step ) ) ) }f`);
		this.Y.axis.tickFormat(data => {
			return `${this.Y.prefix}${tickFormat(data)}${this.Y.suffix}`;
		});

		let context = this.Y.axisNode;
		if (anim) {
			context = context.transition()
				.ease(this.transition.ease)
				.delay(this.transition.delay)
				.duration(this.transition.duration);
		}
		context
			.call(this.Y.axis.ticks(this.Y.maxTicks))
			.call(g => {
				let showDomain = true;

				g.selectAll('line')
					.attr('pointer-events', 'none')
					.attr('stroke', this.config.innerTickLineColour)
					.attr('stroke-width', this.config.innerTickWidth) // make line tick thinner and lighter so that line paths can stand out
					.attr('opacity', this.config.innerTickOpacity)
					.attr('x2', -6)
					.attr('x1', this.chartWidth)
					.each((d, idx, nodes) => {

						if (d == 0.0) {
							d3.select(nodes[idx]).transition()
								.attr('stroke-width', 1)
								.attr('stroke', 'black')
								.attr('opacity', 1);
						} else if (d == this.Y.domain[0] && (idx != 0 || idx != (nodes.length - 1))) {
							showDomain = false;

						}
					});

				if (showDomain) {
					this.svg.select('.x.axis path.domain').transition()
						.attr('stroke', 'black')
						.attr('stroke-width', 1)
						.attr('opacity', 1);
				} else {
					this.svg.select('.x.axis path.domain').transition()
						.attr('stroke', this.config.innerTickLineColour)
						.attr('stroke-width', this.config.innerTickWidth)
						.attr('opacity', this.config.innerTickOpacity);
				}

				g.select('path.domain').attr('pointer-events', 'none');
			});
	}


	/**
	 * Creates the base elements that the Legend uses. such as the group element, outline rectangle, clipping area, and title element
	 *
	 * @memberof D3Graph
	 */
	createLegendBase() {
		this.legendBase = this.svg.append('g')
			.attr('class', 'legend-group');

		this.legend.outline = this.legendBase
			.append('rect')
			.attr('class', 'legend-outline')
			.style('fill', 'none');

		this.legend.clipArea = this.legendBase
			.append('clipPath')
			.attr('id', 'legend-clip')
			.append('rect')
			.attr('id', 'legend-clip-rect');

		this.legend.titleNode = this.legendBase.append('text');

		// this.updateLegend();
	}


	/**
	 * Updates the legend base elements positioning and width, as well as creates/updates/removes the appropriate legend entries corresponding to lines in the chart.
	 *
	 * @memberof D3Graph
	 */
	updateLegend() {
		this.legendBase
			.attr('transform', `translate(${this.chartWidth+this.padding.legendPadding+0.5},0.5)`);

		this.legend.outline
			.attr('stroke-width', this.legend.outlineWidth)
			.attr('stroke', this.legend.outlineColour)
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', this.legend.width)
			.attr('height', this.legend.padding.title + this.legend.padding.top + (this.legend.spacing.itemSpacing + this.legend.spacing.itemSize) * this.data.length);

		this.legend.clipArea
			.attr('x', this.legend.padding.left)
			.attr('y', 0)
			.attr('width', this.legend.width - this.legend.padding.right - this.legend.padding.left)
			.attr('height', this.chartHeight);

		this.legend.titleNode.text('Legend')
			.attr('x', (d, i, nodes) => (this.legend.width / 2) - (d3.select(nodes[i]).node().getComputedTextLength() / 2))
			.attr('dy', 17);


		this.legend.entries = this.legendBase.selectAll('.legend')
			.data(this.data, d => d.name)
			.join(
				enter => enter.append('g')
					.attr('clip-path', 'url(#legend-clip)')
					.attr('class', 'legend')
					.attr('id', d => `legend-entry-${d.name}`)
					.append('text') // TODO - add a coloured circle?
					.each((d, i, nodes) => {
						this.legend.dataNodes[d.name] = {
							node: d3.select(nodes[i]),
							update: (val) => {
								d3.select(nodes[i]).text(`${d.name}: ${val}`);
							},
						};
					}),

				update => update.select('text'),

				exit => exit
					.remove(),
			)
			.text(d => `${d.name}`)
			.attr('fill', (d, i) => d3.schemeCategory10[i])
			.attr('dy', (d, i) => this.legend.padding.title + this.legend.padding.top + (this.legend.spacing.itemSpacing + this.legend.spacing.itemSize) * i)
			.attr('x', this.legend.padding.left);
	}

	/**
	 * Updates/replaces all the lines the chart shows. if new data is passed, replaces and recreates lines.L0
	 * if no new data is passed, updates the current lines positioning from stored data
	 *
	 * @param {*} [data=null]
	 * @memberof D3Graph
	 */
	updateLines(data = null) {
		if (data != null) {
			this.data = data;
		}

		for (let idx in this.data) {
			let line = this.data[idx];
			line.data = movingAverage(line.rawdata, this.smoothing);

			if (this.isTime) {
				for (let dataidx in line.data) {
					let data = line.data[dataidx];

					data.x = new Date(data.x, 0);
				}
			}
		}

		let trn = d3.transition()
			.delay(this.transition.delay)
			.duration(this.transition.duration)
			.ease(this.transition.ease);

		// get the max count of visible points inside the chart area (takes into account a changed x domain)
		this.countVisiblePoints = d3.sum(d3.max(this.data, d => d.data).map(d => this.lineGenerator.defined()(d)));

		this.lines = this.svg.selectAll('.data-line').data(this.data, d => d.name)
			.join(
				enter => enter.append('g')
					.attr('class', 'data-line')
					.attr('id', dataset => `data-line-${dataset.name}`)
					.attr('pointer-events', 'none')
					.append('path')
					.attr('class', 'line'),

				update => update.select('path'),

				exit => exit.remove()
			)
			.transition(trn)
			.attr('stroke', function (dataset, idx) {
				return d3.schemeCategory10[idx];
			})
			.attr('d', dataset => this.lineGenerator(dataset.data));


		this.mouseLineDataMarkers();
		this.updateLegend();
	}

	/**
	 * Creates the base elements needed for mouse interaction, only need to create this once. 
	 *
	 * @memberof D3Graph
	 */
	createMouseArea() {
		if (this.chart.mouseArea) {
			this.chart.mouseArea.remove();
		}
		this.chart.mouseArea = this.svg.append('g')
			.attr('class', 'mouse-over-effects');

		this.chart.mouseLine = this.chart.mouseArea.append('path') // create vertical line to follow mouse
			.attr('class', 'mouse-line')
			.attr('pointer-events', 'none')
			.attr('transform', 'translate(0.5,0)')
			.style('opacity', '0');

		this.chart.mouseArea.append('svg:rect') // append a rect to catch mouse movements on canvas
			.attr('fill', 'none')
			.attr('pointer-events', 'all')
			.on('mouseout', () => { // on mouse out hide line, circles and text
				this.chart.mouseLine.style('opacity', '0');
				this.svg.selectAll('.mouse-per-line').style('opacity', '0');
				// this.svg.selectAll('#tooltip').style('display', 'none');
			})
			.on('mouseover', () => { // on mouse in show line, circles and text
				this.chart.mouseLine.style('opacity', '1');
				this.svg.selectAll('.mouse-per-line').style('opacity', '1');
				// this.svg.selectAll('#tooltip').style('display', 'block');
			})
			.on('mousemove', () => { // update tooltip content, line, circles and text when mouse moves
				let mouse = d3.mouse(event.currentTarget);

				let tickwidth = Math.round(this.chartWidth / (this.countVisiblePoints - 1));
				let xDate = this.X.scale.invert(mouse[0] - (this.padding.mouseEffectPadding / 2) - (tickwidth / 2)); // use 'invert' to get date corresponding to distance from mouse position relative to svg

				this.svg.selectAll('.mouse-per-line')
					.attr('transform', d => {
						let idx = clamp(this.X.leftBisect(d.data, xDate), 0, d.data.length - 1),
							dat = d.data[idx];

						this.legend.dataNodes[d.name].update(round(dat.y, 8)); // TODO - better number formatting

						this.chart.mouseLine.attr('d', `M${ this.X.scale(dat.x) },${ this.chartHeight } ${ this.X.scale(dat.x) },0`);
						return `translate(${ this.X.scale(dat.x) },${ this.Y.scale(dat.y) })`;
					});
			});

		this.updateMouseArea();
	}

	/**
	 * Update the size and positioning of the base mouse area elements
	 *
	 * @memberof D3Graph
	 */
	updateMouseArea() {
		this.chart.mouseLine
			.style('stroke', this.config.innerTickLineColour)
			.style('stroke-width', this.config.mouseCircleWidth);

		this.chart.mouseArea.select('rect')
			.attr('height', this.chartHeight)
			.attr('width', this.chartWidth + this.padding.mouseEffectPadding)
			.attr('transform', `translate(${ -this.padding.mouseEffectPadding / 2 },0)`);
	}


	/**
	 * Creates/Updates the set of shapes (circles) that hover over the nearest datapoint to the users cursor
	 *
	 * @memberof D3Graph
	 */
	mouseLineDataMarkers() {
		this.updateMouseArea();

		this.chart.mousePerLine = this.chart.mouseArea.selectAll('.mouse-per-line')
			.data(this.data, d => d.name);

		this.chart.mousePerLine
			.join(
				enter => enter.append('g')
					.attr('class', 'mouse-per-line')
					.attr('pointer-events', 'none')
					.style('opacity', '0')
					.append('circle')
					.attr('transform', 'translate(0.5,0)'),

				update => update.select('circle'),

				exit => exit.remove(),
			)
			.style('fill', 'none')
			.attr('stroke-width', this.config.mouseCircleWidth)
			.attr('r', this.config.mouseCircleRadius)
			.attr('stroke', this.config.mouseCircleColour);

		this.chart.mouseArea.select('rect').raise();
	}


	/**
	 * Sets the margins of the chart, call without any values to reset to default
	 *
	 * @param {number} [top=50]
	 * @param {number} [right=50]
	 * @param {number} [bottom=50]
	 * @param {number} [left=50]
	 * @memberof D3Graph
	 */
	setMargin(top = 50, right = 50, bottom = 50, left = 50) {
		this.margin.top = top;
		this.margin.right = right;
		this.margin.bottom = bottom;
		this.margin.left = left;
	}

	/**
	 * Returns the chart's margins
	 *
	 * @returns
	 * @memberof D3Graph
	 */
	getMargin() {
		return this.margin;
	}

	/**
	 * Sets the base width, and chartwidth, of the chart. 
	 * These are the two responsive width values, the legend has a fixed width
	 *
	 * @param {*} width
	 * @memberof D3Graph
	 */
	setWidth(width) {
		this.width = width;
		this.chartWidth = this.width - this.margin.left - this.margin.right - this.legend.width;
	}
	/**
	 * Returns base width
	 *
	 * @returns this.width
	 * @memberof D3Graph
	 */
	getWidth() {
		return this.width;
	}
	/**
	 * Returns chart width
	 *
	 * @returns this.chartWidth
	 * @memberof D3Graph
	 */
	getChartWidth() {
		return this.chartWidth;
	}

	/**
	 * Sets the base height & chart height (base height-margins) for this chart
	 *
	 * @param {*} height
	 * @memberof D3Graph
	 */
	setHeight(height) {
		this.height = height;
		this.chartHeight = height - this.margin.top - this.margin.bottom;
	}
	/**
	 * Returns base height
	 *
	 * @returns this.height
	 * @memberof D3Graph
	 */
	getHeight() {
		return this.height;
	}
	/**
	 * Returns chart height
	 *
	 * @returns this.chartHeight
	 * @memberof D3Graph
	 */
	getChartHeight() {
		return this.chartHeight;
	}

	/**
	 * Sets the parent element of this chart, this also creates the svg base, axis, legend, etc.
	 *
	 * @param {*} element
	 * @memberof D3Graph
	 */
	setParent(element) {
		if (typeof (element) === 'string') {
			element = d3.select(element);
		}
		this.parent = element;

		let parnode = this.parent.node();

		this.setWidth(parnode.clientWidth); // Use the parent's width
		this.setHeight(parnode.clientHeight); // Use the parent's height

		this.createBase();
	}

	/**
	 * Get Parent element
	 *
	 * @returns
	 * @memberof D3Graph
	 */
	getParent() {
		return this.parent;
	}

	/**
	 * Set the smoothing value and update the lines
	 *
	 * @param {number} [smooth=1]
	 * @memberof D3Graph
	 */
	setSmoothing(smooth = 1) {
		this.smoothing = smooth;
		this.updateLines();
	}

	/**
	 * Get Smoothing values and update the lines
	 *
	 * @returns
	 * @memberof D3Graph
	 */
	getSmoothing() {
		return self.smoothing;
	}
}

/**
 * Helper function get a JSON document from a url by POST-ing data to it.
 *
 * @param {string} url
 * @param {object} data
 * @param {functiion} callback( data )
 */
function postJSON(url, data, callback) {
	d3.json(url, {
		method: 'POST',
		body: JSON.stringify(data),
		headers: {
			'Content-type': 'application/json; charset=UTF-8'
		}
	}).then(callback);
}


/**
 * Moving window average function.
 * Takes in a dataset (an array of objects where the objects have a `x` and a `y` value )
 * The window value is how far to the left and right it looks to smooth. E.G window of 2 means 5 values in the average (2 left + 2 right + 1 middle)
 * accessor and writer are functions to access and write the dataset, if your structure is different.
 *
 * @param {*} dataset
 * @param {number} [window=2]
 * @param {*} [accessor=id => dataset[id].y]
 * @param {*} [writer=(id, val) => ({
 * 	x: dataset[id].x,
 * 	y: val
 * })]
 * @returns copy of the dataset with the smoothed values in the `y` position
 */
function movingAverage(dataset, window = 2, accessor = id => dataset[id].y, writer = (id, val) => ({
	x: dataset[id].x,
	y: val
})) {
	// Round window value to closest even number and divide by two (because it goes both ways)
	window = Math.floor(window / 2);

	// A window of size '<1' means no smoothing, return copy of original data
	if (window < 1) {
		return dataset.map(data => Object.assign({}, data));
	}

	let smoothVals = [];
	for (let id = 0; id < dataset.length; id++) {
		const lowId = Math.max(id - window, 0);
		const highId = Math.min(id + window, dataset.length - 1);

		let smoothVal = 0;
		for (let subid = lowId; subid <= highId; subid++) {
			smoothVal += accessor(subid);
		}
		smoothVal /= (highId - lowId) + 1;

		smoothVals.push(writer(id, smoothVal));
	}

	return smoothVals;
}

/**
 * Clamp helper function, clamp a value between a min & max
 *
 * @param {*} val
 * @param {*} min
 * @param {*} max
 * @returns
 */
function clamp(val, min, max) {
	return Math.min(Math.max(val, min), max);
}


/**
 * Round helper function, round a float to an arbitrary precision
 *
 * @param {*} x
 * @param {*} n
 * @returns
 */
function round(x, n) {
	return Math.round(x * Math.pow(10, n)) / Math.pow(10, n);
}


// possible TODO
// - draw dots on each data point