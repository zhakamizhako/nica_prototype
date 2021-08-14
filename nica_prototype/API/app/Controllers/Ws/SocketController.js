'use strict'
const _ = use('lodash')
const User = use('App/Models/User')
const Device = use('App/Models/Device')
const Hash = use('Hash')
const Ws = use('Ws')
// const bs = Ws.getChannel('socket').topic('socket')

let socketList=[];

class SocketController {
  constructor ({ socket, request }) {
    this.socket = socket
    this.request = request
    console.log('[DEVICE] Connected :' + socket.id)
    socketList.push({id:socket.id, type:'listener', userId: null, bpm:null})
    console.table(socketList)
  }

  async onLogin(data) {
    let { username, password } = data.login
    console.log(data)
    // this.socket.emit('logon', {type:'fail'},this.socket.id)
    let user = await User.findBy('username', username)
    let pass = await Hash.verify(password, user.password)

    if(pass){
      this.socket.emit('logon', {type:'success', user}, this.socket.id)
      let b = _.findIndex(socketList, {id: this.socket.id})
      socketList[b].userId=user.id
      console.table(socketList)
    }
    if(!pass){
      this.socket.emitTo('logon', {type:'fail'}, this.socket.id)
    }
  }

  async onRegister(data){
    console.log(data)
    let {
      username,
      password,
      email
    } = data.login

    let user = await User.findBy('username', username)
    if (user){
      this.socket.emit('registration', {type:'fail', message:'User already exists.'}, this.socket.id)
    }
    if(!user){
      try{
        user = new User()
        user.username = username
        user.password = password
        user.email = email
  
        await user.save()
        this.socket.emit('registration', {type:'success', user}, this.socket.id)
        let b = _.findIndex(socketList, {id:this.socket.id})
        socketList[b].userId = user.id
        console.table(socketList)
      } catch (e) {
        console.log(e)
        this.socket.emit('error', {message: e}, this.socket.id)
      }
    }
  }

  async onMode(data){
    let b = _.findIndex(socketList, {id:this.socket.id})
    if(data.type=="host_connected"){
      socketList[b].type = 'host'
    }
    if(data.type=='host_disconnected'){
      socketList[b].type='listener'
    }
    console.table(socketList)
  }

  async onBeep(data){
    let b = _.findIndex(socketList, {id:this.socket.id})
    if(socketList[b].type==='host'){
      socketList[b].bpm = data.bpm
      socketList[b].lat = data.lat
      socketList[b].lng = data.lng
    }
    if(socketList[b].userId){
      let broadcastList=[]
      socketList.map(entry =>{
        if(entry.userId==socketList[b].userId && entry.type=='listener'){
          let x = _.findIndex(socketList, {id:entry.id})
          socketList[x].bpm=data.bpm
          broadcastList.push(entry.id)
        }
      })
      console.log(broadcastList)
        const c = Ws.getChannel('socket').topic('socket')
        c.emitTo('boop', {bpm:data.bpm, lat:data.lat, lng:data.lng}, broadcastList)
    }
    console.table(socketList)
  }

  onClose(socket) {
    console.log('[DEVICE] Disconnected :' + socket.id)
    let index = _.findIndex(socketList, {id:socket.id})
    socketList.splice(index,1);
    console.table(socketList)
  }

  async onBreathing(data){
    let b = _.findIndex(socketList, {id:this.socket.id})
    if(socketList[b].type=='host'){
      socketList[b].btresult = data.state
      socketList[b].lat = data.lat
      socketList[b].lng = data.lng

      let broadcastList=[]
      socketList.map(entry=>{
        if(entry.userId==socketList[b].userId && entry.type=='listener'){
        let x = _.findIndex(socketList, {id:entry.id})
        socketList[x].btresult = data.state
        socketList[x].lat = data.lat
        socketList[x].lng = data.lng

        broadcastList.push(entry.id)

        console.log(broadcastList)
          const c = Ws.getChannel('socket').topic('socket')
          c.emitTo('btboop', {btresult: data.state, lat:data.lat, lng:data.lng}, broadcastList)
        }
      })
      console.table(socketList)
    }
  }

}

module.exports = SocketController
