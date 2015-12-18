var http = require('http'),
    httpProxy = require('http-proxy'),
    net = require('net'),
    q = require('q'),
    path = require('path'),
    fs = require('fs'),
    parse = require('csv-parse'),
    sprintf = require('sprintf'),
    watch = require('node-watch');

var PROXY_TABLE_FILENAME = 'proxy.csv';

// Set up proxy rules instance
readProxyTableFile().then(function(data){
    var table = {};
    for(d in data){
        table[data[d].host] = data[d].port;
    }

    // Create reverse proxy instance
    var proxy = httpProxy.createProxy();

    proxy.on('error', function(e) {
        fs.appendFile('error.log', sprintf('%j\n', e));
    });

    // Create http server that leverages reverse proxy instance
    // and proxy rules to proxy requests to different targets
    http.createServer(function(req, res) {
        if(table.hasOwnProperty(req.headers.host)){
            var url = ['http://localhost', table[req.headers.host]].join(":");
            return proxy.web(req, res, {target: url});
        }
        checkAllConnections(table).then(function(result){
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            var string = 'Li Hau Proxy Status:\n';
            for(r in result){
                string += sprintf('%s: \t%s\n', r, result[r]?"off":"on");
            }
            res.end(string);
        });
    }).listen(80);

    //watch file changes
    watch(path.join(__dirname, PROXY_TABLE_FILENAME), function() {
        readProxyTableFile()
        .then(function(data){
            for(d in table){
                delete table[d];
            }
            for(d in data){
                table[data[d].host] = data[d].port;
            }
            fs.appendFile('app.log', 'Updated routing table');
        })
        .catch(function(error){
            fs.appendFile('error.log', sprintf("Failed to read %s error = %j", PROXY_TABLE_FILENAME, error));
        });
    });
})
.catch(function(error){
    fs.appendFile('error.log', sprintf("Failed to read %s", PROXY_TABLE_FILENAME));
    console.log(sprintf("Failed to read %s", PROXY_TABLE_FILENAME));
});

function readProxyTableFile(){
    return q.Promise(function(resolve, reject, notify) {
        var proxyTable = fs.readFileSync(path.join(__dirname, PROXY_TABLE_FILENAME));
        parse(proxyTable, {columns: true}, function(err, data){
            if(err){
                reject(err);
            }else{
                resolve(data);
            }
        });
    });
}

function checkAllConnections(table){
    var data = [];
    for(key in table){
        data.push({host: key, port: table[key]});
    }
    var result = {};
    return data.reduce(function(promise, d) {
        return promise.then(function() {
            return checkConnection('localhost', d.port)
                .then(function(status){
                    result[d.host] = status;
                });
        });
    }, q()).then(function(){
        return result;
    });
}

function checkConnection(host, port, timeout) {
    return q.Promise(function(resolve, reject, notify) {
        timeout = timeout || 10000;     // default of 10 seconds
        var timer = setTimeout(function() {
            resolve(false);
            socket.end();
        }, timeout);
        var socket = net.createConnection(port, host, function() {
            clearTimeout(timer);
            resolve(false);
            socket.end();
        });
        socket.on('error', function(err) {
            clearTimeout(timer);
            if(err.code == 'EADDRINUSE' || err.code == 'ECONNREFUSED'){
                resolve(true);
            }else{
                resolve(false);
            }
        });
    });
}
