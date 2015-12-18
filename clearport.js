require('shelljs/global');
var argv = require('yargs')
    .usage('Usage: $0 [--all] [--p <port>]')
    .argv;
var sudo = require('sudo');
var options = {
    cachePassword: true,
    prompt: 'Password: ',
    spawnOptions: { /* other options for spawn */ }
};

if(argv.all){
    var path = require('path'),
        fs = require('fs'),
        parse = require('csv-parse');
    var proxyTable = fs.readFileSync(path.join(__dirname, 'proxy.csv'));
    parse(proxyTable, {columns: true}, function(err, data){
        var table = {};
        for(d in data){
	        console.log("releasing port " + data[d].port);
            sudo(['fuser', '-k', data[d].port + '/tcp'], options);
        }
    });
}else if(argv.p){
    console.log("releasing port " + p);
    sudo(['fuser', '-k', p + '/tcp'], options);
}
