#!/usr/bin/env node
import path from 'node:path';
import readline from 'node:readline';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const projectPathArg = process.argv[2] || 'project';
const projectPath = path.resolve(projectPathArg);

if(fs.existsSync(projectPath)){
    const answer = await readLine(`${projectPath} already exists. Remove it and make new project? (y/n)`);
    if(!isYes(answer)){
        process.exit();
    }

    fs.rmSync(projectPath, {recursive: true, force: true});
}

console.log('Copying project files...');
fs.cpSync(path.resolve(import.meta.dirname, 'template'), projectPath, {recursive: true, force: true});

console.log("Installing packages...");
execSync("npm install", {cwd: projectPath});

console.log('Complete!');
process.exit();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
function readLine(question){
    return new Promise((res) => {
        rl.question(question, (answer) => res(answer));
    })
}

/**
 * @param {string} y 
 */
function isYes(y){
    y = y.toLowerCase();
    if(y === "y" || y === "yes"){
        return true;
    }
    return false;
}

export {};