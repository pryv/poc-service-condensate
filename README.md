# Mockup service for future condenses feature on events GET requests

## Setup

`$ yarn install`


## Run

**in production alongside core deployment** `$ yarn start`

URL to call will be: `https://{user}.pryv.me/xevents?format=csv+head&fields[]=time&fields[]=type&fields[]=content&auth={token}`


**Development run** for local usage `$ yarn run dev`

URL to call will be: `http://localhost:8080/{user}.pryv.me/events/?format=csv+head&fields[]=time&fields[]=type&fields[]=content&auth={token}`


## Parameters in the query

- *fields[]*: select which fields of events to display, add as many `fields[]=...`  as needed
- *format*: one of `json`, `csv`, `jsonMap` `html` add `+head` to get table headers



## Examples

### `?format=html+head&fields[]=time&fields[]=type&fields[]=content&limit=3`

```
<html><body><table border=1><tr><td>"time"</td><td>"type"</td><td>"content"</td></tr>
<tr><td>1513331185</td><td>"length/m"</td><td>8</td></tr>
<tr><td>1513331185</td><td>"count/steps"</td><td>17</td></tr>
<tr><td>1513331185</td><td>"activity/plain"</td><td>null</td></tr></table></body></html>
```



### ?format=html+head&fields[]=time&fields[]=type&fields[]=content&limit=3
```
"time";"type";"content"
1513331185;"length/m";8
1513331185;"count/steps";17
1513331185;"activity/plain";null
```


### ?format=json&fields[]=time&fields[]=type&fields[]=content&limit=3

```
[1513331185,"length/m",8,1513331185,"count/steps",17,1513331185,"activity/plain",null]
```

### ?format=jsonMap&fields[]=time&fields[]=type&fields[]=content&limit=3

```
[[1513331185,"length/m",8],[1513331185,"count/steps",17],[1513331185,"activity/plain",null]]
```

## License

[BSD-3-Clause](LICENSE)
