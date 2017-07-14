'use strict';
const Async = require('async');
const Hapi = require('hapi');
const Joi = require('joi');
const uuidv4 = require('uuid/v4');
const { exec } = require('child_process');
const fs = require('fs');

const server = new Hapi.Server();
server.connection({ port: 8000, host: 'localhost' });

server.route({
    method: 'POST',
    path: '/compile',
    config: {
        validate: {
            payload: {
                language: Joi.string().allow('javascript','java').required(),
                code: Joi.string().required()
            }
        }
    },
    handler: function (request, reply) {
        Async.auto({
            ID: function(callback) {
                callback(null,uuidv4());
            },
            createDir: ['ID', function (results,callback) {
                exec(`mkdir -p ./code/${results.ID}`, (err, stdout, stderr) => {
                    if (err) {
                        return callback(err);
                    }
                    callback();
                });
            }],
            file: ['ID', function (results,callback) {
                callback(null, `./code/${results.ID}/${getFileName(request.payload.language)}`);
            }],
            makeFile: ['createDir', function (results,callback) {
                fs.writeFile(results.file, request.payload.code,callback);
            }],
            runCode: ['makeFile', function (results,callback) {
                exec(`sh ./scripts/${request.payload.language}.sh ${results.file}`, (err, stdout, stderr) => {
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
    exec(`rm -r ./code/${ID}`, (err, stdout, stderr) => {

    });
}

function getFileName(language) {
    switch(language) {
        case 'javascript':
            return 'index.js';
        case 'java':
            return 'Index.java';
    }
}

server.start((err) => {

    if (err) {
        throw err;
    }
    console.log(`Server running at: ${server.info.uri}`);
});