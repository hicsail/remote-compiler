'use strict';
const Async = require('async');
const Hapi = require('hapi');
const Joi = require('joi');
const uuidv4 = require('uuid/v4');
const { exec } = require('child_process');

const server = new Hapi.Server();
server.connection({ port: 8000, host: 'localhost' });

server.route({
    method: 'POST',
    path: '/compile',
    config: {
        validate: {
            payload: {
                language: Joi.string().allow('javascript').required(),
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
            makeFile: ['createDir', function (results,callback) {
                exec(`echo ${request.payload.code} > ./code/${results.ID}/${getFileName(request.payload.language)}`, (err, stdout, stderr) => {
                    if (err) {
                        console.log(stdout,stderr)
                        return callback(err);
                    }
                    callback();
                });
            }]
        },(err, results) => {
           if(err){
               return reply(err);
           }
           reply(results);
        });
    }
});

function getFileName(language) {
    switch(language) {
        case 'javascript':
            return 'index.js';
    }
}

server.start((err) => {

    if (err) {
        throw err;
    }
    console.log(`Server running at: ${server.info.uri}`);
});