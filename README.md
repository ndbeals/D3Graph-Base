# D3Graph-Base

An object-oriented, general purpose graph made in D3. Designed to be easily extensible and modifiable if it does not fit your needs.



## Features

* Continuous X & Y Axis
  * **Y-Axis** - linear scale only (logarithmic scale, etc, planned in the future)
    * Supports very tiny y-values without wonky numbering (I.e `d3.tickStep(0,0.0005,5) == 0.0000999999999` when it should be `0.0001`)
  * **X-Axis** - linear & chronological scale (date/time)
    * Chronological scale has sanity logic to make your date ranges pretty and sane.
* Selection of nearest data point based on mouse location
* Legend
  * Live updating of legend values based on nearest data point
* Data smoothing (moving window average)
* Animations



## Examples

For example usage, refer to `basic.html` within the `examples` directory.

![Example Image](https://i.imgur.com/drBccg4.png)



### Documentation

Formal documentation coming, for now, the class file is decently well documented.
