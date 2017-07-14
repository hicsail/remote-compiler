FROM ubuntu:16.04
FROM java:8
FROM python:3
FROM node:8

WORKDIR /usr/src/remote-compile
COPY . /usr/src/remote-compile/

RUN apt-get update

RUN npm install
RUN npm install -g pm2

EXPOSE 8000

CMD pm2 start index.js --no-daemon