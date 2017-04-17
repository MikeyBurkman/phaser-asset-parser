
const Promise = require('bluebird');
const hasher = require('folder-hash');
const pixl = require('pixl-xml');
const globby = require('globby');
const R = require('ramda');
const fs = require('mz/fs');
const path = require('path');

const audioExtOrder = ['webm', 'ogg', 'm4a', 'mp3', 'aac', 'ac3', 'caf', 'flac', 'mp4', 'wav'];

Promise.resolve(globby('test_assets/**/*.*'))
    .then(groupFiles)
    .then(generateAudioMappings)
    .then((results) => ({audio: results}))
    .then(output)
    .then((result) => fs.writeFile('output.ts', result))
    .catch((err) => console.error(err.stack));

/*
{
    audio: {
        'audio': [music.ac3, music.m4a, ...]
    }
}
*/
function groupFiles(files) {
    const results = {};

    files.forEach((file) => {
        const fileType = getFileType(file);
        if (!fileType) {
            throw new Error('Unknown file type: ' + file);
        }
        if (!results[fileType]) {
            results[fileType] = [];
        }
        results[fileType].push(file);
    });

    return results;
}

function getFileExt(file) {
    return path.extname(file).substr(1);
}

function getFileName(file) {
    const ext = path.extname(file);
    return path.basename(file, ext);
}

function getFileType(file) {
    const fileTypes = {
        audio: ['aac', 'ac3', 'caf', 'flac', 'm4a', 'mp3', 'mp4', 'ogg', 'wav', 'webm'],
        image: ['bmp', 'gif', 'jpg', 'jpeg', 'png', 'webp'],
        font: ['eot', 'otf', 'svg', 'ttf', 'woff', 'woff2'],
        bitmapFont: ['xml', 'fnt'],
        json: ['json'],
        xml: ['xml'],
        text: ['txt'],
        js: ['js'],
        shader: ['frag'],
        css: ['css']
    };

    const fileExt = getFileExt(file);

    return Object.keys(fileTypes).find((fileType) => {
        const exts = fileTypes[fileType];
        return exts.some((ext) => ext === fileExt);
    });
}

function output(result) {
    return fs.readFile('resultTemplate.ts', 'utf8').then((template) => {
        return [
            template, 
            '\n',
            'export const assets: IAssestMapping = ',
            JSON.stringify(result, null, 2).replace(/\"/g, '\'') + ';'
        ].join('');
    });
}

// Returns an object matching the type of IAssetMapping.audio
function generateAudioMappings(groupedFiles) {
    if (!groupedFiles.audio) {
        return {};
    }

    const results = {};
    groupedFiles.audio.forEach((file) => {
        const name = getFileName(file);
        if (!results[name]) {
            results[name] = [];
        }
        results[name].push(file);
    });

    // Finally, need to sort the URLs according to audioExtOrder
    const sortFiles = (f1, f2) => {
        const e1 = getFileExt(f1);
        const e2 = getFileExt(f2);
        return audioExtOrder.indexOf(e1) - audioExtOrder.indexOf(e2);
    };
    return R.map(R.sort(sortFiles), results);
}