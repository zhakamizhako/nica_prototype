'use strict'

const { spawn } = require('child_process')
const path = require('path')
const { HttpException } = use('@adonisjs/generic-exceptions')
const Helpers = use('Helpers')
// var {PythonShell} = use('python-shell');

class PyTestController {
  async pyTest({ request, response }) {
    console.log('Ey')
    let data = {};

    try {

      let runPy = new Promise(function (success, nosuccess) {
        let lastError = '';
        const { spawn } = require('child_process');
        const pyprog = spawn('/home/zhakami/venv/bin/python3', [path.join(__dirname, '../../DeviceHive/parse_file.py'), path.join(__dirname, '../../../samples/wheeze (17).wav')]);

        console.log('spawning')
        pyprog.stdout.on('data', function (data) {
          console.log(data.toString())
          success(data);
        });

        pyprog.stderr.on('data', (data) => {
          lastError = data.toString();
        });
        
        pyprog.on('close', (data) => {
          console.log('closed::' + data);
          if (data != 0) {
            nosuccess(lastError);
          }
        })
      })

      try {
        await runPy.then(function (fromRunpy) {
          console.log('wtf')
          
          // console.log(fromRunpy.toString());
          data = JSON.parse(`{${fromRunpy.toString()}}`)
          let b = Object.keys(data).map(i => {
            let d = {
              "name": i,
              "value": parseFloat(data[i])
            }
            return d
          })
          data = b;
        });
      } catch (e) {
        console.log(e)
        data = {
          error: e
        }
      }


    } catch (e) {
      console.log(e)
      throw new HttpException(e, 500)
    }

    response.send({ test: 'Hey!', data: data })
  }

  async parseAudio({request, response}){
    let { user } = request.all()

    const validationOptions = {
      types: ['audio']
    }

    const file = request.file('file', validationOptions)

    console.log(user)
    // console.log(file)
    // console.log(await this.create_UUID())
    let b = await this.create_UUID()

    await file.move('public/audioparse', {
      name: `${b}.wav`,
      overwrite: true
    })

    if(!file.moved()){
      console.log('move error.')
      console.log(file.error())
      response.send({error: file.error()})
    }

    console.log(file.fileName)

    // console.log('Ey')
    let data = {};

    try {

      let runPy = new Promise(function (success, nosuccess) {
        let lastError = '';
        const { spawn } = require('child_process');
        const pyprog = spawn('/home/zhakami/venv/bin/python3', [path.join(__dirname, '../../DeviceHive/parse_file.py'), path.join(__dirname, `../../../public/audioparse/${file.fileName}`)]);

        console.log('spawning')
        pyprog.stdout.on('data', function (data) {
          console.log(data.toString())
          success(data);
        });

        pyprog.stderr.on('data', (data) => {
          lastError = data.toString();
        });
        
        pyprog.on('close', (data) => {
          console.log('closed::' + data);
          if (data != 0) {
            nosuccess(lastError);
          }
        })
      })

      try {
        await runPy.then(function (fromRunpy) {
          console.log('wtf')
          
          // console.log(fromRunpy.toString());
          data = JSON.parse(`{${fromRunpy.toString()}}`)
          let b = Object.keys(data).map(i => {
            let d = {
              "name": i,
              "value": parseFloat(data[i])
            }
            return d
          })
          data = b;
        });
      } catch (e) {
        console.log(e)
        data = {
          error: e
        }
      }


    } catch (e) {
      console.log(e)
      throw new HttpException(e, 500)
    }

    response.send({ test: 'Hey!', data: data })
    
    // response.send({status:'OK'})
  }

  async create_UUID(){
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
}
}

module.exports = PyTestController
