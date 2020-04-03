# cloudgate

Install:
`git clone ssh://git@github.com/jbenguira/cloudgate.git`

Enter the cloned folder: 
`cd cloudgate`

Then install dependencies:
`npm install`

then run a sample script:
`node examples/http.js`

or run a sample app container:
`node cli.js ./apps/sample1/` 

/!\ Once the package is published syntax will be:
`cloudgate ./apps/sample1/` 

Run benchmark in single core:
`./benchmarks/single.sh`

Run benchmark in multi core:
`./benchmarks/multi.sh`