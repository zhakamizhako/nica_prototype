/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  NativeEventEmitter,
  NativeModules,
  AppState,
  Platform,
  PermissionsAndroid,
  Alert,
  Dimensions,
} from 'react-native';
import Permissions from 'react-native-permissions';
import {connect} from 'react-redux';
import {Colors} from 'react-native/Libraries/NewAppScreen';
// import { audio } from '@ant-design/icons-react-native';
import BleManager from 'react-native-ble-manager';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
import AudioRecord from 'react-native-audio-record';
import {Buffer} from 'buffer';
import {setLogin, logout, setIP, parseAudio} from './src/store/modules/auth';
import RNFetchBlob from 'react-native-fetch-blob';
import Geolocation from 'react-native-geolocation-service';
import _ from 'lodash';
import MapView, {
  Circle,
  Marker,
  Callout,
  PROVIDER_GOOGLE,
} from 'react-native-maps';

const mapStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    height: 400,
    width: 400,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    height: 400,
    width: '100%',
    // ...StyleSheet.absoluteFillObject
  },
});

const axios = require('axios');
import {
  Button,
  WhiteSpace,
  WingBlank,
  InputItem,
  Icon,
  TabBar,
  List,
  Toast,
  Modal,
} from '@ant-design/react-native';

import Item from '@ant-design/react-native/lib/list/ListItem';
import Ws from './src/Tools/@adonisjs/websocket-client';
var ws;
var stream;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      scanning: false,
      peripherals: new Map(),
      appState: '',
      resulting: [],
      drawerOpen: false,
      tab: 0,
      connectionState: false,
      bpm: null,
      deviceInfo: {},
      serverIp: '192.168.43.244',
      serverState: false,
      user: null,
      login: {
        username: '',
        password: '',
      },
      isRegister: false,
      isLoggingIn: false,
      loginError: false,
      isRecording: false,
      isWaiting: false,
      audioResponse: [],
      patientLat: null,
      patientLng: null,
      patientState: null,
    };
    this.handleDiscoverPeripheral = this.handleDiscoverPeripheral.bind(this);
    this.handleStopScan = this.handleStopScan.bind(this);
    this.handleUpdateValueForCharacteristic = this.handleUpdateValueForCharacteristic.bind(
      this,
    );
    this.handleDisconnectedPeripheral = this.handleDisconnectedPeripheral.bind(
      this,
    );
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
  }

  initBt() {
    AppState.addEventListener('change', this.handleAppStateChange);

    BleManager.start({showAlert: false});

    this.handlerDiscover = bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      this.handleDiscoverPeripheral,
    );
    this.handlerStop = bleManagerEmitter.addListener(
      'BleManagerStopScan',
      this.handleStopScan,
    );
    this.handlerDisconnect = bleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      this.handleDisconnectedPeripheral,
    );
    this.handlerUpdate = bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      this.handleUpdateValueForCharacteristic,
    );

    if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ).then(result => {
        if (result) {
          console.log('Permission is OK');
        } else {
          PermissionsAndroid.requestPermission(
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ).then(result => {
            if (result) {
              console.log('User accept');
            } else {
              console.log('User refuse');
            }
          });
        }
      });
    }
  }

  initWs(ip) {
    try {
      ws.close();
    } catch (e) {
      console.log('missing?');
    }
    ws = Ws('ws://' + ip + ':3333');
    ws.connect();
    stream = ws.subscribe('socket');

    //Connection Listeners
    stream.on('open', () => {
      try {
        stream.getSubscription('socket');
      } catch (e) {
        stream.subscribe('socket');
      }
    });

    stream.on('ready', () => {
      this.setState({serverState: true});
      Toast.info('Connected to Server', Toast.SHORT);
    });

    stream.on('logon', data => {
      console.log(data);
      if (data.type === 'success') {
        this.setState({isLoggingIn: false, user: data.user});
      }
      if (data.type === 'fail') {
        this.setState({isLoggingIn: false, loginError: true});
      }
    });

    stream.on('registration', data => {
      console.log(data);
      if (data.type == 'success') {
        this.setState({
          isRegistering: false,
          user: data.user,
          isRegister: false,
        });
      }
    });

    stream.on('boop', data => {
      console.log(data);
      this.setState({
        bpm: data.bpm,
      });
    });

    stream.on('btboop', data => {
      console.log('::::-----::::::::::');
      // console.log(data);

      this.setState({
        patientLat: data.lat,
        patientLng: data.lng,
        patientState: data.btresult,
      });
    });

    stream.on('error', data => {
      console.log(data);
    });
  }

  parseResults(data) {
    let b = data;
    b = _.sortBy(data, [
      function(o) {
        return o.value;
      },
    ]);
    return b;
  }

  giveResult() {
    let b = this.state.patientState;
    let result = 'Patient is Okay.';
    b.map(entry => {
      if (
        entry.name === 'Wheezing' ||
        entry.name === 'Wheezing 2' ||
        entry.name === 'Wheezing 3'
      ) {
        result = 'Patient may be at risk of an asthma attack.';
      }
    });
    // console.log(result);
    return result;
  }

  async componentDidMount() {
    //WEBSOCKET
    this.initWs(this.state.serverIp);
    //BT
    this.initBt();
    //AudioRecorder
    const options = {
      sampleRate: 16000, // default 44100
      channels: 1, // 1 or 2, default 1
      bitsPerSample: 16, // 8 or 16, default 16
      wavFile: 'test.wav', // default 'audio.wav'
    };

    await this.checkPermission();

    AudioRecord.init(options);

    AudioRecord.on('data', data => {
      const chunk = Buffer.from(data, 'base64');
      console.log('chunk size', chunk.byteLength);
      // do something with audio chunk
    });

    // console.log(this.props);
    this.setState({serverIp: this.props.auth.hostname});

    if (this.hasLocationPermission) {
      Geolocation.getCurrentPosition(
        position => {
          // console.log(position);
        },
        error => {
          // See error code charts below.
          console.log(error.code, error.message);
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
      this.getLocationUpdates();
    }
    if (!this.hasLocationPermission) {
      // console.log("nein.");
    }
  }

  requestPermission = async () => {
    const p = await Permissions.request('microphone');
    console.log('permission request', p);
  };

  getLocationUpdates = async () => {
    const hasLocationPermission = await this.hasLocationPermission();

    if (!hasLocationPermission) {
      return;
    }

    this.setState({updatesEnabled: true}, () => {
      console.log('gotpos');
      this.watchId = Geolocation.watchPosition(
        position => {
          // console.log(position.coords);
          this.setState({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            hasLocation: true,
          });
        },
        error => {
          this.setState({location: error});
          console.log(error);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 0,
          interval: 5000,
          fastestInterval: 2000,
        },
      );
    });
  };

  handleAppStateChange(nextAppState) {
    // if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
    console.log('App has come to the foreground!');
    BleManager.getConnectedPeripherals([]).then(peripheralsArray => {
      console.log('Connected peripherals: ' + peripheralsArray.length);
      if (peripheralsArray.length > 0) {
        this.setState({connectionState: true});
      }
    });

    this.setState({appState: nextAppState});
  }

  componentWillUnmount() {
    this.handlerDiscover.remove();
    this.handlerStop.remove();
    this.handlerDisconnect.remove();
    this.handlerUpdate.remove();
  }

  //BT Disconnect
  handleDisconnectedPeripheral(data) {
    let peripherals = this.state.peripherals;
    let peripheral = peripherals.get(data.peripheral);
    if (peripheral) {
      peripheral.connected = false;
      peripherals.set(peripheral.id, peripheral);
      this.setState({peripherals});
    }
    this.setState({connectionState: false});
    console.log('Disconnected from ' + data.peripheral);
    if (this.state.serverState) {
      stream.emit('mode', {type: 'host_disconnected'});
    }
  }

  //Location Permissions
  hasLocationPermission = async () => {
    if (
      Platform.OS === 'ios' ||
      (Platform.OS === 'android' && Platform.Version < 23)
    ) {
      return true;
    }

    const hasPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );

    if (hasPermission) {
      return true;
    }

    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );

    if (status === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    }

    if (status === PermissionsAndroid.RESULTS.DENIED) {
      Toast.show('Location permission denied by user.', Toast.SHORT);
    } else if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Toast.show('Location permission revoked by user.', Toast.SHORT);
    }

    return false;
  };

  //BT Receive
  handleUpdateValueForCharacteristic(data) {
    console.log(
      'Received data from ' +
        data.peripheral +
        ' characteristic ' +
        data.characteristic,
      data.value,
    );
  }

  handleStopScan() {
    console.log('Scan is stopped');
    let b = [];
    this.state.peripherals.forEach(value => {
      console.log(this.state.peripherals.values());
      console.log(value);
      b.push(value);
    });
    this.setState({resulting: b});
    this.setState({scanning: false});
  }

  //Start BT Scan
  startScan() {
    if (!this.state.scanning) {
      //this.setState({peripherals: new Map()});
      BleManager.scan([], 3, true).then(results => {
        console.log('Scanning...');
        this.setState({scanning: true});
      });
    }
  }

  retrieveConnected() {
    BleManager.getConnectedPeripherals([]).then(results => {
      if (results.length == 0) {
        console.log('No connected peripherals');
        // this.setState({connected:false})
      }
      console.log(results);
      var peripherals = this.state.peripherals;
      for (var i = 0; i < results.length; i++) {
        var peripheral = results[i];
        peripheral.connected = true;
        peripherals.set(peripheral.id, peripheral);
        this.setState({peripherals});
      }
    });
  }

  handleDiscoverPeripheral(peripheral) {
    var peripherals = this.state.peripherals;
    console.log('Got ble peripheral', peripheral);
    if (!peripheral.name) {
      peripheral.name = 'NO NAME';
    }
    peripherals.set(peripheral.id, peripheral);
    this.setState({peripherals});
  }

  //Disconnect due to Incompatible or Unavailable BT Device
  unconncectedDevice() {
    this.setState({connectionState: false});
    Alert.alert('This peripheral is not available.');
  }

  //Test Device and Assign.
  test(peripheral) {
    if (peripheral) {
      if (peripheral.connected) {
        BleManager.disconnect(peripheral.id);
        this.setState({connectionState: false});
      } else {
        BleManager.connect(peripheral.id)
          .then(() => {
            let peripherals = this.state.peripherals;
            let p = peripherals.get(peripheral.id);
            let id = peripheral.id;
            if (p) {
              p.connected = true;
              peripherals.set(id, p);
              this.setState({peripherals});
            }
            console.log('Connected to ' + id);
            this.setState({connectionState: true});

            setTimeout(() => {
              BleManager.retrieveServices(id).then(peripheralInfo => {
                console.log(peripheralInfo);
                var service = 'bcb9dcf3-7206-44b4-a4ab-470aeb9b19ee';
                var characteristic1 = '6e4aa076-b3c3-4ce3-b78d-0c4e092640f4'; //calibrate as well
                var characteristicSensor =
                  '9b35563b-bde8-4b94-92c4-b687725c3b9a';
                var characteristicAccelerometer =
                  '9b35563b-bde8-4b94-92c4-b687725c3b9b';

                setTimeout(() => {
                  BleManager.read(id, service, characteristic1)
                    .then(values => {
                      let b = [];
                      values.map(entry => {
                        let x = String.fromCharCode(entry);
                        b.push(x);
                      });
                      console.log(b.join(''));
                      this.setState(state => {
                        let {deviceInfo} = state;
                        deviceInfo.name = peripheral.name;
                        deviceInfo.welcome = b.join('');
                        deviceInfo.id = peripheral.id;
                      });
                    })
                    .catch(error => {
                      console.log('errorBLE:' + error);
                    });
                }, 200);

                setTimeout(() => {
                  BleManager.startNotification(
                    id,
                    service,
                    characteristicSensor,
                  )
                    .then(() => {
                      Toast.info(
                        'Connected to ' + peripheral.name,
                        Toast.SHORT,
                      );
                      console.log('Started sensing/notification on ' + id);
                      if (this.state.serverState) {
                        stream.emit('mode', {type: 'host_connected'});
                      }
                      bleManagerEmitter.addListener(
                        'BleManagerDidUpdateValueForCharacteristic',
                        ({value, peripheral, characteristic, service}) => {
                          if (value.length == 0) {
                            this.setState({bpm: null});
                          } else {
                            this.setState({bpm: value});
                            if (value > 120 && this.state.tab !== 4) {
                              this.setState({notifModal: true});
                            }
                            if (this.state.serverState) {
                              stream.emit('beep', {
                                bpm: value,
                                lat: this.state.lat,
                                lng: this.state.lng,
                              });
                            }
                          }
                        },
                      );
                    })
                    .catch(error => {
                      console.log('Notification error', error);
                    });
                }, 1000);
              });
            }, 900);
          })
          .catch(error => {
            console.log('Connection error', error);
            this.unconncectedDevice();
          });
      }
    }
  }

  //Audio Permissions

  checkPermission = async () => {
    const p = await Permissions.check('microphone');
    console.log('permission check', p);
    if (p === 'authorized') {
      return;
    }
    return this.requestPermission();
  };

  onMapLayout = () => {
    this.setState({isMapReady: true});
  };

  render() {
    return (
      <>
        <WhiteSpace />
        <SafeAreaView>
          <WingBlank>
            <ScrollView
              contentInsetAdjustmentBehavior="automatic"
              style={styles.scrollView}>
              <Modal
                title="Whoah there."
                visible={this.state.notifModal}
                onClose={() => this.setState({notifModal: false})}
                transparent
                closable
                maskClosable
                footer={[
                  {
                    text: 'Close',
                    onPress: () => this.setState({notifModal: false}),
                  },
                  {
                    text: 'Yes, take me there',
                    onPress: () => {
                      this.setState({notifModal: false, tab: 4});
                    },
                  },
                ]}>
                <View style={{paddingVertical: 20}}>
                  <Text style={{textAlign: 'center'}}>
                    Your bpm rate is unusually high ({this.state.bpm}). Check
                    your breathing whether if there is a potential asthma
                    attack.{' '}
                  </Text>
                </View>
              </Modal>
              {/* APP HOME */}
              {this.state.tab == 0 && (
                <View>
                  <Text>SmartAsth</Text>
                  <View
                    style={{
                      alignContent: 'center',
                      flex: 1,
                      marginLeft: 'auto',
                      marginRight: 'auto',
                    }}>
                    <Text>
                      Hello{' '}
                      {this.state.user ? this.state.user.username : 'Guest'}
                    </Text>
                  </View>

                  <View style={{alignContent: 'center', flex: 1}}>
                    <Text>
                      Bluetooth State:{' '}
                      {this.state.connectionState
                        ? 'Connected'
                        : 'Disconnected'}{' '}
                      {this.state.deviceInfo.id}
                    </Text>
                  </View>
                  <View style={{alignContent: 'center', flex: 1}}>
                    <Text>
                      Server Connection Status:{' '}
                      {this.state.serverState ? 'Connected' : 'Disconnected'}{' '}
                    </Text>
                  </View>
                  <View style={{alignContent: 'center', flex: 1}}>
                    <Text>ServerIP: {this.state.serverIp}</Text>
                  </View>

                  <View
                    style={{
                      alignContent: 'center',
                      flex: 1,
                      marginTop: 100,
                      marginLeft: 'auto',
                      marginRight: 'auto',
                    }}>
                    <Icon style={{fontSize: 115}} name="heart" />
                    <Text style={{fontSize: 20}}>
                      BPM: {this.state.bpm ? this.state.bpm : 'Unavailable'}
                    </Text>

                    {/* Map */}
                  </View>
                  <WhiteSpace size="lg" />
                  {this.state.patientState && (
                    <>
                      <Text>User's Breathing test Results:</Text>
                      {this.state.audioResponse.map(entry => {
                        return <Text>{entry.name + ':' + entry.value}</Text>;
                      })}
                      <Text>{this.giveResult()}</Text>
                    </>
                  )}

                  <View
                    style={{flex: 1, width: Dimensions.get('window').width}}>
                    <MapView
                      // liteMode
                      style={mapStyles.map}
                      // provider={PROVIDER_GOOGLE}
                      ref={eb => (this.map = eb)}
                      onLayout={this.onMapLayout}
                      initialRegion={{
                        latitude: 7.1046193,
                        longitude: 125.6329354,
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421,
                      }}>
                      {this.state.isMapReady && (
                        <>
                          {this.state.hasLocation && (
                            <Marker
                              coordinate={{
                                latitude: this.state.lat,
                                longitude: this.state.lng,
                              }}>
                              <Callout>
                                <Text>You are Here</Text>
                              </Callout>
                            </Marker>
                          )}
                          {this.state.patientState &&
                            this.state.patientLat &&
                            this.state.patientLng && (
                              <Marker
                                coordinate={{
                                  latitude: this.state.patientLat,
                                  longitude: this.state.patientLng,
                                }}>
                                <Callout>
                                  <Text>Patient's Location</Text>
                                </Callout>
                              </Marker>
                            )}
                        </>
                      )}
                    </MapView>
                  </View>
                </View>
              )}
              {/* DEVICE CONNECTION TAB */}
              {this.state.tab === 1 && (
                <View>
                  <Text>Server Settings</Text>
                  <InputItem
                    clear
                    extra={
                      <Button
                        size="small"
                        onPress={() => {
                          this.props.setIP(this.state.serverIp);
                          if (ws) {
                            try {
                              ws.close();
                            } catch (e) {
                              console.log('Seems a problem with network.');
                            }

                            this.setState({serverState: false});
                          }
                          this.initWs(this.state.serverIp);
                        }}>
                        Save
                      </Button>
                    }
                    placeholder="192.168.43.244"
                    value={this.state.serverIp}
                    type="number"
                    onChange={e => {
                      this.setState({serverIp: e});
                    }}>
                    Server IP
                  </InputItem>
                  <Text>
                    Server connection Status:{' '}
                    {this.state.serverState ? 'Connected' : 'Disconnected'}
                  </Text>

                  <WhiteSpace size="lg" />
                  <Text>BT Setup</Text>
                  <Button
                    loading={this.state.scanning}
                    onPress={() => this.startScan()}>
                    {!this.state.scanning && 'Scan for Devices'}
                    {this.state.scanning && 'Scanning...'}
                  </Button>
                  <Button
                    disabled={!this.state.connectionState}
                    onPress={() => {
                      BleManager.disconnect(this.state.deviceInfo.id);
                      this.setState({connectionState: false, deviceInfo: {}});
                    }}>
                    Disconnect
                  </Button>

                  {this.state.resulting &&
                    this.state.resulting.map(entry => (
                      <Button
                        onPress={() => {
                          this.test(entry);
                        }}>
                        {entry.id} - {entry.name}
                      </Button>
                    ))}
                </View>
              )}

              {/* USER LOGIN TAB!! */}
              {this.state.tab === 2 && (
                <View>
                  {!this.state.isRegister ? (
                    <View>
                      {/* User is Logged */}
                      {this.state.user && (
                        <View>
                          <View>
                            <Text>Hi, {this.state.user.username}</Text>
                          </View>
                          <Text>User Information</Text>
                          <View>
                            <Text>Username: {this.state.user.username}</Text>
                          </View>
                          <View>
                            <Text>E-mail: {this.state.user.email}</Text>
                          </View>
                          <WhiteSpace size="lg" />
                          <Button
                            onPress={() => {
                              this.setState({user: null});
                              this.initWs(this.state.serverIp);
                            }}>
                            Logout
                          </Button>
                        </View>
                      )}

                      {/* User not Logged in */}
                      {!this.state.user && (
                        <View>
                          <Text>User Login</Text>
                          <InputItem
                            clear
                            extra="元"
                            placeholder="Username"
                            error={this.state.loginError}
                            onChange={e =>
                              this.setState(state => {
                                let {login, loginError} = state;
                                loginError = false;
                                login.username = e;
                                return {login, loginError};
                              })
                            }>
                            Username
                          </InputItem>
                          <InputItem
                            clear
                            type="password"
                            extra="元"
                            placeholder="Password"
                            error={this.state.loginError}
                            onChange={e =>
                              this.setState(state => {
                                let {login, loginError} = state;
                                loginError = false;
                                login.password = e;
                                return {login, loginError};
                              })
                            }>
                            Password
                          </InputItem>
                          <Button
                            disabled={!this.state.serverState}
                            loading={this.state.isLoggingIn}
                            onPress={() => {
                              if (
                                this.state.login.username &&
                                this.state.login.password
                              ) {
                                this.setState({isLoggingIn: true});
                                stream.emit('login', {
                                  login: this.state.login,
                                });
                              } else {
                                this.setState({loginError: true});
                              }
                            }}>
                            {this.state.serverState
                              ? 'Login'
                              : 'Connect to Server'}
                          </Button>
                          <WhiteSpace size="lg" />
                          <View
                            style={{
                              alignContent: 'center',
                              flex: 1,
                              marginLeft: 'auto',
                              marginRight: 'auto',
                            }}>
                            <Text
                              style={{color: '#1111FF'}}
                              onPress={() => this.setState({isRegister: true})}>
                              Or Register a new Account?
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  ) : (
                    // User Registration
                    <View>
                      <Text> User Registration</Text>
                      <InputItem
                        clear
                        placeholder="Username"
                        error={this.state.loginError}
                        onChange={e =>
                          this.setState(state => {
                            let {login} = state;
                            login.username = e;
                            return {login};
                          })
                        }>
                        Username
                      </InputItem>
                      <InputItem
                        clear
                        type="password"
                        placeholder="Password"
                        error={this.state.loginError}
                        onChange={e =>
                          this.setState(state => {
                            let {login} = state;
                            login.password = e;
                            return {login};
                          })
                        }>
                        Password
                      </InputItem>
                      <InputItem
                        clear
                        placeholder="example@mail.com"
                        error={this.state.loginError}
                        onChange={e =>
                          this.setState(state => {
                            let {login} = state;
                            login.email = e;
                            return {login};
                          })
                        }>
                        E-mail
                      </InputItem>
                      <Button
                        loading={this.state.isRegistering}
                        onPress={() => {
                          this.setState({isRegistering: true});
                          stream.emit('register', {
                            login: this.state.login,
                          });
                        }}>
                        Register
                      </Button>
                      <WhiteSpace size="lg" />
                      <View
                        style={{
                          alignContent: 'center',
                          flex: 1,
                          marginLeft: 'auto',
                          marginRight: 'auto',
                        }}>
                        <Text
                          style={{color: '#1111FF'}}
                          onPress={() => this.setState({isRegister: false})}>
                          Cancel
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Breathing Test tab */}
              {this.state.tab == 4 && (
                <View>
                  {/* {this.checkPermission()} */}
                  <Text>Breathing Test</Text>
                  <View
                    style={{
                      alignContent: 'center',
                      flex: 1,
                      marginTop: 100,
                      marginLeft: 'auto',
                      marginRight: 'auto',
                    }}>
                    <Icon
                      style={{fontSize: 125}}
                      color={this.state.isRecording ? '#F00' : '#000'}
                      name="audio"
                    />
                    <WhiteSpace size="lg" />
                    <Button
                      disabled={!this.state.serverState}
                      loading={this.state.isWaiting}
                      onPress={async () => {
                        if (!this.state.isRecording) {
                          console.log(AudioRecord);

                          AudioRecord.start();
                          this.setState({isRecording: true});
                        }
                        if (this.state.isRecording) {
                          this.setState({isRecording: false, isWaiting: true});
                          let audioFile = await AudioRecord.stop();
                          console.log(audioFile);

                          let formData = new FormData();
                          formData.append('user', 'Admin');
                          formData.append('file', {
                            uri: `file://${audioFile}`,
                            name: 'test.wav',
                            type: 'image/jpg',
                          });
                          console.log(
                            `http://${
                              this.props.auth.hostname
                            }:3333/parseaudio`,
                          );
                          console.log(`file://${audioFile}`);
                          console.log(formData);

                          RNFetchBlob.fetch(
                            'POST',
                            `http://${
                              this.props.auth.hostname
                            }:3333/parseaudio`,
                            {
                              'Content-Type': 'multipart/form-data',
                            },
                            [
                              {
                                name: 'file',
                                filename: 'test.wav',
                                type: 'audio/wav',
                                data: RNFetchBlob.wrap(audioFile),
                              },
                              // elements without property `filename` will be sent as plain text
                              {name: 'user', data: 'Admin'},
                            ],
                          )
                            .then(resp => {
                              console.log('good');
                              this.setState({isWaiting: false});
                              let returnData = JSON.parse(resp.data);

                              let c = this.parseResults(returnData.data);
                              console.log(c);
                              this.setState({audioResponse: c});
                              if (this.state.serverState) {
                                stream.emit('breathing', {
                                  state: c,
                                  lat: this.state.lat,
                                  lng: this.state.lng,
                                });
                              }
                              // console.log(JSON.parse(resp.data));
                            })
                            .catch(err => {
                              this.setState({isWaiting: false});
                              console.log(err);
                              console.log('error');
                            });
                        }
                      }}>
                      {this.state.serverState ? (
                        <>
                          {this.state.isRecording && 'Stop'}
                          {!this.state.isRecording &&
                            !this.state.isWaiting &&
                            'Begin'}
                          {this.state.isWaiting && 'Waiting for Response...'}
                        </>
                      ) : (
                        'Connect to server first.'
                      )}
                    </Button>
                    <WhiteSpace />
                    <Text>Results:</Text>
                    <Text>
                      {/* {this.parseResults()} */}
                      {this.state.audioResponse.length < 1 &&
                        'Try again. Mind the noise.'}
                      {this.state.audioResponse &&
                        this.state.audioResponse.map(entry => {
                          return entry.name + ' - ' + entry.value + '\n';
                        })}
                    </Text>
                  </View>
                </View>
              )}
              <View style={{marginBottom: 40}} />
            </ScrollView>
          </WingBlank>
        </SafeAreaView>
        {/* Navigation Tab */}
        <View
          style={{
            position: 'absolute',
            marginBottom: -1,
            width: '100%',
            bottom: 1,
            zIndex: 2,
          }}>
          <TabBar
            style={{position: 'absolute', flex: 1}}
            unselectedTintColor="#949494"
            tintColor="#33A3F4"
            barTintColor="#f5f5f5">
            <TabBar.Item
              title="Home"
              selected={this.state.tab === 0}
              icon={<Icon name="home" />}
              onPress={() => this.setState({tab: 0})}
            />
            <TabBar.Item
              title="Breating Test"
              selected={this.state.tab === 4}
              icon={<Icon name="audio" />}
              onPress={() => this.setState({tab: 4})}
            />
            <TabBar.Item
              title="Device Setup"
              selected={this.state.tab === 1}
              icon={<Icon name="setting" />}
              onPress={() => this.setState({tab: 1})}
            />
            <TabBar.Item
              title="User"
              selected={this.state.tab === 2}
              icon={<Icon name="user" />}
              onPress={() => this.setState({tab: 2})}
            />
          </TabBar>
        </View>
      </>
    );
  }
}

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: Colors.white,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
});

const mapStateToProps = state => ({
  auth: state.auth,
});

const mapActionCreators = {
  logout,
  setLogin,
  setIP,
  parseAudio,
};

export default connect(
  mapStateToProps,
  mapActionCreators,
)(App);

App.propTypes = {};
