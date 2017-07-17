'use strict';
const Async = require('async');
const Hapi = require('hapi');
const Joi = require('joi');
const uuidv4 = require('uuid/v4');
const { exec } = require('child_process');
const fs = require('fs');
const server = new Hapi.Server();
const Inert = require('inert');

server.register([require('vision'),Inert], (err) => {

    server.views({
        engines: { html: require('handlebars') },
        path: __dirname + '/views',
        layout: 'layout',
        layoutPath: __dirname + '/views'
    });
});

server.connection({ port: 8000, host: 'localhost' });

server.route({
    method: 'GET',
    path: '/public/{param*}',
    handler: {
        directory: {
            path: __dirname + '/public',
            listing: true
        }
    }
});

server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
        return reply.view('home');
    }
});

server.route({
    method: 'GET',
    path: '/languages',
    handler: function (request, reply) {
        return reply([
            'node',
            'java',
            'python'
        ]);
    }
});

server.route({
    method: 'GET',
    path: '/version',
    handler: function (request, reply) {
        exec(`sh ./scripts/version.sh`, (err, stdout, stderr) => {
            if (err) {
                return reply(err);
            }
            reply(JSON.parse(stdout));
        });
    }
});



server.route({
    method: 'POST',
    path: '/compile',
    handler: function (request, reply) {
        Async.auto({
            ID: function(callback) {
                callback(null,uuidv4());
            },
            createDir: ['ID', function (results,callback) {
                exec(`mkdir -p ./temp/${results.ID}`, (err, stdout, stderr) => {
                    if (err) {
                        return callback(err);
                    }
                    callback();
                });
            }],
            payload: function (callback) {
                var payload = {};
                var data = request.payload.split('\n');
                var firstLine = data[0].split(' ');
                payload.language = firstLine[0];
                payload.inputs = JSON.parse(firstLine.slice(1).join(' '));
                payload.code = data.slice(1).join('\n');
                callback(null,payload);
            },
            file: ['ID','payload', function (results,callback) {
                callback(null, `./temp/${results.ID}/${getFileName(results.payload.language)}`);
            }],
            makeFile: ['createDir', 'payload', function (results,callback) {
                fs.writeFile(results.file, results.payload.code,callback);
            }],
            runCode: ['makeFile', function (results,callback) {
                exec(`sh ./scripts/${results.payload.language}.sh ${results.file} ${results.payload.inputs}`, (err, stdout, stderr) => {
                    if(stderr){
                        return callback(stderr);
                    }
                    if(err){
                        return callback(err);
                    }
                    callback(null,stdout);
                });
            }]
        },(err, results) => {
            removeDir(results.ID);
            if(err){
                return reply(err);
            }
            reply(results.runCode);
        });
    }
});

function removeDir(ID) {
    exec(`rm -r ./temp/${ID}`, (err, stdout, stderr) => {

    });
}

function getFileName(language) {
    switch(language) {
        case 'node':
            return 'index.js';
        case 'java':
            return 'Index.java';
        case 'python':
            return 'index.py';
    }
}

server.start((err) => {

    if (err) {
        throw err;
    }
    console.log(`Server running at: ${server.info.uri}`);
});
