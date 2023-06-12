const express = require("express");
const https = require("https");
const path = require('path');
const fs = require('fs');
var ip = require("ip");
//var cors = require("cors");

const app = express();
app.use(express.json());

port = 80
ip = ip.address()

app.get("/", function (req, res){
    res.sendFile(path.join(__dirname, "/src/index.html"));
})

app.get("/data", function (req, res){
    let fileNames = fs.readdirSync('data');
    console.log(`${fileNames.length} point clouds available for annotation`)
    console.log(fileNames)
    res.end(JSON.stringify({fileNames}));
})

app.post("/annotation", function (req, res){
    let points = req.body.points
    let fileName = req.body.fileName
    let index = req.body.index
    let skeletonLength = 0
    prevPoint = points[0]
    points.forEach(point => {
        let dx = point[0] - prevPoint[0]
        let dz = point[1] - prevPoint[1]
        let dy = point[2] - prevPoint[2]
        let d = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2) + Math.pow(dz, 2))
        skeletonLength += d
        prevPoint = point
    })
    lengthMicrons = skeletonLength / 0.005
    let pcd = `ply\nformat ascii 1.0\ncomment length = ${lengthMicrons}`
    pcd += `\nelement vertex ${points.length}\nproperty float x\nproperty float y\nproperty float z\nend_header\n`
    points.forEach(point => {
        pcd += `${point[0]} ${point[1]} ${point[2]}\n`
    });

    let outputName = `output/${fileName}-${index}.ply`
    console.log(outputName)
    fs.writeFileSync(outputName, pcd)
    res.end(JSON.stringify({}));
})

app.post("/debug", function (req, res){
    console.log(req.body)
    res.end(JSON.stringify({}));
})

app.use(express.static("src"));
app.use(express.static("data"));

https
.createServer({
        key: fs.readFileSync("key.pem"),
        cert: fs.readFileSync("cert.pem"), 
    }, app)
.listen(port, ()=>{
    console.log(`server is runing on https://${ip}`)
});
